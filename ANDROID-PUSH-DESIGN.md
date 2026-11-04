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

Revised 2026-11-04 (fix round 1). With expo-notifications (see the rule below) the module ships
`ReceptionExpoMessagingService`, a subclass of `ExpoFirebaseMessagingService` (`android/src/expoNotifications`):

- `onMessageReceived`: `Reception.handlePushMessage(applicationContext, data, messageId)` takes a Reception payload
  (data with a non-empty `reception` field) and returns true; the SDK posts it, or not while the chat is open. The
  message ID is passed separately because Firebase removes `google.*` keys, `google.message_id` among them, from
  `RemoteMessage.data`; without it the SDK cannot recognize a redelivered message and would show it twice.
  Everything else goes to `super`, so Expo handles it exactly as before.
- `onNewToken`: `super` (Expo's token flow and listeners unchanged), then the token is staged with
  `Reception.setPushToken` on the main thread when the SDK is configured. Before `configure` the SDK reads the token
  itself.

## Which service: one rule

`android/messaging-service.js` decides; the config plugin requires it and `android/build.gradle` runs it, so the app's
manifest and the module's never disagree:

1. `@react-native-firebase/messaging` resolves: no Reception service at all, with or without expo-notifications. React
   Native Firebase's service (default priority 0, above Expo's -1) stays the one receiver; that host calls
   `Reception.handlePushMessage` with `remoteMessage.messageId` from a native subclass of it (README); the module
   depends on the SDK with `api`, so that subclass compiles without the app declaring `sh.reception:reception`. A
   Reception service at priority 10 would take every message and `onNewToken` from React Native Firebase.
2. Otherwise `expo-notifications` resolves and Expo autolinking links it on Android: the module's Gradle build compiles
   `ReceptionExpoMessagingService` against expo-notifications as autolinking links it (its Gradle project when built
   from source, otherwise its prebuilt publication, as in Expo 57) and uses `src/expoNotifications/AndroidManifest.xml`
   as the module's manifest. That manifest declares the service with the `com.google.firebase.MESSAGING_EVENT` filter
   at priority 10, above Expo's -1, so the class and its declaration exist together or not at all, with or without
   prebuild. (Declared in the app's own manifest, the entry fails release lint: the app's compile classpath does not
   see Firebase's service behind Expo's.)
3. Otherwise: the config plugin declares the SDK's own `sh.reception.ReceptionMessagingService` in the app manifest
   (the app then needs `com.google.firebase:firebase-messaging`). Hosts without prebuild add that entry themselves
   (README). This includes an expo-notifications that resolves in Node but that autolinking does not link (for
   example `expo.autolinking.exclude` in package.json); prebuild and Gradle then warn ("expo-notifications is installed
   but Expo autolinking does not link it"), since the Expo subclass would have no superclass at runtime.

"Links" is Expo's resolved autolinking, never a package's own `expo-module.config.json`: Gradle reads the `expoGradle`
extension that Expo's settings plugin registers (in Expo 54 and 57 alike; the linked projects, each with its
publication if it uses one), and the config plugin runs the same Android `expo-modules-autolinking resolve` that the
settings plugin runs. Without Expo's settings plugin, Gradle counts a linked `:expo-notifications` project.

The plugin first removes Reception entries of earlier runs, so a prebuild without `--clean` never keeps a service for
another setup. Adding or removing either package needs a new prebuild, as any native dependency does.

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
- Custom autolinking options passed in `settings.gradle` (`useExpoModules` search paths or excludes) reach Gradle's
  decision but not the config plugin's, which reads package.json; set excludes in package.json so both agree.
