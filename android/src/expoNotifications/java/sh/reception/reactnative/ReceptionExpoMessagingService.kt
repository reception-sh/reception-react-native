package sh.reception.reactnative

import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService
import sh.reception.Reception

/**
 * expo-notifications' messaging service with Reception's replies taken out first (see ANDROID-PUSH-DESIGN.md). The
 * config plugin declares it above Expo's own service when the app has expo-notifications, so Firebase's pipeline
 * (message-id dedupe, delivery acknowledgment) runs once and exactly one side presents each message. Compiled only when
 * the app links expo-notifications.
 */
class ReceptionExpoMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    // True for a Reception reply: the SDK shows it (none while the chat is open) and opens the chat on a tap.
    if (Reception.handlePushMessage(applicationContext, remoteMessage.data)) return
    super.onMessageReceived(remoteMessage)
  }

  override fun onNewToken(token: String) {
    super.onNewToken(token)
    PushToken.stage(token)
  }
}
