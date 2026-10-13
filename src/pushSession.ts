// Optional notification integrations reapply the token after the SDK clears it.
const listeners = new Set<() => void>();

export function onPushSessionReset(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function pushSessionReset(): void {
  for (const listener of listeners) listener();
}
