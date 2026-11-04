package sh.reception.reactnative

import android.os.Handler
import android.os.Looper
import sh.reception.Reception

/** An FCM registration token as the service accepts it; anything else never reaches the SDK. */
internal object PushToken {
  private val pattern = Regex("^[A-Za-z0-9_:-]{1,4096}$")

  fun isValid(token: String): Boolean = pattern.matches(token)

  /** Hands a rotated token to a configured SDK on the main thread; before `configure` the SDK fetches it itself. */
  fun stage(token: String) {
    if (!isValid(token)) return
    Handler(Looper.getMainLooper()).post { if (Reception.isConfigured) Reception.setPushToken(token) }
  }
}
