package sh.reception.reactnative

import android.os.Handler
import android.os.Looper
import sh.reception.Reception
import sh.reception.ReceptionInternalApi

/** An FCM registration token as the service accepts it; anything else never reaches the SDK. */
internal object PushToken {
  private val pattern = Regex("^[A-Za-z0-9_:-]{1,4096}$")

  fun isValid(token: String): Boolean = pattern.matches(token)

  /**
   * Hands a token Firebase issued on its own (a rotation) to a configured SDK on the main thread. The SDK stages it
   * only while notifications are allowed, as for the token it reads itself; before `configure` it reads it itself.
   */
  fun stage(token: String) {
    if (!isValid(token)) return
    Handler(Looper.getMainLooper()).post { register(token) }
  }

  /** [stage] on the main thread; also the module's `registerPushTokenIfAuthorized` for JS. */
  @OptIn(ReceptionInternalApi::class)
  fun register(token: String) {
    if (isValid(token) && Reception.isConfigured) Reception.registerPushTokenIfAuthorized(token)
  }
}
