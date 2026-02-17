-- ============================================
-- Fix infinite recursion in RLS policies
-- The documents and signing_requests policies
-- reference each other, causing a cycle.
-- Use SECURITY DEFINER functions to break it.
-- ============================================

-- Helper: check if current user is the sender of a document (bypasses RLS)
create or replace function public.is_document_sender(doc_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.documents
    where id = doc_id and sender_id = auth.uid()
  );
$$;

-- Helper: check if current user is a recipient of a document (bypasses RLS)
create or replace function public.is_document_recipient(doc_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.signing_requests
    where document_id = doc_id and recipient_id = auth.uid()
  );
$$;

-- Helper: check if current user is an admin (bypasses RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================
-- Drop old recursive policies
-- ============================================

drop policy if exists "Users can read relevant documents" on documents;
drop policy if exists "Users can manage fields for own documents" on document_fields;
drop policy if exists "Users can read fields for accessible documents" on document_fields;
drop policy if exists "Senders can manage signing requests" on signing_requests;
drop policy if exists "Recipients can read own signing requests" on signing_requests;
drop policy if exists "Signers can insert field values" on field_values;
drop policy if exists "Users can read field values for accessible requests" on field_values;
drop policy if exists "Users can read accessible activity logs" on activity_log;

-- ============================================
-- Recreate policies using helper functions
-- ============================================

-- Documents: use helper for recipient check to avoid querying signing_requests with RLS
create policy "Users can read relevant documents"
  on documents for select using (
    auth.uid() = sender_id
    or public.is_document_recipient(id)
    or public.is_admin()
  );

-- Document fields: use helper to check document ownership
create policy "Users can manage fields for own documents"
  on document_fields for all using (
    public.is_document_sender(document_id)
  );

create policy "Users can read fields for accessible documents"
  on document_fields for select using (
    public.is_document_sender(document_id)
    or public.is_document_recipient(document_id)
  );

-- Signing requests: use helper to check document ownership
create policy "Senders can manage signing requests"
  on signing_requests for all using (
    public.is_document_sender(document_id)
  );

create policy "Recipients can read own signing requests"
  on signing_requests for select using (recipient_id = auth.uid());

-- Field values: use helpers
create policy "Signers can insert field values"
  on field_values for insert with check (
    exists (
      select 1 from signing_requests sr
      where sr.id = signing_request_id and sr.recipient_id = auth.uid()
    )
  );

create policy "Users can read field values for accessible requests"
  on field_values for select using (
    exists (
      select 1 from signing_requests sr
      where sr.id = signing_request_id
      and (sr.recipient_id = auth.uid() or public.is_document_sender(sr.document_id))
    )
  );

-- Activity log: use helpers
create policy "Users can read accessible activity logs"
  on activity_log for select using (
    public.is_document_sender(document_id)
    or public.is_document_recipient(document_id)
    or public.is_admin()
  );
