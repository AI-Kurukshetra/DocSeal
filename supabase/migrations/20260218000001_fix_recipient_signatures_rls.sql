-- ============================================
-- Fix recipient_signatures RLS policies
-- The previous "for all" policy lacked a TO clause,
-- meaning it applied to every role (anon, authenticated).
-- ============================================

-- Drop the overly-permissive policy
drop policy if exists "Service role can manage recipient signatures" on recipient_signatures;

-- Service role only: full access (used by signing API routes that run as service role)
create policy "Service role can manage recipient signatures"
  on recipient_signatures for all
  to service_role
  using (true)
  with check (true);

-- Authenticated users: read their own saved signature only
create policy "Users can view their own signature"
  on recipient_signatures for select
  to authenticated
  using (recipient_email = auth.email());
