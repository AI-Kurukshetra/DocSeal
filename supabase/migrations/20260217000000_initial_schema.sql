-- ============================================
-- DocSeal Initial Schema
-- ============================================

-- pgcrypto provides gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================
-- Custom types
-- ============================================

create type user_role as enum ('sender', 'recipient', 'admin');
create type document_status as enum ('draft', 'pending', 'signed', 'completed');
create type document_file_type as enum ('pdf', 'image', 'doc');
create type field_type as enum ('signature', 'text', 'date', 'checkbox', 'initials', 'dropdown');
create type field_validation as enum ('none', 'number', 'email', 'phone');
create type signing_status as enum ('pending', 'viewed', 'signed', 'cancelled', 'declined');
create type activity_action as enum (
  'document_uploaded',
  'document_prepared',
  'signature_requested',
  'document_viewed',
  'document_signed',
  'request_cancelled'
);

-- ============================================
-- Tables
-- ============================================

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role user_role not null default 'sender',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_url text not null,
  file_type document_file_type not null default 'pdf',
  converted_pdf_url text,
  status document_status not null default 'draft',
  sender_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Document fields (positioned form fields on a document)
create table document_fields (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  type field_type not null default 'text',
  label text not null default '',
  placeholder text,
  required boolean not null default false,
  validation field_validation default 'none',
  font_size integer not null default 14,
  page_number integer not null default 1,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  width double precision not null default 200,
  height double precision not null default 40,
  options text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Signing requests (one per recipient per document)
create table signing_requests (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  recipient_email text not null,
  recipient_id uuid references profiles(id) on delete set null,
  token text not null unique default gen_random_uuid()::text,
  status signing_status not null default 'pending',
  signature_url text,
  signed_at timestamptz,
  message text,
  created_at timestamptz not null default now()
);

-- Field values (submitted by signer)
create table field_values (
  id uuid primary key default gen_random_uuid(),
  signing_request_id uuid not null references signing_requests(id) on delete cascade,
  document_field_id uuid not null references document_fields(id) on delete cascade,
  value text not null default '',
  created_at timestamptz not null default now()
);

-- Activity log
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action activity_action not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ============================================
-- Indexes
-- ============================================

create index idx_documents_sender_id on documents(sender_id);
create index idx_documents_status on documents(status);
create index idx_document_fields_document_id on document_fields(document_id);
create index idx_signing_requests_document_id on signing_requests(document_id);
create index idx_signing_requests_token on signing_requests(token);
create index idx_signing_requests_recipient_email on signing_requests(recipient_email);
create index idx_field_values_signing_request_id on field_values(signing_request_id);
create index idx_activity_log_document_id on activity_log(document_id);
create index idx_activity_log_user_id on activity_log(user_id);
create index idx_activity_log_created_at on activity_log(created_at desc);

-- ============================================
-- Trigger: auto-create profile on user signup
-- ============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'sender')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Trigger: auto-update updated_at on documents
-- ============================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger on_documents_updated
  before update on documents
  for each row execute function public.handle_updated_at();

-- ============================================
-- Row Level Security
-- ============================================

alter table profiles enable row level security;
alter table documents enable row level security;
alter table document_fields enable row level security;
alter table signing_requests enable row level security;
alter table field_values enable row level security;
alter table activity_log enable row level security;

-- Profiles: users can read all profiles, update only their own
create policy "Anyone can read profiles"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Documents: sender can CRUD own; recipients can read docs sent to them; admins read all
create policy "Senders can insert own documents"
  on documents for insert with check (auth.uid() = sender_id);

create policy "Users can read relevant documents"
  on documents for select using (
    auth.uid() = sender_id
    or exists (
      select 1 from signing_requests sr
      where sr.document_id = id
      and sr.recipient_id = auth.uid()
    )
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Senders can update own documents"
  on documents for update using (auth.uid() = sender_id);

create policy "Senders can delete own draft documents"
  on documents for delete using (auth.uid() = sender_id and status = 'draft');

-- Document fields: same access as parent document
create policy "Users can manage fields for own documents"
  on document_fields for all using (
    exists (
      select 1 from documents d
      where d.id = document_id and d.sender_id = auth.uid()
    )
  );

create policy "Users can read fields for accessible documents"
  on document_fields for select using (
    exists (
      select 1 from documents d
      where d.id = document_id
      and (
        d.sender_id = auth.uid()
        or exists (
          select 1 from signing_requests sr
          where sr.document_id = d.id and sr.recipient_id = auth.uid()
        )
      )
    )
  );

-- Signing requests: sender of doc can manage; recipient can read own
create policy "Senders can manage signing requests"
  on signing_requests for all using (
    exists (
      select 1 from documents d
      where d.id = document_id and d.sender_id = auth.uid()
    )
  );

create policy "Recipients can read own signing requests"
  on signing_requests for select using (recipient_id = auth.uid());

-- Field values: signers can insert; doc sender can read
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
      join documents d on d.id = sr.document_id
      where sr.id = signing_request_id
      and (sr.recipient_id = auth.uid() or d.sender_id = auth.uid())
    )
  );

-- Activity log: users can read logs for documents they have access to; insert is server-side
create policy "Users can read accessible activity logs"
  on activity_log for select using (
    exists (
      select 1 from documents d
      where d.id = document_id
      and (
        d.sender_id = auth.uid()
        or exists (
          select 1 from signing_requests sr
          where sr.document_id = d.id and sr.recipient_id = auth.uid()
        )
        or exists (
          select 1 from profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
    )
  );

create policy "Service role can insert activity logs"
  on activity_log for insert with check (true);

-- ============================================
-- Storage buckets
-- ============================================

insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
insert into storage.buckets (id, name, public) values ('converted', 'converted', false);
insert into storage.buckets (id, name, public) values ('signatures', 'signatures', false);

-- Storage policies: documents bucket
create policy "Authenticated users can upload documents"
  on storage.objects for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "Users can read own documents"
  on storage.objects for select
  using (bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Service role can read all documents"
  on storage.objects for select
  using (bucket_id = 'documents');

-- Storage policies: converted bucket
create policy "Service role can manage converted files"
  on storage.objects for all
  using (bucket_id = 'converted');

-- Storage policies: signatures bucket
create policy "Anyone can upload signatures"
  on storage.objects for insert
  with check (bucket_id = 'signatures');

create policy "Authenticated users can read signatures"
  on storage.objects for select
  using (bucket_id = 'signatures' and auth.role() = 'authenticated');
