import { initial, mockNative } from './mockNative';
import type { Snapshot } from '../src/NativeReception';

let mock: ReturnType<typeof mockNative>;
let Reception: typeof import('../src/Reception').Reception;
function deferred() {
  let resolve: (value: Snapshot) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<Snapshot>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
beforeEach(async () => {
  jest.resetModules();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mock = mockNative();
  jest.doMock('expo', () => ({
    requireOptionalNativeModule: () => mock.native,
  }));
  ({ Reception } = await import('../src/Reception'));
});
afterEach(() => jest.restoreAllMocks());

test('all setting getters reflect assignment before native answers', () => {
  for (const setter of [
    mock.native.setAppearance,
    mock.native.setLanguageOverride,
    mock.native.setUpdatesAppBadge,
    mock.native.setLogLevel,
    mock.native.setPaywalls,
    mock.native.setUsesRemoteAppearance,
  ]) {
    setter.mockReturnValue(new Promise<Snapshot>(() => {}));
  }
  Reception.appearance = { accentColor: '#112233' };
  Reception.languageOverride = 'de';
  Reception.updatesAppBadge = false;
  Reception.logLevel = 'debug';
  Reception.paywalls = [{ id: 'plans', title: 'Plans' }];
  Reception.usesRemoteAppearance = false;
  expect(Reception.appearance).toEqual({ accentColor: '#112233' });
  expect(Reception.languageOverride).toBe('de');
  expect(Reception.updatesAppBadge).toBe(false);
  expect(Reception.logLevel).toBe('debug');
  expect(Reception.paywalls).toEqual([{ id: 'plans', title: 'Plans' }]);
  expect(Reception.usesRemoteAppearance).toBe(false);
});

test('events and an earlier response cannot overwrite a pending newer assignment', async () => {
  const first = deferred();
  const second = deferred();
  mock.native.setAppearance
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  Reception.appearance = { title: 'First' };
  Reception.appearance = { title: 'Second', fontFamily: 'Missing' };
  await mock.emit('onState', { ...initial, revision: 10, unreadCount: 3 });
  expect(Reception.unreadCount).toBe(3);
  expect(Reception.appearance.title).toBe('Second');
  first.resolve({
    ...initial,
    revision: 11,
    settingRevisions: { appearance: 1 },
    appearance: { title: 'First' },
  });
  await flush();
  expect(Reception.appearance).toEqual({
    title: 'Second',
    fontFamily: 'Missing',
  });
  second.resolve({
    ...initial,
    revision: 12,
    settingRevisions: { appearance: 2 },
    appearance: { title: 'Second' },
  });
  await flush();
  expect(Reception.appearance).toEqual({ title: 'Second' });
});

test('out-of-order responses keep the latest acknowledged value', async () => {
  const first = deferred();
  const second = deferred();
  mock.native.setLanguageOverride
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  Reception.languageOverride = 'de';
  Reception.languageOverride = 'fr';
  second.resolve({
    ...initial,
    revision: 12,
    settingRevisions: { languageOverride: 2 },
    languageOverride: 'fr',
  });
  await flush();
  first.resolve({
    ...initial,
    revision: 11,
    settingRevisions: { languageOverride: 1 },
    languageOverride: 'de',
  });
  await flush();
  expect(Reception.languageOverride).toBe('fr');
});

test('settings reconcile independently when another property is still pending', async () => {
  const appearance = deferred();
  const language = deferred();
  mock.native.setAppearance.mockReturnValueOnce(appearance.promise);
  mock.native.setLanguageOverride.mockReturnValueOnce(language.promise);
  Reception.appearance = { fontFamily: 'Missing' };
  Reception.languageOverride = 'de';
  appearance.resolve({
    ...initial,
    revision: 10,
    settingRevisions: { appearance: 1 },
    appearance: {},
  });
  await flush();
  expect(Reception.appearance).toEqual({});
  expect(Reception.languageOverride).toBe('de');
});

test('failure restores confirmed state but cannot discard a newer assignment', async () => {
  const first = deferred();
  const second = deferred();
  mock.native.setLogLevel
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  Reception.logLevel = 'debug';
  Reception.logLevel = 'off';
  first.reject(new Error('private native diagnostic'));
  await flush();
  expect(Reception.logLevel).toBe('off');
  second.reject(new Error('private native diagnostic'));
  await flush();
  expect(Reception.logLevel).toBe('info');
  expect(JSON.stringify(jest.mocked(console.warn).mock.calls)).not.toContain(
    'private native diagnostic',
  );
});
