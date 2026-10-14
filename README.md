# Reception for React Native

Native support chat, with replies managed in the Reception dashboard.
The chat runs entirely in the official Reception iOS SDK.

Requires Expo SDK 54+ (verified 54–57), React Native 0.81+, React 19.1+,
iOS 17+, and Xcode 26. Use the React Native and React versions selected by Expo.
Use a development build; Expo Go cannot load the native SDK.

## 1. Install

```sh
npx expo install react-native-reception
```

Add `"react-native-reception"` to `expo.plugins` in your app config. Apply plugins
even if a generated `ios/` directory already exists, then build:

```sh
npx expo prebuild --platform ios
npx expo run:ios
```

The plugin sets iOS 17 as the minimum. If you use `expo-build-properties`, set its
`ios.deploymentTarget` to `17.0` or higher too. No Podfile edits or `use_frameworks!`
are needed for generated projects.

## 2. Configure

Configure once in your existing startup, before showing Support:

```typescript
import { Reception } from 'react-native-reception';

await Reception.configure({ appId: 'app_YOUR_APP_ID' });
```

## 3. Open chat

Call this from your app’s Support button:

```typescript
await Reception.openChat();
```

Follow the [React Native guide](https://reception.sh/docs/react-native) to match your
app’s theme, add unread badges, identify customers, and connect paywalls or embedded chat.

## Push

Install `expo-notifications`, add its plugin, apply prebuild and rebuild. After
Reception is configured, start the optional helper in your root component:

```typescript
import { startReceptionPush } from 'react-native-reception/expo-notifications';
useEffect(() => startReceptionPush(), []);
```

Import `useEffect` from React. The helper registers when already authorized and routes
receipts and taps, including cold starts. It never requests permission. Compose
`receptionNotificationBehavior(notification)` into your existing notification handler;
see the [push setup](https://reception.sh/docs/react-native#push). The main package
import does not load `expo-notifications`.

## Compatibility

Android and web have no Reception native code. Calls do nothing, warn once, and
return default state.

For native projects you maintain by hand, follow the guide’s manual target and
capability steps instead of prebuild. Bare React Native needs
[Expo Modules](https://docs.expo.dev/bare/installing-expo-modules/).
`npx install-expo-modules` was verified on RN 0.83.10 with Expo 55. For newer stacks
the installer does not recognize yet, follow Expo’s manual installation guide.

Verified with fresh iOS development builds and live message/reply delivery:

| Expo    | React Native | React  |
| ------- | ------------ | ------ |
| 54.0.37 | 0.81.5       | 19.1.0 |
| 55.0.31 | 0.83.10      | 19.2.0 |
| 56.0.23 | 0.85.3       | 19.2.3 |
| 57.0.28 | 0.86.3       | 19.2.3 |

License: MIT.
