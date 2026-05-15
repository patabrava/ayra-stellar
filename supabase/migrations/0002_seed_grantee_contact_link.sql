insert into public.grantee_contacts (id, profile_id, grantee_id) values
  (
    '42000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001'
  )
on conflict (profile_id, grantee_id) do nothing;
