# Development example

From this directory, run `npm install`. Add an ignored `.env.local` file containing
`EXPO_PUBLIC_RECEPTION_APP_ID=app_...` from a local Reception dashboard. Start the
backend on port 3000, then run:

```sh
npx expo prebuild --platform ios
npx expo run:ios --device 'iPhone 17 Pro'
```

This is a development build, not Expo Go. Press Configure, then use the controls to
exercise the public API. Debug builds alone access `configureForTesting` through
`requireNativeModule` to connect to localhost. The method is absent from Release
binaries and the package's TypeScript surface. Never add backend URL configuration
to the customer API.

Use the Expo development menu's Reload command to test JS teardown and reconnection.
The hanging availability control intentionally returns a promise that never settles;
native requests fail closed after five seconds. Restore availability enables `plans`.
The example does not make a purchase when its paywall callback fires.

The Metro configuration shares the app's React and Expo runtimes with the symlinked
local package. A normal tarball/npm installation does not need this configuration.
