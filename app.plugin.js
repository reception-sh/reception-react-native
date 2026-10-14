const {
  IOSConfig,
  withFinalizedMod,
  withPodfileProperties,
  withXcodeProject,
} = require('expo/config-plugins');
const { readFile } = require('node:fs/promises');
const { join } = require('node:path');

function requireIOS17(target) {
  if (!(Number.parseFloat(String(target).replaceAll('"', '')) >= 17)) {
    throw new Error(
      'Reception requires iOS 17 or later. Set expo-build-properties ios.deploymentTarget to "17.0" or higher, then run npx expo prebuild --platform ios.',
    );
  }
}

module.exports = function withReception(config) {
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
