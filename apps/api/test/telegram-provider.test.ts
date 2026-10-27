import { errors } from 'teleproto';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/errors';
import {
  TelegramError,
  mapTelegramError,
  type TelegramAccount,
  type TelegramCodeDelivery,
  type TelegramDocumentReference,
  type TelegramGateway,
  type TelegramSignInResult,
} from '../src/storage/telegram/gateway';
import { createTelegramLoginManager } from '../src/storage/telegram/login';
import {
  createTelegramStorageProvider,
  parseTelegramReference,
  telegramReferenceOf,
} from '../src/storage/telegram/provider';

/** Structural error instances: instanceof works without constructing teleproto errors. */
function protoError<T extends object>(prototype: T, fields: Record<string, unknown>): T {
  const instance = Object.create(prototype) as T;
  return Object.assign(instance, fields);
}

describe('telegram error mapping', () => {
  it('maps rate limits with the retry delay', () => {
    const flood = protoError(Object.create(errors.FloodWaitError.prototype), { seconds: 17 });
    expect(mapTelegramError(flood)).toMatchObject({
      code: 'RATE_LIMITED',
      retryAfterSeconds: 17,
    });
  });

  it('maps invalidated sessions and missing messages', () => {
    expect(mapTelegramError(Object.create(errors.SessionRevokedError.prototype)).code).toBe(
      'SESSION_EXPIRED',
    );
    expect(mapTelegramError(Object.create(errors.AuthKeyUnregisteredError.prototype)).code).toBe(
      'SESSION_EXPIRED',
    );
    expect(mapTelegramError(Object.create(errors.MessageIdInvalidError.prototype)).code).toBe(
      'MISSING',
    );
    expect(mapTelegramError(Object.create(errors.FileReferenceExpiredError.prototype)).code).toBe(
      'MISSING',
    );
  });

  it('marks unknown failures without leaking details and passes TelegramError through', () => {
    const unknown = mapTelegramError(new Error('socket hang up'));
    expect(unknown.code).toBe('UNKNOWN');
    expect(unknown.message).not.toContain('socket hang up');
    const original = new TelegramError('RATE_LIMITED', 'wait', 5);
    expect(mapTelegramError(original)).toBe(original);
  });
});

const DOCUMENT: TelegramDocumentReference = {
  messageId: 77,
  documentId: '9007199254740993',
  accessHash: '1234567890123456789',
  fileReference: Buffer.alloc(24, 9).toString('base64'),
  dcId: 2,
  size: 4096,
  mimeType: 'application/octet-stream',
};

class FakeGateway implements TelegramGateway {
  connects: (string | null)[] = [];
  disconnects = 0;
  deleted: number[] = [];
  downloadChunks = [Buffer.from('cipher'), Buffer.from('text')];
  exists = true;

  async connect(session: string | null): Promise<void> {
    this.connects.push(session);
  }
  async disconnect(): Promise<void> {
    this.disconnects += 1;
  }
  saveSession(): string {
    return '1FAKESESSIONSTRING';
  }
  async sendCode(phoneNumber: string): Promise<TelegramCodeDelivery> {
    return { phoneCodeHash: `hash-${phoneNumber}`, viaApp: true };
  }
  async signIn(_phone: string, _hash: string, code: string): Promise<TelegramSignInResult> {
    if (code === '11111') {
      return { kind: 'signed_in', account: { id: '42', accountIdentifier: '@fake' } };
    }
    if (code === '22222') {
      return { kind: 'password_required', hint: 'favourite colour?' };
    }
    throw new TelegramError('UNKNOWN', 'code rejected');
  }
  async checkPassword(password: string): Promise<TelegramAccount> {
    if (password !== 'hunter2') {
      throw new TelegramError('NOT_AUTHENTICATED', 'wrong password');
    }
    return { id: '42', accountIdentifier: '@fake' };
  }
  async getAccount(): Promise<TelegramAccount> {
    return { id: '42', accountIdentifier: '@fake' };
  }
  async sendDocument(): Promise<TelegramDocumentReference> {
    return DOCUMENT;
  }
  async *iterMessageBytes(): AsyncIterable<Uint8Array> {
    for (const chunk of this.downloadChunks) {
      yield chunk;
    }
  }
  async deleteMessage(messageId: number): Promise<void> {
    this.deleted.push(messageId);
  }
  async inspectMessage(): Promise<{ exists: boolean; size: number | null }> {
    return this.exists ? { exists: true, size: DOCUMENT.size } : { exists: false, size: null };
  }
}

describe('telegram storage provider', () => {
  it('stores the documented reference and keeps the Telegram columns in sync', async () => {
    const gateway = new FakeGateway();
    const provider = createTelegramStorageProvider(gateway);
    const stored = await provider.upload({
      objectName: '33333333-3333-4333-8333-333333333333.bin',
      sizeBytes: DOCUMENT.size,
      sourcePath: 'ignored',
    });

    expect(stored.provider).toBe('telegram');
    expect(stored.reference).toMatchObject({
      messageId: 77,
      documentId: '9007199254740993',
      size: 4096,
      fileName: '33333333-3333-4333-8333-333333333333.bin',
    });
    expect(stored.telegram).toMatchObject({
      chatReference: 'me',
      messageReference: '77',
    });
    expect(stored.remoteSizeBytes).toBe(4096);
  });

  it('downloads, inspects and deletes through the gateway', async () => {
    const gateway = new FakeGateway();
    const provider = createTelegramStorageProvider(gateway);
    const reference = telegramReferenceOf(DOCUMENT, 'x.bin');

    const parts: Buffer[] = [];
    for await (const part of provider.download(reference)) {
      parts.push(Buffer.from(part));
    }
    expect(Buffer.concat(parts).toString()).toBe('ciphertext');

    expect(await provider.inspect(reference)).toEqual({
      status: 'available',
      remoteSizeBytes: 4096,
    });

    gateway.exists = false;
    expect(await provider.inspect(reference)).toEqual({ status: 'missing', remoteSizeBytes: null });

    await provider.delete(reference);
    expect(gateway.deleted).toEqual([77]);
  });

  it('refuses invalid references instead of guessing', async () => {
    const provider = createTelegramStorageProvider(new FakeGateway());
    expect(() => parseTelegramReference({ messageId: '77' })).toThrow(TelegramError);
    expect(() => parseTelegramReference({})).toThrow(TelegramError);
    await expect(
      (async () => {
        for await (const _chunk of provider.download({ messageId: 0 })) {
          // unreachable
        }
      })(),
    ).rejects.toThrow(TelegramError);
  });
});

describe('telegram login manager', () => {
  it('completes a login, saves the session and discards the pending state', async () => {
    const gateway = new FakeGateway();
    const manager = createTelegramLoginManager({ createGateway: () => gateway });

    const started = await manager.start('user-1', '+15550000000');
    expect(started.viaApp).toBe(true);
    expect(gateway.connects).toEqual([null]);

    const bad = await manager
      .completeCode('user-1', 'wrong-login-id', '11111')
      .catch((error: unknown) => error as ApiError);
    expect(bad).toBeInstanceOf(ApiError);
    expect((bad as ApiError).code).toBe('VALIDATION_ERROR');

    const result = await manager.completeCode('user-1', started.loginId, '11111');
    expect(result).toMatchObject({ kind: 'signed_in', session: '1FAKESESSIONSTRING' });
    expect(gateway.disconnects).toBe(1);

    // The pending login is gone; replaying it is rejected.
    await expect(manager.completeCode('user-1', started.loginId, '11111')).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('keeps the pending login for a two-factor step and completes it with the password', async () => {
    const gateway = new FakeGateway();
    const manager = createTelegramLoginManager({ createGateway: () => gateway });
    const started = await manager.start('user-2', '+15550000001');

    const step = await manager.completeCode('user-2', started.loginId, '22222');
    expect(step).toEqual({ kind: 'password_required', hint: 'favourite colour?' });
    expect(gateway.disconnects).toBe(0);

    await expect(
      manager.completePassword('user-2', started.loginId, 'nope'),
    ).rejects.toBeInstanceOf(TelegramError);

    const done = await manager.completePassword('user-2', started.loginId, 'hunter2');
    expect(done.kind).toBe('signed_in');
    expect(gateway.disconnects).toBe(1);
  });

  it('expires pending logins after the TTL', async () => {
    const gateway = new FakeGateway();
    let clock = 1_000;
    const manager = createTelegramLoginManager({
      createGateway: () => gateway,
      pendingTtlMs: 5_000,
      now: () => clock,
    });

    const started = await manager.start('user-3', '+15550000002');
    clock += 6_000;

    const expired = await manager
      .completeCode('user-3', started.loginId, '11111')
      .catch((error: unknown) => error as ApiError);
    expect((expired as ApiError).code).toBe('VALIDATION_ERROR');
    expect(gateway.disconnects).toBe(1);
  });

  it('replaces an existing pending login when a new one starts', async () => {
    const gateways = [new FakeGateway(), new FakeGateway()];
    let next = 0;
    const manager = createTelegramLoginManager({ createGateway: () => gateways[next++]! });

    await manager.start('user-4', '+15550000003');
    await manager.start('user-4', '+15550000004');

    expect(gateways[0]?.disconnects).toBe(1);
    expect(gateways[1]?.disconnects).toBe(0);

    await manager.cancel('user-4');
    expect(gateways[1]?.disconnects).toBe(1);
  });
});
