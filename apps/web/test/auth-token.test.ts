import { describe, expect, it } from 'vitest';
import { tokenExpiresWithin } from '@/lib/auth/token';

const tokenWith = (payload: unknown): string => {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${encoded}.signature`;
};

describe('tokenExpiresWithin', () => {
  const now = 1_700_000_000_000;

  it('leaves a token with more than the leeway alone', () => {
    expect(tokenExpiresWithin(tokenWith({ exp: now / 1000 + 3600 }), 60, now)).toBe(false);
  });

  it('refreshes inside the leeway', () => {
    expect(tokenExpiresWithin(tokenWith({ exp: now / 1000 + 30 }), 60, now)).toBe(true);
  });

  it('treats malformed and unexpiring tokens as expiring', () => {
    expect(tokenExpiresWithin('not-a-jwt', 60, now)).toBe(true);
    expect(tokenExpiresWithin(tokenWith({}), 60, now)).toBe(true);
  });
});