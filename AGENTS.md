# Rules for everyone who writes code here

Reception adds the official Swift support chat to React Native through Expo Modules.
Read the pinned Swift SDK's public API and the sibling reception-ios/AGENTS.md and
CONTRIBUTING.md before changing the native bridge. With backend access, read
reception/docs/SDK_SPEC.md. The Swift SDK owns chat UI, networking and storage.

## Style

Extremely clean, simple, safe at the boundaries. One file, one responsibility;
aim below 200 lines. No speculative API, dependencies, force unwraps, unsafe casts,
`any` in TypeScript, ignored type errors, or secrets in logs. Validate JS input;
never log identity, metadata, tokens, messages, or callback errors supplied by apps.
Run `npm run format` after edits; `npm run lint` checks Prettier formatting.
Use the public Swift API only. Keep all SDK access on the main actor. No Android
native code. Unsupported platforms warn once, never throw, and retain default state.

## Native SDK

Never edit vendor files. Commit SDK changes in reception-ios first, then run
`scripts/sync-ios-sdk [local-tag-or-commit]`. No argument pins the sibling HEAD.
The script uses local Git objects only. `scripts/check-ios-sdk` verifies every
vendored byte and detects added or removed files. Keep both podspecs autolinked;
Reception remains a separate module with its own resources and MIT license.

The current vendor pin is unreleased work on top of iOS 1.1.1, not the 1.1.1 tag.
`vendor/ios-sdk.json` records the SDK-reported version, exact commit, base tag and
release tag (null for unreleased sources). Release order: release and tag
reception-ios 1.1.2 first, run `scripts/sync-ios-sdk 1.1.2`, verify the tarball, then
release react-native-reception. Never publish an npm release from an unreleased
SDK pin. These steps require an explicit release request.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:native` (macOS with a booted iOS simulator), `npm run check:ios`, and
`npm pack`. Test the tarball in a fresh Expo app with prebuild, pod install and an
iOS simulator build without Podfile edits. Confirm Android autolinking excludes us.
Focused tests cover validation, unsupported platforms, state, hooks, errors and
callback races. Verify actual chat and backend operations in the example app;
record commands and observed results. Build success does not prove runtime behavior.
Pass `npm run test:native -- <simulator UUID>` when more than one simulator is booted.

Bare RN 0.83.10 with Expo 55.0.31 passes `npx install-expo-modules --non-interactive`,
including pod install. The automatic installer does not recognize RN 0.86.3 / Expo 57
yet; that stack was verified with Expo’s manual installation. Set the app’s target
to iOS 17. For Expo 57 use `internal import Expo` in AppDelegate, matching its generated
module provider. Reception itself needs no additional Podfile changes.

Reload check (2026-10-13, Expo 57.0.28 / RN 0.86.3 / React 19.2.3): a fresh
app with native animation and no Reception completed 30 `reloadAppAsync()` button
reloads; the same app with Reception completed 30 after a live chat. The example
also completed four reloads with pending availability callbacks, then restored its
filter. The previous intermittent hang did not reproduce in either case. Its saved
sample shows main-thread `RCTHost` startup waiting in `RCTTurboModuleManager`, while
`RCTNativeAnimatedTurboModule.invalidate` waits for a main-queue module notification.
That suggests an upstream dependency cycle but the control does not prove its cause.
Keep the reload button; capture both waiting threads if it recurs, before changing
teardown or applying a workaround. Local evidence: `verification/reload-sample.txt`
and `verification/review2/` (gitignored screenshots and command report).

`configureForTesting` exists only in native Debug builds, accepts loopback URLs,
and is deliberately absent from the package's TypeScript API. Only the example
accesses it via `requireNativeModule`. Release builds must not contain it.
Paywall checks fail closed after five seconds, on cancellation, and on JS teardown.

The optional Expo push entry owns routing; its presentation function never routes.
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
