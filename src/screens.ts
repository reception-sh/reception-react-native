import { native, warnUnavailable, bridgeFailure } from './NativeReception';
import { isRecord, warnInvalid } from './validation';
import type { ReceptionScreen } from './types';

/** The Swift SDK's screen ID rule. */
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
let current: readonly ReceptionScreen[] = [];

function isScreen(value: unknown): value is ReceptionScreen {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !idPattern.test(value.id)
  )
    return false;
  if (typeof value.open !== 'function') return false;
  return (
    value.value === undefined ||
    (typeof value.value === 'string' && value.value.trim() !== '')
  );
}

/** The places link cards can open; the native SDK reports their IDs and runs `open` after the chat closes. */
export const screens = {
  get value(): readonly ReceptionScreen[] {
    return current;
  },
  set value(next: readonly ReceptionScreen[]) {
    if (!native) {
      warnUnavailable();
      return;
    }
    if (!Array.isArray(next) || !next.every(isScreen)) {
      warnInvalid('screens');
      return;
    }
    current = Object.freeze([...next]);
    void native
      .setScreens(
        current.map(({ id, value }) => ({ id, value: value ?? null })),
      )
      .catch(bridgeFailure);
  },
};

if (native) {
  native.addListener('onScreen', ({ id, value }) => {
    // The first screen of an ID wins, as in the Swift SDK.
    const screen = current.find((item) => item.id === id);
    if (!screen) return;
    if (screen.value === undefined) (screen.open as () => void)();
    else if (value !== null) screen.open(value);
  });
}
