package sh.reception.reactnative

/**
 * Decides which FCM broadcasts are Reception's. Reception sends data-only messages whose data has a non-empty
 * `reception` field (the conversation ID); every other message, Firebase's own control messages included, stays with
 * the app's messaging service.
 */
internal object PushMessages {
  const val RECEIVE = "com.google.android.c2dm.intent.RECEIVE"
  private const val PAYLOAD_KEY = "reception"

  /** The message's data as `RemoteMessage.getData()` returns it, or null when the message is not Reception's. */
  fun receptionData(action: String?, extras: Map<String, Any?>): Map<String, String>? {
    if (action != RECEIVE) return null
    // Absent or "gcm" is a message; deleted_messages, send_event and send_error are Firebase's own.
    val type = extras["message_type"]
    if (type != null && type != "gcm") return null
    val conversationId = extras[PAYLOAD_KEY] as? String
    if (conversationId.isNullOrEmpty()) return null
    return extras.mapNotNull { (key, value) ->
      if (value !is String || isTransportKey(key)) null else key to value
    }.toMap()
  }

  // The keys Firebase leaves out of `RemoteMessage.getData()`.
  private fun isTransportKey(key: String): Boolean =
    key.startsWith("google.") || key.startsWith("gcm.") || key == "from" || key == "message_type" ||
      key == "collapse_key"
}
