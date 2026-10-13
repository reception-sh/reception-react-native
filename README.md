# Reception for React Native

Native in-app support chat, with replies managed in the Reception dashboard.
The chat runs entirely in the official Reception iOS SDK.

Requires iOS 17+, Xcode 26, and Expo Modules. Use a development build; Expo Go is
unsupported. Android and web calls do nothing, warn once, and return default state.

## Setup

```sh
npx expo install react-native-reception
```

Add `"react-native-reception"` to `expo.plugins` in your app config, then build with
`npx expo run:ios`. The plugin sets the minimum iOS version to 17; no Podfile edits
or `use_frameworks!` are needed. Existing bare React Native apps need Expo Modules
installed and an iOS 17 deployment target.

Configure during startup, before showing support:

```typescript
import { Reception } from 'react-native-reception';

await Reception.configure({ appId: 'app_YOUR_APP_ID' });
await Reception.openChat();
```

Methods return promises so native work runs on the main queue. Await configuration
before reading `isConfigured`. State and setting getters update from native snapshots;
a JS reload restores them asynchronously. Assign complete appearance objects, not
nested properties. Callback assignments replace the previous callback; use `null`
to remove one.

```typescript
Reception.appearance = { accentColor: '#8A2BE2', showsCloseButton: true };
Reception.onPaywall = (id) => showYourPaywall(id);
Reception.paywalls = [{ id: 'plans', title: 'Plans' }];
Reception.paywallAvailability = async (id) => canShowYourPaywall(id);
```

Paywall checks fail closed after five seconds or a JS reload. Register callbacks again
at startup. `availablePaywalls` updates asynchronously; observe it with
`addAvailablePaywallsListener`. Colors accept `#RRGGBB` or `#RRGGBBAA`. Image options
use names from the host iOS asset catalog. Invalid appearance fields log and retain
the previous field; omitted fields restore Swift defaults. Published dashboard
appearance takes precedence unless `usesRemoteAppearance` is false.

See the [React Native guide](https://reception.sh/docs/react-native) for identity,
push, unread hooks, paywalls, and embedded chat. The bundled Swift SDK version is
available as `Reception.version`. License: MIT.
