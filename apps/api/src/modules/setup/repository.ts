import type {
  SetupStatusResponse,
  StorageConnectionStatus,
  StorageProvider,
} from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { toCount, toIsoString } from '../../database/values';
import { ensureLocalConnection } from '../../storage/registry';

interface ConnectionRow {
  connectionStatus: StorageConnectionStatus;
  accountIdentifier: string | null;
  lastValidatedAt: unknown;
  lastErrorCode: string | null;
}

interface LibraryRow {
  files: unknown;
  folders: unknown;
  bytes: unknown;
}

const LOAD_CONNECTION = `
  select
    connection_status as "connectionStatus",
    account_identifier as "accountIdentifier",
    last_validated_at as "lastValidatedAt",
    last_error_code as "lastErrorCode"
  from public.storage_connections
  where user_id = $1 and provider = $2
  order by created_at desc
  limit 1
`;

const LOAD_LIBRARY = `
  select
    (select count(*) from public.files where user_id = $1 and deleted_at is null) as files,
    (select count(*) from public.folders where user_id = $1 and deleted_at is null) as folders,
    (
      select coalesce(sum(logical_size_bytes), 0)
      from public.files
      where user_id = $1 and deleted_at is null
    ) as bytes
`;

const LOAD_VAULT = `
  select 1 as present from public.encryption_vaults where user_id = $1
`;

/**
 * Real, owner-scoped setup state. Nothing is inferred or fabricated: a user with
 * no connection and no files reports exactly that. The local development
 * provider is always available, so its connection row is provisioned
 * idempotently instead of showing a placeholder state (ADR-015).
 */
export async function getSetupStatus(
  db: Db,
  userId: string,
  options: { provider: StorageProvider },
): Promise<SetupStatusResponse> {
  if (options.provider === 'local') {
    await ensureLocalConnection(db, userId);
  }

  const [connection, library, vault] = await Promise.all([
    db.query<ConnectionRow>(LOAD_CONNECTION, [userId, options.provider]),
    db.query<LibraryRow>(LOAD_LIBRARY, [userId]),
    db.query(LOAD_VAULT, [userId]),
  ]);

  const connectionRow = connection.rows[0];
  const libraryRow = library.rows[0];

  return {
    storage: {
      provider: options.provider,
      status: connectionRow?.connectionStatus ?? 'not_configured',
      accountIdentifier: connectionRow?.accountIdentifier ?? null,
      lastValidatedAt: connectionRow?.lastValidatedAt
        ? toIsoString(connectionRow.lastValidatedAt)
        : null,
      lastErrorCode: connectionRow?.lastErrorCode ?? null,
    },
    encryption: {
      vault: vault.rows.length > 0 ? 'configured' : 'not_configured',
    },
    library: {
      files: toCount(libraryRow?.files),
      folders: toCount(libraryRow?.folders),
      bytes: toCount(libraryRow?.bytes),
    },
  };
}
