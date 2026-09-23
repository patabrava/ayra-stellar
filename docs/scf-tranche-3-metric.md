# SCF Tranche 3 metric

This document defines the Tranche 3 release condition for the SCF #46 Build
Award scope (Integration Track). It is a technical release gate for the new
mainnet features, not a marketing or field-program target. The text below is
identical to the Tranche 3 field of the SCF submission and to section 9.2 of
the technical architecture document.

## Definition

- Metric: active merchant accounts on Stellar mainnet, with floors on distinct payers and on volume.
- Threshold: at least 25 active merchants, at least 75 distinct payer accounts, and at least 1,000 USDC of qualifying payment volume.
- Window: any 30 consecutive days after the new features go live on mainnet, ending before the Tranche 3 submission.
- Active merchant: a merchant in the registry whose registered Stellar address receives at least 10 qualifying payments from at least 3 distinct payer accounts on at least 5 different days in the window. One merchant counts once, even if their registered address changes during the window.
- Qualifying payment: a mainnet USDC (Circle) payment to a registered merchant address, worth at least COP 5,000 at the time of the transaction.
- Excluded: payments from registered merchants or from accounts controlled by CREADOR LABS, AYRA, VIIO, Climate Future or team members; SDP disbursements; testnet activity; self-payments; and repeated round trips between the same two accounts.
- Verification: the acceptance query in the repository runs against Horizon or Stellar RPC and reproduces the result. We share the registered merchant addresses and the addresses controlled by the team and partners with SCF reviewers privately; the public dashboard shows the aggregate counts.
- Where payer USDC comes from: separately funded activation balances through SDP, residents' and visitors' own USDC, or provider on-ramps. None of it comes from this budget, and the disbursements themselves never count.
- Scale: 25 merchants is about 5% of the more than 500 businesses in our island catalogue.

## What the acceptance query does

1. Reads the merchant registry: merchant id, registered receiving address and
   the history of address changes, with the registration date.
2. Reads the list of excluded accounts: registered merchant addresses and the
   addresses controlled by CREADOR LABS, AYRA, VIIO, Climate Future and team
   members. Both lists are shared privately with SCF reviewers.
3. Reads USDC payment operations on Stellar mainnet for the chosen 30-day
   window from Horizon or Stellar RPC, checking the asset code and the Circle
   issuer.
4. Drops excluded payers, SDP disbursements, self-payments and repeated round
   trips between the same two accounts.
5. Converts each payment to COP at the transaction time using the declared
   reference rate and keeps payments of COP 5,000 or more.
6. Groups by merchant id (not by address) and counts, per merchant, the
   qualifying payments, the distinct payer accounts and the distinct days.
7. Reports the number of active merchants, the number of distinct payer
   accounts across all active merchants (each payer counted once) and the
   total qualifying volume in USDC.

The query, its input assumptions and the reference rate source are committed
with the Tranche 3 evidence bundle. The public dashboard shows the aggregate
counts only.
