import {
  native,
  warnUnavailable,
  bridgeFailure,
  type Settings,
  type Snapshot,
} from './NativeReception';
import type { Subscription } from './types';

let confirmed: Snapshot = {
  revision: 0,
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
let snapshot = confirmed;
let revision = 0;
const pending = new Map<
  keyof Settings,
  { revision: number; value: Settings[keyof Settings] }
>();
const listeners = new Set<() => void>();

export function getSnapshot(): Snapshot {
  return snapshot;
}

function publish(): void {
  const settings: Partial<Settings> = {};
  for (const [key, assignment] of pending) {
    if ((confirmed.settingRevisions[key] ?? 0) >= assignment.revision)
      pending.delete(key);
    else Object.assign(settings, { [key]: assignment.value });
  }
  const samePaywalls =
    JSON.stringify(snapshot.availablePaywalls) ===
    JSON.stringify(confirmed.availablePaywalls);
  snapshot = {
    ...confirmed,
    ...settings,
    availablePaywalls: samePaywalls
      ? snapshot.availablePaywalls
      : confirmed.availablePaywalls,
  };
  for (const listener of listeners) listener();
}

export function updateSnapshot(value: Snapshot): void {
  if (value.revision < confirmed.revision) return;
  confirmed = value;
  publish();
}

/** Keep each assignment visible until native acknowledges that revision or rejects the call. */
export function assignSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
  commit: (revision: number) => Promise<Snapshot>,
): void {
  const current = ++revision;
  pending.set(key, { revision: current, value });
  publish();
  void commit(current)
    .then(updateSnapshot)
    .catch(() => {
      if (pending.get(key)?.revision === current) {
        pending.delete(key);
        publish();
      }
      bridgeFailure();
    });
}

export function subscribe(listener: () => void): () => void {
  warnUnavailable();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function listen<T>(
  select: (state: Snapshot) => T,
  listener: (value: T) => void,
): Subscription {
  let previous = select(snapshot);
  return {
    remove: subscribe(() => {
      const value = select(snapshot);
      if (value !== previous) {
        previous = value;
        listener(value);
      }
    }),
  };
}
if (native) native.addListener('onState', updateSnapshot);
