insert into public.profiles (id, email, display_name) values
  ('00000000-0000-0000-0000-000000000001', 'caposk817@gmail.com', 'Nicolas Alvarez'),
  ('00000000-0000-0000-0000-000000000002', 'leidy@ecoparque.co', 'Leidy Mendoza'),
  ('00000000-0000-0000-0000-000000000003', 'applicant@example.org', 'Prospective steward'),
  ('00000000-0000-0000-0000-000000000004', 'nicolas.weber@nos.studio', 'Nicolas Weber')
on conflict (email) do nothing;

insert into public.tracks (id, slug, name, local_currency, theme) values
  ('10000000-0000-0000-0000-000000000001', 'providencia', 'Providencia', 'COP', 'Cinematic island stewardship')
on conflict (slug) do nothing;

insert into public.sponsors (id, slug, name, public_attribution) values
  ('20000000-0000-0000-0000-000000000001', 'audi-foundation', 'Audi Foundation', 'With support from Audi Foundation.'),
  ('20000000-0000-0000-0000-000000000002', 'climate-future', 'Climate Future', 'Climate Future matched this month.')
on conflict (slug) do nothing;

insert into public.initiatives (
  id, track_id, sponsor_id, code, slug, name, headline, description,
  steward_name, league_score, target_metric_label, target_metric_current,
  target_metric_goal, status
) values
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'AYRA-PVD-REFOREST',
    'reforestation',
    'Reforestation',
    'Native canopy across Old Point and Bottom House.',
    'Local crews are rebuilding native canopy cover with monthly field updates and category-level on-chain receipts.',
    'Leidy Mendoza',
    87,
    'Trees in the ground',
    1284,
    1800,
    'live'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'AYRA-PVD-STERIL',
    'dog-sterilization',
    'Dog Sterilization',
    'A mobile clinic for the island.',
    'A six-month veterinary lane waiting on final payout verification before the first batch.',
    'Dr. M. Gomez',
    71,
    'Clinic slots',
    0,
    420,
    'funding'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    null,
    'AYRA-PVD-REEF',
    'reef',
    'Reef',
    'East-shore reef monitoring.',
    'A planning-stage reef restoration lane for later Providencia transparency releases.',
    null,
    58,
    'Survey sites',
    0,
    8,
    'funding'
  )
on conflict (code) do nothing;

insert into public.user_roles (profile_id, role, initiative_id, grantee_id) values
  ('00000000-0000-0000-0000-000000000001', 'admin', null, null),
  ('00000000-0000-0000-0000-000000000004', 'admin', null, null),
  ('00000000-0000-0000-0000-000000000002', 'steward', '30000000-0000-0000-0000-000000000001', null)
on conflict do nothing;

insert into public.grantees (id, initiative_id, name, contact_profile_id) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Ecoparque Iron Wood', '00000000-0000-0000-0000-000000000002')
on conflict do nothing;

insert into public.steward_profiles (
  id, profile_id, initiative_id, organisation_name, public_contact_name, private_phone
) values
  (
    '41000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'Ecoparque Iron Wood',
    'Leidy Mendoza',
    '+57 300 000 0000'
  )
on conflict (profile_id, initiative_id) do nothing;

insert into public.user_roles (profile_id, role, initiative_id, grantee_id) values
  ('00000000-0000-0000-0000-000000000002', 'grantee_contact', null, '40000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into public.grantee_contacts (id, profile_id, grantee_id) values
  (
    '42000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001'
  )
on conflict (profile_id, grantee_id) do nothing;

insert into public.payout_addresses (
  id, initiative_id, address, status, submitted_by_profile_id,
  submitted_at, verified_at, verified_by_profile_id, locked_at, verification_note
) values
  (
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'GBLEIDYECOPARQUEIRONWOODPROVIDENCIASTELLAR3RS9KQ4MWL2VTYGB7',
    'locked',
    '00000000-0000-0000-0000-000000000002',
    '2026-02-12T10:00:00Z',
    '2026-02-13T13:00:00Z',
    '00000000-0000-0000-0000-000000000001',
    '2026-02-28T15:00:00Z',
    'Voice-confirmed on Signal.'
  )
on conflict (initiative_id, address) do nothing;

insert into public.milestones (id, initiative_id, code, title, percent_complete, status) values
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'M01', 'Permits and sites locked', 100, 'done'),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'M02', 'Nursery ready', 100, 'done'),
  ('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'M03', 'Planting in flight', 71, 'active'),
  ('60000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'M04', 'Q4 survival audit', 0, 'planned')
on conflict (initiative_id, code) do nothing;

insert into public.applications (
  applicant_profile_id, applicant_name, applicant_email, proposed_track_name,
  proposed_initiative_name, scope_summary, operational_notes, contact_signal, status
) values
  (
    '00000000-0000-0000-0000-000000000003',
    'Dr. M. Gomez',
    'gomez@vetprov.co',
    'Providencia',
    'Dog Sterilization',
    'Mobile clinic support for six months.',
    'Needs payout verification before funding.',
    '+57 300 222 1111',
    'pending'
  );

insert into public.initiative_updates (
  id, initiative_id, milestone_id, submitted_by_profile_id, source, caption,
  public_caption, status, submitted_at, published_at, moderated_by_profile_id
) values
  (
    '70000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'grantee_contact',
    'Survival rate by site holding above 85% on the older stands. Casabaja batch transplanted on Thursday.',
    'Survival rate by site is holding above 85% on the older stands. Casabaja batch was transplanted on Thursday.',
    'approved',
    '2026-04-22T10:06:00Z',
    '2026-04-22T15:00:00Z',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'grantee_contact',
    'Six volunteers, three rows. Bottom House next week.',
    null,
    'pending',
    '2026-05-02T14:08:00Z',
    null,
    null
  )
on conflict do nothing;

insert into public.update_media (update_id, kind, url, alt, public_ready) values
  ('70000000-0000-0000-0000-000000000001', 'image', '/window.svg', 'Field team checking young native trees.', true)
on conflict do nothing;

insert into public.funding_batches (
  id, initiative_id, sponsor_id, code, period_label, status,
  created_by_profile_id, created_at, submitted_at, settled_at, sdp_batch_id
) values
  (
    '80000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'PV-REFOREST-APR26',
    'April 2026',
    'submitted',
    '00000000-0000-0000-0000-000000000001',
    '2026-04-29T10:00:00Z',
    '2026-04-30T09:14:00Z',
    null,
    'mock-batch-reforest-apr26'
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'PV-REFOREST-MAR26',
    'March 2026',
    'settled',
    '00000000-0000-0000-0000-000000000001',
    '2026-03-28T10:00:00Z',
    '2026-03-31T09:02:00Z',
    '2026-03-31T12:15:00Z',
    'mock-batch-reforest-mar26'
  )
on conflict (code) do nothing;

insert into public.batch_line_items (
  batch_id, category, amount_usdc, local_amount, local_currency,
  status, sdp_payment_id, transaction_hash
) values
  ('80000000-0000-0000-0000-000000000001', 'Crew wages', 4820, 18798000, 'COP', 'settled', 'mock-payment-apr-1', 'mock-tx-apr-crew'),
  ('80000000-0000-0000-0000-000000000001', 'Seedlings', 3160, 12324000, 'COP', 'settled', 'mock-payment-apr-2', 'mock-tx-apr-seedlings'),
  ('80000000-0000-0000-0000-000000000001', 'Tools and transport', 2540, 9906000, 'COP', 'processing', 'mock-payment-apr-3', null),
  ('80000000-0000-0000-0000-000000000001', 'Training', 1860, 7254000, 'COP', 'submitted', 'mock-payment-apr-4', null),
  ('80000000-0000-0000-0000-000000000001', 'Monitoring', 1820, 7098000, 'COP', 'submitted', 'mock-payment-apr-5', null),
  ('80000000-0000-0000-0000-000000000002', 'Crew wages', 4200, 16380000, 'COP', 'settled', 'mock-payment-mar-1', 'mock-tx-mar-crew'),
  ('80000000-0000-0000-0000-000000000002', 'Seedlings', 3100, 12090000, 'COP', 'settled', 'mock-payment-mar-2', 'mock-tx-mar-seedlings')
on conflict do nothing;

insert into public.sdp_sync_events (
  batch_id, provider, action, status, external_id, created_at
) values
  ('80000000-0000-0000-0000-000000000001', 'mock', 'mark_ready', 'ok', 'mock-batch-reforest-apr26', '2026-04-30T09:14:00Z'),
  ('80000000-0000-0000-0000-000000000002', 'mock', 'sync_status', 'ok', 'mock-batch-reforest-mar26', '2026-03-31T12:15:00Z');
