package sh.reception.reactnative

import java.util.UUID
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Asks JS whether a paywall is available. Every check fails closed: after five seconds, when the SDK cancels it, and
 * when JS goes away ([cancelAll]). Main thread only.
 */
internal class PaywallRequests(private val timeoutMillis: Long = 5_000) {
  private val pending = mutableMapOf<String, CompletableDeferred<Boolean>>()
  var emit: ((requestId: String, paywall: String) -> Unit)? = null

  /** Called when JS did not answer in time, for example while React Native paused its timers. */
  var onTimeout: (() -> Unit)? = null

  suspend fun check(paywall: String): Boolean {
    val emit = emit ?: return false
    if (!currentCoroutineContext().isActive) return false
    val requestId = UUID.randomUUID().toString()
    val answer = CompletableDeferred<Boolean>()
    pending[requestId] = answer
    return try {
      emit(requestId, paywall)
      withTimeoutOrNull(timeoutMillis) { answer.await() } ?: false.also { onTimeout?.invoke() }
    } finally {
      // A timeout or cancellation leaves nothing behind; a late answer from JS then finds no request.
      pending.remove(requestId)
    }
  }

  fun resolve(requestId: String, allowed: Boolean) {
    pending.remove(requestId)?.complete(allowed)
  }

  fun cancelAll() {
    for (requestId in pending.keys.toList()) resolve(requestId, allowed = false)
    emit = null
  }

  val pendingCount: Int
    get() = pending.size
}
