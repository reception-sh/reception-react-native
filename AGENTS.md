# Rules for everyone who writes code here

Reception adds the official Swift and Android support chat to React Native through Expo
Modules. Read the pinned Swift SDK's public API and the sibling reception-ios/AGENTS.md and
CONTRIBUTING.md before changing the iOS bridge; read reception-android/SPEC.md and its
`Reception.kt` before changing the Android bridge. With backend access, read
reception/docs/SDK_SPEC.md. The SDKs own chat UI, networking and storage.

## Style

Extremely clean, simple, safe at the boundaries. One file, one responsibility;
aim below 200 lines. No speculative API, dependencies, force unwraps, unsafe casts,
`any` in TypeScript, ignored type errors, or secrets in logs. Validate JS input;
never log identity, metadata, tokens, messages, or callback errors supplied by apps.
Run `npm run format` after edits; `npm run lint` checks Prettier formatting.
Use the public SDK APIs only (Android: plus the plugin-only `noteCurrentActivity`, `noteNewIntent`,
`registerPushTokenIfAuthorized` and `configureForTesting`, all `@ReceptionInternalApi`). `ReceptionPackage`
(autolinked by its file name and `Package` import) hands every new intent of the `ReactActivity` to
`noteNewIntent` from an Expo `ReactActivityLifecycleListener`, because `ReactActivity` passes new intents to React
instead of `ComponentActivity`'s listeners; it must return false so React keeps the intent. Keep all SDK access on the main thread
(`runOnQueue` main). `android/` mirrors `ios/` file by file in behaviour. Web and other
platforms warn once, never throw, and retain default state.

## Native SDK

Never edit vendor files. Commit SDK changes in reception-ios first, then run
`scripts/sync-ios-sdk [local-tag-or-commit]`. No argument pins the sibling HEAD.
The script uses local Git objects only. `scripts/check-ios-sdk` verifies every
vendored byte and detects added or removed files. Keep both podspecs autolinked;
Reception remains a separate module with its own resources and MIT license.

The vendor pin must be a released reception-ios tag (currently 1.7.1).
`vendor/ios-sdk.json` records the SDK-reported version, exact commit, base tag and
release tag. Release order for SDK changes: release and tag reception-ios first,
run `scripts/sync-ios-sdk <tag>`, verify the tarball, then release
react-native-reception. Never publish an npm release from an unreleased SDK pin.
These steps require an explicit release request.

## Android SDK

`android/build.gradle` depends on `sh.reception:reception` from Maven Central; never add
`mavenLocal()` there, and bump the dependency only to a released SDK version. To try an unreleased
SDK, publish it to Maven Local from a scratch copy of reception-android (never Gradle inside the SDK
repo while others build) and add `mavenLocal()` to the example's generated Android project for
that build only; never commit it.
How push coexists with expo-notifications is decided in the maintainers' notes, kept outside this
repository (`../reception-internal/react-native/`); `android/messaging-service.js` states the rule.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:native` (macOS with a booted iOS simulator),
`npm run test:android` (JDK 17, Android SDK, `npx expo prebuild --platform android` in example/),
`npm run check:ios`, and `npm pack`. Test the tarball in a fresh Expo app with prebuild, pod install and an
iOS simulator build without Podfile edits, and an Android build without Gradle or manifest edits.
Build the example's release APK with `-Pandroid.enableMinifyInReleaseBuilds=true` (R8) and confirm the
module's `Loopback` and testing code are absent from its mapping.
Focused tests cover validation, unsupported platforms, state, hooks, errors and
callback races. Verify actual chat and backend operations in the example app;
record commands and observed results. Build success does not prove runtime behavior.
Pass `npm run test:native -- <simulator UUID>` when more than one simulator is booted.

Bare RN 0.83.10 with Expo 55.0.31 passes `npx install-expo-modules --non-interactive`,
including pod install. The automatic installer does not recognize RN 0.86.3 / Expo 57
yet; that stack was verified with Expo’s manual installation. Set the app’s target
to iOS 17. For Expo 57 use `internal import Expo` in AppDelegate, matching its generated
module provider. Reception itself needs no additional Podfile changes.

Reload control (2026-10-13, Expo 57.0.28 / RN 0.86.3 / React 19.2.3): a fresh
app completed 30 `reloadAppAsync()` calls without Reception and 30 with it after a
live chat. The example also reloaded four times with pending availability checks.
The earlier intermittent hang did not reproduce. Its thread sample suggests a React
Native startup/animation teardown dependency cycle, but does not prove the cause.
Keep the reload button; if it recurs, capture both waiting threads before changing
teardown. Evidence: `verification/reload-sample.txt` and `verification/review2/`.

`configureForTesting` exists only in native Debug builds (Android: `src/debug`, with an empty
`src/release` twin), accepts loopback URLs (the emulator reaches the backend through
`adb reverse tcp:3000 tcp:<backend port>`),
and is deliberately absent from the package's TypeScript API. Only the example
accesses it via `requireNativeModule`. Release builds must not contain it.
Paywall checks fail closed after five seconds, on cancellation, and on JS teardown. On Android
React Native pauses JS timers while the SDK's chat activity is on top; a check that timed out
then runs again once the chat closes.

The optional Expo push entry owns routing on iOS; its presentation function never routes. On
Android the SDK owns receipt, presentation and taps through the app's one messaging service
chosen by `android/messaging-service.js` for both Gradle and the plugin (React Native Firebase's own; else
`ReceptionExpoMessagingService` from the module's manifest with expo-notifications; else the SDK's
`ReceptionMessagingService` from the plugin); the entry
only keeps the FCM token current.
Keep notification deduplication in native process state so JS reloads cannot replay
Expo's retained tap. Never clear Expo's shared last-response storage: another router
may own a newer notification. Registration never requests permission.

Superwall purchase verification uses a copied StoreKit catalog in a scratch app's
Xcode Run scheme. Resolve the catalog path in the scheme editor. A different bundle
ID enables Superwall's simulated test mode; set its `testModeBehavior` to `never` only
in the scratch fixture to exercise Apple's StoreKit test purchase instead. Load keys
from local environment/configuration; never commit or log them.

## Git

Small, focused commits. Never push, publish, change remotes, commit .env files, or
commit test App IDs. No version bump or release unless explicitly requested.
