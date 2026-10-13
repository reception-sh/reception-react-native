import { initial, mockNative } from './mockNative';

let mock: ReturnType<typeof mockNative>;
let Reception: typeof import('../src/Reception').Reception;
let ReceptionError: typeof import('../src/ReceptionError').ReceptionError;
beforeEach(async () => {
  jest.resetModules();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mock = mockNative();
  jest.doMock('expo', () => ({
    requireOptionalNativeModule: () => mock.native,
  }));
  ({ Reception } = await import('../src/Reception'));
  ({ ReceptionError } = await import('../src/ReceptionError'));
});
afterEach(() => {
  jest.restoreAllMocks();
});

test('configuration hydrates state and native errors become typed errors', async () => {
  expect(Reception.isConfigured).toBe(false);
  await Reception.configure({ appId: 'app_example' });
  expect(Reception.isConfigured).toBe(true);
  mock.native.openChat.mockRejectedValueOnce(new Error('private diagnostic'));
  await expect(Reception.openChat()).rejects.toMatchObject({
    name: 'ReceptionError',
    code: 'bridge_error',
    status: 0,
  });
});

test('identity variants, metadata and push forward only valid inputs', async () => {
  await Reception.identify({ userId: 'customer', name: 'Test', email: null });
  await Reception.identify({ token: 'signed-token' });
  await Reception.setMetadata({ plan: 'Pro' });
  await Reception.setPushToken('AABB01', 'sandbox');
  expect(mock.native.identify).toHaveBeenCalledWith('customer', 'Test', null);
  expect(mock.native.identifyToken).toHaveBeenCalledWith('signed-token');
  expect(mock.native.setMetadata).toHaveBeenCalledWith({ plan: 'Pro' });
  expect(mock.native.setPushToken).toHaveBeenCalledWith('aabb01', 'sandbox');
  for (const token of ['', 'a', 'gg', 'ExpoPushToken[x]', 'a'.repeat(514)])
    await Reception.setPushToken(token);
  expect(mock.native.setPushToken).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(jest.mocked(console.warn).mock.calls)).not.toContain(
    'signed-token',
  );
});

test('push recognizes the SDK routing envelope and ignores unrelated payloads', async () => {
  expect(await Reception.handlePushNotification({ aps: {} })).toBe(false);
  expect(
    await Reception.handlePushNotification({
      reception: { conversationId: '' },
    }),
  ).toBe(false);
  expect(
    await Reception.handlePushNotification(
      { reception: { conversationId: 'thread' }, aps: {} },
      { openChat: false },
    ),
  ).toBe(true);
  expect(mock.native.handlePushNotification).toHaveBeenCalledWith(
    'thread',
    false,
  );
});

test('deletion preserves code and HTTP status', async () => {
  mock.native.deleteData.mockResolvedValueOnce({
    state: initial,
    error: { code: 'delete_failed', status: 503 },
  });
  await expect(Reception.deleteData()).rejects.toEqual(
    new ReceptionError('delete_failed', 503),
  );
  await expect(Reception.deleteData()).resolves.toBeUndefined();
});

test('listeners receive changes, unsubscribe, and ignore stale responses', async () => {
  const count = jest.fn();
  const open = jest.fn();
  const subscription = Reception.addUnreadCountListener(count);
  Reception.addChatOpenListener(open);
  await mock.emit('onState', {
    ...initial,
    revision: 10,
    unreadCount: 3,
    isChatOpen: true,
  });
  expect(count).toHaveBeenCalledWith(3);
  expect(open).toHaveBeenCalledWith(true);
  await mock.emit('onState', { ...initial, revision: 2 });
  expect(Reception.unreadCount).toBe(3);
  subscription.remove();
  await mock.emit('onState', { ...initial, revision: 11 });
  expect(count).toHaveBeenCalledTimes(1);
});

test('events preserve typed identity rejection and handler replacement', async () => {
  const first = jest.fn();
  const next = jest.fn();
  Reception.onEvent = first;
  Reception.onEvent = next;
  await mock.emit('onEvent', {
    type: 'identityRejected',
    error: { code: 'identity_token_expired', status: 401 },
  });
  expect(first).not.toHaveBeenCalled();
  expect(next).toHaveBeenCalledWith({
    type: 'identityRejected',
    error: new ReceptionError('identity_token_expired', 401),
  });
  Reception.onEvent = null;
  await mock.emit('onEvent', { type: 'messageSent' });
  expect(next).toHaveBeenCalledTimes(1);
});

test('async paywall callback round trip, rejection, replacement and stale generations fail closed', async () => {
  Reception.paywallAvailability = async (id) => id === 'plans';
  await mock.emit('onAvailability', {
    requestId: 'a',
    id: 'plans',
    generation: 1,
  });
  expect(mock.native.resolvePaywallAvailability).toHaveBeenLastCalledWith(
    'a',
    true,
  );
  Reception.paywallAvailability = async () => {
    throw new Error('private details');
  };
  await mock.emit('onAvailability', {
    requestId: 'b',
    id: 'plans',
    generation: 2,
  });
  expect(mock.native.resolvePaywallAvailability).toHaveBeenLastCalledWith(
    'b',
    false,
  );
  let complete: (value: boolean) => void = () => {};
  Reception.paywallAvailability = () =>
    new Promise<boolean>((resolve) => {
      complete = resolve;
    });
  const pending = mock.emit('onAvailability', {
    requestId: 'c',
    id: 'plans',
    generation: 3,
  });
  Reception.paywallAvailability = null;
  complete(true);
  await pending;
  expect(mock.native.resolvePaywallAvailability).toHaveBeenLastCalledWith(
    'c',
    false,
  );
  await mock.emit('onAvailability', {
    requestId: 'd',
    id: 'plans',
    generation: 1,
  });
  expect(mock.native.resolvePaywallAvailability).toHaveBeenLastCalledWith(
    'd',
    false,
  );
  expect(JSON.stringify(jest.mocked(console.warn).mock.calls)).not.toContain(
    'private details',
  );
});

test('paywall callbacks and registrations forward without closing chat', async () => {
  const onPaywall = jest.fn();
  Reception.onPaywall = onPaywall;
  Reception.paywalls = [{ id: 'plans', title: 'Plans' }];
  await mock.emit('onPaywall', { id: 'plans' });
  expect(onPaywall).toHaveBeenCalledWith('plans');
  expect(mock.native.closeChat).not.toHaveBeenCalled();
  await Reception.refreshPaywalls({ invalidate: true });
  expect(mock.native.refreshPaywalls).toHaveBeenCalledWith(true);
});
