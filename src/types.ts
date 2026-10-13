import type { ReceptionError } from './ReceptionError';

export interface ReceptionPaywall {
  readonly id: string;
  readonly title: string;
}
export type PushEnvironment = 'automatic' | 'sandbox' | 'production';
export type LogLevel = 'off' | 'error' | 'info' | 'debug';
export type ReceptionEvent =
  | {
      type:
        | 'chatOpened'
        | 'messageSent'
        | 'imageSent'
        | 'reviewOpened'
        | 'paywallOpened'
        | 'dataDeleted';
    }
  | { type: 'identityRejected'; error: ReceptionError };
export type WelcomeIcon =
  | { symbol: string }
  | { image: string }
  | { hidden: true };

export type AppearanceColor = string | { light: string; dark: string };

/** Assign a complete value; omitted fields use Swift SDK defaults. Images are iOS asset catalog names. */
export interface Appearance {
  accentColor?: AppearanceColor;
  onAccentColor?: AppearanceColor | null;
  title?: string;
  welcomeTitle?: string;
  welcomeText?: string;
  showsCloseButton?: boolean;
  chatBackground?: AppearanceColor | null;
  incomingBackground?: AppearanceColor | null;
  incomingForeground?: AppearanceColor | null;
  preferredColorScheme?: 'light' | 'dark' | null;
  closeIcon?: 'xmark' | 'chevron.down' | 'arrow.down';
  closeImage?: string | null;
  fontDesign?: 'default' | 'rounded' | 'serif' | 'monospaced' | null;
  fontFamily?: string | null;
  fadesOlderMessages?: boolean;
  welcomeIcon?: WelcomeIcon | null;
  welcomeIconColor?: AppearanceColor | null;
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
export interface Subscription {
  remove(): void;
}
export type PaywallAvailability = (id: string) => boolean | Promise<boolean>;
export type Identity =
  | { userId: string | null; name?: string | null; email?: string | null }
  | { token: string };
