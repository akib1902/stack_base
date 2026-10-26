import 'dotenv/config';
import { ConfigError, loadConfig } from '../config/env';
import { extensionOf } from '../modules/library/names';
import { openDb, type Db } from './db';
import { runMigrations } from './migrations';

/**
 * Development fixtures. Files normally enter the library through the encrypted
 * upload pipeline, which ships in the storage milestone; until then this command
 * gives a local database realistic metadata so the file manager can be exercised
 * end to end. It refuses to run in production and never touches another
 * account's rows.
 */

interface SeedFolder {
  name: string;
  parent?: string;
  deleted?: boolean;
}

interface SeedFile {
  name: string;
  mimeType: string;
  sizeBytes: number;
  folder?: string;
  favorite?: boolean;
  description?: string;
  tags?: string[];
  deleted?: boolean;
}

const FOLDERS: SeedFolder[] = [
  { name: 'Projects' },
  { name: 'Projects/Design', parent: 'Projects' },
  { name: 'Screenshots' },
  { name: 'Documents' },
  { name: 'Receipts' },
  { name: 'Old exports', deleted: true },
];

const TAGS = [
  { name: 'Client work', colorToken: 'amber' },
  { name: 'Inspiration', colorToken: 'rose' },
  { name: 'Taxes', colorToken: 'slate' },
];

const MB = 1024 * 1024;

const FILES: SeedFile[] = [
  {
    name: 'brand-guidelines.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2.4 * MB,
    folder: 'Projects',
    favorite: true,
    description: 'Palette, type scale and logo clear-space rules.',
    tags: ['Client work'],
  },
  {
    name: 'landing-hero.png',
    mimeType: 'image/png',
    sizeBytes: 1.8 * MB,
    folder: 'Projects/Design',
    favorite: true,
    tags: ['Client work', 'Inspiration'],
  },
  {
    name: 'mobile-checkout.png',
    mimeType: 'image/png',
    sizeBytes: 900 * 1024,
    folder: 'Projects/Design',
  },
  {
    name: 'product-tour.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 48 * MB,
    folder: 'Projects',
    description: 'Screen recording for the release notes.',
  },
  {
    name: 'deep-work.mp3',
    mimeType: 'audio/mpeg',
    sizeBytes: 6 * MB,
  },
  {
    name: 'tax-return-2025.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 512 * 1024,
    folder: 'Receipts',
    tags: ['Taxes'],
  },
  {
    name: 'invoices-2025.zip',
    mimeType: 'application/zip',
    sizeBytes: 4 * MB,
    folder: 'Documents',
    tags: ['Taxes'],
  },
  {
    name: 'stackbase-1.4.2.apk',
    mimeType: 'application/vnd.android.package-archive',
    sizeBytes: 18 * MB,
  },
  {
    name: 'setup.dmg',
    mimeType: 'application/x-apple-diskimage',
    sizeBytes: 92 * MB,
  },
  {
    name: 'ubuntu-24.04.iso',
    mimeType: 'application/octet-stream',
    sizeBytes: 2800 * MB,
  },
  {
    name: 'README.md',
    mimeType: 'text/markdown',
    sizeBytes: 12 * 1024,
    folder: 'Documents',
    favorite: true,
  },
  {
    name: 'notes.txt',
    mimeType: 'text/plain',
    sizeBytes: 8 * 1024,
  },
  {
    name: 'export-2024.zip',
    mimeType: 'application/zip',
    sizeBytes: 120 * MB,
    folder: 'Old exports',
    deleted: true,
  },
  {
    name: 'draft.md',
    mimeType: 'text/markdown',
    sizeBytes: 4 * 1024,
    deleted: true,
    description: 'Half-finished write-up.',
  },
];

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function ensureIdentity(db: Db, email: string): Promise<string> {
  const existing = await db.query<{ id: string }>(
    'select id from auth.users where lower(email) = $1',
    [email],
  );
  const found = existing.rows[0];
  if (found) {
    return found.id;
  }

  const inserted = await db.query<{ id: string }>(
    'insert into auth.users (email) values ($1) returning id',
    [email],
  );
  const id = inserted.rows[0]?.id;
  if (!id) {
    throw new Error('Failed to create the development identity.');
  }
  return id;
}

async function seed(db: Db, userId: string): Promise<{ folders: number; files: number; tags: number }> {
  return db.transaction(async (tx) => {
    const folderIds = new Map<string, string>();

    for (const folder of FOLDERS) {
      const parentId = folder.parent ? folderIds.get(folder.parent) : null;
      if (folder.parent && !parentId) {
        throw new Error(`Seed folder ${folder.name} references an unknown parent.`);
      }
      const { rows } = await tx.query<{ id: string }>(
        `insert into public.folders (user_id, name, parent_folder_id, deleted_at)
         values ($1, $2, $3, case when $4 then now() else null end)
         returning id`,
        [userId, folder.name, parentId, folder.deleted ?? false],
      );
      const id = rows[0]?.id;
      if (!id) {
        throw new Error(`Failed to insert seed folder ${folder.name}.`);
      }
      folderIds.set(folder.name, id);
    }

    const tagIds = new Map<string, string>();
    for (const tag of TAGS) {
      const { rows } = await tx.query<{ id: string }>(
        'insert into public.tags (user_id, name, color_token) values ($1, $2, $3) returning id',
        [userId, tag.name, tag.colorToken],
      );
      const id = rows[0]?.id;
      if (!id) {
        throw new Error(`Failed to insert seed tag ${tag.name}.`);
      }
      tagIds.set(tag.name, id);
    }

    for (const file of FILES) {
      const folderId = file.folder ? folderIds.get(file.folder) : null;
      if (file.folder && !folderId) {
        throw new Error(`Seed file ${file.name} references an unknown folder.`);
      }

      const { rows } = await tx.query<{ id: string }>(
        `insert into public.files
           (user_id, folder_id, name, extension, mime_type, logical_size_bytes,
            favorite, description, deleted_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, case when $9 then now() else null end)
         returning id`,
        [
          userId,
          folderId,
          file.name,
          extensionOf(file.name),
          file.mimeType,
          Math.round(file.sizeBytes),
          file.favorite ?? false,
          file.description ?? null,
          file.deleted ?? false,
        ],
      );
      const fileId = rows[0]?.id;
      if (!fileId) {
        throw new Error(`Failed to insert seed file ${file.name}.`);
      }

      for (const tagName of file.tags ?? []) {
        const tagId = tagIds.get(tagName);
        if (!tagId) {
          throw new Error(`Seed file ${file.name} references an unknown tag.`);
        }
        await tx.query(
          'insert into public.file_tags (user_id, file_id, tag_id) values ($1, $2, $3)',
          [userId, fileId, tagId],
        );
      }
    }

    return { folders: FOLDERS.length, files: FILES.length, tags: TAGS.length };
  });
}

async function clearLibrary(db: Db, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.query('delete from public.files where user_id = $1', [userId]);

    // Deepest folders first: the parent foreign key restricts deletion.
    const ranked = await tx.query<{ id: string }>(
      `with recursive ranked as (
        select id, 0 as depth from public.folders
        where user_id = $1 and parent_folder_id is null
        union all
        select child.id, parent.depth + 1
        from public.folders child
        join ranked parent on child.parent_folder_id = parent.id
        where child.user_id = $1
      )
      select id from ranked order by depth desc`,
      [userId],
    );

    for (const folder of ranked.rows) {
      await tx.query('delete from public.folders where user_id = $1 and id = $2', [
        userId,
        folder.id,
      ]);
    }

    await tx.query('delete from public.tags where user_id = $1', [userId]);
  });
}

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

  if (config.isProduction) {
    console.error('Refusing to seed a production database.');
    process.exit(1);
  }
  if (config.auth.mode !== 'dev') {
    console.error(
      'Seeding creates a local development identity, so it requires AUTH_MODE=dev.',
    );
    process.exit(1);
  }

  const email = (readFlag('--email') ?? 'demo@stackbase.local').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Pass a valid address, for example: pnpm seed --email you@example.com');
    process.exit(1);
  }

  const db = openDb(config.database);
  try {
    if (db.kind === 'pglite') {
      await runMigrations(db, { localAuthStub: true });
    } else {
      // A hosted database is migrated separately; fail with a useful instruction.
      try {
        await db.query('select 1 from public.files limit 1');
      } catch {
        throw new Error('The database has no StackBase schema yet. Run pnpm db:migrate first.');
      }
    }

    const userId = await ensureIdentity(db, email);
    await db.query(
      'insert into public.profiles (id) values ($1) on conflict (id) do nothing',
      [userId],
    );
    await db.query(
      'insert into public.user_settings (user_id) values ($1) on conflict (user_id) do nothing',
      [userId],
    );

    const existing = await db.query<{ total: unknown }>(
      `select count(*)::int as total from public.files where user_id = $1`,
      [userId],
    );
    const total = Number((existing.rows[0]?.total as number | string | undefined) ?? 0);

    if (total > 0) {
      if (!process.argv.includes('--reset')) {
        console.error(
          `${email} already has library data. Re-run with --reset to replace it ` +
            '(only that account’s files, folders and tags are removed).',
        );
        process.exit(1);
      }
      await clearLibrary(db, userId);
    }

    const result = await seed(db, userId);

    console.log(`Seeded ${email}`);
    console.log(`  folders: ${result.folders}`);
    console.log(`  files:   ${result.files}`);
    console.log(`  tags:    ${result.tags}`);
    console.log('Sign in with that email; no password is required in development.');
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
