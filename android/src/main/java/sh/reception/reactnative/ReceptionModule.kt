package sh.reception.reactnative

import android.content.Context
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import sh.reception.Reception
import sh.reception.ReceptionError
import sh.reception.ReceptionInternalApi

class ReceptionModule : Module() {
  private val bridge = ReceptionBridge()

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ReceptionReactNative")
    Constant("version") { Reception.version }
    Events("onState", "onEvent", "onPaywall", "onScreen", "onAvailability")

    OnCreate { noteCurrentActivity() }
    OnActivityEntersForeground { noteCurrentActivity() }
    OnDestroy { Handler(Looper.getMainLooper()).post { bridge.invalidate() } }

    AsyncFunction("connect") {
      bridge.connect { name, payload -> sendEvent(name, payload) }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("configure") { appId: String, notificationSmallIcon: String? ->
      Reception.notificationSmallIcon = notificationSmallIcon?.let { AppearanceResources.notificationIcon(context, it) }
      Reception.configure(context, appId)
      noteCurrentActivity()
      bridge.snapshot()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("identify") { userId: String?, name: String?, email: String? ->
      Reception.identify(userId, name, email)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("identifyToken") { token: String -> Reception.identifyWithToken(token) }.runOnQueue(Queues.MAIN)
    AsyncFunction("setMetadata") { value: Map<String, String> -> Reception.setMetadata(value) }.runOnQueue(Queues.MAIN)
    AsyncFunction("logout") {
      Reception.logout()
      bridge.snapshot()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("deleteData") Coroutine { ->
      withContext(Dispatchers.Main) {
        val error = try {
          Reception.deleteData()
          null
        } catch (error: ReceptionError) {
          mapOf("code" to error.code, "status" to error.status)
        } catch (error: CancellationException) {
          throw error
        } catch (_: Exception) {
          mapOf("code" to "bridge_error", "status" to 0)
        }
        if (error == null) mapOf("state" to bridge.snapshot()) else mapOf("state" to bridge.snapshot(), "error" to error)
      }
    }
    AsyncFunction("openChat") { Reception.openChat() }.runOnQueue(Queues.MAIN)
    AsyncFunction("closeChat") { Reception.closeChat() }.runOnQueue(Queues.MAIN)
    AsyncFunction("track") { event: String, opensChat: Boolean -> Reception.track(event, opensChat) }
      .runOnQueue(Queues.MAIN)
    // Android has no push environment: the token is FCM's, and the service always uses production.
    AsyncFunction("setPushToken") { token: String, _: String ->
      if (PushToken.isValid(token)) Reception.setPushToken(token)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("handlePushNotification") { conversationId: String, openChat: Boolean ->
      Reception.handlePushNotification(mapOf("reception" to conversationId), openChat)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("registerForPushIfAuthorized") { Reception.registerForPushIfAuthorized() }.runOnQueue(Queues.MAIN)

    AsyncFunction("setAppearance") { value: String, revision: Int ->
      bridge.applySetting("appearance", revision) { ReceptionAppearance.apply(value, context) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("setUpdatesAppBadge") { value: Boolean, revision: Int ->
      bridge.applySetting("updatesAppBadge", revision) { Reception.updatesAppBadge = value }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("setOpensWebLinksInApp") { value: Boolean, revision: Int ->
      bridge.applySetting("opensWebLinksInApp", revision) { Reception.opensWebLinksInApp = value }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("setUsesRemoteAppearance") { value: Boolean, revision: Int ->
      bridge.applySetting("usesRemoteAppearance", revision) { Reception.usesRemoteAppearance = value }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("setLanguageOverride") { value: String?, revision: Int ->
      bridge.applySetting("languageOverride", revision) { Reception.languageOverride = value }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("setLogLevel") { value: String, revision: Int ->
      bridge.applySetting("logLevel", revision) {
        Reception.LogLevel.entries.firstOrNull { it.name.lowercase() == value }?.let { Reception.logLevel = it }
      }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("setPaywalls") { value: List<Map<String, Any?>>, revision: Int ->
      bridge.applySetting("paywalls", revision) { Reception.paywalls = value.mapNotNull(PaywallValues::paywall) }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("setPaywallHandler") { enabled: Boolean -> bridge.setPaywallHandler(enabled) }.runOnQueue(Queues.MAIN)
    AsyncFunction("setScreens") { screens: List<Map<String, Any?>> -> bridge.setScreens(screens) }
      .runOnQueue(Queues.MAIN)
    AsyncFunction("setPaywallAvailability") { enabled: Boolean, generation: Int ->
      bridge.setAvailability(enabled, generation)
      bridge.snapshot()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("resolvePaywallAvailability") { requestId: String, allowed: Boolean ->
      bridge.resolve(requestId, allowed)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("refreshPaywalls") { invalidate: Boolean -> Reception.refreshPaywalls(invalidate) }
      .runOnQueue(Queues.MAIN)
    View(ReceptionNativeView::class) {}

    // Debug builds only (src/debug); the SDK also refuses it unless the app is debuggable.
    if (TestingConfiguration.IS_AVAILABLE) {
      AsyncFunction("configureForTesting") { appId: String, serviceUrl: String ->
        if (TestingConfiguration.configure(context, appId, serviceUrl)) noteCurrentActivity()
        bridge.snapshot()
      }.runOnQueue(Queues.MAIN)
    }
  }

  /** The plugin configures after its activity resumed, so the SDK learns the activity from here. */
  @OptIn(ReceptionInternalApi::class)
  private fun noteCurrentActivity() {
    val activity = appContext.currentActivity ?: return
    Reception.noteCurrentActivity(activity)
  }
}
