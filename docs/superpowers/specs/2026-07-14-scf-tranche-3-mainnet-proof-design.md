# SCF Tranche 3 Mainnet and Proof Release Design

Date: 2026-07-14

## Objective

Close the deployable portion of SCF Tranche 3 without rewriting historical testnet evidence or representing an unverified payment as a live mainnet batch. The release must support a separate Stellar mainnet SDP environment, persist the network used by every batch, verify USDC against the correct Horizon and issuer, and publish a versioned immutable proof artifact after settlement.

## Current constraints

- The existing `ayra-sdp-testnet` deployment and all settled receipts are testnet records and must remain available.
- Stellar's SDP guidance requires a new instance for mainnet rather than switching an existing testnet database.
- The production registry currently has no verified Providencia payout address that exists on mainnet with the Circle USDC trustline.
- No mainnet distribution account is funded yet.
- Authentic field-execution evidence must come from Climate Future or the local delivery partner; test or operator-authored media cannot satisfy that acceptance item.

These constraints make a real payment and field closeout externally gated. The application and infrastructure will therefore fail closed until those inputs exist.

## Architecture

### Per-batch network identity

Add `stellar_network` to `funding_batches` with allowed values `testnet` and `pubnet`. Existing rows are backfilled to `testnet`; new rows use the explicitly configured application network. Once a batch is submitted, its network is immutable.

Every operation that can prove or submit money loads the batch network and resolves a complete, canonical network configuration:

| Network | Horizon | USDC issuer | Stellar Expert path |
| --- | --- | --- | --- |
| `testnet` | `https://horizon-testnet.stellar.org` | existing Stellar testnet USDC issuer | `explorer/testnet` |
| `pubnet` | `https://horizon.stellar.org` | Circle Stellar mainnet issuer | `explorer/public` |

Environment variables may override endpoints only when the override matches the active network. Startup and action-level validation reject an issuer or Horizon mismatch.

### Separate SDP environments

Keep `ayra-sdp-testnet` unchanged. Add an independent `ayra-sdp-mainnet` compose project with its own database, secrets, distribution account, SEP-10 account, API hostname, dashboard hostname, and Stellar mainnet configuration. MFA stays enabled for the mainnet dashboard.

The application has distinct SDP credentials for testnet and mainnet. A gateway is created from the batch network, preventing a historical testnet batch from being queried through the mainnet SDP or vice versa.

### Payout readiness and release control

A payout address is network-specific. Add `stellar_network` to `payout_addresses`, backfill existing rows to `testnet`, and require a separate pubnet submission and verification. Verifying an address checks that the account exists on that network and has the expected USDC trustline. Creating and submitting a batch requires a verified/locked address for the same network.

Mainnet submission also requires an explicit release switch (`AYRA_MAINNET_PAYMENTS_ENABLED=1`). This is a deployment kill switch, not a substitute for the registry, trustline, SDP, or funding checks.

### Immutable proof-pack releases

Add `proof_pack_releases` with:

- batch, version, and network identity;
- the normalized public proof payload;
- SHA-256 digest of canonical JSON;
- application commit and deployment identifier;
- creator and timestamp.

Only a settled batch whose public receipt lines all have verified USDC metadata and matched attribution can be released. A `(batch_id, version)` release is immutable. The public JSON route serves the stored artifact rather than regenerating it from mutable tables. The existing proof page and CSV expose the batch network and network-correct explorer URLs.

### Operational evidence

The repository includes:

- mainnet deployment and funded-account runbook;
- rollback and kill-switch procedure;
- failure-injection/acceptance script;
- versioned handoff checklist and next-track notes;
- field-evidence checklist that distinguishes partner evidence from QA records.

The proof release records software and ledger evidence. Field evidence remains a separate, human-originated acceptance input and is never synthesized by the application.

## Failure behavior

- Unknown/missing network: reject the action.
- Horizon or issuer does not match the batch network: reject before submission or settlement.
- Payout address belongs to another network: reject batch creation/submission.
- Pubnet release switch disabled: reject before contacting SDP.
- Recipient account absent or missing the expected trustline: reject before contacting SDP.
- SDP reports success but Horizon proof fails: keep the line item processing and batch submitted.
- Attribution is unmatched or incomplete: do not freeze a proof release.
- Proof payload digest changes after release: acceptance verification fails.
- Mainnet SDP is unhealthy: web deployment remains readable, but mainnet payments stay disabled.

## Acceptance criteria

1. Existing testnet receipts continue to link to and verify against testnet.
2. Pubnet fixtures resolve to mainnet Horizon, Circle USDC, and public explorer links.
3. A batch cannot cross networks at address, SDP, or Horizon boundaries.
4. Mainnet submission is disabled by default and requires every release gate.
5. A settled, matched batch can produce one immutable, digest-verifiable proof release.
6. Production migration backfills historical rows to testnet without changing their transaction proof.
7. The web deployment passes unit, lint, build, HTTP, and browser checks.
8. The separate mainnet SDP deployment passes health checks before payment enablement.
9. A real batch is executed only when a funded distribution account and a partner-approved mainnet USDC recipient exist.
10. Tranche reporting labels externally gated live-payment and field-evidence items honestly until their source evidence is received.
