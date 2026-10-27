import 'dotenv/config';
import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import type { StorageProvider as StorageProviderName } from '@stackbase/contracts';
import { ConfigError, loadConfig } from '../config/env';
import { openDb } from '../database/db';
import { runMigrations } from '../database/migrations';
import { toCount } from '../database/values';
import { openStorageProvider, type OpenStorageProvider } from './registry';

/**
 * Operator command (SRS A4.2 inspection/reconciliation, ADR-017 cleanup):
 *
 *   pnpm storage:verify --email you@example.com [--sweep]
 *
 * Re-inspects every storage object against its provider, updates
 * `storage_status` / `last_verified_at`, and — with `--sweep` or by default —
 * removes staging files that no unfinished upload job still references.
 * Refuses to run against a production process configuration.
 */

const readFlag = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

interface ObjectRow {
  id: string;
  provider: StorageProviderName;
  reference: unknown;
  remoteSize: unknown;
  status: string;
}

const STAGING_IDLE_MS = 60 * 60 * 1000;

async function sweepStaging(
  stagingDir: string,
  userId: string,
  db: Awaited<ReturnType<typeof openDb>>,
): Promise<number> {
  const dir = path.join(stagingDir, userId);
  let removed = 0;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return 0;
  }

  for (const entry of entries) {
    if (!entry.endsWith('.part') && !entry.endsWith('.bin')) {
      continue;
    }
    const full = path.join(dir, entry);
    const info = await stat(full);
    const age = Date.now() - info.mtimeMs;

    if (entry.endsWith('.part')) {
      const jobId = entry.slice(0, -'.part'.length);
      const job = await db.query<{ id: string; status: string }>(
        `select id, status from public.upload_jobs
          where user_id = $1 and id = $2
            and status not in ('completed', 'cancelled')`,
        [userId, jobId],
      );
      // An active job's staging file is data, not garbage.
      if (job.rows.length > 0 && age < STAGING_IDLE_MS) {
        continue;
      }
      if (job.rows.length > 0) {
        console.log(`  keep    ${entry} (job ${job.rows[0]?.status} but recent)`);
        continue;
      }
    } else if (age < STAGING_IDLE_MS) {
      // Temporary provider copies are short-lived; give them an hour.
      continue;
    }

    await rm(full, { force: true });
    console.log(`  removed ${entry}`);
    removed += 1;
  }
  return removed;
}

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  if (config.isProduction) {
    console.error('storage:verify is an operator tool for non-production setups.');
    process.exit(1);
  }

  const email = (readFlag('--email') ?? 'demo@stackbase.local').trim().toLowerCase();
  const db = openDb(config.database);

  const handles = new Map<StorageProviderName, OpenStorageProvider>();
  const closeAll = async (): Promise<void> => {
    for (const handle of handles.values()) {
      await handle.close();
    }
  };

  try {
    if (db.kind === 'pglite') {
      await runMigrations(db, { localAuthStub: true });
    }

    const user = await db.query<{ id: string }>(
      'select id from auth.users where lower(email) = $1',
      [email],
    );
    const userId = user.rows[0]?.id;
    if (!userId) {
      console.error(`No account exists for ${email}.`);
      process.exit(1);
    }

    const objects = await db.query<ObjectRow>(
      `select id, provider, provider_reference as "reference",
              remote_size_bytes as "remoteSize", storage_status as "status"
         from public.storage_objects
        where user_id = $1
        order by created_at`,
      [userId],
    );

    console.log(`Verifying ${objects.rows.length} stored object(s) for ${email}`);

    let available = 0;
    let missing = 0;
    let reconciliation = 0;

    for (const object of objects.rows) {
      const expectedSize = object.remoteSize === null ? null : toCount(object.remoteSize);
      try {
        let handle = handles.get(object.provider);
        if (!handle) {
          handle = await openStorageProvider({ config, db }, userId, object.provider);
          handles.set(object.provider, handle);
        }

        const inspection = await handle.provider.inspect(
          object.reference as Record<string, unknown>,
        );
        const sizeMatches =
          inspection.remoteSizeBytes === null ||
          expectedSize === null ||
          inspection.remoteSizeBytes === expectedSize;

        if (inspection.status === 'available' && sizeMatches) {
          available += 1;
          console.log(`  ok      ${object.id} (${object.provider})`);
          await db.query(
            `update public.storage_objects
               set storage_status = 'available', last_verified_at = now()
             where id = $1`,
            [object.id],
          );
        } else if (inspection.status === 'missing') {
          missing += 1;
          console.log(`  missing ${object.id} (${object.provider})`);
          await db.query(
            `update public.storage_objects
               set storage_status = 'missing', last_verified_at = now()
             where id = $1`,
            [object.id],
          );
        } else {
          reconciliation += 1;
          console.log(
            `  size    ${object.id} (${object.provider}) expected ${expectedSize} bytes, provider reports ${inspection.remoteSizeBytes}`,
          );
          await db.query(
            `update public.storage_objects
               set storage_status = 'reconciliation_required', last_verified_at = now()
             where id = $1`,
            [object.id],
          );
        }
      } catch (error) {
        reconciliation += 1;
        const reason = error instanceof Error ? error.name : 'unknown error';
        console.log(`  error   ${object.id} (${object.provider}): ${reason}`);
        await db
          .query(
            `update public.storage_objects
               set storage_status = 'reconciliation_required', last_verified_at = now()
             where id = $1`,
            [object.id],
          )
          .catch(() => undefined);
      }
    }

    console.log('Sweeping staging');
    const removed = await sweepStaging(config.storage.stagingDir, userId, db);

    console.log('');
    console.log(`  available:                   ${available}`);
    console.log(`  missing:                     ${missing}`);
    console.log(`  reconciliation_required:     ${reconciliation}`);
    console.log(`  staging files removed:       ${removed}`);
  } finally {
    await closeAll();
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
