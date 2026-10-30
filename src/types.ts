import type { ReceptionError } from './ReceptionError';

/** A product a paywall sells, shown to your team in the dashboard. Periods are ISO 8601 durations like "P1M". */
export interface ReceptionPaywallProduct {
  readonly id: string;
  readonly price?: string;
  readonly period?: string;
  readonly trial?: string;
}
export interface ReceptionPaywall {
  readonly id: string;
  readonly title: string;
  /** Where the paywall is built: "revenuecat", "superwall", "adapty", "app" or another lowercase vendor name. */
  readonly source?: string;
  readonly products?: readonly ReceptionPaywallProduct[];
  /** False lists an offering without a paywall for your team; it is never opened by a card. */
  readonly presentable?: boolean;
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
        | 'linkOpened'
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
  /** Hides the "You'll get a notification when we reply." line under the person's latest message. */
  hidesPushStatus?: boolean;
}

/**
 * A place in the app that link cards can open: a tab, a screen, a sheet, the paywall. `value` names what a screen
 * needs from the link, such as "Order number"; its `open` then receives it.
 */
export type ReceptionScreen =
  | { id: string; value?: undefined; open: () => void }
  | { id: string; value: string; open: (value: string) => void };

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
