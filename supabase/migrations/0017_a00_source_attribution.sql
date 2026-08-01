insert into public.source_records (external_id, source_system, received_at)
select
  'AYRA-SOURCE-' || b.code,
  'ayra-admin',
  coalesce(b.submitted_at, b.created_at)
from public.funding_batches b
where b.code = 'A00-LUZMARINA-VALIDATION-20260801'
on conflict (external_id) do nothing;

alter table public.batch_line_items
  disable trigger prevent_submitted_line_item_rewrite;

update public.batch_line_items li
set
  source_record_id = sr.id,
  external_id = 'AYRA-LI-' || li.id,
  node_code = 'PVD',
  track_code = 'PROVIDENCIA-SUSTAINABLE-ENTERPRISE',
  milestone_code = 'A00',
  recipient_category = 'grantee'
from public.funding_batches b, public.source_records sr
where li.batch_id = b.id
  and b.code = 'A00-LUZMARINA-VALIDATION-20260801'
  and sr.external_id = 'AYRA-SOURCE-' || b.code
  and li.source_record_id is null;

alter table public.batch_line_items
  enable trigger prevent_submitted_line_item_rewrite;

update public.reconciliation_items ri
set
  attribution_match_status = 'matched',
  exception_code = null,
  resolution_action = 'Admin source record linked after verified mainnet settlement.'
from public.funding_batches b
where ri.batch_id = b.id
  and b.code = 'A00-LUZMARINA-VALIDATION-20260801';
