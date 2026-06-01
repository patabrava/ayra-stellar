alter table public.batch_line_items
  add column if not exists payment_asset_code text,
  add column if not exists payment_asset_issuer text,
  add column if not exists payment_asset_amount numeric;

alter table public.batch_line_items
  drop constraint if exists batch_line_items_payment_asset_code_usdc,
  add constraint batch_line_items_payment_asset_code_usdc
    check (payment_asset_code is null or payment_asset_code = 'USDC');

alter table public.batch_line_items
  drop constraint if exists batch_line_items_payment_asset_amount_positive,
  add constraint batch_line_items_payment_asset_amount_positive
    check (payment_asset_amount is null or payment_asset_amount > 0);

alter table public.batch_line_items
  drop constraint if exists batch_line_items_amount_usdc_cents,
  add constraint batch_line_items_amount_usdc_cents
    check (amount_usdc = round(amount_usdc, 2));

update public.batch_line_items
set
  status = 'processing',
  transaction_hash = null,
  payment_asset_code = null,
  payment_asset_issuer = null,
  payment_asset_amount = null
where transaction_hash = '4ee20870c7d17a13234d36a1c8d9f285a68defa3a8ec4172de1ad58f7acc8783';

drop view if exists public.public_batch_receipts;

create or replace view public.public_batch_receipts
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
  li.payment_asset_amount
from public.funding_batches b
join public.initiatives i on i.id = b.initiative_id
left join public.sponsors s on s.id = b.sponsor_id
join public.batch_line_items li on li.batch_id = b.id
where
  b.status in ('submitted', 'settled')
  and li.status = 'settled'
  and li.transaction_hash ~* '^[a-f0-9]{64}$'
  and li.payment_asset_code = 'USDC'
  and li.payment_asset_issuer is not null
  and li.payment_asset_amount = li.amount_usdc;
