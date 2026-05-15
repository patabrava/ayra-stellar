create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'steward', 'grantee_contact', 'applicant');
create type public.application_status as enum ('pending', 'approved', 'rejected');
create type public.update_status as enum ('draft', 'pending', 'approved', 'rejected');
create type public.batch_status as enum ('draft', 'ready', 'submitted', 'settled');
create type public.line_item_status as enum ('draft', 'submitted', 'processing', 'settled');
create type public.payout_address_status as enum ('pending', 'verified', 'locked', 'rejected');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  initiative_id uuid,
  grantee_id uuid,
  created_at timestamptz not null default now(),
  unique (profile_id, role, initiative_id, grantee_id)
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  local_currency text not null default 'COP',
  theme text not null default 'Cinematic island stewardship',
  created_at timestamptz not null default now()
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  public_attribution text,
  created_at timestamptz not null default now()
);

create table public.initiatives (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete restrict,
  sponsor_id uuid references public.sponsors(id) on delete set null,
  code text not null unique,
  slug text not null,
  name text not null,
  headline text not null,
  description text not null,
  steward_name text,
  league_score int not null default 0 check (league_score between 0 and 99),
  target_metric_label text not null,
  target_metric_current numeric not null default 0,
  target_metric_goal numeric not null default 0,
  status text not null default 'funding' check (status in ('live', 'funding', 'draft')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (track_id, slug)
);

alter table public.user_roles
  add constraint user_roles_initiative_fk foreign key (initiative_id) references public.initiatives(id) on delete cascade;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_profile_id uuid references public.profiles(id) on delete set null,
  applicant_name text not null,
  applicant_email text not null,
  proposed_track_name text not null,
  proposed_initiative_name text not null,
  scope_summary text not null,
  operational_notes text not null,
  contact_signal text not null,
  status public.application_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by_profile_id uuid references public.profiles(id) on delete set null
);

create table public.steward_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  organisation_name text not null,
  public_contact_name text not null,
  private_phone text,
  created_at timestamptz not null default now(),
  unique (profile_id, initiative_id)
);

create table public.grantees (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  name text not null,
  contact_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.user_roles
  add constraint user_roles_grantee_fk foreign key (grantee_id) references public.grantees(id) on delete cascade;

create table public.grantee_contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  grantee_id uuid not null references public.grantees(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, grantee_id)
);

create table public.payout_addresses (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  address text not null,
  status public.payout_address_status not null default 'pending',
  submitted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by_profile_id uuid references public.profiles(id) on delete set null,
  locked_at timestamptz,
  verification_note text,
  unique (initiative_id, address)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  code text not null,
  title text not null,
  percent_complete numeric not null default 0 check (percent_complete between 0 and 100),
  status text not null default 'planned' check (status in ('done', 'active', 'planned')),
  created_at timestamptz not null default now(),
  unique (initiative_id, code)
);

create table public.initiative_updates (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id) on delete restrict,
  submitted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  source text not null check (source in ('steward', 'grantee_contact', 'operator')),
  caption text not null,
  public_caption text,
  status public.update_status not null default 'pending',
  internal_initials text,
  submitted_at timestamptz not null default now(),
  published_at timestamptz,
  moderated_by_profile_id uuid references public.profiles(id) on delete set null,
  sanitized_feedback text
);

create table public.update_media (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.initiative_updates(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  url text not null,
  alt text not null,
  public_ready boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.funding_batches (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete restrict,
  sponsor_id uuid references public.sponsors(id) on delete set null,
  code text not null unique,
  period_label text not null,
  status public.batch_status not null default 'draft',
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  settled_at timestamptz,
  sdp_batch_id text
);

create table public.batch_line_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.funding_batches(id) on delete cascade,
  category text not null,
  amount_usdc numeric not null check (amount_usdc > 0),
  local_amount numeric not null default 0,
  local_currency text not null default 'COP',
  status public.line_item_status not null default 'draft',
  sdp_payment_id text,
  transaction_hash text,
  private_recipient_name text,
  created_at timestamptz not null default now()
);

create table public.sdp_sync_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.funding_batches(id) on delete cascade,
  provider text not null check (provider in ('mock', 'stellar-sdp')),
  action text not null,
  status text not null check (status in ('ok', 'error')),
  external_id text,
  message text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_summary jsonb,
  after_summary jsonb,
  created_at timestamptz not null default now()
);

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
      or old.private_recipient_name is distinct from new.private_recipient_name then
      raise exception 'submitted batch line items are immutable';
    end if;
  end if;
  return new;
end;
$$;

create trigger prevent_submitted_line_item_rewrite
before update or delete on public.batch_line_items
for each row execute function public.prevent_submitted_line_item_rewrite();

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where profile_id = public.current_profile_id()
      and role = 'admin'
  )
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.tracks enable row level security;
alter table public.sponsors enable row level security;
alter table public.initiatives enable row level security;
alter table public.applications enable row level security;
alter table public.steward_profiles enable row level security;
alter table public.grantees enable row level security;
alter table public.grantee_contacts enable row level security;
alter table public.payout_addresses enable row level security;
alter table public.milestones enable row level security;
alter table public.initiative_updates enable row level security;
alter table public.update_media enable row level security;
alter table public.funding_batches enable row level security;
alter table public.batch_line_items enable row level security;
alter table public.sdp_sync_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "public read tracks" on public.tracks for select using (true);
create policy "public read public initiatives" on public.initiatives for select using (status in ('live', 'funding'));
create policy "public read sponsors" on public.sponsors for select using (true);
create policy "public read milestones" on public.milestones for select using (
  exists (select 1 from public.initiatives i where i.id = initiative_id and i.status in ('live', 'funding'))
);
create policy "public read approved updates" on public.initiative_updates for select using (status = 'approved');
create policy "public read approved update media" on public.update_media for select using (
  public_ready and exists (
    select 1 from public.initiative_updates u
    where u.id = update_id and u.status = 'approved'
  )
);
create policy "public read visible batches" on public.funding_batches for select using (status in ('submitted', 'settled'));

create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "users read own profile" on public.profiles for select using (id = public.current_profile_id());
create policy "admins manage roles" on public.user_roles for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage all applications" on public.applications for all using (public.is_admin()) with check (public.is_admin());
create policy "public submit applications" on public.applications for insert with check (status = 'pending');
create policy "admins manage operational tables" on public.steward_profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage grantees" on public.grantees for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage contacts" on public.grantee_contacts for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage payout addresses" on public.payout_addresses for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage initiatives" on public.initiatives for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage milestones" on public.milestones for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage updates" on public.initiative_updates for all using (public.is_admin()) with check (public.is_admin());
create policy "scoped users submit updates" on public.initiative_updates for insert with check (
  submitted_by_profile_id = public.current_profile_id()
  and status = 'pending'
  and exists (
    select 1 from public.user_roles r
    where r.profile_id = public.current_profile_id()
      and r.role in ('steward', 'grantee_contact')
      and (r.initiative_id = initiative_id or r.grantee_id is not null)
  )
);
create policy "admins manage media" on public.update_media for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage batches" on public.funding_batches for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage line items" on public.batch_line_items for all using (public.is_admin()) with check (public.is_admin());
create policy "admins read sdp events" on public.sdp_sync_events for select using (public.is_admin());
create policy "admins manage audit logs" on public.audit_logs for all using (public.is_admin()) with check (public.is_admin());

create or replace view public.public_batch_receipts
with (security_invoker = false)
as
select
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
  li.sdp_payment_id,
  li.transaction_hash
from public.funding_batches b
join public.initiatives i on i.id = b.initiative_id
left join public.sponsors s on s.id = b.sponsor_id
join public.batch_line_items li on li.batch_id = b.id
where b.status in ('submitted', 'settled');
