-- A valid Stellar transfer does not establish that a project's funding was approved.
-- This is a provenance-only, additive migration. It does not classify historical
-- payments, alter settlement receipts, move funds, or enable payment execution.
-- Apply only through the authorised deployment gate after review.

create table if not exists public.batch_funding_classifications (
  batch_id uuid primary key references public.funding_batches(id) on delete restrict,
  initiative_id uuid not null references public.initiatives(id) on delete restrict,
  public_funding_purpose text not null
    check (public_funding_purpose in ('technical_validation', 'approved_project_disbursement')),
  source_record_id uuid not null references public.source_records(id) on delete restrict,
  recipient_grantee_id uuid references public.grantees(id) on delete restrict,
  evidence_reference text not null
    check (char_length(btrim(evidence_reference)) between 8 and 500),
  reviewed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint batch_funding_classifications_recipient_required
    check (public_funding_purpose <> 'approved_project_disbursement' or recipient_grantee_id is not null)
);

alter table public.batch_funding_classifications enable row level security;

-- Admins may read provenance. Nobody writes through the table API: the only
-- write path is admin_record_batch_funding_classification(), which binds the
-- reviewer to the signed-in admin and checks project, source, recipient and
-- evidence before recording anything.
drop policy if exists "admins manage funding classification provenance"
  on public.batch_funding_classifications;
drop policy if exists "admins read funding classification provenance"
  on public.batch_funding_classifications;
create policy "admins read funding classification provenance"
on public.batch_funding_classifications
for select
using (public.is_admin());

revoke all on public.batch_funding_classifications from anon, authenticated;
grant select on public.batch_funding_classifications to authenticated;
-- Service-role scripts cannot classify either: no automated or inferred backfill.
revoke insert, update, delete, truncate on public.batch_funding_classifications from service_role;

create or replace function public.prevent_funding_classification_rewrite()
returns trigger
language plpgsql
as $$
begin
  raise exception 'funding classifications are immutable; corrections need a reviewed migration';
end;
$$;

drop trigger if exists prevent_funding_classification_rewrite
  on public.batch_funding_classifications;
create trigger prevent_funding_classification_rewrite
before update or delete on public.batch_funding_classifications
for each row execute function public.prevent_funding_classification_rewrite();

-- Records one reviewed purpose for one submitted or settled transfer. Nothing is
-- inferred from amount, hash, memo or text; every argument is an explicit
-- operator statement and the reviewer is always the calling admin.
create or replace function public.admin_record_batch_funding_classification(
  p_batch_id uuid,
  p_initiative_id uuid,
  p_purpose text,
  p_source_external_id text,
  p_recipient_grantee_id uuid,
  p_evidence_reference text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer uuid := public.current_profile_id();
  v_batch public.funding_batches%rowtype;
  v_source_id uuid;
  v_evidence text := btrim(coalesce(p_evidence_reference, ''));
begin
  if v_reviewer is null or not public.is_admin() then
    raise exception 'a signed-in admin reviewer is required' using errcode = '42501';
  end if;

  if p_purpose is null
    or p_purpose not in ('technical_validation', 'approved_project_disbursement') then
    raise exception 'unknown funding purpose' using errcode = '22023';
  end if;

  select * into v_batch from public.funding_batches where id = p_batch_id for update;
  if not found then
    raise exception 'batch not found' using errcode = 'P0002';
  end if;

  if p_initiative_id is null or v_batch.initiative_id <> p_initiative_id then
    raise exception 'batch belongs to a different project' using errcode = '22023';
  end if;

  if v_batch.status not in ('submitted', 'settled') then
    raise exception 'only submitted or settled transfers can be classified' using errcode = '22023';
  end if;

  select id into v_source_id
  from public.source_records
  where external_id = btrim(coalesce(p_source_external_id, ''));
  if v_source_id is null then
    raise exception 'source record is not registered' using errcode = '22023';
  end if;

  if p_purpose = 'approved_project_disbursement' then
    if v_batch.stellar_network <> 'pubnet' then
      raise exception 'testnet transfers cannot be project disbursements' using errcode = '22023';
    end if;
    if p_recipient_grantee_id is null then
      raise exception 'approved disbursements need a legal recipient' using errcode = '22023';
    end if;
  end if;

  if p_recipient_grantee_id is not null and not exists (
    select 1 from public.grantees g
    where g.id = p_recipient_grantee_id and g.initiative_id = p_initiative_id
  ) then
    raise exception 'recipient is not a registered grantee of this project' using errcode = '22023';
  end if;

  if char_length(v_evidence) < 8 or char_length(v_evidence) > 500 then
    raise exception 'an evidence reference is required' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.batch_funding_classifications where batch_id = p_batch_id
  ) then
    raise exception 'batch is already classified' using errcode = '23505';
  end if;

  insert into public.batch_funding_classifications (
    batch_id,
    initiative_id,
    public_funding_purpose,
    source_record_id,
    recipient_grantee_id,
    evidence_reference,
    reviewed_by_profile_id,
    reviewed_at
  ) values (
    p_batch_id,
    p_initiative_id,
    p_purpose,
    v_source_id,
    p_recipient_grantee_id,
    v_evidence,
    v_reviewer,
    now()
  );

  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, after_summary)
  values (
    v_reviewer,
    'funding.purpose_classified',
    'funding_batch',
    p_batch_id,
    jsonb_build_object(
      'initiativeId', p_initiative_id,
      'publicFundingPurpose', p_purpose,
      'sourceRecordId', v_source_id,
      'recipientGranteeId', p_recipient_grantee_id
    )
  );
end;
$$;

revoke all on function public.admin_record_batch_funding_classification(uuid, uuid, text, text, uuid, text) from public;
revoke all on function public.admin_record_batch_funding_classification(uuid, uuid, text, text, uuid, text) from anon;
grant execute on function public.admin_record_batch_funding_classification(uuid, uuid, text, text, uuid, text) to authenticated;

-- Public callers may see only the reviewed classification, never source record
-- identities, private reviewer references, recipients, evidence or contracts.
create or replace view public.public_batch_funding_purposes
with (security_invoker = false)
as
select
  b.id as batch_id,
  c.public_funding_purpose
from public.funding_batches b
join public.batch_funding_classifications c
  on c.batch_id = b.id
  and c.initiative_id = b.initiative_id
where
  b.status in ('submitted', 'settled')
  and (c.public_funding_purpose <> 'approved_project_disbursement' or b.stellar_network = 'pubnet');

revoke all on public.public_batch_funding_purposes from anon, authenticated;
grant select on public.public_batch_funding_purposes to anon, authenticated;

-- Existing payments intentionally remain unclassified until an authorised
-- review records an actual source record, legal recipient, evidence and the
-- reviewing admin. This migration contains no backfill.
