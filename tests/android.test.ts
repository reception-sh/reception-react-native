import { mockNative } from './mockNative';

let mock: ReturnType<typeof mockNative>;
let Reception: typeof import('../src/Reception').Reception;
beforeEach(async () => {
  jest.resetModules();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mock = mockNative();
  jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
  jest.doMock('expo', () => ({
    requireOptionalNativeModule: () => mock.native,
    requireNativeView: () => () => null,
  }));
  ({ Reception } = await import('../src/Reception'));
});
afterEach(() => {
  jest.restoreAllMocks();
});

test('Android uses the native module without the unsupported-platform warning', async () => {
  await Reception.configure({ appId: 'app_example' });
  expect(mock.native.configure).toHaveBeenCalledWith('app_example');
  expect(Reception.isConfigured).toBe(true);
  expect(console.warn).not.toHaveBeenCalled();
});

test('Android forwards FCM tokens unchanged and refuses others', async () => {
  const token = 'dXa1:APA91b-Hk_x';
  await Reception.setPushToken(token);
  expect(mock.native.setPushToken).toHaveBeenCalledWith(token, 'automatic');
  for (const invalid of ['', 'with space', 'a'.repeat(4097)])
    await Reception.setPushToken(invalid);
  await Reception.setPushToken(token, 'staging' as 'sandbox');
  expect(mock.native.setPushToken).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(jest.mocked(console.warn).mock.calls)).not.toContain(
    token,
  );
});

test('Android routes FCM data and the APNs-style envelope', async () => {
  expect(await Reception.handlePushNotification({ reception: 'conv' })).toBe(
    true,
  );
  expect(
    await Reception.handlePushNotification(
      { reception: { conversationId: 'thread' } },
      { openChat: false },
    ),
  ).toBe(true);
  expect(await Reception.handlePushNotification({ reception: '' })).toBe(false);
  expect(await Reception.handlePushNotification({ title: 'Sale' })).toBe(false);
  expect(mock.native.handlePushNotification.mock.calls).toEqual([
    ['conv', true],
    ['thread', false],
  ]);
});
