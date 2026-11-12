package sh.reception.reactnative

import android.app.Activity
import android.content.Intent
import android.net.Uri
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * The app's `ReactActivity` gets one listener from Expo's activity delegate, which hands each new intent to the SDK
 * without taking it from React, also before Reception is configured. The SDK's own tests cover what it decides.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ReceptionPackageTest {
  private val launcherReturn = Intent.makeMainActivity(null)
    .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)

  @Test
  fun `the activity gets one listener that never handles a new intent`() {
    val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
    val listeners = ReceptionPackage().createReactActivityLifecycleListeners(activity)
    assertEquals(1, listeners.size)
    val listener = listeners.single()
    assertFalse(listener.onNewIntent(launcherReturn))
    assertFalse(listener.onNewIntent(Intent(Intent.ACTION_VIEW, Uri.parse("example://screen"))))
    assertFalse(listener.onNewIntent(null))
  }

  @Test
  fun `a context that is no activity gets no listener`() {
    assertTrue(ReceptionPackage().createReactActivityLifecycleListeners(RuntimeEnvironment.getApplication()).isEmpty())
    assertTrue(ReceptionPackage().createReactActivityLifecycleListeners(null).isEmpty())
  }
}
