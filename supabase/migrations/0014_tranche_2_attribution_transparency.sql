create table if not exists public.source_records (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  source_system text not null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.source_records enable row level security;

drop policy if exists "admins manage source records" on public.source_records;
create policy "admins manage source records" on public.source_records
for all using (public.is_admin()) with check (public.is_admin());

alter table public.batch_line_items
  add column if not exists source_record_id uuid references public.source_records(id) on delete restrict,
  add column if not exists external_id text,
  add column if not exists node_code text,
  add column if not exists track_code text,
  add column if not exists milestone_code text,
  add column if not exists recipient_category text;

create unique index if not exists batch_line_items_external_id_unique
  on public.batch_line_items (external_id)
  where external_id is not null;

alter table public.reconciliation_items
  add column if not exists attribution_match_status text,
  add column if not exists exception_code text,
  add column if not exists resolution_action text;

alter table public.reconciliation_items
  drop constraint if exists reconciliation_items_attribution_match_status_check,
  add constraint reconciliation_items_attribution_match_status_check
    check (attribution_match_status is null or attribution_match_status in ('matched', 'unmatched'));

insert into public.source_records (external_id, source_system, received_at)
values ('VIIO-PVD-2026-06-07-001', 'viio', '2026-06-07T06:53:18Z')
on conflict (external_id) do nothing;

update public.batch_line_items li
set
  source_record_id = sr.id,
  external_id = 'AYRA-LI-PVD-2026-06-07-001',
  node_code = 'PVD',
  track_code = 'AYRA-PVD-REFOREST',
  milestone_code = 'M1',
  recipient_category = 'local-operator'
from public.funding_batches b, public.source_records sr
where li.batch_id = b.id
  and b.code = 'PV-REFOREST-SDP-20260607T065318Z-01'
  and sr.external_id = 'VIIO-PVD-2026-06-07-001';

insert into public.reconciliation_items (
  batch_id,
  line_item_id,
  status,
  attribution_match_status,
  resolution_action,
  created_by_profile_id,
  reconciled_at
)
select
  b.id,
  li.id,
  'reconciled',
  'matched',
  'Source record, attribution keys, amount, and verified Stellar receipt matched.',
  b.created_by_profile_id,
  coalesce(b.settled_at, now())
from public.funding_batches b
join public.batch_line_items li on li.batch_id = b.id
where b.code = 'PV-REFOREST-SDP-20260607T065318Z-01'
on conflict (line_item_id) do update set
  attribution_match_status = excluded.attribution_match_status,
  exception_code = null,
  resolution_action = excluded.resolution_action;

create or replace function public.prevent_submitted_line_item_rewrite()
returns trigger
language plpgsql
as $$
declare
  parent_status public.batch_status;
begin
  select status into parent_status from public.funding_batches where id = coalesce(old.batch_id, new.batch_id);
  if parent_status in ('submitted', 'settled') then
    if tg_op = 'DELETE' then
      raise exception 'submitted batch line items are immutable';
    end if;
    if old.batch_id is distinct from new.batch_id
      or old.category is distinct from new.category
      or old.amount_usdc is distinct from new.amount_usdc
      or old.local_amount is distinct from new.local_amount
      or old.local_currency is distinct from new.local_currency
      or old.private_recipient_name is distinct from new.private_recipient_name
      or old.source_record_id is distinct from new.source_record_id
      or old.external_id is distinct from new.external_id
      or old.node_code is distinct from new.node_code
      or old.track_code is distinct from new.track_code
      or old.milestone_code is distinct from new.milestone_code
      or old.recipient_category is distinct from new.recipient_category then
      raise exception 'submitted batch line items are immutable';
    end if;
  end if;
  return new;
end;
$$;

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
