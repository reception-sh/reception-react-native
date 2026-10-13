import { useSyncExternalStore } from 'react';
import { getSnapshot, subscribe } from './state';
import { warnUnavailable } from './NativeReception';

export function useReceptionUnreadCount(): number {
  warnUnavailable();
  return useSyncExternalStore(subscribe, () => getSnapshot().unreadCount, () => 0);
}
export function useReceptionChatOpen(): boolean {
  warnUnavailable();
  return useSyncExternalStore(subscribe, () => getSnapshot().isChatOpen, () => false);
}
