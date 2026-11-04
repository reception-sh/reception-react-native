# Android push design

Decided 2026-11-04 for 1.6.0. The iOS design (Expo routes APNs, Swift deduplicates taps) is unchanged.

## Who owns what

| Concern                  | iOS                                                             | Android                                                                                                            |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Token                    | `startReceptionPush` reads the APNs token from Expo             | The SDK reads the FCM token itself (`registerForPushIfAuthorized`) at configure and on every foreground            |
| Receipt and presentation | Expo receives; `receptionNotificationBehavior` decides          | The app's one messaging service hands Reception replies to the SDK, which posts them (none while the chat is open) |
| Taps, cold start         | Expo's response listener, deduplicated in `NotificationRouting` | The SDK's trampoline activity; a tap before `configure` opens the chat 500 ms after it                             |
| What JS does             | Registration, routing, presentation choice                      | Keeps the token current; nothing else                                                                              |

## The problem

Reception sends data-only, high-priority FCM messages so the SDK decides presentation, as on iOS. Firebase delivers
`MESSAGING_EVENT` to exactly one `FirebaseMessagingService`: the highest-priority declaration in the merged manifest.
With expo-notifications that is `ExpoFirebaseMessagingService` (priority -1, above Firebase's default at -500). Expo
presents data-only messages that carry `title`: verified live, a Reception reply then appears as an Expo notification on
`expo_notifications_fallback_notification_channel`, the SDK never sees it, and a tap does not open the chat. A second
service of the same priority never receives anything.

## The decision: one service, Expo's subclass

Revised 2026-11-04 (fix round 1). The module ships `ReceptionExpoMessagingService`, a subclass of
`ExpoFirebaseMessagingService` (`android/src/expoNotifications`):

- `onMessageReceived`: `Reception.handlePushMessage(applicationContext, data)` takes a Reception payload (data with a
  non-empty `reception` field) and returns true; the SDK posts it, or not while the chat is open. Everything else goes
  to `super`, so Expo handles it exactly as before.
- `onNewToken`: `super` (Expo's token flow and listeners unchanged), then the token is staged with
  `Reception.setPushToken` on the main thread when the SDK is configured. Before `configure` the SDK reads the token
  itself.

The config plugin declares it in the app manifest with the `com.google.firebase.MESSAGING_EVENT` filter at priority 10,
above Expo's -1, when Node resolves `expo-notifications` from the project. Otherwise it declares the SDK's own
`sh.reception.ReceptionMessagingService` (the app then needs `com.google.firebase:firebase-messaging`), except with
React Native Firebase (`@react-native-firebase/messaging` resolves), whose own service stays; that host calls
`Reception.handlePushMessage` from a native subclass of it. The plugin removes either Reception entry first, so a
prebuild without `--clean` never keeps a service for the other setup. Hosts without prebuild add the entry themselves
(README).

Gradle compiles the subclass under the same condition, against expo-notifications as the app links it: its Gradle
project when built from source, otherwise its prebuilt publication (Expo 57). If Node resolves expo-notifications but
neither exists, the build fails with a message instead of producing an app whose manifest names a missing class.

Why this over the earlier receiver (a `c2dm.intent.RECEIVE` receiver at priority 100 that aborted the broadcast):

- Firebase's pipeline stays intact. Firebase's receiver and service deduplicate by message id and acknowledge delivery
  to Google Play services; aborting the broadcast skipped both.
- Exactly one presentation owner per message, decided in one place. With an unordered broadcast the receiver could not
  abort, so the SDK and expo-notifications both posted.
- It works for any delivery mode, because it no longer depends on the broadcast being ordered.

Rejected: a JS-side handler (cannot run for a killed app without a headless task, and would present after Expo had);
a second independent service (only one receives).

## JS on Android

`startReceptionPush()` on Android only: `refreshReceptionPush()` calls the native
`registerForPushIfAuthorized()` (after the app's own permission flow; never prompts), token rotations from
`addPushTokenListener` go to `setPushToken`, and logout or deletion triggers registration again.
`receptionNotificationBehavior` returns null (Expo never sees Reception replies). `handleExpoNotification` and the
native `NotificationRouting` stay iOS only. `Reception.setPushToken` accepts the FCM token
(`[A-Za-z0-9_:-]{1,4096}`; the environment argument is validated and ignored) and `handlePushNotification`
accepts the FCM data shape `{ reception: '<conversationId>' }` as well as the iOS envelope.

## Verified live (emulator, real FCM, local backend)

With expo-notifications (the example) and with expo-notifications removed (the SDK's service): foreground with the
chat open (no notification) and closed (one notification, the SDK's), background with a tap that opens the chat, a
killed process (started by Firebase's own receiver), and a cold-start tap. Commands and logs: `verification/android.md`.

## Limits

- `am force-stop` (Settings → Force stop) blocks every FCM delivery until the app is opened again; Android's rule.
- An app that declares its own messaging service above priority 10 receives everything, Reception's replies included;
  it then calls `Reception.handlePushMessage` itself.
- In a monorepo where Node resolves expo-notifications from the app but autolinking does not link it, the build stops
  with "expo-notifications is installed but not linked".
