// The one rule for which FCM messaging service receives Reception's replies (see ANDROID-PUSH-DESIGN.md). app.plugin.js
// requires it and android/build.gradle runs it, so the app's manifest and the module's always make the same choice:
// - 'none': @react-native-firebase/messaging resolves. Its service stays; that host calls Reception.handlePushMessage
//   from a subclass of it (README).
// - 'expo': expo-notifications resolves. The module compiles and declares ReceptionExpoMessagingService, its subclass
//   of Expo's service.
// - 'sdk': otherwise. The config plugin declares the SDK's sh.reception.ReceptionMessagingService.
// Command line (build.gradle): node messaging-service.js <projectRoot>
const EXPO_NOTIFICATIONS = 'expo-notifications';
const REACT_NATIVE_FIREBASE = '@react-native-firebase/messaging';

function resolves(name, projectRoot) {
  for (const request of [`${name}/package.json`, name]) {
    try {
      require.resolve(request, { paths: [projectRoot] });
      return true;
    } catch {
      // Packages may export neither path; try the next.
    }
  }
  return false;
}

function selectMessagingService(projectRoot) {
  if (resolves(REACT_NATIVE_FIREBASE, projectRoot)) return { service: 'none' };
  if (resolves(EXPO_NOTIFICATIONS, projectRoot)) return { service: 'expo' };
  return { service: 'sdk' };
}

module.exports = { selectMessagingService };

if (require.main === module) {
  process.stdout.write(JSON.stringify(selectMessagingService(process.argv[2])));
}
