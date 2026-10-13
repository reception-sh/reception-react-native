const {
  withPodfileProperties,
  withXcodeProject,
} = require('expo/config-plugins');

module.exports = function withReception(config) {
  config = withPodfileProperties(config, (config) => {
    const current = config.modResults['ios.deploymentTarget'];
    if (!current || Number.parseFloat(current) < 17) {
      config.modResults['ios.deploymentTarget'] = '17.0';
    }
    return config;
  });
  return withXcodeProject(config, (config) => {
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
};
