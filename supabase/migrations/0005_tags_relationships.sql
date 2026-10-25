-- 0005_tags_relationships.sql
-- Tags and the file/tag join table, both ownership-aware.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color_token text,
  created_at timestamptz not null default now(),
  constraint tags_name_length check (length(btrim(name)) between 1 and 64),
  constraint tags_user_id_unique unique (user_id, id)
);

comment on table public.tags is
  'User-defined labels. Uniqueness is case-insensitive per owner (see index below).';

-- Documented case-insensitive uniqueness policy.
create unique index tags_user_name_case_insensitive
  on public.tags (user_id, lower(btrim(name)));

create table public.file_tags (
  user_id uuid not null,
  file_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (file_id, tag_id),
  constraint file_tags_file_same_owner foreign key (user_id, file_id)
    references public.files (user_id, id)
    on delete cascade,
  constraint file_tags_tag_same_owner foreign key (user_id, tag_id)
    references public.tags (user_id, id)
    on delete cascade
);

comment on table public.file_tags is
  'Join table. The shared user_id column plus ownership-aware foreign keys make '
  'cross-user tagging impossible even for privileged writers.';
