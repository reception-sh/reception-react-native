import {
  native,
  warnUnavailable,
  type NativeReception,
} from './NativeReception';
import { ReceptionError } from './ReceptionError';
import { updateSnapshot } from './state';
import { pushSessionReset } from './pushSession';
import { isRecord, warnInvalid } from './validation';
import type { Identity, PushEnvironment } from './types';

async function call<T>(
  action: (module: NativeReception) => Promise<T>,
): Promise<T | undefined> {
  if (!native) {
    warnUnavailable();
    return;
  }
  try {
    return await action(native);
  } catch (error) {
    throw ReceptionError.from(error);
  }
}

export const methods = {
  async configure(options: { appId: string }): Promise<void> {
    await call(async (module) => {
      if (!isRecord(options) || typeof options.appId !== 'string') {
        warnInvalid('appId');
        return;
      }
      updateSnapshot(await module.configure(options.appId));
    });
  },
  async identify(identity: Identity): Promise<void> {
    await call(async (module) => {
      if (!isRecord(identity)) {
        warnInvalid('identity');
        return;
      }
      if ('token' in identity) {
        if (typeof identity.token !== 'string') {
          warnInvalid('identity token');
          return;
        }
        await module.identifyToken(identity.token);
      } else {
        const values = [
          identity.userId,
          identity.name ?? null,
          identity.email ?? null,
        ];
        if (
          !values.every((value) => value === null || typeof value === 'string')
        ) {
          warnInvalid('identity');
          return;
        }
        await module.identify(
          identity.userId,
          identity.name ?? null,
          identity.email ?? null,
        );
      }
    });
  },
  async setMetadata(value: Record<string, string>): Promise<void> {
    await call(async (module) => {
      if (
        !isRecord(value) ||
        !Object.values(value).every((entry) => typeof entry === 'string')
      ) {
        warnInvalid('metadata');
        return;
      }
      await module.setMetadata(value);
    });
  },
  async logout(): Promise<void> {
    await call(async (module) => {
      updateSnapshot(await module.logout());
      pushSessionReset();
    });
  },
  async deleteData(): Promise<void> {
    await call(async (module) => {
      const result = await module.deleteData();
      updateSnapshot(result.state);
      if (result.error) throw ReceptionError.from(result.error);
      pushSessionReset();
    });
  },
  async openChat(): Promise<void> {
    await call((module) => module.openChat());
  },
  async closeChat(): Promise<void> {
    await call((module) => module.closeChat());
  },
  /**
   * Reports an app event, for example `'paywall_declined'`, for automations set up in the dashboard;
   * a listening automation sends its message and can open the chat. With `opensChat`, the chat also
   * opens again at later events for people who received it. Offline or without a listening
   * automation, nothing happens.
   */
  async track(
    event: string,
    options: { opensChat?: boolean } = {},
  ): Promise<void> {
    await call(async (module) => {
      if (
        typeof event !== 'string' ||
        !isRecord(options) ||
        (options.opensChat !== undefined &&
          typeof options.opensChat !== 'boolean')
      ) {
        warnInvalid('event');
        return;
      }
      await module.track(event, options.opensChat ?? false);
    });
  },
  async setPushToken(
    token: string,
    environment: PushEnvironment = 'automatic',
  ): Promise<void> {
    await call(async (module) => {
      if (
        typeof token !== 'string' ||
        !/^(?:[\da-f]{2})+$/i.test(token) ||
        token.length > 512 ||
        !['automatic', 'sandbox', 'production'].includes(environment)
      ) {
        warnInvalid('APNs token or environment');
        return;
      }
      await module.setPushToken(token.toLowerCase(), environment);
    });
  },
  async handlePushNotification(
    payload: Record<string, unknown>,
    options: { openChat?: boolean } = {},
  ): Promise<boolean> {
    return (
      (await call(async (module) => {
        if (
          !isRecord(payload) ||
          !isRecord(options) ||
          (options.openChat !== undefined &&
            typeof options.openChat !== 'boolean')
        ) {
          warnInvalid('notification');
          return false;
        }
        // Only this public routing field is consumed by Swift; unrelated provider payloads may not be serializable.
        const reception = payload.reception;
        if (
          !isRecord(reception) ||
          typeof reception.conversationId !== 'string' ||
          !reception.conversationId
        )
          return false;
        return module.handlePushNotification(
          reception.conversationId,
          options.openChat ?? true,
        );
      })) ?? false
    );
  },
  async refreshPaywalls(options: { invalidate?: boolean } = {}): Promise<void> {
    await call(async (module) => {
      if (
        !isRecord(options) ||
        (options.invalidate !== undefined &&
          typeof options.invalidate !== 'boolean')
      ) {
        warnInvalid('invalidate');
        return;
      }
      await module.refreshPaywalls(options.invalidate ?? false);
    });
  },
};
