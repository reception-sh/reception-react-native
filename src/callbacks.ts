import { native, warnUnavailable } from './NativeReception';
import { ReceptionError } from './ReceptionError';
import { updateSnapshot } from './state';
import { warnInvalid } from './validation';
import type { PaywallAvailability, ReceptionEvent } from './types';

let eventHandler: ((event: ReceptionEvent) => void) | null = null;
let paywallHandler: ((id: string) => void) | null = null;
let availability: PaywallAvailability | null = null;
let generation = 0;
export function bridgeFailure(): void { console.warn('[Reception] Native bridge call failed.'); }
export const callbacks = {
  get onEvent() { return eventHandler; },
  set onEvent(value: typeof eventHandler) { if (!native) { warnUnavailable(); return; }
    if (value !== null && typeof value !== 'function') { warnInvalid('onEvent'); return; }
    eventHandler = value; },
  get onPaywall() { return paywallHandler; },
  set onPaywall(value: typeof paywallHandler) {
    if (!native) { warnUnavailable(); return; }
    if (value !== null && typeof value !== 'function') { warnInvalid('onPaywall'); return; }
    paywallHandler = value;
    void native?.setPaywallHandler(value !== null).catch(bridgeFailure);
  },
  get paywallAvailability() { return availability; },
  set paywallAvailability(value: PaywallAvailability | null) {
    if (!native) { warnUnavailable(); return; }
    if (value !== null && typeof value !== 'function') { warnInvalid('paywallAvailability'); return; }
    availability = value; generation += 1;
    void native?.setPaywallAvailability(value !== null, generation).then(updateSnapshot).catch(bridgeFailure);
  },
};
if (native) {
  native.addListener('onEvent', (event) => {
    if (event.type === 'identityRejected' && event.error) {
      eventHandler?.({ type: 'identityRejected', error: ReceptionError.from(event.error) });
    } else if (['chatOpened', 'messageSent', 'imageSent', 'reviewOpened', 'paywallOpened', 'dataDeleted'].includes(event.type)) {
      eventHandler?.({ type: event.type as Exclude<ReceptionEvent['type'], 'identityRejected'> });
    }
  });
  native.addListener('onPaywall', ({ id }) => { paywallHandler?.(id); });
  native.addListener('onAvailability', async (request) => {
    const handler = availability;
    let allowed = false;
    try {
      if (handler && request.generation === generation) allowed = (await handler(request.id)) === true;
    } catch { console.warn('[Reception] Paywall availability callback failed; offer unavailable.'); }
    if (handler !== availability || request.generation !== generation) allowed = false;
    await native?.resolvePaywallAvailability(request.requestId, allowed).catch(bridgeFailure);
  });
  void native.connect().then(updateSnapshot).catch(bridgeFailure);
}
