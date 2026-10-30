import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type {
  Appearance,
  LogLevel,
  ReceptionPaywall,
  ReceptionState,
  Subscription,
} from './types';

export interface Settings {
  appearance: Appearance;
  updatesAppBadge: boolean;
  opensWebLinksInApp: boolean;
  usesRemoteAppearance: boolean;
  languageOverride: string | null;
  logLevel: LogLevel;
  paywalls: readonly ReceptionPaywall[];
}
export interface Snapshot extends ReceptionState, Settings {
  revision: number;
  settingRevisions: Partial<Record<keyof Settings, number>>;
}
export type NativeEvent = {
  type: string;
  error?: { code: string; status: number };
};
export interface NativeEvents {
  onState: Snapshot;
  onEvent: NativeEvent;
  onPaywall: { id: string };
  onScreen: { id: string; value: string | null };
  onAvailability: { requestId: string; id: string; generation: number };
}
export interface NativeReception {
  readonly version: string;
  connect(): Promise<Snapshot>;
  configure(appId: string): Promise<Snapshot>;
  identify(
    userId: string | null,
    name: string | null,
    email: string | null,
  ): Promise<void>;
  identifyToken(token: string): Promise<void>;
  setMetadata(metadata: Record<string, string>): Promise<void>;
  logout(): Promise<Snapshot>;
  deleteData(): Promise<{
    error?: { code: string; status: number };
    state: Snapshot;
  }>;
  openChat(): Promise<void>;
  closeChat(): Promise<void>;
  track(event: string, opensChat: boolean): Promise<void>;
  setPushToken(token: string, environment: string): Promise<void>;
  handlePushNotification(
    conversationId: string,
    openChat: boolean,
  ): Promise<boolean>;
  handleExpoNotification(
    id: string,
    conversationId: string,
    openChat: boolean,
  ): Promise<void>;
  setAppearance(value: string, revision: number): Promise<Snapshot>;
  setUpdatesAppBadge(value: boolean, revision: number): Promise<Snapshot>;
  setOpensWebLinksInApp(value: boolean, revision: number): Promise<Snapshot>;
  setUsesRemoteAppearance(value: boolean, revision: number): Promise<Snapshot>;
  setLanguageOverride(
    value: string | null,
    revision: number,
  ): Promise<Snapshot>;
  setLogLevel(value: LogLevel, revision: number): Promise<Snapshot>;
  setPaywalls(
    value: readonly ReceptionPaywall[],
    revision: number,
  ): Promise<Snapshot>;
  setPaywallHandler(enabled: boolean): Promise<void>;
  setScreens(screens: { id: string; value: string | null }[]): Promise<void>;
  setPaywallAvailability(
    enabled: boolean,
    generation: number,
  ): Promise<Snapshot>;
  resolvePaywallAvailability(
    requestId: string,
    allowed: boolean,
  ): Promise<void>;
  refreshPaywalls(invalidate: boolean): Promise<void>;
  addListener<K extends keyof NativeEvents>(
    event: K,
    listener: (value: NativeEvents[K]) => void,
  ): Subscription;
}

export const native =
  Platform.OS === 'ios'
    ? requireOptionalNativeModule<NativeReception>('ReceptionReactNative')
    : null;
let warned = false;
export function warnUnavailable(): void {
  if (warned || native) return;
  warned = true;
  console.warn(
    Platform.OS === 'ios'
      ? '[Reception] Native module unavailable. Install the package and rebuild your iOS app; Expo Go is unsupported.'
      : '[Reception] Support chat is available on iOS only.',
  );
}

export function bridgeFailure(): void {
  console.warn('[Reception] Native bridge call failed.');
}
