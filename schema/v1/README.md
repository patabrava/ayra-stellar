# Providencia Onchain schema v1

This directory holds the reusable, integration-neutral data contract of the
Providencia Onchain rail. It is meant to be reused by another location without
exposing merchant-level or participant-identifying data. It is licensed under
the Apache License 2.0 (see the repository root).

## Proof release (exists today)

Every settled disbursement batch can be published as an immutable proof
release: a JSON payload plus its SHA-256 checksum, served at
`/proof/{batchId}/release?version={n}`. The payload is described in
[`proof-release.schema.json`](proof-release.schema.json) (JSON Schema).
`stellarNetwork` is `testnet` or `pubnet` (Stellar mainnet).

The checksum is computed over the canonical JSON of the payload (object keys
sorted, fields without a value omitted, no whitespace), not over the
pretty-printed file the endpoint serves; re-serialize the file canonically
before hashing. The endpoint also returns the checksum in the
`x-ayra-proof-sha256` header.

Rules enforced before a release is created:

- the batch is settled ("Cleared") and has at least one receipt;
- every receipt has a real 64-character transaction hash;
- every receipt is USDC from the Circle issuer of the stated network, and the
  onchain amount equals the published line item;
- every receipt has matched attribution.

Fields: `schemaVersion`, `releaseVersion`, `appCommit`, `deploymentId`,
`batchId`, `batchCode`, `initiativeName`, `initiativeSlug`, `trackSlug`,
`sponsorName`, `periodLabel`, `stellarNetwork`, `publicLabel` and
`receipts[]` with `id`, `category`, `amountUsdc`, `localAmount`,
`localCurrency`, `transactionHash`, `assetCode`, `assetIssuer`,
`assetAmount`, `sourceRecordExternalId`, `externalId`, `nodeCode`,
`trackCode`, `milestoneCode`, `recipientCategory` and
`attributionMatchStatus`.

## Payment records (added under SCF #46, deliverable D3.6)

The SCF #46 scope extends this contract with the records the payment rail
needs. Field lists follow section 7 of the technical architecture document;
the JSON Schema files are added with deliverable D3.6.

| Record | Fields |
| --- | --- |
| Onchain payment | hash, ledger, source, destination, asset, amount, time, result |
| Attribution | merchant id, cohort, program line item, reporting period |
| Withdrawal | provider, provider reference, COP amount, status, time |
| Merchant registry (private) | merchant id, registered address, address history, payout destination, consent |

The public view exposes aggregates, program payments with their transaction
links, and the Tranche 3 metric. Merchant-level records and the mapping
between merchants and addresses stay access-controlled.
