# Changelog

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
