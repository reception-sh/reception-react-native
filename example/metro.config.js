const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '..')];
// The linked package's dev dependencies must not create a second React/Expo runtime.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const shared = /^(react|react-native|expo|expo-modules-core)(\/|$)/.test(
    moduleName,
  );
  return context.resolveRequest(
    shared ? { ...context, originModulePath: __filename } : context,
    moduleName,
    platform,
  );
};
module.exports = config;
