import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import type { DatabaseConfig } from '../config/env';

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface Queryable {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
}

export interface Db extends Queryable {
  readonly kind: 'pglite' | 'pg';
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * Local-first driver: a real PostgreSQL engine compiled to WebAssembly, persisted
 * to disk. Production deployments set DATABASE_URL and use the pg driver.
 */
export function createPGliteDb(dataDir?: string): Db {
  if (dataDir) {
    // PGlite creates its data directory non-recursively; make parents first.
    mkdirSync(dataDir, { recursive: true });
  }
  const client = dataDir ? new PGlite(dataDir) : new PGlite();

  const db: Db = {
    kind: 'pglite',
    async query<T>(sql: string, params?: readonly unknown[]) {
      const result = await client.query<T>(sql, params ? [...params] : undefined);
      return {
        rows: result.rows,
        rowCount: result.affectedRows ?? result.rows.length,
      };
    },
    async exec(sql: string) {
      await client.exec(sql);
    },
    async transaction<T>(fn: (tx: Queryable) => Promise<T>) {
      await client.exec('begin');
      try {
        const value = await fn(db);
        await client.exec('commit');
        return value;
      } catch (error) {
        await client.exec('rollback').catch(() => undefined);
        throw error;
      }
    },
    async close() {
      await client.close();
    },
  };

  return db;
}

export function createPgDb(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString, max: 10 });

  const queryable = (runner: pg.Pool | pg.PoolClient): Queryable => ({
    async query<T>(sql: string, params?: readonly unknown[]) {
      const result = await runner.query(sql, params ? [...params] : undefined);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async exec(sql: string) {
      await runner.query(sql);
    },
  });

  return {
    kind: 'pg',
    ...queryable(pool),
    async transaction<T>(fn: (tx: Queryable) => Promise<T>) {
      const client = await pool.connect();
      try {
        await client.query('begin');
        const value = await fn(queryable(client));
        await client.query('commit');
        return value;
      } catch (error) {
        await client.query('rollback').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

export function openDb(config: DatabaseConfig): Db {
  if (config.url) {
    return createPgDb(config.url);
  }
  return createPGliteDb(config.localDataDir);
}

export function isDatabaseUnavailable(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === '57P01' ||
    code === '57P03' ||
    code === '08000' ||
    code === '08003' ||
    code === '08006' ||
    code === '53300'
  );
}
