import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from './helpers';

/**
 * These tests exercise the database itself, not the Fastify layer: the
 * `authenticated` role is assumed and `request.jwt.claims` is set exactly as
 * Supabase does, so auth.uid() resolves to the acting user.
 */

let ctx: TestContext;
let alice: string;
let bob: string;
let aliceFile: string;
let bobFile: string;
let aliceVersion: string;

interface PgError {
  code?: string;
}

const errorCode = (error: unknown): string | undefined => (error as PgError).code;

async function asRole<T>(role: string, claims: string | null, fn: () => Promise<T>): Promise<T> {
  await ctx.db.exec(`set role ${role};`);
  if (claims) {
    await ctx.db.exec(`set request.jwt.claims = '${claims}';`);
  }
  try {
    return await fn();
  } finally {
    await ctx.db.exec('reset role; reset request.jwt.claims;');
  }
}

const asUser = <T>(userId: string, fn: () => Promise<T>): Promise<T> =>
  asRole('authenticated', JSON.stringify({ sub: userId, role: 'authenticated' }), fn);

beforeAll(async () => {
  ctx = await createTestContext();

  const users = await ctx.db.query<{ id: string; email: string }>(
    `insert into auth.users (email) values ('rls-alice@example.com'), ('rls-bob@example.com')
     returning id, email`,
  );
  alice = users.rows.find((row) => row.email === 'rls-alice@example.com')!.id;
  bob = users.rows.find((row) => row.email === 'rls-bob@example.com')!.id;

  await ctx.db.query('insert into public.folders (user_id, name) values ($1, $2)', [
    alice,
    'Alice folder',
  ]);

  const files = await ctx.db.query<{ id: string; name: string }>(
    `insert into public.files (user_id, name, mime_type, logical_size_bytes)
     values ($1, 'alice-secret.txt', 'text/plain', 10), ($2, 'bob-secret.txt', 'text/plain', 20)
     returning id, name`,
    [alice, bob],
  );
  aliceFile = files.rows.find((row) => row.name === 'alice-secret.txt')!.id;
  bobFile = files.rows.find((row) => row.name === 'bob-secret.txt')!.id;

  // Fixtures for version immutability and current-version consistency checks.
  const connection = await ctx.db.query<{ id: string }>(
    `insert into public.storage_connections (user_id, connection_status)
     values ($1, 'connected') returning id`,
    [alice],
  );
  const object = await ctx.db.query<{ id: string }>(
    `insert into public.storage_objects
       (user_id, storage_connection_id, telegram_chat_reference, telegram_message_reference, storage_status)
     values ($1, $2, 'saved', 'msg-1', 'available') returning id`,
    [alice, connection.rows[0]?.id],
  );
  const version = await ctx.db.query<{ id: string }>(
    `insert into public.file_versions
       (user_id, file_id, version_number, size_bytes, ciphertext_hash,
        encryption_format_version, encryption_manifest, storage_object_id, created_by)
     values ($1, $2, 1, 10, 'hash', 'stackbase-stream-v1', '{"formatVersion":"stackbase-stream-v1"}'::jsonb, $3, $1)
     returning id`,
    [alice, aliceFile, object.rows[0]?.id],
  );
  aliceVersion = version.rows[0]!.id;
});

afterAll(async () => {
  await ctx.close();
});

describe('row-level security on user-owned tables', () => {
  it('returns only the acting user’s rows', async () => {
    const rows = await asUser(alice, () =>
      ctx.db.query<{ id: string }>('select id from public.files'),
    );
    expect(rows.rows.map((row) => row.id)).toEqual([aliceFile]);
  });

  it('hides another user’s row even when its id is known', async () => {
    const rows = await asUser(alice, () =>
      ctx.db.query<{ id: string }>('select id from public.files where id = $1', [bobFile]),
    );
    expect(rows.rows).toHaveLength(0);
  });

  it('rejects inserting a row owned by another user', async () => {
    const error = await asUser(alice, () =>
      ctx.db
        .query(
          `insert into public.files (user_id, name, mime_type, logical_size_bytes)
           values ($1, 'forged.txt', 'text/plain', 1)`,
          [bob],
        )
        .catch((caught: unknown) => caught),
    );
    expect(errorCode(error)).toBe('42501');
  });

  it('cannot claim an existing row by rewriting its owner', async () => {
    const result = await asUser(alice, () =>
      ctx.db.query('update public.files set user_id = $1 where id = $2', [alice, bobFile]),
    );
    expect(result.rowCount).toBe(0);

    const stillBobs = await asUser(bob, () =>
      ctx.db.query<{ user_id: string }>('select user_id from public.files where id = $1', [
        bobFile,
      ]),
    );
    expect(stillBobs.rows[0]?.user_id).toBe(bob);
  });

  it('cannot delete another user’s row', async () => {
    const result = await asUser(alice, () =>
      ctx.db.query('delete from public.files where id = $1', [bobFile]),
    );
    expect(result.rowCount).toBe(0);

    const exists = await asUser(bob, () =>
      ctx.db.query('select 1 from public.files where id = $1', [bobFile]),
    );
    expect(exists.rows).toHaveLength(1);
  });

  it('cannot attach a tag to another user’s file', async () => {
    const tag = await ctx.db.query<{ id: string }>(
      'insert into public.tags (user_id, name) values ($1, $2) returning id',
      [alice, 'alice-tag'],
    );
    const error = await asUser(alice, () =>
      ctx.db
        .query('insert into public.file_tags (user_id, file_id, tag_id) values ($1, $2, $3)', [
          alice,
          bobFile,
          tag.rows[0]?.id,
        ])
        .catch((caught: unknown) => caught),
    );
    expect(['42501', '23503']).toContain(errorCode(error));
  });

  it('enforces case-insensitive tag uniqueness per owner', async () => {
    await ctx.db.query('insert into public.tags (user_id, name) values ($1, $2)', [
      alice,
      'Receipts',
    ]);
    const error = await ctx.db
      .query('insert into public.tags (user_id, name) values ($1, $2)', [alice, ' receipts '])
      .catch((caught: unknown) => caught);
    expect(errorCode(error)).toBe('23505');
  });
});

describe('internal storage tables', () => {
  it('are not readable by the authenticated role', async () => {
    const error = await asUser(alice, () =>
      ctx.db
        .query('select * from public.storage_connections')
        .catch((caught: unknown) => caught),
    );
    expect(errorCode(error)).toBe('42501');
  });

  it('are not readable by anon', async () => {
    const error = await asRole('anon', null, () =>
      ctx.db.query('select * from public.files').catch((caught: unknown) => caught),
    );
    expect(errorCode(error)).toBe('42501');
  });
});

describe('ownership-aware relationships', () => {
  it('rejects a folder whose parent belongs to another user', async () => {
    const bobFolder = await ctx.db.query<{ id: string }>(
      'insert into public.folders (user_id, name) values ($1, $2) returning id',
      [bob, 'Bob folder'],
    );
    const error = await ctx.db
      .query('insert into public.folders (user_id, name, parent_folder_id) values ($1, $2, $3)', [
        alice,
        'Hijacked',
        bobFolder.rows[0]?.id,
      ])
      .catch((caught: unknown) => caught);
    expect(errorCode(error)).toBe('23503');
  });

  it('rejects a folder hierarchy cycle', async () => {
    const parent = await ctx.db.query<{ id: string }>(
      'insert into public.folders (user_id, name) values ($1, $2) returning id',
      [alice, 'Cycle parent'],
    );
    const child = await ctx.db.query<{ id: string }>(
      'insert into public.folders (user_id, name, parent_folder_id) values ($1, $2, $3) returning id',
      [alice, 'Cycle child', parent.rows[0]?.id],
    );
    const error = await ctx.db
      .query('update public.folders set parent_folder_id = $1 where id = $2', [
        child.rows[0]?.id,
        parent.rows[0]?.id,
      ])
      .catch((caught: unknown) => caught);
    expect(errorCode(error)).toBe('23514');
  });

  it('rejects a current_version that belongs to another file', async () => {
    const otherFile = await ctx.db.query<{ id: string }>(
      `insert into public.files (user_id, name, mime_type, logical_size_bytes)
       values ($1, 'other.txt', 'text/plain', 1) returning id`,
      [alice],
    );
    const error = await ctx.db
      .query('update public.files set current_version_id = $1 where id = $2', [
        aliceVersion,
        otherFile.rows[0]?.id,
      ])
      .catch((caught: unknown) => caught);
    expect(errorCode(error)).toBe('23514');
  });

  it('keeps file versions immutable', async () => {
    const error = await ctx.db
      .query('update public.file_versions set size_bytes = 999 where id = $1', [aliceVersion])
      .catch((caught: unknown) => caught);
    expect(errorCode(error)).toBe('23514');
  });
});

describe('audit events', () => {
  it('are readable by their owner and hidden from everyone else', async () => {
    await ctx.db.query(
      `insert into public.audit_events (user_id, event_type, result)
       values ($1, 'file.download', 'success')`,
      [alice],
    );

    const aliceRows = await asUser(alice, () =>
      ctx.db.query('select event_type from public.audit_events'),
    );
    expect(aliceRows.rows).toHaveLength(1);

    const bobRows = await asUser(bob, () =>
      ctx.db.query('select event_type from public.audit_events'),
    );
    expect(bobRows.rows).toHaveLength(0);
  });

  it('cannot be written by the authenticated role', async () => {
    const error = await asUser(alice, () =>
      ctx.db
        .query(
          `insert into public.audit_events (user_id, event_type, result)
           values ($1, 'file.delete', 'success')`,
          [alice],
        )
        .catch((caught: unknown) => caught),
    );
    expect(errorCode(error)).toBe('42501');
  });
});
