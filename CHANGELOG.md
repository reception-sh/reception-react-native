# Changelog

## Unreleased

- Validate final iOS deployment targets, including resolved expo-build-properties plugin paths.
- Add `refreshReceptionPush()` to register after the app’s existing permission flow.

- Add optional Expo notification registration, routing and composable presentation, with cleanup and duplicate-tap protection across JavaScript reloads.
- Report conflicting expo-build-properties deployment targets and document explicit prebuild for existing generated projects.
- Keep embedded chat content and the iOS 26 composer inside their view bounds.
- Add iOS support chat for React Native and Expo using a pinned, unreleased Swift SDK based on Reception 1.1.1.
- Support light/dark color pairs and immediate setting getters with revision-based native reconciliation.
- Require Expo SDK 54+ (verified 54–57), React Native 0.81+ and React 19.1+, with open upper ranges.
- Simplify the JS bridge and organize setup around install, configure and open chat.
