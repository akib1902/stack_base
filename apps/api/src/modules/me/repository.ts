import type { MeResponse } from '@stackbase/contracts';
import type { Db } from '../../database/db';
import { toIsoString } from '../../database/values';
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
      defaultSort: row.defaultSort ?? 'updated_at',
      trashRetentionDays: row.trashRetentionDays ?? 30,
      offlineEnabled: row.offlineEnabled ?? true,
    },
  };
}
