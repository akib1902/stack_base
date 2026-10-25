import 'dotenv/config';
import { rm } from 'node:fs/promises';
import { loadDatabaseConfig } from '../config/env';
import { openDb } from './db';
import { runMigrations } from './migrations';

const config = loadDatabaseConfig();

if (config.url) {
  // Never drop tables in a shared PostgreSQL database from a helper script.
  console.error(
    'db:reset only resets the local PGlite database. DATABASE_URL is set; ' +
      'drop and recreate that database deliberately instead.',
  );
  process.exit(1);
}

await rm(config.localDataDir, { recursive: true, force: true });

const db = openDb(config);
try {
  const { applied } = await runMigrations(db, { localAuthStub: true });
  console.log(`Recreated ${config.localDataDir}`);
  console.log(`Applied: ${applied.join(', ')}`);
} finally {
  await db.close();
}
