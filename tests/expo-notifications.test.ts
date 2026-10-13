import { mockNative, initial } from './mockNative';
import { notificationsMock, notification } from './notificationsMock';
import type { NotificationResponse } from 'expo-notifications';

let push: ReturnType<typeof notificationsMock>;
let mock: ReturnType<typeof mockNative>;
let helper: typeof import('../src/expo-notifications');
let Reception: typeof import('../src/Reception').Reception;
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

async function load(platform = 'ios') {
  jest.resetModules();
  push = notificationsMock();
  mock = mockNative();
  jest.doMock('react-native', () => ({
    Platform: { OS: platform },
    AppState: {
      addEventListener: (_: string, listener: (value: string) => void) =>
        push.appState.add(listener),
    },
  }));
  jest.doMock('expo', () => ({
    requireOptionalNativeModule: () => mock.native,
  }));
  jest.doMock('expo-notifications', () => push.api);
  helper = await import('../src/expo-notifications');
  ({ Reception } = await import('../src/Reception'));
}

beforeEach(async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  await load();
});
afterEach(() => {
  jest.restoreAllMocks();
});

test('registration uses raw APNs at startup, foreground, token changes and session resets', async () => {
  const stop = helper.startReceptionPush();
  await flush();
  expect(mock.native.setPushToken).toHaveBeenLastCalledWith(
    'aabb',
    'automatic',
  );
  push.appState.emit('active');
  await flush();
  push.token.emit({ type: 'ios', data: 'CCDD' });
  await flush();
  expect(mock.native.setPushToken).toHaveBeenLastCalledWith(
    'ccdd',
    'automatic',
  );
  await Reception.logout();
  await flush();
  await Reception.deleteData();
  await flush();
  expect(mock.native.setPushToken).toHaveBeenCalledTimes(5);
  expect(push.api.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(push.api.setNotificationHandler).not.toHaveBeenCalled();
  stop();
  push.appState.emit('active');
  await Reception.logout();
  await flush();
  expect(mock.native.setPushToken).toHaveBeenCalledTimes(5);
});

test.each([0, 1, 3, 4])(
  'registration respects current iOS permission %s',
  async (status) => {
    push.api.getPermissionsAsync.mockResolvedValue({
      granted: false,
      ios: { status },
    });
    const stop = helper.startReceptionPush();
    await flush();
    expect(mock.native.setPushToken).toHaveBeenCalledTimes(status >= 3 ? 1 : 0);
    push.token.emit({ type: 'ios', data: 'CCDD' });
    await flush();
    expect(mock.native.setPushToken).toHaveBeenCalledTimes(status >= 3 ? 2 : 0);
    stop();
  },
);

test('cleanup cancels outstanding work and never clears a newer unrelated response', async () => {
  let finishResponse: ((value: NotificationResponse) => void) | undefined;
  let finishPermission:
    | ((value: { granted: boolean; ios: { status: number } }) => void)
    | undefined;
  push.api.getLastNotificationResponseAsync.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishResponse = resolve;
      }),
  );
  push.api.getPermissionsAsync.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishPermission = resolve;
      }),
  );
  const stop = helper.startReceptionPush();
  stop();
  push.response.emit({
    actionIdentifier: 'default',
    notification: notification('other', {}),
  });
  finishResponse?.({
    actionIdentifier: 'default',
    notification: notification(),
  });
  finishPermission?.({ granted: true, ios: { status: 2 } });
  await flush();
  expect(mock.native.setPushToken).not.toHaveBeenCalled();
  expect(mock.native.handleExpoNotification).not.toHaveBeenCalled();
  expect(push.api.clearLastNotificationResponseAsync).not.toHaveBeenCalled();
});

test('presentation composes without routing; receipts and default taps use the native deduplication key', async () => {
  const value = notification();
  push.api.getLastNotificationResponseAsync.mockResolvedValue({
    actionIdentifier: 'default',
    notification: value,
  });
  const stop = helper.startReceptionPush();
  await flush();
  expect(helper.receptionNotificationBehavior(value)).toMatchObject({
    shouldShowBanner: true,
    shouldSetBadge: false,
  });
  await mock.emit('onState', { ...initial, revision: 2, isChatOpen: true });
  expect(helper.receptionNotificationBehavior(value)).toMatchObject({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
  });
  expect(
    helper.receptionNotificationBehavior(notification('other', {})),
  ).toBeNull();
  push.received.emit(value);
  push.response.emit({ actionIdentifier: 'default', notification: value });
  push.response.emit({ actionIdentifier: 'dismiss', notification: value });
  push.received.emit(notification('other', {}));
  expect(mock.native.handleExpoNotification.mock.calls).toEqual([
    ['["push",100]', 'thread', true],
    ['["push",100]', 'thread', false],
    ['["push",100]', 'thread', true],
  ]);
  expect(mock.native.handlePushNotification).not.toHaveBeenCalled();
  stop();
});

test('multiple owners share listeners and cleanup is idempotent', () => {
  const first = helper.startReceptionPush();
  const second = helper.startReceptionPush();
  expect(push.received.listeners.size).toBe(1);
  first();
  first();
  expect(push.received.listeners.size).toBe(1);
  second();
  expect(push.received.listeners.size).toBe(0);
});

test.each(['android', 'web'])(
  '%s has no notification side effects',
  async (platform) => {
    await load(platform);
    helper.startReceptionPush()();
    expect(helper.receptionNotificationBehavior(notification())).toBeNull();
    expect(push.api.getPermissionsAsync).not.toHaveBeenCalled();
    expect(push.received.add).not.toHaveBeenCalled();
  },
);

test('permission failure and deletion errors do not prompt or re-register', async () => {
  push.api.getPermissionsAsync.mockRejectedValueOnce(
    new Error('private error'),
  );
  const stop = helper.startReceptionPush();
  await flush();
  mock.native.deleteData.mockResolvedValue({
    state: initial,
    error: { code: 'delete_failed', status: 503 },
  });
  await expect(Reception.deleteData()).rejects.toMatchObject({
    code: 'delete_failed',
  });
  expect(push.api.getPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(jest.mocked(console.warn).mock.calls)).not.toContain(
    'private error',
  );
  stop();
});
