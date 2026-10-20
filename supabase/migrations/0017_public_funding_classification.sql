-- A valid Stellar transfer does not establish that a project's funding was approved.
-- This is a provenance-only, additive migration. It does not classify historical
-- payments, alter settlement receipts, move funds, or enable payment execution.
-- Apply only through the authorised deployment gate after review.

create table if not exists public.batch_funding_classifications (
  batch_id uuid primary key references public.funding_batches(id) on delete restrict,
  public_funding_purpose text not null
    check (public_funding_purpose in ('technical_validation', 'approved_project_disbursement')),
  source_record_id uuid not null references public.source_records(id) on delete restrict,
  reviewed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.batch_funding_classifications enable row level security;

drop policy if exists "admins manage funding classification provenance"
  on public.batch_funding_classifications;
create policy "admins manage funding classification provenance"
on public.batch_funding_classifications
for all
using (public.is_admin())
with check (public.is_admin());

-- Public callers may see only the reviewed classification, never source record
-- identities, private reviewer references, internal evidence, or raw contracts.
create or replace view public.public_batch_funding_purposes
with (security_invoker = false)
as
select
  b.id as batch_id,
  c.public_funding_purpose
from public.funding_batches b
join public.batch_funding_classifications c on c.batch_id = b.id
where b.status in ('submitted', 'settled');

grant select on public.public_batch_funding_purposes to anon, authenticated;

-- No UPDATE/INSERT of classifications is exposed via the public view.
-- Existing payments intentionally remain unclassified until an authorised
-- review records an actual source record, human reviewer and review date.
