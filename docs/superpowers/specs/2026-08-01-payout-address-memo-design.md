# Payout Address Memo Design

## Goal

Persist an optional Stellar destination memo with each payout address and carry it unchanged into every SDP payment submission. This enables the authorized 5 USDC validation payment to `GB5CLRWUCBQ6DFK2LR5ZMWJ7QCVEB3XKMPTQUYCDIYB4DRZJBEW6M26D` with memo `4192883277` through the live AYRA frontend.

## Chosen approach

Add a nullable `wallet_address_memo` column to `payout_addresses`. The steward payout form accepts the memo, the registry displays it for operator verification, and both SDP destination loaders return it. This keeps the memo attached to the verified recipient record instead of hard-coding it into one batch or bypassing AYRA through the SDP dashboard.

Rejected alternatives:

- Hard-code the memo for this initiative: fast but unsafe and non-reusable.
- Create the payment manually in SDP: bypasses the requested frontend, audit trail, and reconciliation controls.

## Contract and validation

- `wallet_address_memo` is optional, trimmed text.
- A supplied memo must contain 1–28 UTF-8 bytes, matching Stellar text-memo capacity and safely covering numeric memo IDs such as `4192883277`.
- Existing memo-less payout records remain valid.
- The memo is operator-visible and passed to SDP as `walletAddressMemo`; it is not added to public project copy or exposed as private identity data.

## Data flow

1. Steward submits address plus optional memo.
2. AYRA stores both on the pubnet payout-address row and checks the Circle USDC trustline.
3. Admin verifies the row and can visually compare address, network, and memo.
4. Batch creation locks the verified destination.
5. SDP receiver CSV/payment creation receives the stored memo unchanged.
6. Settlement verification remains bound to network, issuer, destination, amount, and transaction hash.

## UI and operational behavior

- Steward: add an optional memo field and show the active memo beside the active address.
- Admin Registry: add a Memo column.
- Payment/proof screens retain the existing AYRA visual system and status model.
- Missing or oversized memos fail closed before database writes.

## Tests

- Domain/data mapping preserves an optional memo.
- Steward action inserts `wallet_address_memo`.
- Both SDP submission paths select and forward it.
- Existing memo-less records remain supported.
- Full unit, lint, and production build validation run before migration/deployment.

## Live acceptance

- Apply the migration before deploying code.
- Submit and verify the supplied pubnet address and memo through the live role screens.
- Create an admin-approved advance batch explicitly labeled `5 USDC validation payment` under `A00 · Launch advance`.
- Submit once, verify settlement on Horizon, reconcile attribution, freeze proof release v1, publish approved field evidence, and return the mainnet kill switch to disabled.
