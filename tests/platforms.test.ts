import { initial } from './mockNative';

afterEach(() => { jest.restoreAllMocks(); });
test.each(['android', 'web'])('%s never requests a native module, throws, or changes default state', async (platform) => {
  jest.resetModules();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const requireNative = jest.fn(() => { throw new Error('Native must not load'); });
  jest.doMock('react-native', () => ({ Platform: { OS: platform } }));
  jest.doMock('expo', () => ({ requireOptionalNativeModule: requireNative, requireNativeView: requireNative }));
  const { Reception, ReceptionChatView } = await import('../src');
  await Reception.configure({ appId: 'test' }); await Reception.openChat(); await Reception.closeChat();
  await Reception.identify({ userId: 'test' }); await Reception.setMetadata({ plan: 'test' });
  await Reception.setPushToken('abcd'); await Reception.deleteData(); await Reception.logout();
  await Reception.refreshPaywalls();
  expect(await Reception.handlePushNotification({ reception: { conversationId: 'id' } })).toBe(false);
  Reception.appearance = { accentColor: '#ff0000' }; Reception.updatesAppBadge = false;
  Reception.usesRemoteAppearance = false; Reception.languageOverride = 'de'; Reception.logLevel = 'off';
  Reception.paywalls = [{ id: 'plans', title: 'Plans' }]; Reception.onEvent = jest.fn(); Reception.onPaywall = jest.fn();
  Reception.paywallAvailability = async () => true;
  Reception.addUnreadCountListener(jest.fn()).remove(); Reception.addChatOpenListener(jest.fn()).remove();
  Reception.addAvailablePaywallsListener(jest.fn()).remove();
  expect(ReceptionChatView({})).toBeNull();
  expect(Reception.isConfigured).toBe(false); expect(Reception.isChatOpen).toBe(false); expect(Reception.unreadCount).toBe(0);
  expect(Reception.appearance).toEqual(initial.appearance); expect(Reception.paywalls).toEqual([]); expect(Reception.availablePaywalls).toEqual([]);
  expect(Reception.onEvent).toBeNull(); expect(Reception.onPaywall).toBeNull(); expect(Reception.paywallAvailability).toBeNull();
  expect(requireNative).not.toHaveBeenCalled(); expect(console.warn).toHaveBeenCalledTimes(1);
});
