create table if not exists public.advisor_sources (
  id text primary key,
  title text not null,
  href text,
  track_slug text,
  initiative_slug text,
  content text not null,
  content_hash text not null,
  embedding jsonb not null default '[]'::jsonb,
  source_kind text not null default 'generated' check (source_kind in ('generated', 'synced')),
  synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.advisor_sources enable row level security;

drop policy if exists "public read advisor sources" on public.advisor_sources;
create policy "public read advisor sources" on public.advisor_sources
for select using (true);

drop policy if exists "admins manage advisor sources" on public.advisor_sources;
create policy "admins manage advisor sources" on public.advisor_sources
for all using (public.is_admin()) with check (public.is_admin());

create index if not exists advisor_sources_track_idx
  on public.advisor_sources (track_slug, initiative_slug);

create index if not exists advisor_sources_updated_idx
  on public.advisor_sources (updated_at desc);
