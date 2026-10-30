import type { Appearance, LogLevel, ReceptionPaywall } from '../src/types';
import type {
  NativeEvents,
  NativeReception,
  Snapshot,
} from '../src/NativeReception';

export const initial: Snapshot = {
  revision: 1,
  settingRevisions: {},
  isConfigured: false,
  unreadCount: 0,
  isChatOpen: false,
  availablePaywalls: [],
  appearance: {},
  updatesAppBadge: true,
  opensWebLinksInApp: true,
  usesRemoteAppearance: true,
  languageOverride: null,
  logLevel: 'info',
  paywalls: [],
};
export function mockNative() {
  const listeners: {
    [K in keyof NativeEvents]: Set<
      (value: NativeEvents[K]) => void | Promise<void>
    >;
  } = {
    onState: new Set(),
    onEvent: new Set(),
    onPaywall: new Set(),
    onScreen: new Set(),
    onAvailability: new Set(),
  };
  const native = {
    version: '1.1.1',
    connect: jest.fn(async () => initial),
    configure: jest.fn(async () => ({
      ...initial,
      revision: 2,
      isConfigured: true,
    })),
    identify: jest.fn(async () => {}),
    identifyToken: jest.fn(async () => {}),
    setMetadata: jest.fn(async () => {}),
    logout: jest.fn(async () => ({ ...initial, revision: 3 })),
    deleteData: jest.fn(
      async (): Promise<{
        state: Snapshot;
        error?: { code: string; status: number };
      }> => ({ state: initial }),
    ),
    openChat: jest.fn(async () => {}),
    closeChat: jest.fn(async () => {}),
    track: jest.fn(async () => {}),
    setPushToken: jest.fn(async () => {}),
    handlePushNotification: jest.fn(async () => true),
    handleExpoNotification: jest.fn(async () => {}),
    setAppearance: jest.fn(async (value: string) => ({
      ...initial,
      appearance: JSON.parse(value) as Appearance,
    })),
    setUpdatesAppBadge: jest.fn(async (updatesAppBadge: boolean) => ({
      ...initial,
      updatesAppBadge,
    })),
    setOpensWebLinksInApp: jest.fn(async (opensWebLinksInApp: boolean) => ({
      ...initial,
      opensWebLinksInApp,
    })),
    setUsesRemoteAppearance: jest.fn(async (usesRemoteAppearance: boolean) => ({
      ...initial,
      usesRemoteAppearance,
    })),
    setLanguageOverride: jest.fn(async (languageOverride: string | null) => ({
      ...initial,
      languageOverride,
    })),
    setLogLevel: jest.fn(async (logLevel: LogLevel) => ({
      ...initial,
      logLevel,
    })),
    setPaywalls: jest.fn(async (paywalls: readonly ReceptionPaywall[]) => ({
      ...initial,
      paywalls,
    })),
    setPaywallHandler: jest.fn(async () => {}),
    setScreens: jest.fn(async () => {}),
    setPaywallAvailability: jest.fn(async () => initial),
    resolvePaywallAvailability: jest.fn(async () => {}),
    refreshPaywalls: jest.fn(async () => {}),
    addListener<K extends keyof NativeEvents>(
      name: K,
      listener: (value: NativeEvents[K]) => void,
    ) {
      listeners[name].add(listener);
      return {
        remove: () => {
          listeners[name].delete(listener);
        },
      };
    },
  } satisfies NativeReception;
  return {
    native,
    async emit<K extends keyof NativeEvents>(name: K, value: NativeEvents[K]) {
      await Promise.all(
        [...listeners[name]].map((listener) => listener(value)),
      );
    },
  };
}
