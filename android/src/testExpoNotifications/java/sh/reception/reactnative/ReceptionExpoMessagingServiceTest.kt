package sh.reception.reactnative

import android.Manifest
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.os.Looper
import com.google.firebase.messaging.RemoteMessage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

/** A Reception reply redelivered by FCM is shown once: the service passes the message ID Firebase keeps out of `data`. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ReceptionExpoMessagingServiceTest {
  private val application = RuntimeEnvironment.getApplication()

  @Before
  fun setUp() {
    shadowOf(application).grantPermissions(Manifest.permission.POST_NOTIFICATIONS)
    val launcher = ComponentName(application.packageName, "Launcher")
    val packages = shadowOf(application.packageManager)
    packages.addActivityIfNotPresent(launcher)
    packages.addIntentFilterForActivity(
      launcher,
      IntentFilter(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_LAUNCHER) },
    )
  }

  @Test
  fun `a redelivered reply is shown once`() {
    val service = Robolectric.buildService(ReceptionExpoMessagingService::class.java).create().get()
    service.onMessageReceived(reply("m1", "c1"))
    awaitNotifications(1)
    // One notification per conversation: a repeat would replace it, so clear it to see one.
    notifications().cancelAll()
    service.onMessageReceived(reply("m1", "c1"))
    // The SDK records IDs in order, so once m2's notification is up the repeat of m1 has been decided.
    service.onMessageReceived(reply("m2", "c2"))
    awaitNotifications(1)
    settle(300)
    assertEquals(listOf("c2"), notifications().activeNotifications.map { it.tag.substringAfterLast(":") })
  }

  /** As FCM delivers it: the ID arrives as `google.message_id`, which `RemoteMessage.data` leaves out. */
  private fun reply(messageId: String, conversationId: String): RemoteMessage {
    val bundle = Bundle().apply {
      putString("reception", conversationId)
      putString("title", "Team")
      putString("body", "Hi")
      putString("google.message_id", messageId)
    }
    return RemoteMessage(bundle).also { assertNull(it.data["google.message_id"]) }
  }

  private fun notifications() = application.getSystemService(NotificationManager::class.java)

  private fun posted() = notifications().activeNotifications.size

  private fun awaitNotifications(count: Int) {
    val deadline = System.currentTimeMillis() + 5_000
    while (posted() < count && System.currentTimeMillis() < deadline) settle(10)
  }

  /** Runs the main thread's work while the SDK's storage thread finishes. */
  private fun settle(millis: Long) {
    val end = System.currentTimeMillis() + millis
    do {
      shadowOf(Looper.getMainLooper()).idle()
      Thread.sleep(5)
    } while (System.currentTimeMillis() < end)
  }
}
