const {
  IOSConfig,
  WarningAggregator,
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

// A project whose node_modules hold these packages. With expo-notifications, it and expo are the real ones, so Expo
// autolinking resolves the project as it would an app; `excluded` goes to expo.autolinking.exclude.
function projectWith(packages, excluded = []) {
  const { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } =
    jest.requireActual('fs');
  const { dirname, join } = require('node:path');
  const projectRoot = mkdtempSync(
    join(require('node:os').tmpdir(), 'reception-plugin-'),
  );
  const modules = join(projectRoot, 'node_modules');
  const real = packages.includes('expo-notifications')
    ? ['expo', 'expo-notifications']
    : [];
  for (const name of packages.filter((name) => !real.includes(name))) {
    mkdirSync(join(modules, name), { recursive: true });
    writeFileSync(join(modules, name, 'index.js'), '');
  }
  for (const name of real) {
    mkdirSync(modules, { recursive: true });
    symlinkSync(
      dirname(require.resolve(`${name}/package.json`)),
      join(modules, name),
    );
  }
  writeFileSync(
    join(projectRoot, 'package.json'),
    JSON.stringify({
      name: 'test',
      dependencies: Object.fromEntries(real.map((name) => [name, '*'])),
      expo: { autolinking: { exclude: excluded } },
    }),
  );
  return projectRoot;
}

async function messagingServices(packages, previous = [], excluded = []) {
  const projectRoot = projectWith(packages, excluded);
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

const EXPO_SUBCLASS = 'sh.reception.reactnative.ReceptionExpoMessagingService';
const SDK_SERVICE = 'sh.reception.ReceptionMessagingService';
const FIREBASE = '@react-native-firebase/messaging';

const NOT_LINKED = expect.stringContaining(
  'expo-notifications is installed but Expo autolinking does not link it',
);

test.each([
  [[FIREBASE, 'expo-notifications'], [], { service: 'none' }],
  [[FIREBASE], [], { service: 'none' }],
  [['expo-notifications'], [], { service: 'expo' }],
  [
    ['expo-notifications'],
    ['expo-notifications'],
    { service: 'sdk', warning: NOT_LINKED },
  ],
  [[], [], { service: 'sdk' }],
])(
  'the plugin and Gradle make one choice with %j, excluding %j',
  async (packages, excluded, selection) => {
    const warn = jest
      .spyOn(WarningAggregator, 'addWarningAndroid')
      .mockImplementation(() => {});
    const declared = await messagingServices(
      packages,
      [EXPO_SUBCLASS, SDK_SERVICE],
      excluded,
    );
    expect(declared.slice(1).map(([name]) => name)).toEqual(
      selection.service === 'sdk' ? [SDK_SERVICE] : [],
    );
    expect(warn.mock.calls).toEqual(
      selection.warning ? [['react-native-reception', NOT_LINKED]] : [],
    );
    // build.gradle runs the same rule with its own autolinking result and compiles the Expo subclass only for 'expo'.
    const linked =
      packages.includes('expo-notifications') &&
      !excluded.includes('expo-notifications');
    const output = require('node:child_process').execFileSync(
      process.execPath,
      [
        require('node:path').join(__dirname, '../android/messaging-service.js'),
        projectWith(packages, excluded),
        String(linked),
      ],
      { encoding: 'utf8' },
    );
    expect(JSON.parse(output)).toEqual(selection);
  },
);
