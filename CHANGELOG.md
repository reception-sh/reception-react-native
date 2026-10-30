# Changelog

## 1.4.0 — Unreleased

- The chat can ask for notification permission right after the person's message, when **Ask for push notifications** is on in the dashboard, and confirms under their latest message that replies will arrive as notifications. Hide that line with the new `appearance.hidesPushStatus`. No code is needed beyond the existing push setup.
- Add `Reception.screens`: the places in your app that link cards can open, such as tabs, screens or the paywall, each `{ id, open }`, or `{ id, value: 'Order number', open: (number) => … }` for a screen that takes a value from the link. The dashboard offers them by name and sends a screen link only to app versions that list it; `open` runs after the chat closes. No URL scheme or linking setup is needed. Set it again at startup after a JavaScript reload.
- Add the `linkOpened` event, emitted when someone taps a link card. Apps with an exhaustive `switch` over `ReceptionEvent['type']` need to add this case.
- Add `opensWebLinksInApp` (iOS, default `true`): web links from link cards and message text open in an in-app Safari sheet over the chat. Set it to `false` to hand them to the system instead. It is a local setting; nothing is sent to Reception.
- Link cards: a message from your team can carry a button that opens a website, another app's link, an App Store page or offer code, an email address, a phone number, your app's page in iOS Settings, or one of your `screens`. Only screens need code.
- Bundle Reception iOS SDK 1.7.0: the device registers on launch so every install appears on the Users page, the chat keeps your place when you scroll up and shows a “new messages” button, web addresses in message text are tappable, a long press on a bubble offers Copy, and device registration reports the app's screens.

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
