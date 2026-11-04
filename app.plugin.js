const {
  AndroidConfig,
  IOSConfig,
  WarningAggregator,
  withAndroidManifest,
  withFinalizedMod,
  withPodfileProperties,
  withXcodeProject,
} = require('expo/config-plugins');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');
const { selectMessagingService } = require('./android/messaging-service');

function requireIOS17(target) {
  if (!(Number.parseFloat(String(target).replaceAll('"', '')) >= 17)) {
    throw new Error(
      'Reception requires iOS 17 or later. Set expo-build-properties ios.deploymentTarget to "17.0" or higher, then run npx expo prebuild --platform ios.',
    );
  }
}

// The SDK's messaging service, declared in the app when messaging-service.js selects it. With expo-notifications the
// module's own manifest declares Reception's subclass of Expo's service; React Native Firebase keeps its own service.
const SDK_SERVICE = 'sh.reception.ReceptionMessagingService';
// Prebuild without --clean keeps entries of earlier runs, which may name a class that is no longer built.
const SERVICES = [
  'sh.reception.reactnative.ReceptionExpoMessagingService',
  SDK_SERVICE,
];

function withReceptionMessagingService(config) {
  return withAndroidManifest(config, (config) => {
    const { service, warning } = selectMessagingService(
      config.modRequest.projectRoot,
    );
    if (warning)
      WarningAggregator.addWarningAndroid('react-native-reception', warning);
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    application.service = (application.service ?? []).filter(
      (entry) => !SERVICES.includes(entry.$['android:name']),
    );
    if (service !== 'sdk') return config;
    application.service.push({
      $: { 'android:name': SDK_SERVICE, 'android:exported': 'false' },
      'intent-filter': [
        {
          $: { 'android:priority': '10' },
          action: [
            { $: { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } },
          ],
        },
      ],
    });
    return config;
  });
}

module.exports = function withReception(config) {
  config = withReceptionMessagingService(config);
  for (const plugin of config.plugins ?? []) {
    if (
      !Array.isArray(plugin) ||
      typeof plugin[0] !== 'string' ||
      !/(^|[/\\])expo-build-properties([/\\]|$)/.test(plugin[0])
    )
      continue;
    const target = plugin[1]?.ios?.deploymentTarget;
    if (target) requireIOS17(target);
  }
  config = withPodfileProperties(config, (config) => {
    const current = config.modResults['ios.deploymentTarget'];
    if (!current || Number.parseFloat(current) < 17) {
      config.modResults['ios.deploymentTarget'] = '17.0';
    }
    return config;
  });
  config = withXcodeProject(config, (config) => {
    const configurations = config.modResults.pbxXCBuildConfigurationSection();
    for (const entry of Object.values(configurations)) {
      if (typeof entry !== 'object' || !entry.buildSettings) continue;
      const settings = entry.buildSettings;
      if (
        settings.IPHONEOS_DEPLOYMENT_TARGET &&
        Number.parseFloat(
          settings.IPHONEOS_DEPLOYMENT_TARGET.replaceAll('"', ''),
        ) < 17
      ) {
        settings.IPHONEOS_DEPLOYMENT_TARGET = '17.0';
      }
    }
    return config;
  });
  // Other plugins can overwrite either target after our mods run.
  return withFinalizedMod(config, [
    'ios',
    async (config) => {
      const { projectRoot, platformProjectRoot } = config.modRequest;
      const properties = JSON.parse(
        await readFile(
          join(platformProjectRoot, 'Podfile.properties.json'),
          'utf8',
        ),
      );
      requireIOS17(properties['ios.deploymentTarget']);
      const project = IOSConfig.XcodeUtils.getPbxproj(projectRoot);
      for (const entry of Object.values(
        project.pbxXCBuildConfigurationSection(),
      )) {
        const target = entry?.buildSettings?.IPHONEOS_DEPLOYMENT_TARGET;
        if (target) requireIOS17(target);
      }
      return config;
    },
  ]);
};
