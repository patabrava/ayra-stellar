create or replace function public.claim_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  user_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  user_name text := nullif(auth.jwt() -> 'user_metadata' ->> 'name', '');
  claimed public.profiles;
begin
  if user_id is null or user_email is null then
    raise exception 'authenticated user email required';
  end if;

  update public.profiles
  set auth_user_id = user_id
  where lower(email) = user_email
    and (auth_user_id is null or auth_user_id = user_id)
  returning * into claimed;

  if claimed.id is null then
    select * into claimed
    from public.profiles
    where auth_user_id = user_id
    limit 1;
  end if;

  if claimed.id is null then
    insert into public.profiles (auth_user_id, email, display_name)
    values (user_id, user_email, coalesce(user_name, split_part(user_email, '@', 1)))
    returning * into claimed;

    insert into public.user_roles (profile_id, role)
    values (claimed.id, 'applicant')
    on conflict do nothing;
  end if;

  return claimed;
end;
$$;

revoke execute on function public.claim_current_profile() from public;
revoke execute on function public.claim_current_profile() from anon;
grant execute on function public.claim_current_profile() to authenticated;

drop policy if exists "users read own roles" on public.user_roles;
create policy "users read own roles" on public.user_roles
for select using (profile_id = public.current_profile_id());

drop policy if exists "scoped users read steward profiles" on public.steward_profiles;
create policy "scoped users read steward profiles" on public.steward_profiles
for select using (profile_id = public.current_profile_id());

drop policy if exists "scoped users read grantees" on public.grantees;
create policy "scoped users read grantees" on public.grantees
for select using (
  contact_profile_id = public.current_profile_id()
  or exists (
    select 1 from public.grantee_contacts gc
    where gc.grantee_id = grantees.id
      and gc.profile_id = public.current_profile_id()
  )
  or exists (
    select 1 from public.user_roles r
    where r.profile_id = public.current_profile_id()
      and r.role = 'steward'
      and r.initiative_id = grantees.initiative_id
  )
);

drop policy if exists "scoped users read contacts" on public.grantee_contacts;
create policy "scoped users read contacts" on public.grantee_contacts
for select using (profile_id = public.current_profile_id());

drop policy if exists "scoped users read payout addresses" on public.payout_addresses;
create policy "scoped users read payout addresses" on public.payout_addresses
for select using (
  exists (
    select 1 from public.user_roles r
    where r.profile_id = public.current_profile_id()
      and (
        (r.role = 'steward' and r.initiative_id = payout_addresses.initiative_id)
        or exists (
          select 1 from public.grantees g
          where g.id = r.grantee_id
            and g.initiative_id = payout_addresses.initiative_id
        )
      )
  )
);

drop policy if exists "scoped users read own updates" on public.initiative_updates;
create policy "scoped users read own updates" on public.initiative_updates
for select using (
  submitted_by_profile_id = public.current_profile_id()
  or exists (
    select 1 from public.user_roles r
    where r.profile_id = public.current_profile_id()
      and (
        (r.role = 'steward' and r.initiative_id = initiative_updates.initiative_id)
        or exists (
          select 1 from public.grantees g
          where g.id = r.grantee_id
            and g.initiative_id = initiative_updates.initiative_id
        )
      )
  )
);

drop policy if exists "scoped users read own update media" on public.update_media;
create policy "scoped users read own update media" on public.update_media
for select using (
  exists (
    select 1 from public.initiative_updates u
    where u.id = update_media.update_id
      and u.submitted_by_profile_id = public.current_profile_id()
  )
);

drop policy if exists "scoped users insert own update media" on public.update_media;
create policy "scoped users insert own update media" on public.update_media
for insert with check (
  public_ready = false
  and exists (
    select 1 from public.initiative_updates u
    where u.id = update_media.update_id
      and u.submitted_by_profile_id = public.current_profile_id()
      and u.status = 'pending'
  )
);

drop policy if exists "scoped users read submitted line items" on public.batch_line_items;
create policy "scoped users read submitted line items" on public.batch_line_items
for select using (
  exists (
    select 1
    from public.funding_batches b
    join public.user_roles r on r.profile_id = public.current_profile_id()
    left join public.grantees g on g.id = r.grantee_id
    where b.id = batch_line_items.batch_id
      and b.status in ('submitted', 'settled')
      and (
        (r.role = 'steward' and r.initiative_id = b.initiative_id)
        or g.initiative_id = b.initiative_id
      )
  )
);

drop policy if exists "authenticated insert own audit logs" on public.audit_logs;
create policy "authenticated insert own audit logs" on public.audit_logs
for insert with check (actor_profile_id = public.current_profile_id());

drop policy if exists "admins manage sdp events" on public.sdp_sync_events;
create policy "admins manage sdp events" on public.sdp_sync_events
for all using (public.is_admin()) with check (public.is_admin());
