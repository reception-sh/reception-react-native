import type { ReceptionError } from './ReceptionError';

export interface ReceptionPaywall { readonly id: string; readonly title: string }
export type PushEnvironment = 'automatic' | 'sandbox' | 'production';
export type LogLevel = 'off' | 'error' | 'info' | 'debug';
export type ReceptionEvent =
  | { type: 'chatOpened' | 'messageSent' | 'imageSent' | 'reviewOpened' | 'paywallOpened' | 'dataDeleted' }
  | { type: 'identityRejected'; error: ReceptionError };
export type WelcomeIcon = { symbol: string } | { image: string } | { hidden: true };

/** Assign a complete value; omitted fields use Swift SDK defaults. Images are iOS asset catalog names. */
export interface Appearance {
  accentColor?: string;
  onAccentColor?: string | null;
  title?: string;
  welcomeTitle?: string;
  welcomeText?: string;
  showsCloseButton?: boolean;
  chatBackground?: string | null;
  incomingBackground?: string | null;
  incomingForeground?: string | null;
  preferredColorScheme?: 'light' | 'dark' | null;
  closeIcon?: 'xmark' | 'chevron.down' | 'arrow.down';
  closeImage?: string | null;
  fontDesign?: 'default' | 'rounded' | 'serif' | 'monospaced' | null;
  fontFamily?: string | null;
  fadesOlderMessages?: boolean;
  welcomeIcon?: WelcomeIcon | null;
  welcomeIconColor?: string | null;
  welcomeIconSize?: number | null;
  welcomeIconCornerRadius?: number;
  welcomeIconOffset?: { x: number; y: number };
  hidesTitle?: boolean;
  hidesWelcomeTitle?: boolean;
  hidesWelcomeText?: boolean;
}

export interface ReceptionState {
  readonly isConfigured: boolean;
  readonly unreadCount: number;
  readonly isChatOpen: boolean;
  readonly availablePaywalls: readonly ReceptionPaywall[];
}
export interface Subscription { remove(): void }
export type PaywallAvailability = (id: string) => boolean | Promise<boolean>;
export type Identity = { userId: string | null; name?: string | null; email?: string | null } | { token: string };
