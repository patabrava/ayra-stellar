revoke execute on function public.claim_current_profile() from public;
revoke execute on function public.claim_current_profile() from anon;
grant execute on function public.claim_current_profile() to authenticated;
