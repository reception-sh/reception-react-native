package sh.reception.reactnative

import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService
import sh.reception.Reception

/**
 * expo-notifications' messaging service with Reception's replies taken out first. The
 * module's manifest declares it above Expo's own service, so Firebase's pipeline (message-id dedupe, delivery
 * acknowledgment) runs once and exactly one side presents each message. Compiled and declared only when
 * messaging-service.js selects it: expo-notifications without React Native Firebase.
 */
class ReceptionExpoMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    // True for a Reception reply: the SDK shows it (none while the chat is open) and opens the chat on a tap. Firebase
    // keeps the message ID out of `data`; the SDK needs it to show a redelivered message once.
    if (Reception.handlePushMessage(applicationContext, remoteMessage.data, remoteMessage.messageId)) return
    super.onMessageReceived(remoteMessage)
  }

  override fun onNewToken(token: String) {
    super.onNewToken(token)
    PushToken.stage(token)
  }
}
