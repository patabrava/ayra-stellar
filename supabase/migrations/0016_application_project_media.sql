alter table public.applications
add column if not exists hero_image_rights_confirmed boolean not null default false;

create table if not exists public.application_media (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  storage_path text not null unique,
  role text not null check (role in ('main', 'gallery')),
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  alt text not null check (char_length(trim(alt)) between 5 and 240),
  credit text check (credit is null or char_length(trim(credit)) between 1 and 160),
  selected_for_public boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  focal_position text not null default 'center' check (focal_position in ('center', 'top', 'bottom', 'left', 'right')),
  created_at timestamptz not null default now()
);

create unique index if not exists application_media_one_main
on public.application_media (application_id)
where role = 'main';

create index if not exists application_media_application_order
on public.application_media (application_id, sort_order, created_at);

create table if not exists public.initiative_media (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  storage_path text not null unique,
  role text not null check (role in ('main', 'gallery')),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  alt text not null check (char_length(trim(alt)) between 5 and 240),
  credit text check (credit is null or char_length(trim(credit)) between 1 and 160),
  sort_order integer not null default 0 check (sort_order >= 0),
  focal_position text not null default 'center' check (focal_position in ('center', 'top', 'bottom', 'left', 'right')),
  created_at timestamptz not null default now()
);

create unique index if not exists initiative_media_one_main
on public.initiative_media (initiative_id)
where role = 'main';

create index if not exists initiative_media_initiative_order
on public.initiative_media (initiative_id, sort_order, created_at);

alter table public.application_media enable row level security;
alter table public.initiative_media enable row level security;

drop policy if exists "admins manage application media" on public.application_media;
create policy "admins manage application media" on public.application_media
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read initiative media" on public.initiative_media;
create policy "public read initiative media" on public.initiative_media
for select using (
  exists (
    select 1 from public.initiatives i
    where i.id = initiative_id and i.status in ('live', 'funding')
  )
);

drop policy if exists "admins manage initiative media" on public.initiative_media;
create policy "admins manage initiative media" on public.initiative_media
for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.admin_set_application_main_media(
  p_application_id uuid,
  p_media_id uuid
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin role required';
  end if;
  if not exists (
    select 1 from public.application_media
    where id = p_media_id and application_id = p_application_id
  ) then
    raise exception 'Application media not found';
  end if;
  update public.application_media
  set role = 'gallery'
  where application_id = p_application_id and role = 'main' and id <> p_media_id;
  update public.application_media
  set role = 'main', selected_for_public = true, sort_order = 0
  where id = p_media_id and application_id = p_application_id;
end;
$$;

revoke all on function public.admin_set_application_main_media(uuid, uuid) from public;
grant execute on function public.admin_set_application_main_media(uuid, uuid) to authenticated;

create or replace function public.admin_replace_initiative_media(
  p_initiative_id uuid,
  p_media jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin role required'; end if;
  if jsonb_array_length(p_media) < 1 or jsonb_array_length(p_media) > 9 then raise exception 'Invalid media count'; end if;
  if (select count(*) from jsonb_array_elements(p_media) item where item->>'role' = 'main') <> 1 then raise exception 'Exactly one main image required'; end if;
  delete from public.initiative_media where initiative_id = p_initiative_id;
  insert into public.initiative_media (id, initiative_id, storage_path, role, mime_type, width, height, alt, credit, sort_order, focal_position)
  select
    (item->>'id')::uuid,
    p_initiative_id,
    item->>'storage_path',
    item->>'role',
    item->>'mime_type',
    (item->>'width')::integer,
    (item->>'height')::integer,
    item->>'alt',
    nullif(item->>'credit', ''),
    (item->>'sort_order')::integer,
    coalesce(item->>'focal_position', 'center')
  from jsonb_array_elements(p_media) item;
end;
$$;

revoke all on function public.admin_replace_initiative_media(uuid, jsonb) from public;
grant execute on function public.admin_replace_initiative_media(uuid, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ayra-private-application-media',
  'ayra-private-application-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ayra-public-initiative-media',
  'ayra-public-initiative-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins read application media objects" on storage.objects;
create policy "admins read application media objects" on storage.objects
for select to authenticated
using (bucket_id = 'ayra-private-application-media' and public.is_admin());

drop policy if exists "admins manage application media objects" on storage.objects;
create policy "admins manage application media objects" on storage.objects
for all to authenticated
using (bucket_id = 'ayra-private-application-media' and public.is_admin())
with check (bucket_id = 'ayra-private-application-media' and public.is_admin());

drop policy if exists "public read initiative media objects" on storage.objects;
create policy "public read initiative media objects" on storage.objects
for select using (bucket_id = 'ayra-public-initiative-media');

drop policy if exists "admins manage initiative media objects" on storage.objects;
create policy "admins manage initiative media objects" on storage.objects
for all to authenticated
using (bucket_id = 'ayra-public-initiative-media' and public.is_admin())
with check (bucket_id = 'ayra-public-initiative-media' and public.is_admin());
