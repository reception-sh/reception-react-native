const {
  IOSConfig,
  withBaseMod,
  evalModsAsync,
} = require('expo/config-plugins');
jest.mock('node:fs/promises', () => ({ readFile: jest.fn() }));
const { readFile } = require('node:fs/promises');
const { withIosDeploymentTarget } = require(
  require('node:path').join(
    require('node:path').dirname(require.resolve('expo-build-properties')),
    'ios.js',
  ),
);
const withReception = require('../app.plugin');

async function deploymentTarget(
  order,
  target,
  identity = 'expo-build-properties',
) {
  const buildProperties = [identity, { ios: { deploymentTarget: target } }];
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
    finalized: {},
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
  readFile.mockImplementation(async () =>
    JSON.stringify(files.podfileProperties),
  );
  jest
    .spyOn(IOSConfig.XcodeUtils, 'getPbxproj')
    .mockReturnValue(files.xcodeproj);
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

afterEach(() => jest.restoreAllMocks());

test.each([
  ['reception', 'properties'],
  ['properties', 'reception'],
])(
  'recognizes resolved build-properties paths: %s, %s',
  async (first, second) => {
    const path = require.resolve('expo-build-properties/app.plugin.js');
    await expect(
      deploymentTarget([first, second], '16.4', path),
    ).rejects.toThrow('Reception requires iOS 17');
    expect(await deploymentTarget([first, second], '18.0', path)).toEqual({
      pods: '18.0',
      app: '18.0',
    });
  },
);

test('validates generated targets even when an unrecognized plugin overwrites them', async () => {
  await expect(
    deploymentTarget(['properties', 'reception'], '16.4', './custom-plugin'),
  ).rejects.toThrow('Reception requires iOS 17');
  expect(readFile).toHaveBeenCalled();
});

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

async function messagingServices(packages, previous = []) {
  const { mkdtempSync, mkdirSync, writeFileSync } = jest.requireActual('fs');
  const { join } = require('node:path');
  const projectRoot = mkdtempSync(
    join(require('node:os').tmpdir(), 'reception-plugin-'),
  );
  for (const name of packages) {
    mkdirSync(join(projectRoot, 'node_modules', name), { recursive: true });
    writeFileSync(join(projectRoot, 'node_modules', name, 'index.js'), '');
  }
  const files = {
    manifest: {
      manifest: {
        application: [
          {
            $: { 'android:name': '.MainApplication' },
            service: [
              { $: { 'android:name': 'com.example.Other' } },
              ...previous.map((name) => ({ $: { 'android:name': name } })),
            ],
          },
        ],
      },
    },
  };
  let config = withReception({ name: 'Test', slug: 'test' });
  config = withBaseMod(config, {
    platform: 'android',
    mod: 'manifest',
    isProvider: true,
    action: async (config) => {
      const result = await config.modRequest.nextMod({
        ...config,
        modResults: files.manifest,
      });
      files.manifest = result.modResults;
      return result;
    },
  });
  await evalModsAsync(config, { projectRoot, platforms: ['android'] });
  return files.manifest.manifest.application[0].service.map((service) => [
    service.$['android:name'],
    service['intent-filter']?.[0].$['android:priority'],
    service['intent-filter']?.[0].action[0].$['android:name'],
  ]);
}

test("declares nothing with expo-notifications, whose subclass the module's manifest declares", async () => {
  expect(
    await messagingServices(
      ['expo-notifications'],
      ['sh.reception.ReceptionMessagingService'],
    ),
  ).toEqual([['com.example.Other', undefined, undefined]]);
});

test("declares the SDK's service without expo-notifications", async () => {
  expect((await messagingServices([]))[1]).toEqual([
    'sh.reception.ReceptionMessagingService',
    '10',
    'com.google.firebase.MESSAGING_EVENT',
  ]);
});

test('replaces the entry an earlier prebuild left for the other setup', async () => {
  expect(
    await messagingServices(
      [],
      ['sh.reception.reactnative.ReceptionExpoMessagingService'],
    ),
  ).toEqual([
    ['com.example.Other', undefined, undefined],
    [
      'sh.reception.ReceptionMessagingService',
      '10',
      'com.google.firebase.MESSAGING_EVENT',
    ],
  ]);
});

test("leaves React Native Firebase's service alone", async () => {
  expect(await messagingServices(['@react-native-firebase/messaging'])).toEqual(
    [['com.example.Other', undefined, undefined]],
  );
});
