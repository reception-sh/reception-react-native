import { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { requireNativeModule } from 'expo';
import * as Notifications from 'expo-notifications';
import {
  Reception,
  ReceptionChatView,
  useReceptionChatOpen,
  useReceptionUnreadCount,
} from 'react-native-reception';

function notificationPayload(
  notification: Notifications.Notification,
): Record<string, unknown> {
  const trigger = notification.request.trigger;
  return trigger && 'type' in trigger && trigger.type === 'push'
    ? (trigger.payload ?? {})
    : (notification.request.content.data ?? {});
}

export default function App() {
  const unread = useReceptionUnreadCount();
  const open = useReceptionChatOpen();
  const [embedded, setEmbedded] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [events, setEvents] = useState<string[]>([]);
  const [available, setAvailable] = useState('');
  const record = (event: string) =>
    setEvents((previous) => [...previous.slice(-7), event]);
  const run = async (action: () => Promise<void>, success: string) => {
    try {
      await action();
      setStatus(success);
    } catch {
      setStatus('Operation failed');
    }
  };
  useEffect(() => {
    Reception.onEvent = (event) =>
      record(
        event.type === 'identityRejected'
          ? `${event.type}:${event.error.code}`
          : event.type,
      );
    Reception.onPaywall = (id) => {
      record(`onPaywall:${id}, chat:${Reception.isChatOpen}`);
    };
    const paywalls = Reception.addAvailablePaywallsListener((values) =>
      setAvailable(values.map((value) => value.id).join(', ')),
    );
    const received = Notifications.addNotificationReceivedListener(
      (notification) => {
        void Reception.handlePushNotification(
          notificationPayload(notification),
          { openChat: false },
        ).then((handled) => record(`push received:${handled}`));
      },
    );
    const response = Notifications.addNotificationResponseReceivedListener(
      (event) => {
        void Reception.handlePushNotification(
          notificationPayload(event.notification),
        ).then((handled) => record(`push opened:${handled}`));
      },
    );
    return () => {
      paywalls.remove();
      received.remove();
      response.remove();
      Reception.onEvent = null;
      Reception.onPaywall = null;
    };
  }, []);

  async function configure() {
    const appId = process.env.EXPO_PUBLIC_RECEPTION_APP_ID ?? 'app_YOUR_APP_ID';
    if (__DEV__) {
      const debug = requireNativeModule<{
        configureForTesting(
          appId: string,
          serviceURL: string,
        ): Promise<unknown>;
      }>('ReceptionReactNative');
      await debug.configureForTesting(appId, 'http://localhost:3000');
    } else {
      await Reception.configure({ appId });
    }
    Reception.appearance = { accentColor: '#8A2BE2', showsCloseButton: true };
    Reception.usesRemoteAppearance = false;
    Reception.paywalls = [
      { id: 'plans', title: 'Plans' },
      { id: 'hidden', title: 'Unavailable plan' },
    ];
    Reception.paywallAvailability = async (id) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return id === 'plans';
    };
    await Reception.refreshPaywalls({ invalidate: true });
  }

  if (embedded)
    return (
      <View style={styles.embedded}>
        <Button
          title="Back from embedded chat"
          onPress={() => setEmbedded(false)}
        />
        <ReceptionChatView style={styles.chat} />
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Reception verification</Text>
      <Text testID="state">
        Unread: {unread} · Chat open: {String(open)}
      </Text>
      <Text>
        {status} · SDK {Reception.version}
      </Text>
      <Text>Available: {available}</Text>
      <Button
        title="Calls before configure"
        onPress={() =>
          void run(async () => {
            await Reception.openChat();
            await Reception.closeChat();
            await Reception.identify({ userId: 'before-configure' });
            await Reception.setMetadata({ stage: 'before' });
            await Reception.setPushToken('aabb', 'sandbox');
            await Reception.logout();
            await Reception.deleteData();
          }, 'Preconfigure calls completed')
        }
      />
      <Button
        title="Configure"
        onPress={() => void run(configure, 'Configured')}
      />
      <Button
        title="Open chat"
        onPress={() => void run(Reception.openChat, 'Open requested')}
      />
      <Button
        title="Open then close after 3s"
        onPress={() =>
          void run(async () => {
            await Reception.openChat();
            setTimeout(() => {
              void Reception.closeChat();
            }, 3000);
          }, 'Close scheduled')
        }
      />
      <Button
        title="Identify and metadata"
        onPress={() =>
          void run(async () => {
            await Reception.identify({
              userId: 'rn-verification-user',
              name: 'RN Test Customer',
              email: 'rn-test@example.test',
            });
            await Reception.setMetadata({
              plan: 'Pro',
              source: 'React Native example',
            });
          }, 'Identity and metadata staged')
        }
      />
      <Button
        title="German"
        onPress={() => {
          Reception.languageOverride = 'de';
          setStatus('German selected');
        }}
      />
      <Button
        title="App language"
        onPress={() => {
          Reception.languageOverride = null;
          setStatus('App language selected');
        }}
      />
      <Button title="Embedded chat" onPress={() => setEmbedded(true)} />
      <Button
        title="Logout"
        onPress={() => void run(Reception.logout, 'Logged out')}
      />
      <Button
        title="Delete support data"
        onPress={() => void run(Reception.deleteData, 'Data deletion resolved')}
      />
      <Button
        title="Hanging availability callback"
        onPress={() => {
          Reception.paywallAvailability = () => new Promise<boolean>(() => {});
          setStatus('Availability waiting (5s timeout)');
        }}
      />
      <Button
        title="Restore availability"
        onPress={() => {
          Reception.paywallAvailability = async (id) => id === 'plans';
          setStatus('Availability restored');
        }}
      />
      <Button
        title="Enable test notifications"
        onPress={() =>
          void run(async () => {
            await Notifications.requestPermissionsAsync();
          }, 'Notification permission requested')
        }
      />
      <Text style={styles.events}>{events.join('\n')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 70, paddingBottom: 40, gap: 6 },
  title: { fontSize: 23, fontWeight: '600', marginBottom: 8 },
  events: { fontSize: 13, marginTop: 12 },
  embedded: { flex: 1, paddingTop: 65 },
  chat: { flex: 1 },
});
