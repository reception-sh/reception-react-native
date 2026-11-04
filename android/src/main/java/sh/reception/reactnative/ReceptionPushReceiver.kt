package sh.reception.reactnative

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import sh.reception.Reception

/**
 * Receives FCM messages before Firebase's own receiver (see the manifest and ANDROID-PUSH-DESIGN.md). A Reception
 * reply goes to the SDK, which shows it unless the chat is open and opens the chat on a tap; the broadcast then ends
 * as handled, so expo-notifications or another messaging service never shows it a second time.
 */
class ReceptionPushReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val extras = intent.extras ?: return
    @Suppress("DEPRECATION")
    val values = extras.keySet().associateWith { key -> extras.get(key) }
    val data = PushMessages.receptionData(intent.action, values) ?: return
    if (!Reception.handlePushMessage(context, data) || !isOrderedBroadcast) return
    // RESULT_OK is what Firebase's receiver reports for a delivered message.
    resultCode = Activity.RESULT_OK
    abortBroadcast()
  }
}
