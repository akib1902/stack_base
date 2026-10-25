import 'dotenv/config';
import { ConfigError, loadConfig } from './config/env';
import { openDb } from './database/db';
import { runMigrations } from './database/migrations';
import { buildApp } from './app';

async function main(): Promise<void> {
  let config: ReturnType<typeof loadConfig>;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const db = openDb(config.database);

  if (db.kind === 'pglite') {
    // Local-first convenience: create/upgrade the local database on boot.
    const { applied } = await runMigrations(db, { localAuthStub: true });
    if (applied.length > 0) {
      console.log(`[db] applied migrations: ${applied.join(', ')}`);
    }
  }

  const app = await buildApp({ config, db });

  if (config.auth.mode === 'dev') {
    app.log.warn(
      'AUTH_MODE=dev: local development sessions are enabled. Configure Supabase Auth before deploying.',
    );
  }

  await app.listen({ host: config.host, port: config.port });

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await db.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  console.error('Failed to start StackBase API:', error);
  process.exit(1);
});
