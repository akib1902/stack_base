-- 0013_share_wrapped_keys.sql
-- Milestone 5: share-specific key transfer (SRS A7.2).
--
-- A share never exposes the vault key. When the owner creates the link, the
-- browser unwraps the version's data key with the vault key and re-wraps it
-- under a fresh random share key; only that wrapped key is stored here. The
-- share key itself travels in the URL fragment, which browsers never send to
-- the server, so the API can serve the ciphertext but cannot decrypt it.
--
-- Nullable for deployments that inserted rows before sharing existed; such rows
-- cannot be opened and the public endpoint refuses them with
-- SHARE_KEY_UNAVAILABLE. Every row created by the application is populated.

alter table public.shares
  add column wrapped_key jsonb,
  add constraint shares_wrapped_key_object check (
    wrapped_key is null or jsonb_typeof(wrapped_key) = 'object'
  );

comment on column public.shares.wrapped_key is
  'The shared version''s data key wrapped under the URL-fragment share key '
  '(xsalsa20poly1305). Not a secret on its own, but useless without the fragment.';

comment on table public.shares is
  'Revocable share of one immutable file version. Only token_hash is stored; the '
  'raw token lives with the recipient. Revocation cannot erase copies already '
  'downloaded. download_count must be incremented atomically.';
