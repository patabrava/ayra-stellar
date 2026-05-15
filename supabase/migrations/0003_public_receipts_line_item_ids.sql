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
  li.sdp_payment_id,
  li.transaction_hash
from public.funding_batches b
join public.initiatives i on i.id = b.initiative_id
left join public.sponsors s on s.id = b.sponsor_id
join public.batch_line_items li on li.batch_id = b.id
where b.status in ('submitted', 'settled');
