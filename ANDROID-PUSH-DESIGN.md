# Android push design

Decided 2026-11-04 for 1.6.0. The iOS design (Expo routes APNs, Swift deduplicates taps) is unchanged.

## Who owns what

| Concern                  | iOS                                                             | Android                                                                                                    |
| ------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Token                    | `startReceptionPush` reads the APNs token from Expo             | The SDK reads the FCM token itself (`registerForPushIfAuthorized`) at configure and on every foreground    |
| Receipt and presentation | Expo receives; `receptionNotificationBehavior` decides          | `ReceptionPushReceiver` hands Reception replies to the SDK, which posts them (none while the chat is open) |
| Taps, cold start         | Expo's response listener, deduplicated in `NotificationRouting` | The SDK's trampoline activity; a tap before `configure` opens the chat 500 ms after it                     |
| What JS does             | Registration, routing, presentation choice                      | Keeps the token current; nothing else                                                                      |

## The problem

Reception sends data-only, high-priority FCM messages so the SDK decides presentation, as on iOS. An app has
exactly one `FirebaseMessagingService` that receives `MESSAGING_EVENT`. With expo-notifications that is
`ExpoFirebaseMessagingService` (priority -1, above Firebase's default at -500). Expo presents data-only messages
that carry `title`: verified live, a Reception reply then appears as an Expo notification on
`expo_notifications_fallback_notification_channel`, the SDK never sees it, and a tap does not open the chat.
React Native Firebase has the same shape. We cannot subclass an optional service, and a second service never
receives anything.

## The decision: a receiver ahead of Firebase

Google Play services delivers every FCM message to the app as the ordered broadcast
`com.google.android.c2dm.intent.RECEIVE` (protected by `com.google.android.c2dm.permission.SEND`). Firebase's
`FirebaseInstanceIdReceiver` (priority 0) turns it into the `MESSAGING_EVENT` for the service. The module's
library manifest declares `ReceptionPushReceiver` for the same broadcast at priority 100, so it runs first:

- `PushMessages.receptionData` claims a message only when its action is `RECEIVE`, `message_type` is absent or
  `gcm`, and the data has a non-empty `reception` field. The data passed on is what `RemoteMessage.getData()`
  would contain (no `google.*`, `gcm.*`, `from`, `message_type`, `collapse_key`).
- A claimed message goes to `Reception.handlePushMessage(context, data)`, which works before `configure` (the
  process may have been started just for this broadcast).
- If the SDK took it, the receiver sets `RESULT_OK` (what Firebase's receiver reports for a delivered message)
  and aborts the broadcast, so no messaging service shows it a second time.
- Every other message, and tokens, pass to Firebase and the app's service unchanged.

Why not alternatives: a `FirebaseMessagingService` of ours would replace the app's (tokens and other messages
lost); a JS-side handler cannot run for a killed app without a headless task and would present after expo had
already presented; the SDK's `ReceptionMessagingService` is only for apps without any messaging service and is
not declared by this package.

Works the same with expo-notifications, React Native Firebase, the SDK's own service or Firebase's default
service: the receiver never depends on which one exists. Without Firebase Messaging in the app, nothing sends
the broadcast and the SDK logs that push is unavailable.

## JS on Android

`startReceptionPush()` on Android only: `refreshReceptionPush()` calls the native
`registerForPushIfAuthorized()` (after the app's own permission flow; never prompts), token rotations from
`addPushTokenListener` go to `setPushToken`, and logout or deletion triggers registration again.
`receptionNotificationBehavior` returns null (Expo never sees Reception replies). `handleExpoNotification` and the
native `NotificationRouting` stay iOS only. `Reception.setPushToken` accepts the FCM token
(`[A-Za-z0-9_:-]{1,4096}`; the environment argument is validated and ignored) and `handlePushNotification`
accepts the FCM data shape `{ reception: '<conversationId>' }` as well as the iOS envelope.

## Verified live (emulator, real FCM, local backend)

Foreground, background, killed process (started for the receiver) and cold-start taps; chat open (no
notification); expo-notifications present (one notification, the SDK's); a build without Reception's receiver
(Expo shows the reply itself: the reason for this design); a build without Expo's service (the SDK still shows
it). Commands and screenshots: `verification/android.md`.

## Limits

- `am force-stop` (Settings → Force stop) blocks every FCM delivery until the app is opened again; Android's rule.
- If Google Play services ever stops delivering FCM as an ordered broadcast, the receiver cannot abort it and
  Expo would show a second notification; `isOrderedBroadcast` is checked, and nothing breaks beyond that.
- An app's own receiver for the same broadcast at a priority above 100 runs first; that is the app's choice.
