import type {
  DevicePushToken,
  Notification,
  NotificationResponse,
} from 'expo-notifications';

function event<T>() {
  const listeners = new Set<(value: T) => void>();
  return {
    add: jest.fn((listener: (value: T) => void) => {
      listeners.add(listener);
      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    }),
    emit(value: T) {
      for (const listener of listeners) listener(value);
    },
    listeners,
  };
}

export function notificationsMock() {
  const token = event<DevicePushToken>();
  const received = event<Notification>();
  const response = event<NotificationResponse>();
  const appState = event<string>();
  const api = {
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
    DEFAULT_ACTION_IDENTIFIER: 'default',
    getPermissionsAsync: jest.fn(async () => ({
      granted: true,
      ios: { status: 2 },
    })),
    getDevicePushTokenAsync: jest.fn(
      async (): Promise<DevicePushToken> => ({ type: 'ios', data: 'AABB' }),
    ),
    getLastNotificationResponseAsync: jest.fn(
      async (): Promise<NotificationResponse | null> => null,
    ),
    clearLastNotificationResponseAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    setNotificationHandler: jest.fn(),
    addPushTokenListener: token.add,
    addNotificationReceivedListener: received.add,
    addNotificationResponseReceivedListener: response.add,
  };
  return { api, token, received, response, appState };
}

export function notification(
  id = 'push',
  payload: Record<string, unknown> = {
    reception: { conversationId: 'thread' },
  },
): Notification {
  return {
    date: 100,
    request: {
      identifier: id,
      trigger: { type: 'push', payload },
      content: {
        title: null,
        subtitle: null,
        body: null,
        categoryIdentifier: null,
        sound: null,
      },
    },
  };
}
