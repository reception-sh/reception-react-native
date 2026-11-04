package sh.reception.reactnative

/** An FCM registration token as the service accepts it; anything else never reaches the SDK. */
internal object PushToken {
  private val pattern = Regex("^[A-Za-z0-9_:-]{1,4096}$")

  fun isValid(token: String): Boolean = pattern.matches(token)
}
