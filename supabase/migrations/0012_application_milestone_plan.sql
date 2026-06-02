alter table public.applications
add column if not exists milestone_plan text[] not null default array[
  'Setup and address verification',
  'First field update',
  'Public proof review'
];
