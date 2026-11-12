# Changelog

## 1.6.0 — 2026-11-12

- Android: the same API now runs the native Reception Android SDK (`sh.reception:reception` 1.0.0 from Maven Central, Android 7+), with the chat sheet, `ReceptionChatView`, appearance (light/dark color pairs, drawable resources for images, React Native fonts), language, paywalls with `paywallAvailability`, screens, link cards, events, unread and chat state. No Gradle or manifest edits. The Android warning is gone.
- Android push: with your `google-services.json` and the Firebase service account uploaded in the dashboard, the SDK reads the FCM token, shows replies (none while the chat is open) and opens the chat from a tap, including cold starts. With expo-notifications the module declares Reception's subclass of its messaging service, which hands Reception's replies to the SDK and everything else to Expo, so they never appear twice and your other notifications and tokens are unaffected; without it the config plugin declares the SDK's own service. `startReceptionPush()` only keeps the token current on Android. `setPushToken` takes the FCM token there and `handlePushNotification` also accepts `{ reception: conversationId }`.
- Android: a fresh install registers its FCM token only once notifications are allowed. Tokens Firebase issues on its own (rotations reaching the Expo messaging service or `startReceptionPush()`) go through the SDK's permission check; `setPushToken` still registers the token you pass.
- Android: the embedded `ReceptionChatView` keeps its composer right on the keyboard inside a tab or bottom-navigation layout too (the SDK pads it only for the part of the keyboard and system bars that overlaps it), and `openChat()` no longer crashes in apps that resolve Material 3 1.5, such as a new Expo 58 app with `@expo/ui` (the SDK draws its sheet itself). Verified on Expo 58 (Android).
- Android: in apps whose launcher activity is `singleTask` (Expo's default), the chat sheet comes back open when the person leaves the app with the chat open and returns through the app icon, which makes Android close every screen above that activity. The module hands the activity's new intents to the SDK, because React Native does not pass them on; no code needed (Expo 54–58, and bare React Native with Expo Modules). After a notification, a deep link or a shortcut the chat stays closed, as before.
- Android: when Android ends the app's process while the chat sheet is open, returning through Recents shows your app at once, taking touches, and the chat opens again, already open, once JavaScript calls `Reception.configure` (if that call, the SDK's check of the stored chat and a resumed screen all happen within 5 seconds of the return, and only if nothing closed or opened the chat meanwhile). It starts at the latest messages; an open photo is closed. `closeChat()`, `logout()` and `deleteData()` cancel it also before `configure`, and so does a deep link, shortcut or notification that reaches the running main activity meanwhile (one that starts a new activity does not; a tap on a Reception reply opens the chat as usual, once).
- Bundle Reception iOS SDK 1.7.1. An automation's message appears right away in a chat that is already open, a chat that was open before its conversation existed receives replies live, and the live connection backs off when it is asked to reconnect right after opening.

## 1.5.0 — 2026-10-31

- Link cards: a message from your team can carry a button that opens a website, another app's link, an App Store page or offer code, an email address, a phone number, your app's page in iOS Settings, or one of your `screens`. Only screens need code.
- Add `Reception.screens`: the places in your app that link cards can open, such as tabs, screens or the paywall, each `{ id, open }`, or `{ id, value: 'Order number', open: (number) => … }` for a screen that takes a value from the link. The dashboard offers them by name and sends a screen link only to app versions that list it; `open` runs after the chat closes. No URL scheme or linking setup is needed. Set it again at startup after a JavaScript reload.
- Add the `linkOpened` event, emitted when someone taps a link card. Apps with an exhaustive `switch` over `ReceptionEvent['type']` need to add this case.
- Add `opensWebLinksInApp` (iOS, default `true`): web links from link cards and message text open in the app that owns them (for example WhatsApp or Instagram), otherwise in an in-app Safari sheet over the chat. Set it to `false` to hand them to the system instead. It is a local setting; nothing is sent to Reception.
- The chat can ask for notification permission right after the person's message, when **Ask for push notifications** is on in the dashboard, and confirms under their latest message that replies will arrive as notifications. Hide that line with the new `appearance.hidesPushStatus`. No code is needed beyond the existing push setup.
- Bundle Reception iOS SDK 1.7.0: the chat keeps your place when you scroll up and shows a “new messages” button, and device registration reports the app's screens and the original transaction IDs of App Store purchases, so App Store notifications connected in the dashboard reach the person. While typing, the chat sheet closes by dragging its grabber or title bar; a drag over the messages puts the keyboard away.

## 1.4.0 — 2026-10-24

- Bundle Reception iOS SDK 1.6.0. The device registers with Reception at launch and on foreground instead of with the first message, so every install appears in the dashboard's Users page, and a conversation your team starts first loads, polls and badges in the app like any other. Expo notification routing is unchanged.

## 1.3.0 — 2026-10-23

- Add `track(event, { opensChat })` to report app events, such as a closed paywall or a cancelled purchase, for automations set up in the dashboard. A listening automation sends its message and can open the chat.
- Bundle Reception iOS SDK 1.5.0. The chat opens once the App Store sheet has closed or a re-shown paywall has settled, so an automation's message never waits unread; subscription changes and paid access are reported for automations.

## 1.2.1 — 2026-10-22

- Bundle Reception iOS SDK 1.4.1. The live chat connection keeps retrying after drops instead of stopping for good after eight over a session; opening the chat, sending a message or the network coming back reconnects at once.

## 1.2.0 — 2026-10-22

- `paywalls` entries take an optional `source` (where the paywall is built), `products` (ID, localized price, ISO 8601 period and free trial) and `presentable` (false lists an offering without a paywall for your team). They reach the dashboard with Reception iOS SDK 1.4.0; existing `{ id, title }` entries are unchanged. The RevenueCat, Superwall and own-screen helpers report them.

## 1.1.0 — 2026-10-16

- Bundle Reception iOS SDK 1.3.0. Device registration and updates now report the app's `Reception.appearance` (colors, texts, font, welcome icon and visibility) so the dashboard's chat design editor starts from the design set in code. Images are reported only as present, never uploaded.

## 1.0.0 — 2026-10-14

- Add the native Reception iOS support chat to React Native and Expo apps, bundling Reception iOS SDK 1.2.0.
- Require Expo SDK 54+ (verified 54–57), React Native 0.81+ and React 19.1+, with open upper ranges.
- Support light/dark color pairs and setting getters that reflect assignments immediately.
- Add optional Expo notification registration, routing and composable presentation, plus `refreshReceptionPush()` after the app's permission flow.
- Validate the final iOS deployment target, including expo-build-properties.
