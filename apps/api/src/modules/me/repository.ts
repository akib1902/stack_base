import {
  FILE_SORTS,
  type FileSort,
  type MeResponse,
  type UserSettings,
  type UserSettingsUpdate,
} from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { toIsoString } from '../../database/values';
import { ApiError } from '../../errors';
import type { AuthenticatedUser } from '../../security/token';

interface ProfileRow {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: unknown;
  theme: 'amber' | 'graphite' | null;
  defaultView: 'grid' | 'list' | null;
  defaultSort: string | null;
  trashRetentionDays: number | null;
  offlineEnabled: boolean | null;
}

interface SettingsRow {
  theme: 'amber' | 'graphite' | null;
  defaultView: 'grid' | 'list' | null;
  defaultSort: string | null;
  trashRetentionDays: number | null;
  offlineEnabled: boolean | null;
}

function toFileSort(value: string | null): FileSort {
  return (FILE_SORTS as readonly string[]).includes(value ?? '')
    ? (value as FileSort)
    : 'updated_at';
}

const SELECT_SETTINGS = `
  select
    theme,
    default_view as "defaultView",
    default_sort as "defaultSort",
    trash_retention_days as "trashRetentionDays",
    offline_enabled as "offlineEnabled"
  from public.user_settings
  where user_id = $1
`;

const SELECT_PROFILE = `
  select
    p.id,
    u.email,
    p.display_name as "displayName",
    p.avatar_url as "avatarUrl",
    p.created_at as "createdAt",
    s.theme,
    s.default_view as "defaultView",
    s.default_sort as "defaultSort",
    s.trash_retention_days as "trashRetentionDays",
    s.offline_enabled as "offlineEnabled"
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.user_settings s on s.user_id = p.id
  where p.id = $1
`;

/**
 * Load the caller's identity. Identity rows are created by a database trigger on
 * sign-up; this also provisions them defensively (idempotent) so an existing
 * identity can never end up without settings.
 */
export async function getMe(db: Db, user: AuthenticatedUser): Promise<MeResponse> {
  const first = await db.query<ProfileRow>(SELECT_PROFILE, [user.id]);

  if (first.rows.length === 0 || first.rows[0]?.theme === null) {
    await db.transaction(async (tx) => {
      await tx.query(
        'insert into public.profiles (id) values ($1) on conflict (id) do nothing',
        [user.id],
      );
      await tx.query(
        'insert into public.user_settings (user_id) values ($1) on conflict (user_id) do nothing',
        [user.id],
      );
    });
  }

  const { rows } = await db.query<ProfileRow>(SELECT_PROFILE, [user.id]);
  const row = rows[0];
  if (!row) {
    // The identity is not present in auth.users; the token cannot be honoured.
    throw new Error('Authenticated identity has no profile row.');
  }

  return {
    user: {
      id: row.id,
      email: row.email ?? user.email,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      createdAt: toIsoString(row.createdAt),
    },
    settings: {
      theme: row.theme ?? 'amber',
      defaultView: row.defaultView ?? 'grid',
      defaultSort: toFileSort(row.defaultSort),
      trashRetentionDays: row.trashRetentionDays ?? 30,
      offlineEnabled: row.offlineEnabled ?? true,
    },
  };
}

function toUserSettings(row: SettingsRow | undefined): UserSettings {
  return {
    theme: row?.theme ?? 'amber',
    defaultView: row?.defaultView ?? 'grid',
    defaultSort: toFileSort(row?.defaultSort ?? null),
    trashRetentionDays: row?.trashRetentionDays ?? 30,
    offlineEnabled: row?.offlineEnabled ?? true,
  };
}

/** Update only the caller's own settings row; unknown fields are rejected upstream. */
export async function updateUserSettings(
  db: Db,
  userId: string,
  patch: UserSettingsUpdate,
): Promise<UserSettings> {
  const params: unknown[] = [userId];
  const add = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };
  const sets: string[] = [];

  if (patch.theme !== undefined) sets.push(`theme = ${add(patch.theme)}`);
  if (patch.defaultView !== undefined) sets.push(`default_view = ${add(patch.defaultView)}`);
  if (patch.defaultSort !== undefined) sets.push(`default_sort = ${add(patch.defaultSort)}`);
  if (patch.trashRetentionDays !== undefined) {
    sets.push(`trash_retention_days = ${add(patch.trashRetentionDays)}`);
  }
  if (patch.offlineEnabled !== undefined) {
    sets.push(`offline_enabled = ${add(patch.offlineEnabled)}`);
  }

  if (sets.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 400, 'No supported settings were provided.');
  }

  await db.query(
    'insert into public.user_settings (user_id) values ($1) on conflict (user_id) do nothing',
    [userId],
  );
  await db.query(
    `update public.user_settings set ${sets.join(', ')} where user_id = $1`,
    params,
  );

  const { rows } = await db.query<SettingsRow>(SELECT_SETTINGS, [userId]);
  return toUserSettings(rows[0]);
}
