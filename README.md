# Reception for React Native

Native in-app support chat, with replies managed in the Reception dashboard.
The chat runs entirely in the official Reception iOS SDK.

Supports Expo SDK 55–57 with their default React Native and React versions.
Peer ranges allow Expo `>=55 <58`, React Native `>=0.83 <0.87`, and React `>=19.2 <20`.
Use the versions selected by your Expo SDK.

Verified with fresh iOS development builds and live message/reply delivery:

| Expo    | React Native | React  |
| ------- | ------------ | ------ |
| 55.0.31 | 0.83.10      | 19.2.0 |
| 56.0.23 | 0.85.3       | 19.2.3 |
| 57.0.28 | 0.86.3       | 19.2.3 |

Requires iOS 17+, Xcode 26, and Expo Modules. Use a development build; Expo Go is
unsupported. Android and web calls do nothing, warn once, and return default state.

## Setup

```sh
npx expo install react-native-reception
```

Add `"react-native-reception"` to `expo.plugins` in your app config, then build with
`npx expo run:ios`. The plugin sets the minimum iOS version to 17; no Podfile edits
or `use_frameworks!` are needed. Existing bare React Native apps need
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

See the [React Native guide](https://reception.sh/docs/react-native) for identity,
push, unread hooks, paywalls, and embedded chat. The bundled Swift SDK version is
available as `Reception.version`. License: MIT.
