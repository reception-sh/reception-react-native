import { native, warnUnavailable } from './NativeReception';
import { sdkVersion } from './sdkVersion';
import { callbacks, bridgeFailure } from './callbacks';
import { ReceptionError } from './ReceptionError';
import { getSnapshot, listen, updateSnapshot } from './state';
import { isRecord, validateAppearance, warnInvalid } from './validation';
import type { Appearance, Identity, LogLevel, PaywallAvailability, PushEnvironment, ReceptionEvent, ReceptionPaywall } from './types';

async function call<T>(action: () => Promise<T>): Promise<T | undefined> {
  if (!native) { warnUnavailable(); return; }
  try { return await action(); } catch (error) { throw ReceptionError.from(error); }
}

export const Reception = {
  async configure(options: { appId: string }): Promise<void> {
    await call(async () => {
      if (!isRecord(options) || typeof options.appId !== 'string') { warnInvalid('appId'); return; }
      if (native) updateSnapshot(await native.configure(options.appId));
    });
  },
  get isConfigured() { warnUnavailable(); return getSnapshot().isConfigured; },
  get version() { warnUnavailable(); return native?.version ?? sdkVersion; },
  async identify(identity: Identity): Promise<void> {
    await call(async () => {
      if (!isRecord(identity)) { warnInvalid('identity'); return; }
      if ('token' in identity) {
        if (typeof identity.token !== 'string') { warnInvalid('identity token'); return; }
        await native?.identifyToken(identity.token);
      } else {
        const values = [identity.userId, identity.name ?? null, identity.email ?? null];
        if (!values.every((value) => value === null || typeof value === 'string')) { warnInvalid('identity'); return; }
        await native?.identify(identity.userId, identity.name ?? null, identity.email ?? null);
      }
    });
  },
  async setMetadata(value: Record<string, string>): Promise<void> {
    await call(async () => {
      if (!isRecord(value) || !Object.values(value).every((entry) => typeof entry === 'string')) { warnInvalid('metadata'); return; }
      await native?.setMetadata(value);
    });
  },
  async logout(): Promise<void> { await call(async () => { if (native) updateSnapshot(await native.logout()); }); },
  async deleteData(): Promise<void> {
    await call(async () => {
      const result = await native?.deleteData();
      if (result) {
        updateSnapshot(result.state);
        if (result.error) throw ReceptionError.from(result.error);
      }
    });
  },
  async openChat(): Promise<void> { await call(async () => { await native?.openChat(); }); },
  async closeChat(): Promise<void> { await call(async () => { await native?.closeChat(); }); },
  async setPushToken(token: string, environment: PushEnvironment = 'automatic'): Promise<void> {
    await call(async () => {
      if (typeof token !== 'string' || !/^(?:[\da-f]{2})+$/i.test(token) || token.length > 512 ||
          !['automatic', 'sandbox', 'production'].includes(environment)) { warnInvalid('APNs token or environment'); return; }
      await native?.setPushToken(token.toLowerCase(), environment);
    });
  },
  async handlePushNotification(payload: Record<string, unknown>, options: { openChat?: boolean } = {}): Promise<boolean> {
    return await call(async () => {
      if (!isRecord(payload) || !isRecord(options) || (options.openChat !== undefined && typeof options.openChat !== 'boolean')) {
        warnInvalid('notification'); return false;
      }
      // Only this public routing field is consumed by Swift; unrelated provider payloads may not be serializable.
      const reception = payload.reception;
      if (!isRecord(reception) || typeof reception.conversationId !== 'string' || !reception.conversationId) return false;
      return await native?.handlePushNotification(reception.conversationId, options.openChat ?? true) ?? false;
    }) ?? false;
  },
  get unreadCount() { warnUnavailable(); return getSnapshot().unreadCount; },
  get isChatOpen() { warnUnavailable(); return getSnapshot().isChatOpen; },
  addUnreadCountListener(listener: (count: number) => void) { return listen((state) => state.unreadCount, listener); },
  addChatOpenListener(listener: (open: boolean) => void) { return listen((state) => state.isChatOpen, listener); },
  get availablePaywalls() { warnUnavailable(); return getSnapshot().availablePaywalls; },
  addAvailablePaywallsListener(listener: (value: readonly ReceptionPaywall[]) => void) { return listen((state) => state.availablePaywalls, listener); },
  get paywalls() { warnUnavailable(); return getSnapshot().paywalls; },
  set paywalls(value: readonly ReceptionPaywall[]) {
    if (!native) { warnUnavailable(); return; }
    if (!Array.isArray(value) || !value.every((entry) => isRecord(entry) && typeof entry.id === 'string' && typeof entry.title === 'string')) {
      warnInvalid('paywalls'); return;
    }
    void native.setPaywalls(value).then(updateSnapshot).catch(bridgeFailure);
  },
  async refreshPaywalls(options: { invalidate?: boolean } = {}): Promise<void> {
    await call(async () => {
      if (!isRecord(options) || (options.invalidate !== undefined && typeof options.invalidate !== 'boolean')) { warnInvalid('invalidate'); return; }
      await native?.refreshPaywalls(options.invalidate ?? false);
    });
  },
  get onEvent() { return callbacks.onEvent; },
  set onEvent(value: ((event: ReceptionEvent) => void) | null) { callbacks.onEvent = value; },
  get onPaywall() { return callbacks.onPaywall; },
  set onPaywall(value: ((id: string) => void) | null) { callbacks.onPaywall = value; },
  get paywallAvailability() { return callbacks.paywallAvailability; },
  set paywallAvailability(value: PaywallAvailability | null) { callbacks.paywallAvailability = value; },
  get appearance() { warnUnavailable(); return getSnapshot().appearance; },
  set appearance(value: Appearance) {
    if (!native) { warnUnavailable(); return; }
    const valid = validateAppearance(value, getSnapshot().appearance);
    if (valid) void native.setAppearance(JSON.stringify(valid)).then(updateSnapshot).catch(bridgeFailure);
  },
  get updatesAppBadge() { warnUnavailable(); return getSnapshot().updatesAppBadge; },
  set updatesAppBadge(value: boolean) {
    if (!native) { warnUnavailable(); return; }
    if (typeof value !== 'boolean') { warnInvalid('updatesAppBadge'); return; }
    void native.setUpdatesAppBadge(value).then(updateSnapshot).catch(bridgeFailure);
  },
  get usesRemoteAppearance() { warnUnavailable(); return getSnapshot().usesRemoteAppearance; },
  set usesRemoteAppearance(value: boolean) {
    if (!native) { warnUnavailable(); return; }
    if (typeof value !== 'boolean') { warnInvalid('usesRemoteAppearance'); return; }
    void native.setUsesRemoteAppearance(value).then(updateSnapshot).catch(bridgeFailure);
  },
  get languageOverride() { warnUnavailable(); return getSnapshot().languageOverride; },
  set languageOverride(value: string | null) {
    if (!native) { warnUnavailable(); return; }
    if (value !== null && typeof value !== 'string') { warnInvalid('languageOverride'); return; }
    void native.setLanguageOverride(value).then(updateSnapshot).catch(bridgeFailure);
  },
  get logLevel() { warnUnavailable(); return getSnapshot().logLevel; },
  set logLevel(value: LogLevel) {
    if (!native) { warnUnavailable(); return; }
    if (!['off', 'error', 'info', 'debug'].includes(value)) { warnInvalid('logLevel'); return; }
    void native.setLogLevel(value).then(updateSnapshot).catch(bridgeFailure);
  },
};
