package sh.reception.reactnative

import android.app.Activity
import android.content.Context
import android.content.Intent
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener
import sh.reception.Reception
import sh.reception.ReceptionInternalApi

/**
 * Hands every new intent of the app's `ReactActivity` to the SDK. React Native gives new intents to React and never to
 * `ComponentActivity`'s listeners once React runs, so the SDK would not see the launcher's intent that brings its chat
 * sheet back after a return through the app icon (Expo's `singleTask` launcher activity finishes the sheet). Expo's
 * activity delegate calls this listener for each new intent before React handles it.
 */
class ReceptionPackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context?): List<ReactActivityLifecycleListener> =
    (activityContext as? Activity)?.let { listOf(NewIntentForwarder(it)) }.orEmpty()
}

/** Lives in the activity's own delegate, so it may hold the activity. */
internal class NewIntentForwarder(private val activity: Activity) : ReactActivityLifecycleListener {
  /** False: the intent stays React's and every other listener's; the SDK only looks at it. */
  @OptIn(ReceptionInternalApi::class)
  override fun onNewIntent(intent: Intent?): Boolean {
    if (intent != null) Reception.noteNewIntent(activity, intent)
    return false
  }
}
