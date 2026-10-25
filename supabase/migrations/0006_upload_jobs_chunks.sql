-- 0006_upload_jobs_chunks.sql
-- Durable upload jobs and per-chunk bookkeeping.
--
-- upload_chunks stores metadata only (size, checksum, state). Binary payload
-- staging is a deliberate, separately documented decision (SRS B2): Telegram's
-- temporary upload parts are NOT durable and must not be treated as staging.

create table public.upload_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_id uuid,
  storage_connection_id uuid not null,
  idempotency_key text not null,
  status text not null default 'queued',
  source_size_bytes bigint not null,
  source_fingerprint text,
  encrypted_size_bytes bigint,
  chunk_size_bytes integer not null,
  total_chunks integer,
  received_chunks integer not null default 0,
  retry_count integer not null default 0,
  lease_owner text,
  lease_expires_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint upload_jobs_idempotency_key_length check (
    length(idempotency_key) between 8 and 200
  ),
  constraint upload_jobs_status_check check (
    status in (
      'queued',
      'preparing',
      'encrypting',
      'transferring',
      'finalizing',
      'paused',
      'retrying',
      'failed',
      'needs_source_file',
      'reconciliation_required',
      'completed',
      'cancelled'
    )
  ),
  constraint upload_jobs_source_size_nonnegative check (source_size_bytes >= 0),
  constraint upload_jobs_encrypted_size_nonnegative check (
    encrypted_size_bytes is null or encrypted_size_bytes >= 0
  ),
  constraint upload_jobs_chunk_size_positive check (chunk_size_bytes > 0),
  constraint upload_jobs_total_chunks_nonnegative check (
    total_chunks is null or total_chunks >= 0
  ),
  constraint upload_jobs_received_chunks_nonnegative check (received_chunks >= 0),
  constraint upload_jobs_received_chunks_within_total check (
    total_chunks is null or received_chunks <= total_chunks
  ),
  constraint upload_jobs_retry_count_nonnegative check (retry_count >= 0),
  constraint upload_jobs_lease_pair check (
    (lease_owner is null and lease_expires_at is null)
    or (lease_owner is not null and lease_expires_at is not null)
  ),
  constraint upload_jobs_user_idempotency_unique unique (user_id, idempotency_key),
  constraint upload_jobs_user_id_unique unique (user_id, id),
  constraint upload_jobs_file_same_owner foreign key (user_id, file_id)
    references public.files (user_id, id)
    on delete set null (file_id),
  constraint upload_jobs_connection_same_owner foreign key (user_id, storage_connection_id)
    references public.storage_connections (user_id, id)
    on delete restrict
);

comment on table public.upload_jobs is
  'Durable upload state. status is authoritative; the browser only shows optimistic '
  'progress and must reconcile with this table.';

create trigger upload_jobs_set_updated_at
before update on public.upload_jobs
for each row execute function public.set_updated_at();

create table public.upload_chunks (
  id uuid primary key default gen_random_uuid(),
  upload_job_id uuid not null references public.upload_jobs (id) on delete cascade,
  chunk_number integer not null,
  chunk_size_bytes integer not null,
  checksum text not null,
  chunk_state text not null default 'pending',
  received_at timestamptz,
  created_at timestamptz not null default now(),
  constraint upload_chunks_chunk_number_nonnegative check (chunk_number >= 0),
  constraint upload_chunks_size_nonnegative check (chunk_size_bytes >= 0),
  constraint upload_chunks_state_check check (
    chunk_state in ('pending', 'received', 'staged', 'acknowledged', 'discarded')
  ),
  constraint upload_chunks_job_chunk_unique unique (upload_job_id, chunk_number)
);

comment on table public.upload_chunks is
  'Per-chunk metadata only. No binary payload is stored in this table.';
