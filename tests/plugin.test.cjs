const { withBaseMod, evalModsAsync } = require('expo/config-plugins');
const { withIosDeploymentTarget } = require(
  require('node:path').join(
    require('node:path').dirname(require.resolve('expo-build-properties')),
    'ios.js',
  ),
);
const withReception = require('../app.plugin');

async function deploymentTarget(order, target) {
  const buildProperties = [
    'expo-build-properties',
    { ios: { deploymentTarget: target } },
  ];
  let config = {
    name: 'Test',
    slug: 'test',
    plugins: order.map((name) =>
      name === 'reception' ? 'react-native-reception' : buildProperties,
    ),
  };
  for (const name of order) {
    config =
      name === 'reception'
        ? withReception(config)
        : withIosDeploymentTarget(config, buildProperties[1]);
  }
  // Use Expo's real mod chain with in-memory providers for the two generated native files.
  const configurations = {
    debug: {
      isa: 'XCBuildConfiguration',
      buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: '15.1' },
    },
  };
  const files = {
    podfileProperties: {},
    xcodeproj: {
      pbxXCBuildConfigurationSection: () => configurations,
      pbxNativeTargetSection: () => ({
        app: {
          productType: 'com.apple.product-type.application',
          buildConfigurationList: 'configurations',
        },
      }),
      pbxXCConfigurationList: () => ({
        configurations: { buildConfigurations: [{ value: 'debug' }] },
      }),
    },
  };
  for (const [mod, contents] of Object.entries(files)) {
    config = withBaseMod(config, {
      platform: 'ios',
      mod,
      isProvider: true,
      action: async (config) => {
        const result = await config.modRequest.nextMod({
          ...config,
          modResults: contents,
        });
        files[mod] = result.modResults;
        return result;
      },
    });
  }
  await evalModsAsync(config, {
    projectRoot: process.cwd(),
    platforms: ['ios'],
  });
  return {
    pods: files.podfileProperties['ios.deploymentTarget'],
    app: configurations.debug.buildSettings.IPHONEOS_DEPLOYMENT_TARGET,
  };
}

test.each([
  ['reception', 'properties'],
  ['properties', 'reception'],
])(
  'rejects an incompatible target regardless of order: %s, %s',
  async (first, second) => {
    await expect(deploymentTarget([first, second], '15.1')).rejects.toThrow(
      'Set expo-build-properties ios.deploymentTarget to "17.0" or higher',
    );
  },
);

test.each([
  ['reception', 'properties'],
  ['properties', 'reception'],
])(
  'preserves compatible targets regardless of order: %s, %s',
  async (first, second) => {
    expect(await deploymentTarget([first, second], '17.0')).toEqual({
      pods: '17.0',
      app: '17.0',
    });
    expect(await deploymentTarget([first, second], '18.0')).toEqual({
      pods: '18.0',
      app: '18.0',
    });
  },
);

test('raises generated native targets without build-properties', async () => {
  expect(await deploymentTarget(['reception'])).toEqual({
    pods: '17.0',
    app: '17.0',
  });
});
