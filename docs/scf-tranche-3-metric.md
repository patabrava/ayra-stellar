# SCF Tranche 3 metric

This document defines the proposed Tranche 3 adoption metric for Providencia
Onchain. It is a technical release gate for the new mainnet features. It is not
a marketing, go-to-market, resident-acquisition, or field-programme target.

## Gate

The gate is satisfied when both conditions are true during any 30 consecutive
days after the new mainnet features launch and before the Tranche 3 submission:

1. At least 25 active merchant accounts are counted.
2. At least 75 distinct payer accounts are counted across those merchants.

The measurement window must close within the SCF timing rule for Tranche 3.

## Active merchant account

One merchant equals one registered merchant address on the public transparency
dashboard. A registered merchant address is counted as active when it receives
at least 10 qualifying onchain USDC payments from at least 3 distinct payer
accounts inside the measurement window.

Each qualifying payment must meet the minimum value of COP 1,000, calculated at
the transaction time using the proposal’s declared conversion method. The same
payer account counts once in the distinct-payer total even if it pays multiple
merchants.

## Exclusions

- Testnet payments.
- SDP activation or funding disbursements.
- Payments controlled by AYRA, CREADOR LABS UG, VIIO, Climate Future, Camilo,
  or their related wallets.
- Obvious self-payments, refunds, reversals, and repeated circular transfers
  between the same accounts.

The exclusions are intended to remove non-adoption activity without imposing a
broader restriction on ordinary independent merchant payments.

## Verification

The acceptance query should:

1. Read the registered merchant-address list from the transparency dashboard.
2. Read Stellar mainnet payment operations for the selected 30-day window.
3. Verify the asset issuer and USDC asset.
4. Apply the COP 1,000 transaction-time minimum.
5. Remove excluded accounts and non-qualifying operation types.
6. Group by merchant address and count payments and distinct payer accounts.
7. Report the active-merchant count and the distinct-payer count.

The query and its input assumptions should be committed with the final proposal
package. The merchant-address list may be provided privately to SCF reviewers;
the public dashboard exposes aggregate results only.
