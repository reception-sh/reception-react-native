# Reception for React Native

Native support chat, with replies managed in the Reception dashboard.
The chat runs entirely in the official Reception SDKs for iOS and Android.

Requires Expo SDK 54+ (verified 54–58; Expo 58 so far on Android only), React Native 0.81+, React 19.1+,
iOS 17+ with Xcode 26, and Android 7 (API 24)+ (devices on Android 7.0 itself need
[one addition](https://reception.sh/docs/troubleshooting#android-7)). Use the React Native and React versions
selected by Expo. Use a development build; Expo Go cannot load the native SDKs.

## 1. Install

```sh
npx expo install react-native-reception
```

Add `"react-native-reception"` to `expo.plugins` in your app config. Apply plugins
even if a generated `ios/` directory already exists, then build:

```sh
npx expo prebuild
npx expo run:ios
npx expo run:android
```

On Android, Gradle resolves the Reception Android SDK (`sh.reception:reception`) from
Maven Central; no Gradle or manifest edits are needed. The plugin sets iOS 17 as the minimum. If you use `expo-build-properties`, set its
`ios.deploymentTarget` to `17.0` or higher too. No Podfile edits or `use_frameworks!`
are needed for generated projects.

## 2. Configure

Configure once in your existing startup, before showing Support:

```typescript
import { Reception } from 'react-native-reception';

await Reception.configure({ appId: 'app_YOUR_APP_ID' });
```

## 3. Open chat

Call this from your app’s Support button:

```typescript
await Reception.openChat();
```

Report app events for automations set up in the dashboard with
`await Reception.track('paywall_declined', { opensChat: true })`.

Follow the [React Native guide](https://reception.sh/docs/react-native) to match your
app’s theme, add unread badges, identify customers, and connect paywalls, links or embedded chat.

## Push

Install `expo-notifications`, add its plugin, apply prebuild and rebuild. After
Reception is configured, start the optional helper in your root component:

```typescript
import { startReceptionPush } from 'react-native-reception/expo-notifications';
useEffect(() => startReceptionPush(), []);
```

Import `useEffect` from React. The helper registers when already authorized and routes
receipts and taps, including cold starts. It never requests permission.

On Android, add your Firebase project's `google-services.json` with expo-notifications'
`android.googleServicesFile` and upload the Firebase service account in the dashboard's push
settings. The Reception SDK reads the FCM token itself, shows replies and opens the chat from
a tap; the helper only keeps the token current. Reception picks the app's one messaging service:

- With React Native Firebase (`@react-native-firebase/messaging`), its service stays; call
  `Reception.handlePushMessage(this, remoteMessage.data, remoteMessage.messageId)` from a native subclass of it,
  first, and return when it returns true. Pass the message ID: Firebase removes it from `data`, and the SDK uses it to
  show a redelivered message once. The module exposes the SDK to the app's compile classpath, so the app declares no
  Reception dependency.
- Otherwise, with expo-notifications linked on Android, the module declares Reception's subclass of its messaging
  service, so Reception's replies never reach expo-notifications' handlers and your other notifications and tokens
  are unaffected.
- Otherwise (including expo-notifications excluded from Android autolinking, with a build warning) the plugin declares
  the SDK's `ReceptionMessagingService`; add `com.google.firebase:firebase-messaging` to the app then. Projects
  without prebuild add it to `AndroidManifest.xml` themselves:

```xml
<service android:name="sh.reception.ReceptionMessagingService" android:exported="false">
  <intent-filter android:priority="10">
    <action android:name="com.google.firebase.MESSAGING_EVENT" />
  </intent-filter>
</service>
```

After your app’s permission request, call `await refreshReceptionPush()` from the
same optional entry to register immediately, including for provisional permission.
Compose
`receptionNotificationBehavior(notification)` into your existing notification handler;
see the [push setup](https://reception.sh/docs/react-native#push). The main package
import does not load `expo-notifications`.

### Android notification icon

Reception's reply notifications on Android show the SDK's built-in glyph. To use your app's own monochrome icon,
name its drawable resource when you configure:

```typescript
await Reception.configure({
  appId: 'app_YOUR_APP_ID',
  android: { notificationSmallIcon: 'ic_notification' },
});
```

The name is the resource's file name without extension (`res/drawable/ic_notification.xml`): lowercase letters,
digits and underscores, at most 64 characters. A name the app does not contain logs a warning and keeps the built-in
glyph. iOS ignores the `android` options.

## Compatibility

Web and other platforms have no Reception native code. Calls do nothing, warn once,
and return default state.

Android notes: the chat sheet is its own activity, so React Native pauses JS timers
(`setTimeout`) while it is open. A `paywallAvailability` callback should not wait on a timer;
vendor SDK calls and network requests are unaffected, and a check that timed out while the
chat was open runs again once it closes. Present a paywall from `onPaywall` after
`await Reception.closeChat()` if it must appear above the sheet. Appearance images
(`welcomeIcon.image`, `closeImage`) name Android drawable resources, and `fontFamily` names a
font React Native knows (`assets/fonts` or expo-font). With Expo's `singleTask` launcher activity,
a return through the app icon makes Android close every screen above it; the chat sheet then comes
back open by itself (after a notification, deep link or shortcut it stays closed). This needs the
`ReactActivityDelegateWrapper` that prebuild and `install-expo-modules` put in `MainActivity`.
When Android ends the app's process while the chat sheet is open and the person returns through
Recents, your app's screen comes up at once and takes touches; the chat opens again, already open,
as soon as JavaScript calls `Reception.configure`, if that call, the SDK's check of the stored chat
and a resumed screen all happen within 5 seconds of the return and nothing closed or opened the
chat meanwhile. It starts at the latest messages, and an open
photo is closed. `closeChat()`, `logout()` and `deleteData()` cancel it, also when called before
`configure`, and so does a deep link, shortcut or notification that reaches the running main activity
meanwhile (one that starts a new activity does not; a tap on a Reception reply opens the chat as
usual, once).

For native projects you maintain by hand, follow the guide’s manual target and
capability steps instead of prebuild. Bare React Native needs
[Expo Modules](https://docs.expo.dev/bare/installing-expo-modules/).
`npx install-expo-modules` was verified on RN 0.83.10 with Expo 55. For newer stacks
the installer does not recognize yet, follow Expo’s manual installation guide.

Verified with fresh iOS development builds and live message/reply delivery:

| Expo    | React Native | React  |
| ------- | ------------ | ------ |
| 54.0.37 | 0.81.5       | 19.1.0 |
| 55.0.31 | 0.83.10      | 19.2.0 |
| 56.0.23 | 0.85.3       | 19.2.3 |
| 57.0.28 | 0.86.3       | 19.2.3 |

Android was verified on Expo 57 / React Native 0.86.3 with an Android 16 emulator: live
chat, replies and FCM push in the example, and a fresh development build from the tarball. A
fresh Expo 54 / React Native 0.81.5 app with expo-notifications 0.32 builds from the tarball.
Final check (2026-11-05) against Reception Android SDK 728a9ce from `~/.m2`: typecheck, lint, 77 Jest tests and
13 Android unit tests pass, the example debug build succeeds, and live chat, the embedded chat with the keyboard, an
FCM reply through Reception's Expo messaging service with its tap, and logout work on an Android 16 emulator. (The
`FlowRow` crash of a "Not delivered" message on Compose 1.8+ that this run found is fixed in the SDK.)

Expo 58 check (2026-11-10) against Reception Android SDK cb3a636: a fresh `create-expo-app` (Expo 58.0.23, React Native
0.88.1, with the template's `@expo/ui` 58.0.27, which resolves Material 3 1.5.0-beta01 and Compose 1.12.1) built from
the tarball as a minified, non-debuggable release with R8 and resource shrinking and no keep rules of its own. On an
Android 16 emulator the chat sheet, sending, photos, team replies and unread, the embedded chat in the template's tab
layout with the keyboard, dark mode, German, every FCM push case (foreground, chat open, background, killed process,
swiped from Recents), identify, logout, cached history and "Not delivered" with Retry worked, and the app held no push
token before notifications were allowed. A debug build passed a smoke test. Logcat had no linkage or serialization
errors.

License: MIT.
