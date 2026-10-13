import { native, warnUnavailable } from './NativeReception';
import { ReceptionError } from './ReceptionError';
import { updateSnapshot } from './state';
import { pushSessionReset } from './pushSession';
import { isRecord, warnInvalid } from './validation';
import type { Identity, PushEnvironment } from './types';

async function call<T>(action: () => Promise<T>): Promise<T | undefined> {
  if (!native) {
    warnUnavailable();
    return;
  }
  try {
    return await action();
  } catch (error) {
    throw ReceptionError.from(error);
  }
}

export const methods = {
  async configure(options: { appId: string }): Promise<void> {
    await call(async () => {
      if (!isRecord(options) || typeof options.appId !== 'string') {
        warnInvalid('appId');
        return;
      }
      if (native) updateSnapshot(await native.configure(options.appId));
    });
  },
  async identify(identity: Identity): Promise<void> {
    await call(async () => {
      if (!isRecord(identity)) {
        warnInvalid('identity');
        return;
      }
      if ('token' in identity) {
        if (typeof identity.token !== 'string') {
          warnInvalid('identity token');
          return;
        }
        await native?.identifyToken(identity.token);
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
        await native?.identify(
          identity.userId,
          identity.name ?? null,
          identity.email ?? null,
        );
      }
    });
  },
  async setMetadata(value: Record<string, string>): Promise<void> {
    await call(async () => {
      if (
        !isRecord(value) ||
        !Object.values(value).every((entry) => typeof entry === 'string')
      ) {
        warnInvalid('metadata');
        return;
      }
      await native?.setMetadata(value);
    });
  },
  async logout(): Promise<void> {
    await call(async () => {
      if (native) {
        updateSnapshot(await native.logout());
        pushSessionReset();
      }
    });
  },
  async deleteData(): Promise<void> {
    await call(async () => {
      const result = await native?.deleteData();
      if (result) {
        updateSnapshot(result.state);
        if (result.error) throw ReceptionError.from(result.error);
        pushSessionReset();
      }
    });
  },
  async openChat(): Promise<void> {
    await call(async () => {
      await native?.openChat();
    });
  },
  async closeChat(): Promise<void> {
    await call(async () => {
      await native?.closeChat();
    });
  },
  async setPushToken(
    token: string,
    environment: PushEnvironment = 'automatic',
  ): Promise<void> {
    await call(async () => {
      if (
        typeof token !== 'string' ||
        !/^(?:[\da-f]{2})+$/i.test(token) ||
        token.length > 512 ||
        !['automatic', 'sandbox', 'production'].includes(environment)
      ) {
        warnInvalid('APNs token or environment');
        return;
      }
      await native?.setPushToken(token.toLowerCase(), environment);
    });
  },
  async handlePushNotification(
    payload: Record<string, unknown>,
    options: { openChat?: boolean } = {},
  ): Promise<boolean> {
    return (
      (await call(async () => {
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
        return (
          (await native?.handlePushNotification(
            reception.conversationId,
            options.openChat ?? true,
          )) ?? false
        );
      })) ?? false
    );
  },
  async refreshPaywalls(options: { invalidate?: boolean } = {}): Promise<void> {
    await call(async () => {
      if (
        !isRecord(options) ||
        (options.invalidate !== undefined &&
          typeof options.invalidate !== 'boolean')
      ) {
        warnInvalid('invalidate');
        return;
      }
      await native?.refreshPaywalls(options.invalidate ?? false);
    });
  },
};
