import { native, warnUnavailable, type Snapshot } from './NativeReception';
import type { Subscription } from './types';

let snapshot: Snapshot = {
  revision: 0,
  isConfigured: false,
  unreadCount: 0,
  isChatOpen: false,
  availablePaywalls: [],
  appearance: {},
  updatesAppBadge: true,
  usesRemoteAppearance: true,
  languageOverride: null,
  logLevel: 'info',
  paywalls: [],
};
const listeners = new Set<() => void>();
export function getSnapshot(): Snapshot {
  return snapshot;
}
export function updateSnapshot(value: Snapshot): void {
  if (value.revision < snapshot.revision) return;
  const samePaywalls =
    JSON.stringify(snapshot.availablePaywalls) ===
    JSON.stringify(value.availablePaywalls);
  snapshot = {
    ...value,
    availablePaywalls: samePaywalls
      ? snapshot.availablePaywalls
      : value.availablePaywalls,
  };
  for (const listener of listeners) listener();
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
if (native) {
  native.addListener('onState', updateSnapshot);
}
