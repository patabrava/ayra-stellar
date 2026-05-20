create extension if not exists vector with schema extensions;

create table public.advisor_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  title text not null,
  href text,
  track_slug text,
  initiative_slug text,
  visibility text not null default 'public' check (visibility = 'public'),
  content text not null,
  content_hash text not null,
  embedding extensions.vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.advisor_sources enable row level security;

create policy advisor_sources_public_read
on public.advisor_sources
for select
to anon, authenticated
using (visibility = 'public');

create or replace function public.match_advisor_sources(
  query_embedding extensions.vector(768),
  match_threshold double precision,
  match_count integer,
  filter_track_slug text default null,
  filter_initiative_slug text default null
)
returns table (
  source_key text,
  title text,
  href text,
  track_slug text,
  initiative_slug text,
  content text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    advisor_sources.source_key,
    advisor_sources.title,
    advisor_sources.href,
    advisor_sources.track_slug,
    advisor_sources.initiative_slug,
    advisor_sources.content,
    1 - (advisor_sources.embedding <=> query_embedding) as similarity
  from public.advisor_sources
  where advisor_sources.visibility = 'public'
    and advisor_sources.embedding is not null
    and (filter_track_slug is null or advisor_sources.track_slug is null or advisor_sources.track_slug = filter_track_slug)
    and (filter_initiative_slug is null or advisor_sources.initiative_slug is null or advisor_sources.initiative_slug = filter_initiative_slug)
    and 1 - (advisor_sources.embedding <=> query_embedding) > match_threshold
  order by advisor_sources.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_advisor_sources(
  extensions.vector(768),
  double precision,
  integer,
  text,
  text
) to anon, authenticated, service_role;
