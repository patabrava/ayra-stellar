# AYRA Stellar MVP Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining MVP contracts: strict scope matrix, public track switching, browser-level seeded smoke coverage, and real Stellar SDP testnet verification.

**Architecture:** Keep AYRA DB as canonical truth. Keep SDP behind `src/lib/ayra/sdp.ts`; mock and real testnet adapters must share the same app-facing gateway. Treat Playwright browser smoke as the continuous happy-path proof, and a separate live SDP runbook/script as the external payment proof.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, existing `node:test`/`tsx`, one added dev dependency for browser smoke (`@playwright/test`), Stellar SDP Dashboard API/testnet.

`{files, LOC/file, deps}`: target 8 touched files; keep each file under 900 LOC; add 1 dev dependency (`@playwright/test`) only if browser acceptance is implemented in-repo.

---

## Evidence Summary

- PRD MVP requires mock + real testnet SDP paths, public track switching, seeded smoke coverage, and strict privacy-safe proof surfaces.
- HRRLME defers VIIO, AI suggestions, advanced search/filters, phone-based registration, auto-batching, multiple payout addresses, steward-triggered payouts, redacted receipt downloads, and full reporting.
- Current repo passes `npm test`, `npm run lint`, and `npm run build`.
- Current `src/lib/ayra/sdp.ts` is mock-only; `createSdpGateway()` always returns `createMockSdpGateway()`.
- Current public wall accepts `?track=...` but does not render track navigation.
- Stellar SDP current API flow is: create disbursement, upload CSV instructions, start disbursement/status transition, list or retrieve payments for payment ids/status/transaction ids.
- For direct wallet-address disbursements, official CSV templates include `email,walletAddress,walletAddressMemo,id,amount,paymentID` or `phone,walletAddress,walletAddressMemo,id,amount,paymentID`.
- Local SDP MCP/CLI research found no ready-made SDP-specific MCP for the app workflow; the MVP should use a narrow SDP REST adapter plus verification script, not a broad custom MCP or general-purpose `sdpctl`.
- SDP backend may reject starting a disbursement by the same creator, so real testnet config needs either a second SDP credential/header or a documented operator handoff.

## Task 1: Lock MVP Scope Matrix

**Files:**
- Create: `docs/ayra-stellar-mvp-matrix.md` (~180 LOC)
- Modify: `README.md` (~40 LOC) or leave unchanged if README refresh is deferred

- [ ] Create a matrix with columns: `Capability`, `MVP status`, `Repo evidence`, `Acceptance check`, `Deferred notes`.
- [ ] Mark these as MVP: public wall, application intake, admin approval/promotion, scoped steward/grantee updates, moderation, one verified payout address per initiative, manual admin batches, mock SDP submit/sync, real SDP testnet submit/sync, privacy-safe proof page, CSV export, audit log, storage separation, seeded browser smoke.
- [ ] Mark these as deferred: VIIO, AI suggestions, advanced search/filter, phone registration, auto-batching, multiple payout addresses, steward/grantee-triggered payouts, public raw/redacted receipts, full reporting.
- [ ] Add acceptance commands:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Expected: matrix makes the remaining implementation small and prevents treating intentionally deferred scope as bugs.

## Task 2: Add Public Track Selector

**Files:**
- Modify: `src/app/page.tsx` (~80 LOC change)
- Modify: `src/lib/ayra/domain.ts` (~80 LOC change if adding a second deterministic demo track)
- Modify: `tests/ayra-domain.test.ts` (~40 LOC change)
- Modify: `tests/ayra-data.test.ts` (~30 LOC change if row mapping needs a second track fixture)

- [ ] Write a failing test that `getPublicWallProjection(state, "some-other-track")` returns only initiatives/updates/batches for that selected track while defaulting safely when the slug is unknown.
- [ ] Add a visible track selector to the public wall nav using `state.tracks`. Links should be `/?track=<slug>`; active state should come from `wall.track.slug`.
- [ ] Keep the hero default product signal centered on Providencia/Reforestation when no track is selected.
- [ ] If only one track exists, render the selector as a one-item control rather than hiding the navigation contract.
- [ ] If a second deterministic demo track is added, keep it clearly synthetic and do not weaken the Providencia/Reforestation smoke path.
- [ ] Run:

```bash
npm test
npm run lint
npm run build
```

Expected: public UI exposes the primary navigation control promised by PRD/HRRLME, and the projection remains track-scoped.

## Task 3: Add Seeded Browser Smoke

**Files:**
- Modify: `package.json` (~8 LOC)
- Modify: `package-lock.json`
- Create: `playwright.config.ts` (~50 LOC)
- Create: `tests/e2e/ayra-seeded-smoke.spec.ts` (~220 LOC)

- [ ] Add `@playwright/test` as the only new dev dependency.
- [ ] Add script:

```json
"test:e2e": "playwright test"
```

- [ ] Configure Playwright `webServer` to run `npm run dev` on an available local port, with Supabase env omitted so demo sessions are deterministic.
- [ ] Browser smoke must verify:
  - `/` loads public wall and has track selector, latest-first updates, proof link, no private email or raw receipt path.
  - `/apply` submits synthetic application and shows demo submitted status when Supabase env is absent.
  - `/admin` loads operator console, shows applications/updates/batches, SDP mode, proof packs, and CSV export link.
  - `/steward` loads scoped portal, update form, sanitized feedback, payout-address state, and no raw private receipt path.
  - `/proof/<seeded-batch-id>` loads public proof with category-level receipts and no private recipient/receipt leakage.
- [ ] Run:

```bash
npx playwright install chromium
npm run test:e2e
npm test
npm run lint
npm run build
```

Expected: the seeded MVP happy path is continuously proven through real rendered pages, not just domain/module tests.

## Task 4: Implement Env-Selected Stellar SDP Gateway

**Files:**
- Modify: `src/lib/ayra/sdp.ts` (~350 LOC total target)
- Modify: `src/lib/ayra/actions.ts` (~120 LOC change)
- Modify: `src/lib/ayra/domain.ts` (~40 LOC change if gateway types are deduplicated)
- Modify: `tests/ayra-sdp-export.test.ts` (~160 LOC change)
- Optional create only if `sdp.ts` exceeds 900 LOC: `src/lib/ayra/sdpCsv.ts` (~140 LOC)

- [ ] Replace unconditional `createMockSdpGateway()` routing with env mode:

```text
AYRA_SDP_MODE=mock | testnet
STELLAR_SDP_BASE_URL=https://...
STELLAR_SDP_CREATE_AUTHORIZATION=<full Authorization header value>
STELLAR_SDP_START_AUTHORIZATION=<full Authorization header value, may differ>
STELLAR_SDP_TENANT_NAME=<optional tenant header>
STELLAR_SDP_ASSET_ID=<testnet USDC/XLM asset id from SDP>
STELLAR_SDP_REGISTRATION_CONTACT_TYPE=EMAIL_AND_WALLET_ADDRESS
```

- [ ] Extend gateway line-item input to include destination contract fields:

```ts
type SdpLineItemRef = {
  id: string;
  category: string;
  amountUsdc: number;
  receiverEmail: string;
  walletAddress: string;
  walletAddressMemo?: string | null;
};
```

- [ ] Update `submitBatchAction` to load the locked/verified payout address and synthetic receiver contact email for the initiative before calling the gateway.
- [ ] In testnet mode, implement:
  - `POST /disbursements` with `name`, `asset_id`, `registration_contact_type`, empty `wallet_id` and empty `verification_field` for wallet-address registrations.
  - `POST /disbursements/:id/instructions` multipart field `file` containing CSV header `email,walletAddress,walletAddressMemo,id,amount,paymentID`.
  - `PATCH /disbursements/:id/status` with `{ "status": "STARTED" }` using the start authorization header.
  - `GET /payments?q=<paymentID>&type=DISBURSEMENT` to map SDP payment `id`, `status`, and `stellar_transaction_id` back to AYRA line items.
- [ ] Normalize errors into `SdpGatewayEvent` rows with provider `stellar-sdp`; never log credentials or raw response bodies containing secrets.
- [ ] Unit-test the adapter with mocked `fetch`, including CSV generation, headers, state transition request, payment id mapping, transaction hash mapping, non-2xx errors, and missing env.
- [ ] Run:

```bash
npm test
npm run lint
npm run build
```

Expected: mock mode remains deterministic, while testnet mode has a concrete SDP API contract and does not expose SDP credentials to the browser.

## Task 5: Add Real Testnet Verification Script/Runbook

**Files:**
- Create: `scripts/verify-sdp-testnet.mjs` (~260 LOC)
- Create: `docs/ayra-stellar-sdp-testnet-runbook.md` (~180 LOC)
- Modify: `package.json` (~4 LOC)

- [ ] Add script:

```json
"verify:sdp-testnet": "node scripts/verify-sdp-testnet.mjs"
```

- [ ] Script should fail fast unless `AYRA_SDP_MODE=testnet` and required SDP env vars are present.
- [ ] Keep this script intentionally narrow: it is an MVP verification harness, not a full `sdpctl` or MCP implementation.
- [ ] Script should run one synthetic AYRA batch against the configured SDP testnet instance, then print only:
  - AYRA batch code
  - SDP disbursement id
  - mapped SDP payment ids
  - mapped transaction ids/hashes when available
  - final AYRA status mapping
- [ ] Runbook must document the official setup path:
  - SDP backend `make setup` testnet single-tenant flow.
  - create/fund distribution account and asset.
  - create/gather two SDP API credentials if creator cannot start the disbursement.
  - configure env variables.
  - run `npm run verify:sdp-testnet`.
- [ ] Acceptance: at least one testnet run persists `stellar-sdp` sync events plus external payment ids and transaction hashes in AYRA canonical records.

Expected: real Stellar verification becomes repeatable without hand-editing app code or bypassing SDP.

## Recommended Execution Order

1. Task 1: scope matrix. Fast, prevents drift.
2. Task 2: track selector. Small user-visible gap.
3. Task 3: browser smoke. Makes the existing MVP continuously believable.
4. Task 4: real SDP gateway. Highest-risk integration; do it after browser smoke catches regressions.
5. Task 5: testnet runbook/script. Final proof layer; may need live SDP credentials and a funded testnet distribution account.

## Done Criteria

- `npm test`, `npm run lint`, `npm run build`, and `npm run test:e2e` pass.
- Admin submit/sync actions work in mock mode exactly as today.
- Public wall visibly switches tracks through the primary nav control.
- Browser smoke proves public/admin/steward/apply/proof surfaces with seeded data.
- Testnet gateway creates an SDP disbursement, uploads wallet-address CSV instructions, starts the disbursement, maps SDP payment ids, and persists transaction hashes/statuses.
- Public surfaces still omit private emails, raw receipt paths, private recipient names, failed payment details, and internal reconciliation notes.
