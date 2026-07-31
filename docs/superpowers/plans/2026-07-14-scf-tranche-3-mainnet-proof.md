# SCF Tranche 3 Mainnet and Proof Release Implementation Plan

> Execute this plan with test-driven changes, fresh verification at each deployment boundary, and no fabricated payment or field evidence.

**Goal:** Deploy network-safe Stellar mainnet support and immutable proof releases while preserving all historical testnet receipts and failing closed until genuine mainnet funding, recipient, and field evidence are available.

**Architecture:** Store Stellar network identity on batches and payout addresses, derive canonical network configuration in one module, select SDP and Horizon per batch, and freeze settled proof packs into an immutable release table. Deploy mainnet SDP as a separate Hostinger project and keep payment submission behind explicit operational gates.

**Stack:** Next.js 16, TypeScript, Node test runner, Supabase/Postgres, Stellar SDP Docker stack, Vercel, Hostinger VPS.

---

## Task 1: Canonical Stellar network configuration

**Files:**
- Create: `src/lib/ayra/stellar-network.ts`
- Create: `tests/ayra-stellar-network.test.ts`
- Modify: `src/lib/ayra/stellar-proof.ts`
- Modify: `.env.example`

1. Write failing tests for canonical testnet/pubnet Horizon, issuer, explorer path, invalid network values, and incompatible endpoint/issuer overrides.
2. Run `npm test -- --test-name-pattern='Stellar network'` and confirm failure.
3. Implement the resolver and network type with exact Circle mainnet and existing testnet constants.
4. Replace the proof helper's implicit testnet default with an explicit resolved network configuration.
5. Run the focused tests and commit.

## Task 2: Persist network identity and protect cross-network operations

**Files:**
- Create: `supabase/migrations/0015_tranche_3_mainnet_release_controls.sql`
- Modify: `src/lib/ayra/domain.ts`
- Modify: `src/lib/ayra/data.ts`
- Modify: `src/lib/ayra/actions.ts`
- Modify: `src/lib/ayra/batch-sync.ts`
- Modify: `tests/ayra-data.test.ts`
- Modify: `tests/ayra-batch-sync.test.ts`
- Modify: `tests/ayra-sdp-export.test.ts`

1. Write failing mapping and settlement tests proving that batch network flows into Horizon verification and that a cross-network payout is rejected.
2. Add `stellar_network` to batches and payout addresses, backfill testnet, add constraints/indexes, and prevent network changes after verification/submission.
3. Stamp new addresses/batches from `AYRA_STELLAR_NETWORK` and query destinations by matching network.
4. Select proof issuer/Horizon and SDP gateway from the stored batch network.
5. Require `AYRA_MAINNET_PAYMENTS_ENABLED=1` for pubnet submission.
6. Run focused tests and commit.

## Task 3: Network-correct public proof and immutable releases

**Files:**
- Create: `src/lib/ayra/proof-release.ts`
- Create: `src/app/proof/[batchId]/release/route.ts`
- Create: `tests/ayra-proof-release.test.ts`
- Modify: `supabase/migrations/0015_tranche_3_mainnet_release_controls.sql`
- Modify: `src/lib/ayra/domain.ts`
- Modify: `src/lib/ayra/data.ts`
- Modify: `src/lib/ayra/export.ts`
- Modify: `src/components/ayra/ui.tsx`
- Modify: `src/app/proof/[batchId]/page.tsx`
- Modify: `src/app/proof/[batchId]/export/route.ts`
- Modify: `tests/ayra-domain.test.ts`
- Modify: `tests/ayra-ui.test.ts`
- Modify: `tests/ayra-sdp-export.test.ts`

1. Write failing tests for canonical JSON hashing, immutable release eligibility, pubnet links, and CSV network columns.
2. Add `proof_pack_releases` with RLS, uniqueness, and an update/delete prevention trigger.
3. Implement deterministic payload normalization and SHA-256 verification.
4. Add an admin action to freeze a release only for settled, fully verified, fully matched batches.
5. Serve stored release JSON and expose network-correct proof links/labels.
6. Run focused tests and commit.

## Task 4: Mainnet SDP deployment bundle and operations handoff

**Files:**
- Create: `deploy/hostinger-sdp-mainnet/docker-compose.yml`
- Create: `deploy/hostinger-sdp-mainnet/.env.example`
- Create: `deploy/hostinger-sdp-mainnet/README.md`
- Create: `scripts/verify-sdp-mainnet.mjs`
- Create: `docs/ayra-stellar-sdp-mainnet-runbook.md`
- Create: `docs/scf-tranche-3-acceptance.md`
- Modify: `package.json`
- Modify: `README.md`

1. Add configuration tests/static checks proving the mainnet stack uses Public Global Stellar Network, public Horizon/RPC, separate database/service names, and MFA enabled.
2. Create the separate compose bundle with no committed secrets.
3. Add health, network-identity, and account-readiness checks that never print secret keys.
4. Document provisioning, funding, release switch, rollback, proof freeze, next-track handoff, and authentic field-evidence requirements.
5. Upgrade the vulnerable production `ws` dependency to a patched version and rerun `npm audit --omit=dev`.
6. Run tests, lint, build, and commit.

## Task 5: Production migration and web deployment

1. Apply the Supabase migration and read back constraints, backfill counts, and proof view columns.
2. Deploy the linked `ayra-transparency` project to Vercel with the application network left at testnet and mainnet payments disabled until the separate SDP is accepted.
3. Verify public pages, a historical proof, testnet explorer links, CSV network identity, release route behavior, and authenticated operator page health.
4. Push the verified commit to the production source branch without touching unrelated dirty files in the user's main checkout.

## Task 6: Separate mainnet SDP deployment

1. Provision new mainnet distribution and SEP-10 keypairs without reusing or exposing testnet keys.
2. Deploy as a new Hostinger compose project; do not mutate `ayra-sdp-testnet`.
3. Confirm containers, API live/ready health, dashboard TLS, mainnet network identity, database isolation, and MFA.
4. Confirm the public distribution account exists and is funded before enabling payments. If not funded, leave the release switch disabled and record the exact funding handoff.

## Task 7: Live batch and final acceptance

1. Re-read the production registry and verify a partner-approved Providencia pubnet address exists with the Circle USDC trustline.
2. Verify the mainnet distribution account has enough XLM reserves/fees and sponsor-funded USDC for the approved line items.
3. Only when both gates pass, create, submit, settle, Horizon-verify, reconcile, and freeze the first mainnet proof release.
4. Run failure injection for wrong network, missing trustline, bad hash, amount mismatch, issuer mismatch, and disabled release switch.
5. Capture live HTTP/browser/DB/Horizon evidence and mark each SCF deliverable complete or externally blocked. Never substitute QA records for local field evidence.
