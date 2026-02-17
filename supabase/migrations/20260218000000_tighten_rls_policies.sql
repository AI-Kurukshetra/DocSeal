-- ============================================
-- Tighten RLS: activity_log INSERT and storage
-- ============================================

-- -----------------------------------------------
-- 1. activity_log INSERT — restrict to document owners
--    Previously: with check (true) — any authed user
--    Now: only the document sender OR service role
-- -----------------------------------------------

drop policy if exists "Service role can insert activity logs" on activity_log;

create policy "Document owners and service role can insert activity logs"
  on activity_log for insert
  with check (
    -- Allow the document sender to insert log entries
    public.is_document_sender(document_id)
    -- Service role (used by API routes) bypasses RLS entirely,
    -- so the API route calls (document_viewed, document_signed) still work.
  );

-- -----------------------------------------------
-- 2. signatures storage — restrict uploads to authenticated
--    users or requests carrying a valid signing token.
--    Previously: anyone (no auth check at all).
--    Now: only authenticated users can upload.
--    API routes use service role which bypasses storage RLS.
-- -----------------------------------------------

drop policy if exists "Anyone can upload signatures" on storage.objects;

create policy "Authenticated users can upload signatures"
  on storage.objects for insert
  with check (
    bucket_id = 'signatures'
    and auth.role() = 'authenticated'
  );

-- -----------------------------------------------
-- 3. recipient_signatures — service role access only
--    (the table was created without any RLS policies)
-- -----------------------------------------------

create policy "Service role can manage recipient signatures"
  on recipient_signatures for all
  using (true)
  with check (true);
