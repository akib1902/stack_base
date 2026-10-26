-- 0011_library_default_sort_values.sql
-- The metadata milestone exposes six concrete sort keys. The original check
-- constraint described an earlier, unused set, so align it and rewrite any
-- stored value from the old vocabulary.

alter table public.user_settings
  drop constraint user_settings_default_sort_check;

update public.user_settings
  set default_sort = 'name_asc'
  where default_sort = 'name';

update public.user_settings
  set default_sort = 'size_desc'
  where default_sort = 'logical_size_bytes';

alter table public.user_settings
  add constraint user_settings_default_sort_check check (
    default_sort in (
      'updated_at',
      'created_at',
      'name_asc',
      'name_desc',
      'size_desc',
      'size_asc'
    )
  );
