create table if not exists public.funding_allocations (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  sponsor_id uuid references public.sponsors(id) on delete set null,
  batch_id uuid references public.funding_batches(id) on delete set null,
  category text not null,
  amount_usdc numeric not null check (amount_usdc > 0),
  local_amount numeric not null default 0,
  local_currency text not null default 'COP',
  status text not null default 'planned' check (status in ('planned', 'batched', 'submitted', 'settled')),
  notes text,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.funding_batches(id) on delete cascade,
  line_item_id uuid not null references public.batch_line_items(id) on delete cascade,
  status text not null default 'needs_receipt' check (status in ('needs_receipt', 'receipt_attached', 'reconciled')),
  private_receipt_path text,
  note text,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  reconciled_at timestamptz,
  unique (line_item_id)
);

alter table public.funding_allocations enable row level security;
alter table public.reconciliation_items enable row level security;

drop policy if exists "admins manage funding allocations" on public.funding_allocations;
create policy "admins manage funding allocations" on public.funding_allocations
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "scoped users read funding allocations" on public.funding_allocations;
create policy "scoped users read funding allocations" on public.funding_allocations
for select using (
  exists (
    select 1 from public.user_roles r
    left join public.grantees g on g.id = r.grantee_id
    where r.profile_id = public.current_profile_id()
      and r.role in ('steward', 'grantee_contact')
      and (r.initiative_id = funding_allocations.initiative_id or g.initiative_id = funding_allocations.initiative_id)
  )
);

drop policy if exists "admins manage reconciliation items" on public.reconciliation_items;
create policy "admins manage reconciliation items" on public.reconciliation_items
for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ayra-public-update-media',
  'ayra-public-update-media',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ayra-private-receipts',
  'ayra-private-receipts',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/csv']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read ayra update media" on storage.objects;
create policy "public read ayra update media" on storage.objects
for select using (bucket_id = 'ayra-public-update-media');

drop policy if exists "authenticated upload ayra update media" on storage.objects;
create policy "authenticated upload ayra update media" on storage.objects
for insert to authenticated
with check (bucket_id = 'ayra-public-update-media');

drop policy if exists "admins read ayra private receipts" on storage.objects;
create policy "admins read ayra private receipts" on storage.objects
for select to authenticated
using (bucket_id = 'ayra-private-receipts' and public.is_admin());

drop policy if exists "admins upload ayra private receipts" on storage.objects;
create policy "admins upload ayra private receipts" on storage.objects
for insert to authenticated
with check (bucket_id = 'ayra-private-receipts' and public.is_admin());
