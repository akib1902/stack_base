import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Db } from './db';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Repository paths, resolved from this module rather than the shell cwd. */
export const MIGRATIONS_DIR = path.resolve(here, '../../../../supabase/migrations');
export const LOCAL_AUTH_STUB_PATH = path.resolve(
  here,
  '../../../../supabase/local/0000_local_auth_stub.sql',
);

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

const checksum = (sql: string): string =>
  createHash('sha256').update(sql).digest('hex');

async function listMigrationFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  return entries.filter((name) => name.endsWith('.sql')).sort();
}

/**
 * Apply every pending migration in filename order. Migrations are immutable:
 * re-running against a database whose recorded checksum differs fails loudly
 * instead of silently drifting.
 */
export async function runMigrations(
  db: Db,
  options: { localAuthStub: boolean; migrationsDir?: string },
): Promise<MigrationResult> {
  const dir = options.migrationsDir ?? MIGRATIONS_DIR;

  if (options.localAuthStub) {
    const stub = await readFile(LOCAL_AUTH_STUB_PATH, 'utf8');
    await db.exec(stub);
  }

  await db.exec(`
    create table if not exists public.schema_migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    );
    alter table public.schema_migrations enable row level security;
  `);

  const appliedRows = await db.query<{ name: string; checksum: string }>(
    'select name, checksum from public.schema_migrations',
  );
  const applied = new Map(appliedRows.rows.map((row) => [row.name, row.checksum]));

  const result: MigrationResult = { applied: [], skipped: [] };

  for (const name of await listMigrationFiles(dir)) {
    const sql = await readFile(path.join(dir, name), 'utf8');
    const digest = checksum(sql);
    const previous = applied.get(name);

    if (previous !== undefined) {
      if (previous !== digest) {
        throw new Error(
          `Migration ${name} was modified after being applied (checksum mismatch). ` +
            'Migrations are immutable; add a new migration instead.',
        );
      }
      result.skipped.push(name);
      continue;
    }

    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query(
        'insert into public.schema_migrations (name, checksum) values ($1, $2)',
        [name, digest],
      );
    });
    result.applied.push(name);
  }

  return result;
}
