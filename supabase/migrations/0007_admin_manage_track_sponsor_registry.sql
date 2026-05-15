drop policy if exists "admins manage tracks" on public.tracks;
create policy "admins manage tracks" on public.tracks
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage sponsors" on public.sponsors;
create policy "admins manage sponsors" on public.sponsors
for all using (public.is_admin()) with check (public.is_admin());
