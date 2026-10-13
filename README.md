# Reception for React Native

Native in-app support chat, with replies managed in the Reception dashboard.
The chat runs entirely in the official Reception iOS SDK.

Requires Expo SDK 54+ (verified 54–57), React Native 0.81+, and React 19.1+.
Use the versions selected by your Expo SDK.

Verified with fresh iOS development builds and live message/reply delivery:

| Expo    | React Native | React  |
| ------- | ------------ | ------ |
| 54.0.37 | 0.81.5       | 19.1.0 |
| 55.0.31 | 0.83.10      | 19.2.0 |
| 56.0.23 | 0.85.3       | 19.2.3 |
| 57.0.28 | 0.86.3       | 19.2.3 |

Requires iOS 17+, Xcode 26, and Expo Modules. Use a development build; Expo Go is
unsupported. Android and web calls do nothing, warn once, and return default state.

## Setup

```sh
npx expo install react-native-reception
```

Add `"react-native-reception"` to `expo.plugins` in your app config. For generated native
projects, apply plugins even if `ios/` exists, then build:

```sh
npx expo prebuild --platform ios
npx expo run:ios
```

The plugin sets iOS 17 as the minimum. If you use `expo-build-properties`, its
`ios.deploymentTarget` must also be `17.0` or higher; conflicting values produce a
clear error. No Podfile edits or `use_frameworks!` are needed for generated projects.
For maintained native projects, set iOS 17+ in Xcode and the existing CocoaPods
deployment-target configuration, run `pod install`, and rebuild. Existing bare React Native apps need
[Expo Modules installed](https://docs.expo.dev/bare/installing-expo-modules/) and
an iOS 17 deployment target. `npx install-expo-modules` was verified on React Native
0.83.10 with Expo 55. For newer stacks the installer does not recognize yet, follow
Expo’s manual installation guide.

Configure during startup, before showing support:

```typescript
import { Reception } from 'react-native-reception';

await Reception.configure({ appId: 'app_YOUR_APP_ID' });
await Reception.openChat();
```

Methods return promises so native work runs on the main queue. Await configuration
before reading `isConfigured`. Setting getters reflect valid assignments immediately; native validation may
then reconcile them. Live state updates from native snapshots, and a JavaScript
reload restores state asynchronously. Assign complete appearance objects, not
nested properties. Callback assignments replace the previous callback; use `null`
to remove one.

```typescript
Reception.appearance = {
  accentColor: { light: '#8A2BE2', dark: '#C89FFF' },
  showsCloseButton: true,
};
Reception.onPaywall = (id) => showYourPaywall(id);
Reception.paywalls = [{ id: 'plans', title: 'Plans' }];
Reception.paywallAvailability = async (id) => canShowYourPaywall(id);
```

Paywall checks fail closed after five seconds or a JS reload. Register callbacks again
at startup. `availablePaywalls` updates asynchronously; observe it with
`addAvailablePaywallsListener`. Each color accepts `#RRGGBB`, `#RRGGBBAA`, or a `{ light, dark }` pair of
those hex strings. Pairs follow the native color scheme without JavaScript updates. Image options
use names from the host iOS asset catalog. Invalid appearance fields log and retain
the previous field; omitted fields restore Swift defaults. Published dashboard
appearance takes precedence unless `usesRemoteAppearance` is false.

For push, install `expo-notifications`, add its plugin, apply prebuild and rebuild
(or add the Push Notifications capability/entitlement in a maintained native project).
After Reception is configured, start the optional helper in your root component:

```typescript
import { startReceptionPush } from 'react-native-reception/expo-notifications';
useEffect(() => startReceptionPush(), []);
```

Import `useEffect` from React. The helper never prompts for permission. It handles
APNs registration, session resets, foreground receipt and taps, including cold starts.
Compose `receptionNotificationBehavior(notification)` from the same subpath into
your existing notification handler; `null` leaves other notifications to your policy.
The main entry never loads `expo-notifications`. See the guide for the complete setup.

See the [React Native guide](https://reception.sh/docs/react-native) for identity,
push, unread hooks, paywalls, and embedded chat. The bundled Swift SDK version is
available as `Reception.version`. License: MIT.
