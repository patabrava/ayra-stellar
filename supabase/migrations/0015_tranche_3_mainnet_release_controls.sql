alter table public.payout_addresses
  add column if not exists stellar_network text not null default 'testnet';

alter table public.payout_addresses
  drop constraint if exists payout_addresses_stellar_network_check,
  add constraint payout_addresses_stellar_network_check
    check (stellar_network in ('testnet', 'pubnet'));

alter table public.funding_batches
  add column if not exists stellar_network text not null default 'testnet';

alter table public.funding_batches
  drop constraint if exists funding_batches_stellar_network_check,
  add constraint funding_batches_stellar_network_check
    check (stellar_network in ('testnet', 'pubnet'));

create unique index if not exists payout_addresses_one_active_per_network
  on public.payout_addresses (initiative_id, stellar_network)
  where status in ('verified', 'locked');

create or replace function public.prevent_stellar_network_change()
returns trigger
language plpgsql
as $$
begin
  if old.stellar_network is distinct from new.stellar_network then
    raise exception 'stellar network identity is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_payout_stellar_network_change on public.payout_addresses;
create trigger prevent_payout_stellar_network_change
before update on public.payout_addresses
for each row execute function public.prevent_stellar_network_change();

drop trigger if exists prevent_batch_stellar_network_change on public.funding_batches;
create trigger prevent_batch_stellar_network_change
before update on public.funding_batches
for each row execute function public.prevent_stellar_network_change();

create table if not exists public.proof_pack_releases (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.funding_batches(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  stellar_network text not null check (stellar_network in ('testnet', 'pubnet')),
  payload jsonb not null,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  app_commit text not null,
  deployment_id text,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (batch_id, version)
);

alter table public.proof_pack_releases enable row level security;

drop policy if exists "public read proof pack releases" on public.proof_pack_releases;
create policy "public read proof pack releases" on public.proof_pack_releases
for select using (true);

drop policy if exists "admins create proof pack releases" on public.proof_pack_releases;
create policy "admins create proof pack releases" on public.proof_pack_releases
for insert with check (public.is_admin());

create or replace function public.validate_proof_pack_release()
returns trigger
language plpgsql
as $$
declare
  parent_status public.batch_status;
  parent_network text;
begin
  select status, stellar_network
    into parent_status, parent_network
  from public.funding_batches
  where id = new.batch_id;

  if parent_status is distinct from 'settled' then
    raise exception 'proof releases require a settled batch';
  end if;
  if parent_network is distinct from new.stellar_network then
    raise exception 'proof release network must match its batch';
  end if;
  if new.payload ->> 'stellarNetwork' is distinct from new.stellar_network then
    raise exception 'proof payload network must match its batch';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_proof_pack_release on public.proof_pack_releases;
create trigger validate_proof_pack_release
before insert on public.proof_pack_releases
for each row execute function public.validate_proof_pack_release();

create or replace function public.prevent_proof_pack_release_rewrite()
returns trigger
language plpgsql
as $$
begin
  raise exception 'proof pack releases are immutable';
end;
$$;

drop trigger if exists prevent_proof_pack_release_rewrite on public.proof_pack_releases;
create trigger prevent_proof_pack_release_rewrite
before update or delete on public.proof_pack_releases
for each row execute function public.prevent_proof_pack_release_rewrite();

grant select on public.proof_pack_releases to anon, authenticated;

drop view if exists public.public_batch_receipts;

create view public.public_batch_receipts
with (security_invoker = false)
as
select
  li.id as line_item_id,
  b.id as batch_id,
  b.code as batch_code,
  b.period_label,
  b.status as batch_status,
  b.stellar_network,
  i.name as initiative_name,
  s.name as sponsor_name,
  li.category,
  li.amount_usdc,
  li.local_amount,
  li.local_currency,
  li.status as line_item_status,
  li.transaction_hash,
  li.payment_asset_code,
  li.payment_asset_issuer,
  li.payment_asset_amount,
  sr.external_id as source_record_external_id,
  li.external_id as line_item_external_id,
  li.node_code,
  li.track_code,
  li.milestone_code,
  li.recipient_category,
  ri.attribution_match_status
from public.funding_batches b
join public.initiatives i on i.id = b.initiative_id
left join public.sponsors s on s.id = b.sponsor_id
join public.batch_line_items li on li.batch_id = b.id
left join public.source_records sr on sr.id = li.source_record_id
left join public.reconciliation_items ri on ri.line_item_id = li.id
where
  b.status in ('submitted', 'settled')
  and li.status = 'settled'
  and li.transaction_hash ~* '^[a-f0-9]{64}$'
  and li.payment_asset_code = 'USDC'
  and li.payment_asset_issuer is not null
  and li.payment_asset_amount = li.amount_usdc;

grant select on public.public_batch_receipts to anon, authenticated;
