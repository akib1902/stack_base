import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { VaultResponse } from '@stackbase/contracts';
import { authHeader, createTestContext, signIn, type DevSession, type TestContext } from './helpers';

let ctx: TestContext;
let alice: DevSession;
let bob: DevSession;

beforeAll(async () => {
  ctx = await createTestContext();
  alice = await signIn(ctx.app, 'vault-alice@example.com');
  bob = await signIn(ctx.app, 'vault-bob@example.com');
});

afterAll(async () => {
  await ctx.close();
});

const SALT = Buffer.alloc(16, 1).toString('base64');
const NONCE = Buffer.alloc(24, 2).toString('base64');
const WRAPPED = Buffer.alloc(48, 3).toString('base64');
const VERIFIER = Buffer.alloc(51, 4).toString('base64');

const createBody = (): Record<string, unknown> => ({
  kdf: {
    algorithm: 'argon2id13',
    opsLimit: 3,
    memLimitBytes: 67_108_864,
    salt: SALT,
  },
  wrappedVaultKey: {
    algorithm: 'xsalsa20poly1305',
    nonce: NONCE,
    ciphertext: WRAPPED,
  },
  recoveryVerifier: {
    algorithm: 'xsalsa20poly1305',
    nonce: NONCE,
    ciphertext: VERIFIER,
  },
});

const getVault = (session: DevSession) =>
  ctx.app.inject({
    method: 'GET',
    url: '/api/v1/encryption/vault',
    headers: authHeader(session),
  });

describe('vault endpoints', () => {
  it('requires authentication', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/v1/encryption/vault' });
    expect(response.statusCode).toBe(401);
  });

  it('reports no vault before one is created', async () => {
    const response = await getVault(bob);
    expect(response.statusCode).toBe(200);
    expect((response.json() as VaultResponse).vault).toBeNull();
  });

  it('creates a vault once and never replaces it silently', async () => {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/encryption/vault',
      headers: authHeader(alice),
      payload: createBody(),
    });
    expect(created.statusCode).toBe(200);

    const vault = (created.json() as VaultResponse).vault;
    expect(vault).toMatchObject({
      format: 'stackbase-vault',
      version: 1,
      kdf: { algorithm: 'argon2id13', opsLimit: 3, memLimitBytes: 67_108_864, salt: SALT },
      wrappedVaultKey: { algorithm: 'xsalsa20poly1305', nonce: NONCE, ciphertext: WRAPPED },
    });

    const duplicate = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/encryption/vault',
      headers: authHeader(alice),
      payload: createBody(),
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({ error: { code: 'VAULT_ALREADY_EXISTS' } });

    const fetched = await getVault(alice);
    expect((fetched.json() as VaultResponse).vault).toEqual(vault);
  });

  it('isolates vaults per owner', async () => {
    const response = await getVault(bob);
    expect((response.json() as VaultResponse).vault).toBeNull();
  });

  it('rejects values whose lengths do not match the pinned format', async () => {
    const shortKey = createBody();
    shortKey.wrappedVaultKey = {
      algorithm: 'xsalsa20poly1305',
      nonce: NONCE,
      ciphertext: Buffer.alloc(16, 3).toString('base64'),
    };
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/encryption/vault',
      headers: authHeader(bob),
      payload: shortKey,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('rejects non-canonical base64 that decodes to the right length', async () => {
    const body = createBody();
    // Same bytes as SALT, but the final data character carries ignored bits.
    body.kdf = {
      algorithm: 'argon2id13',
      opsLimit: 3,
      memLimitBytes: 67_108_864,
      salt: `${SALT.slice(0, 21)}B==`,
    };
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/encryption/vault',
      headers: authHeader(bob),
      payload: body,
    });
    expect(response.statusCode).toBe(400);
  });

  it('rejects unsupported kdf profiles and extra fields', async () => {
    const weak = createBody();
    weak.kdf = {
      algorithm: 'argon2id13',
      opsLimit: 1,
      memLimitBytes: 1024,
      salt: SALT,
    };
    const weakResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/encryption/vault',
      headers: authHeader(bob),
      payload: weak,
    });
    expect(weakResponse.statusCode).toBe(400);

    const extra = { ...createBody(), plaintextPassphrase: 'oops' };
    const extraResponse = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/encryption/vault',
      headers: authHeader(bob),
      payload: extra,
    });
    expect(extraResponse.statusCode).toBe(400);
  });
});
