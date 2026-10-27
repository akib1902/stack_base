import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SessionCryptoError, openSession, sealSession } from '../src/storage/session-crypto';

const key = (): { key: Buffer; version: string } => ({
  key: randomBytes(32),
  version: 'v1',
});

describe('session string sealing (A4.4)', () => {
  it('round-trips a session string', () => {
    const sessionKey = key();
    const session = '1BVtsOK4Bu7JA-session-string-value';
    const sealed = sealSession(session, sessionKey);
    expect(sealed.toString('utf8')).toMatch(/^v1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
    expect(openSession(sealed, sessionKey)).toBe(session);
  });

  it('produces a different ciphertext for the same plaintext', () => {
    const sessionKey = key();
    const first = sealSession('same-session', sessionKey);
    const second = sealSession('same-session', sessionKey);
    expect(first.equals(second)).toBe(false);
    expect(openSession(first, sessionKey)).toBe(openSession(second, sessionKey));
  });

  it('rejects a tampered ciphertext', () => {
    const sessionKey = key();
    const sealed = sealSession('session', sessionKey);
    const parts = sealed.toString('utf8').split('.');
    const body = Buffer.from(parts[2] as string, 'base64');
    body[0] = (body[0] as number) ^ 0xff;
    const tampered = Buffer.from(`v1.${parts[1]}.${body.toString('base64')}`, 'utf8');
    expect(() => openSession(tampered, sessionKey)).toThrow(SessionCryptoError);
  });

  it('rejects the wrong key', () => {
    const sealed = sealSession('session', key());
    expect(() => openSession(sealed, key())).toThrow(SessionCryptoError);
  });

  it('rejects a key-version mismatch', () => {
    const sessionKey = key();
    const sealed = sealSession('session', sessionKey);
    expect(() => openSession(sealed, { key: sessionKey.key, version: 'v2' })).toThrow(
      SessionCryptoError,
    );
  });

  it('rejects malformed input', () => {
    const sessionKey = key();
    expect(() => openSession(Buffer.from('not-sealed', 'utf8'), sessionKey)).toThrow(
      SessionCryptoError,
    );
    expect(() => openSession(Buffer.from('v1.AAAA.AAAA', 'utf8'), sessionKey)).toThrow(
      SessionCryptoError,
    );
  });
});
