package sh.reception.reactnative

import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.snapshots.ObserverHandle
import androidx.compose.runtime.snapshots.Snapshot
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import sh.reception.Reception
import sh.reception.ReceptionEvent
import sh.reception.ReceptionScreen

/** The SDK state and callbacks for one JS runtime. Main thread only. */
internal class ReceptionBridge {
  companion object {
    private var current: WeakReference<ReceptionBridge>? = null
    private var revision = 0
    var appearanceValues: Map<String, Any?> = emptyMap()
  }

  private val requests = PaywallRequests()
  private var connected = false
  private val settingRevisions = mutableMapOf<String, Int>()
  private var scope: CoroutineScope? = null
  private var writes: ObserverHandle? = null
  private var observed: List<Any?>? = null
  private var recheckAfterChat = false
  private val checkPosted = AtomicBoolean(false)
  private val main = Handler(Looper.getMainLooper())
  private var emit: ((String, Map<String, Any?>) -> Unit)? = null

  fun connect(emit: (String, Map<String, Any?>) -> Unit): Map<String, Any?> {
    current?.get()?.invalidate()
    current = WeakReference(this)
    connected = true
    this.emit = emit
    Reception.onEvent = { event -> send(event) }
    observe()
    return snapshot()
  }

  fun invalidate() {
    connected = false
    scope?.cancel()
    scope = null
    writes?.dispose()
    writes = null
    requests.cancelAll()
    emit = null
    if (current?.get() !== this) return
    Reception.onEvent = null
    Reception.onPaywall = null
    // Without JS nothing can open a screen, so none is reported until JS lists them again.
    Reception.screens = emptyList()
    // A missing JS runtime must not turn a previously filtered offer into an available one.
    if (Reception.paywallAvailability != null) Reception.paywallAvailability = { false }
    current = null
  }

  fun snapshot(): Map<String, Any?> {
    revision += 1
    return mapOf(
      "revision" to revision,
      "settingRevisions" to settingRevisions.toMap(),
      "isConfigured" to Reception.isConfigured,
      "unreadCount" to Reception.unreadCount.value,
      "isChatOpen" to Reception.isChatOpen.value,
      "availablePaywalls" to Reception.availablePaywalls.map(PaywallValues::value),
      "paywalls" to Reception.paywalls.map(PaywallValues::value),
      "appearance" to appearanceValues,
      "updatesAppBadge" to Reception.updatesAppBadge,
      "opensWebLinksInApp" to Reception.opensWebLinksInApp,
      "usesRemoteAppearance" to Reception.usesRemoteAppearance,
      "languageOverride" to Reception.languageOverride,
      "logLevel" to Reception.logLevel.name.lowercase(),
    )
  }

  fun applySetting(key: String, revision: Int, update: () -> Unit): Map<String, Any?> {
    if (connected && revision > (settingRevisions[key] ?: 0)) {
      update()
      settingRevisions[key] = revision
    }
    return snapshot()
  }

  fun setPaywallHandler(enabled: Boolean) {
    Reception.onPaywall = if (enabled) { id -> emit?.invoke("onPaywall", mapOf("id" to id)) } else null
  }

  // JS validated the list; each screen forwards its ID and value, and JS runs the matching open.
  fun setScreens(screens: List<Map<String, Any?>>) {
    Reception.screens = screens.mapNotNull { entry ->
      val id = entry["id"] as? String ?: return@mapNotNull null
      val value = entry["value"] as? String
      if (value != null) ReceptionScreen(id, value) { given -> openScreen(id, given) }
      else ReceptionScreen(id) { openScreen(id, null) }
    }
  }

  /** The chat has closed; JS gets that state before `open` runs, so `isChatOpen` already reads false there. */
  private fun openScreen(id: String, value: String?) {
    if (!connected) return
    emit?.invoke("onState", snapshot())
    emit?.invoke("onScreen", mapOf("id" to id, "value" to value))
  }

  fun setAvailability(enabled: Boolean, generation: Int) {
    requests.cancelAll()
    if (!enabled) {
      Reception.paywallAvailability = null
      return
    }
    // React Native pauses JS timers while the SDK's chat activity covers the app's activity, so a callback that waits
    // on a timer fails closed there. Such offers are checked again once the chat has closed.
    requests.onTimeout = { if (Reception.isChatOpen.value) recheckAfterChat = true }
    requests.emit = { requestId, id ->
      emit?.invoke("onAvailability", mapOf("requestId" to requestId, "id" to id, "generation" to generation))
    }
    Reception.paywallAvailability = { id -> connected && requests.check(id) }
  }

  fun resolve(requestId: String, allowed: Boolean) = requests.resolve(requestId, allowed)

  /**
   * Sends the state whenever what JS shows changes: the unread count and chat visibility are flows, the available
   * paywalls are Compose state. Compose delivers state changes only while a composition runs, so writes are observed
   * directly and compared on the next main-loop turn.
   */
  private fun observe() {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate).also { this.scope = it }
    scope.launch {
      combine(Reception.unreadCount, Reception.isChatOpen) { _, _ -> }.collect { check() }
    }
    writes = Snapshot.registerGlobalWriteObserver {
      if (!checkPosted.compareAndSet(false, true)) return@registerGlobalWriteObserver
      main.post {
        checkPosted.set(false)
        check()
      }
    }
  }

  private fun check() {
    if (!connected) return
    val state = listOf(
      Reception.isConfigured, Reception.unreadCount.value, Reception.isChatOpen.value, Reception.availablePaywalls,
    )
    if (state == observed) return
    observed = state
    emit?.invoke("onState", snapshot())
    if (recheckAfterChat && !Reception.isChatOpen.value) {
      recheckAfterChat = false
      Reception.refreshPaywalls()
    }
  }

  private fun send(event: ReceptionEvent) {
    val payload: Map<String, Any?> = when (event) {
      is ReceptionEvent.IdentityRejected -> mapOf(
        "type" to "identityRejected",
        "error" to mapOf("code" to event.error.code, "status" to event.error.status),
      )
      ReceptionEvent.ChatOpened -> mapOf("type" to "chatOpened")
      ReceptionEvent.MessageSent -> mapOf("type" to "messageSent")
      ReceptionEvent.ImageSent -> mapOf("type" to "imageSent")
      ReceptionEvent.ReviewOpened -> mapOf("type" to "reviewOpened")
      ReceptionEvent.PaywallOpened -> mapOf("type" to "paywallOpened")
      ReceptionEvent.LinkOpened -> mapOf("type" to "linkOpened")
      ReceptionEvent.DataDeleted -> mapOf("type" to "dataDeleted")
    }
    emit?.invoke("onEvent", payload)
  }
}
