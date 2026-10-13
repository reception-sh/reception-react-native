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
Use the public Swift API only. Keep all SDK access on the main actor. No Android
native code. Unsupported platforms warn once, never throw, and retain default state.

## Native SDK

Never edit vendor files. Commit SDK changes in reception-ios first, then run
`scripts/sync-ios-sdk [local-tag-or-commit]`. No argument pins the sibling HEAD.
The script uses local Git objects only. `scripts/check-ios-sdk` verifies every
vendored byte and detects added or removed files. Keep both podspecs autolinked;
Reception remains a separate module with its own resources and MIT license.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:native` (macOS), `npm run check:ios`, and
`npm pack`. Test the tarball in a fresh Expo app with prebuild, pod install and an
iOS simulator build without Podfile edits. Confirm Android autolinking excludes us.
Focused tests cover validation, unsupported platforms, state, hooks, errors and
callback races. Verify actual chat and backend operations in the example app;
record commands and observed results. Build success does not prove runtime behavior.

`configureForTesting` exists only in native Debug builds, accepts loopback URLs,
and is deliberately absent from the package's TypeScript API. Only the example
accesses it via `requireNativeModule`. Release builds must not contain it.
Paywall checks fail closed after five seconds, on cancellation, and on JS teardown.

## Git

Small, focused commits. Never push, publish, change remotes, commit .env files, or
commit test App IDs. No version bump or release unless explicitly requested.
