-- 0008_indexes_constraints.sql
-- Query-pattern indexes from SRS B4.

create index folders_user_parent_deleted_idx
  on public.folders (user_id, parent_folder_id, deleted_at);

create index files_user_folder_deleted_idx
  on public.files (user_id, folder_id, deleted_at);

create index files_user_updated_at_idx
  on public.files (user_id, updated_at desc);

create index files_user_created_at_idx
  on public.files (user_id, created_at desc);

create index files_user_mime_type_idx
  on public.files (user_id, mime_type);

create index files_user_logical_size_idx
  on public.files (user_id, logical_size_bytes desc);

create index files_user_name_lower_idx
  on public.files (user_id, lower(name));

create index file_versions_file_version_idx
  on public.file_versions (file_id, version_number desc);

create index storage_objects_user_connection_idx
  on public.storage_objects (user_id, storage_connection_id);

create index upload_jobs_user_status_created_idx
  on public.upload_jobs (user_id, status, created_at desc);

create index upload_chunks_job_chunk_idx
  on public.upload_chunks (upload_job_id, chunk_number);

create index shares_token_hash_idx
  on public.shares (token_hash);

create index shares_user_created_idx
  on public.shares (user_id, created_at desc);

create index audit_events_user_created_idx
  on public.audit_events (user_id, created_at desc);

create index file_tags_tag_file_idx
  on public.file_tags (tag_id, file_id);

create index offline_operations_user_status_idx
  on public.offline_operations (user_id, status);
