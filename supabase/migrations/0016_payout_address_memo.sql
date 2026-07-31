alter table public.payout_addresses
  add column if not exists wallet_address_memo text;

alter table public.payout_addresses
  drop constraint if exists payout_addresses_wallet_address_memo_check,
  add constraint payout_addresses_wallet_address_memo_check check (
    wallet_address_memo is null
    or (
      wallet_address_memo = btrim(wallet_address_memo)
      and octet_length(wallet_address_memo) between 1 and 28
    )
  );
