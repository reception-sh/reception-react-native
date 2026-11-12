// The one rule for which FCM messaging service receives Reception's replies. app.plugin.js
// requires it and android/build.gradle runs it, so the app's manifest and the module's always make the same choice:
// - 'none': @react-native-firebase/messaging resolves. Its service stays; that host calls Reception.handlePushMessage
//   from a subclass of it (README).
// - 'expo': expo-notifications resolves and Expo autolinking links it on Android. The module compiles and declares
//   ReceptionExpoMessagingService, its subclass of Expo's service.
// - 'sdk': otherwise. The config plugin declares the SDK's sh.reception.ReceptionMessagingService. When
//   expo-notifications resolves but is not linked (expo.autolinking.exclude), with a warning.
// Command line (build.gradle): node messaging-service.js <projectRoot> <true|false: Gradle linked expo-notifications>
const childProcess = require('node:child_process');

const EXPO_NOTIFICATIONS = 'expo-notifications';
const REACT_NATIVE_FIREBASE = '@react-native-firebase/messaging';
const NOT_LINKED =
  "expo-notifications is installed but Expo autolinking does not link it on Android (expo.autolinking.exclude?), so Reception uses the SDK's ReceptionMessagingService; the app then needs com.google.firebase:firebase-messaging.";

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

// Expo's resolved Android autolinking, computed as its Gradle settings plugin does (honours expo.autolinking.exclude).
function linkedByExpoAutolinking(projectRoot) {
  const output = childProcess.execFileSync(
    process.execPath,
    [
      '--no-warnings',
      '--eval',
      "require('expo/bin/autolinking')",
      'expo-modules-autolinking',
      'resolve',
      '--platform',
      'android',
      '--json',
    ],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  );
  return JSON.parse(output).modules.some(
    (module) => module.packageName === EXPO_NOTIFICATIONS,
  );
}

// `expoNotificationsLinked` is Gradle's own autolinking result; without it (the config plugin) Expo's autolinking is
// asked the same question.
function selectMessagingService(projectRoot, expoNotificationsLinked) {
  if (resolves(REACT_NATIVE_FIREBASE, projectRoot)) return { service: 'none' };
  if (!resolves(EXPO_NOTIFICATIONS, projectRoot)) return { service: 'sdk' };
  const linked =
    expoNotificationsLinked ?? linkedByExpoAutolinking(projectRoot);
  return linked ? { service: 'expo' } : { service: 'sdk', warning: NOT_LINKED };
}

module.exports = { selectMessagingService };

if (require.main === module) {
  const [projectRoot, linked] = process.argv.slice(2);
  const selection = selectMessagingService(
    projectRoot,
    linked === undefined ? undefined : linked === 'true',
  );
  process.stdout.write(JSON.stringify(selection));
}
