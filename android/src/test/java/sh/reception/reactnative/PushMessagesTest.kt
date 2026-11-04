package sh.reception.reactnative

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PushMessagesTest {
  private val reply = mapOf(
    "reception" to "conv_1", "title" to "Support", "body" to "Hi", "badge" to "2",
    "from" to "16200985775", "google.message_id" to "0:1", "google.delivered_priority" to "high",
    "gcm.n.analytics_data" to "x", "collapse_key" to "conv_1", "google.ttl" to 2419200,
  )

  @Test
  fun `a Reception reply is claimed with the data Firebase would pass on`() {
    assertEquals(
      mapOf("reception" to "conv_1", "title" to "Support", "body" to "Hi", "badge" to "2"),
      PushMessages.receptionData(PushMessages.RECEIVE, reply),
    )
    assertEquals("conv_1", PushMessages.receptionData(PushMessages.RECEIVE, reply + ("message_type" to "gcm"))?.get("reception"))
  }

  @Test
  fun `every other message stays with the app`() {
    assertNull(PushMessages.receptionData(PushMessages.RECEIVE, mapOf("title" to "Sale")))
    assertNull(PushMessages.receptionData(PushMessages.RECEIVE, mapOf("reception" to "")))
    assertNull(PushMessages.receptionData(PushMessages.RECEIVE, mapOf("reception" to 1)))
    assertNull(PushMessages.receptionData(PushMessages.RECEIVE, reply + ("message_type" to "deleted_messages")))
    assertNull(PushMessages.receptionData("com.google.firebase.MESSAGING_EVENT", reply))
    assertNull(PushMessages.receptionData(null, reply))
  }
}
