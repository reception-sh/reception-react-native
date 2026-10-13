import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Reception } from './Reception';
import { native } from './NativeReception';
import { onPushSessionReset } from './pushSession';
import { isRecord } from './validation';

function conversationId(
  notification: Notifications.Notification,
): string | null {
  const trigger = notification.request.trigger;
  if (!trigger || !('type' in trigger) || trigger.type !== 'push') return null;
  const reception = trigger.payload?.reception;
  return isRecord(reception) &&
    typeof reception.conversationId === 'string' &&
    reception.conversationId
    ? reception.conversationId
    : null;
}

/** Compose with your app's notification handler. This only selects presentation; it never routes a notification. */
export function receptionNotificationBehavior(
  notification: Notifications.Notification,
): Notifications.NotificationBehavior | null {
  if (Platform.OS !== 'ios' || !conversationId(notification)) return null;
  const visible = !Reception.isChatOpen;
  return {
    shouldShowBanner: visible,
    shouldShowList: visible,
    shouldPlaySound: visible,
    shouldSetBadge: false,
  };
}

let owners = 0;
let stop: (() => void) | undefined;

/** Start after configuring Reception. Never requests permission; returns cleanup. iOS only. */
export function startReceptionPush(): () => void {
  if (Platform.OS !== 'ios' || !native) return () => {};
  if (owners++ === 0) stop = start();
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    if (--owners === 0) {
      stop?.();
      stop = undefined;
    }
  };
}

function start(): () => void {
  let active = true;
  let registration = 0;
  const reportFailure = () => {
    if (active)
      console.warn(
        '[Reception] Push integration failed; registration retries on foreground.',
      );
  };
  const register = async (updatedToken?: Notifications.DevicePushToken) => {
    const revision = ++registration;
    const permission = await Notifications.getPermissionsAsync();
    if (!active || revision !== registration) return;
    const status = permission.ios?.status;
    if (
      !permission.granted &&
      status !== Notifications.IosAuthorizationStatus.PROVISIONAL &&
      status !== Notifications.IosAuthorizationStatus.EPHEMERAL
    )
      return;
    const token =
      updatedToken ?? (await Notifications.getDevicePushTokenAsync());
    if (active && revision === registration && typeof token.data === 'string') {
      await Reception.setPushToken(token.data);
    }
  };
  const refresh = () => {
    void register().catch(reportFailure);
  };
  const route = (
    notification: Notifications.Notification,
    openChat: boolean,
  ) => {
    if (!active) return;
    const id = conversationId(notification);
    if (id) {
      const key = JSON.stringify([
        notification.request.identifier,
        notification.date,
      ]);
      void native
        ?.handleExpoNotification(key, id, openChat)
        .catch(reportFailure);
    }
  };
  const response = (value: Notifications.NotificationResponse) => {
    if (value.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER)
      route(value.notification, true);
  };
  const foreground = AppState.addEventListener('change', (state) => {
    if (state === 'active') refresh();
  });
  const token = Notifications.addPushTokenListener((value) => {
    void register(value).catch(reportFailure);
  });
  const received = Notifications.addNotificationReceivedListener((value) =>
    route(value, false),
  );
  const tapped =
    Notifications.addNotificationResponseReceivedListener(response);
  const reset = onPushSessionReset(refresh);
  refresh();
  // Never clear Expo's shared response: another router may own a newer tap.
  void Notifications.getLastNotificationResponseAsync()
    .then((value) => {
      if (active && value) response(value);
    })
    .catch(reportFailure);
  return () => {
    active = false;
    foreground.remove();
    token.remove();
    received.remove();
    tapped.remove();
    reset();
  };
}
