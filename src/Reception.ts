import { native, warnUnavailable } from './NativeReception';
import { sdkVersion } from './sdkVersion';
import { callbacks } from './callbacks';
import { getSnapshot, listen, assignSetting } from './state';
import { isPaywall, validateAppearance, warnInvalid } from './validation';
import { methods } from './methods';
import type {
  Appearance,
  LogLevel,
  PaywallAvailability,
  ReceptionEvent,
  ReceptionPaywall,
} from './types';

export const Reception = {
  ...methods,
  get isConfigured() {
    warnUnavailable();
    return getSnapshot().isConfigured;
  },
  get version() {
    warnUnavailable();
    return native?.version ?? sdkVersion;
  },
  get unreadCount() {
    warnUnavailable();
    return getSnapshot().unreadCount;
  },
  get isChatOpen() {
    warnUnavailable();
    return getSnapshot().isChatOpen;
  },
  addUnreadCountListener(listener: (count: number) => void) {
    return listen((state) => state.unreadCount, listener);
  },
  addChatOpenListener(listener: (open: boolean) => void) {
    return listen((state) => state.isChatOpen, listener);
  },
  get availablePaywalls() {
    warnUnavailable();
    return getSnapshot().availablePaywalls;
  },
  addAvailablePaywallsListener(
    listener: (value: readonly ReceptionPaywall[]) => void,
  ) {
    return listen((state) => state.availablePaywalls, listener);
  },
  get paywalls() {
    warnUnavailable();
    return getSnapshot().paywalls;
  },
  set paywalls(value: readonly ReceptionPaywall[]) {
    const module = native;
    if (!module) {
      warnUnavailable();
      return;
    }
    if (!Array.isArray(value) || !value.every(isPaywall)) {
      warnInvalid('paywalls');
      return;
    }
    assignSetting('paywalls', value, (revision) =>
      module.setPaywalls(value, revision),
    );
  },
  get onEvent() {
    return callbacks.onEvent;
  },
  set onEvent(value: ((event: ReceptionEvent) => void) | null) {
    callbacks.onEvent = value;
  },
  get onPaywall() {
    return callbacks.onPaywall;
  },
  set onPaywall(value: ((id: string) => void) | null) {
    callbacks.onPaywall = value;
  },
  /** Called after the chat closes when someone taps a link card; a set handler always counts as handled. Call Linking.openURL(url) to let the system open it. */
  get onLink() {
    return callbacks.onLink;
  },
  set onLink(value: ((url: string) => void) | null) {
    callbacks.onLink = value;
  },
  get paywallAvailability() {
    return callbacks.paywallAvailability;
  },
  set paywallAvailability(value: PaywallAvailability | null) {
    callbacks.paywallAvailability = value;
  },
  get appearance() {
    warnUnavailable();
    return getSnapshot().appearance;
  },
  set appearance(value: Appearance) {
    const module = native;
    if (!module) {
      warnUnavailable();
      return;
    }
    const valid = validateAppearance(value, getSnapshot().appearance);
    if (valid)
      assignSetting('appearance', valid, (revision) =>
        module.setAppearance(JSON.stringify(valid), revision),
      );
  },
  get updatesAppBadge() {
    warnUnavailable();
    return getSnapshot().updatesAppBadge;
  },
  set updatesAppBadge(value: boolean) {
    const module = native;
    if (!module) {
      warnUnavailable();
      return;
    }
    if (typeof value !== 'boolean') {
      warnInvalid('updatesAppBadge');
      return;
    }
    assignSetting('updatesAppBadge', value, (revision) =>
      module.setUpdatesAppBadge(value, revision),
    );
  },
  get opensWebLinksInApp() {
    warnUnavailable();
    return getSnapshot().opensWebLinksInApp;
  },
  set opensWebLinksInApp(value: boolean) {
    const module = native;
    if (!module) {
      warnUnavailable();
      return;
    }
    if (typeof value !== 'boolean') {
      warnInvalid('opensWebLinksInApp');
      return;
    }
    assignSetting('opensWebLinksInApp', value, (revision) =>
      module.setOpensWebLinksInApp(value, revision),
    );
  },
  get usesRemoteAppearance() {
    warnUnavailable();
    return getSnapshot().usesRemoteAppearance;
  },
  set usesRemoteAppearance(value: boolean) {
    const module = native;
    if (!module) {
      warnUnavailable();
      return;
    }
    if (typeof value !== 'boolean') {
      warnInvalid('usesRemoteAppearance');
      return;
    }
    assignSetting('usesRemoteAppearance', value, (revision) =>
      module.setUsesRemoteAppearance(value, revision),
    );
  },
  get languageOverride() {
    warnUnavailable();
    return getSnapshot().languageOverride;
  },
  set languageOverride(value: string | null) {
    const module = native;
    if (!module) {
      warnUnavailable();
      return;
    }
    if (value !== null && typeof value !== 'string') {
      warnInvalid('languageOverride');
      return;
    }
    assignSetting('languageOverride', value, (revision) =>
      module.setLanguageOverride(value, revision),
    );
  },
  get logLevel() {
    warnUnavailable();
    return getSnapshot().logLevel;
  },
  set logLevel(value: LogLevel) {
    const module = native;
    if (!module) {
      warnUnavailable();
      return;
    }
    if (!['off', 'error', 'info', 'debug'].includes(value)) {
      warnInvalid('logLevel');
      return;
    }
    assignSetting('logLevel', value, (revision) =>
      module.setLogLevel(value, revision),
    );
  },
};
