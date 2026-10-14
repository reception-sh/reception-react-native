# Releases

Release only with the maintainer's explicit approval for each push, tag, GitHub
release and npm publish. Never include credentials or test App IDs in commits,
release assets or logs.

1. Pin a published Reception iOS tag with `scripts/sync-ios-sdk <tag>` if needed.
   Verify that `vendor/ios-sdk.json` names that release and its exact commit.
2. Update the package and lockfile with `npm version <version> --no-git-tag-version`.
   Refresh the example lockfile and date the changelog entry.
3. Run `npm run format`, `npm run typecheck`, `npm run lint`, `npm test`,
   `npm run test:native -- <simulator UUID>` and `npm run check:ios`.
4. Run `npm pack`, inspect every included file, and record the tarball's SHA-512.
   Install this exact tarball into a fresh Expo app. Add the config plugin, run
   prebuild and pod install, and build for an iOS simulator without Podfile edits.
   Check Android autolinking excludes Reception. Verify live chat and backend
   operations in the example; record runtime evidence separately from builds.
5. Commit the reviewed release changes. After approval, push the release commit.
6. After approval, create and push the annotated Git tag matching `package.json`
   exactly: `1.0.0`, never `v1.0.0`. The podspec uses this exact source tag;
   the project `.npmrc` also disables npm's default `v` prefix.
7. After approval, publish the GitHub release from that tag with the changelog notes.
8. Immediately before npm publication, check `npm whoami` and the registry again.
   For the first release, the package must still be unclaimed; a registry error
   other than a confirmed 404 does not establish availability. Verify the account's
   publishing access and complete its required 2FA flow without recording secrets.
9. After explicit npm approval, publish the tested tarball with
   `npm publish <tarball> --access public --tag latest`. Do not rebuild it between
   verification and publication. Check the published version, `latest` tag and
   registry integrity against the tested tarball, then install from npm in a clean
   consumer to confirm registry delivery.

If packaged files change after testing, pack and verify a new tarball before release.
Document unverified external delivery, physical-device checks and compatibility
limits explicitly. A successful simulator build does not prove APNs delivery.
