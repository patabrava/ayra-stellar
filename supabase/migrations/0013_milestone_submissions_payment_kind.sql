do $$
begin
  create type public.milestone_submission_status as enum ('draft', 'submitted', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create unique index if not exists milestones_id_initiative_id_key
on public.milestones (id, initiative_id);

create table if not exists public.milestone_submissions (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id) on delete restrict,
  submitted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  status public.milestone_submission_status not null default 'submitted',
  title text not null check (char_length(title) >= 4),
  summary text not null check (char_length(summary) >= 10),
  private_document_path text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  review_note text,
  constraint milestone_submissions_milestone_matches_initiative
    foreign key (milestone_id, initiative_id)
    references public.milestones(id, initiative_id)
);

alter table public.milestone_submissions enable row level security;

drop policy if exists "admins manage milestone submissions" on public.milestone_submissions;
create policy "admins manage milestone submissions"
on public.milestone_submissions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "scoped users create milestone submissions" on public.milestone_submissions;
create policy "scoped users create milestone submissions"
on public.milestone_submissions
for insert
with check (
  submitted_by_profile_id = public.current_profile_id()
  and status = 'submitted'
  and exists (
    select 1
    from public.user_roles r
    left join public.grantees g on g.id = r.grantee_id
    where r.profile_id = public.current_profile_id()
      and (
        (r.role = 'steward' and r.initiative_id = milestone_submissions.initiative_id)
        or (r.role = 'grantee_contact' and g.initiative_id = milestone_submissions.initiative_id)
      )
  )
);

drop policy if exists "scoped users read own milestone submissions" on public.milestone_submissions;
create policy "scoped users read own milestone submissions"
on public.milestone_submissions
for select
using (
  submitted_by_profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.user_roles r
    left join public.grantees g on g.id = r.grantee_id
    where r.profile_id = public.current_profile_id()
      and (
        (r.role = 'steward' and r.initiative_id = milestone_submissions.initiative_id)
        or (r.role = 'grantee_contact' and g.initiative_id = milestone_submissions.initiative_id)
      )
  )
);

alter table public.funding_batches
  add column if not exists payment_kind text not null default 'normal'
    check (payment_kind in ('normal', 'advance')),
  add column if not exists milestone_submission_id uuid
    references public.milestone_submissions(id) on delete restrict;

create unique index if not exists funding_batches_one_payment_per_milestone_submission
on public.funding_batches (milestone_submission_id)
where milestone_submission_id is not null;

create or replace function public.enforce_batch_milestone_submission()
returns trigger
language plpgsql
as $$
declare
  linked_submission record;
begin
  if new.payment_kind = 'advance' then
    if new.milestone_submission_id is not null then
      raise exception 'advance payments cannot link milestone submissions';
    end if;
    return new;
  end if;

  if new.milestone_submission_id is null then
    raise exception 'normal payments require an approved milestone submission';
  end if;

  select id, initiative_id, status
  into linked_submission
  from public.milestone_submissions
  where id = new.milestone_submission_id;

  if linked_submission.id is null or linked_submission.status <> 'approved' then
    raise exception 'normal payments require an approved milestone submission';
  end if;

  if linked_submission.initiative_id <> new.initiative_id then
    raise exception 'milestone submission must belong to the payment initiative';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_batch_milestone_submission on public.funding_batches;
create trigger enforce_batch_milestone_submission
before insert or update of payment_kind, milestone_submission_id, initiative_id
on public.funding_batches
for each row execute function public.enforce_batch_milestone_submission();
