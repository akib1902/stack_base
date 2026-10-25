import 'dotenv/config';
import { loadDatabaseConfig } from '../config/env';
import { openDb } from './db';
import { runMigrations } from './migrations';

const config = loadDatabaseConfig();
const db = openDb(config);
const localAuthStub = db.kind === 'pglite' || config.allowLocalAuthStub;

try {
  const { applied, skipped } = await runMigrations(db, { localAuthStub });
  const target = config.url ? 'PostgreSQL (DATABASE_URL)' : `local PGlite (${config.localDataDir})`;
  console.log(`Target: ${target}`);
  console.log(`Applied: ${applied.length === 0 ? 'none' : applied.join(', ')}`);
  console.log(`Already applied: ${skipped.length}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('schema "auth" does not exist')) {
    console.error(
      'This database has no Supabase auth schema. Point DATABASE_URL at a Supabase ' +
        'project, or set STACKBASE_LOCAL_AUTH_STUB=1 to install the documented local stub.',
    );
  } else {
    console.error(`Migration failed: ${message}`);
  }
  process.exitCode = 1;
} finally {
  await db.close();
}
