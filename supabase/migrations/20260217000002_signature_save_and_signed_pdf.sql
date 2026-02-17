-- ============================================
-- Save recipient signatures and signed PDFs
-- ============================================

alter table signing_requests
  add column if not exists signed_file_url text;

create table if not exists recipient_signatures (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null unique,
  signature_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table recipient_signatures enable row level security;

drop trigger if exists on_recipient_signatures_updated on recipient_signatures;
create trigger on_recipient_signatures_updated
  before update on recipient_signatures
  for each row execute function public.handle_updated_at();

-- Storage bucket for signed PDFs
insert into storage.buckets (id, name, public)
values ('signed', 'signed', false)
on conflict do nothing;

create policy "Service role can manage signed files"
  on storage.objects for all
  using (bucket_id = 'signed');
