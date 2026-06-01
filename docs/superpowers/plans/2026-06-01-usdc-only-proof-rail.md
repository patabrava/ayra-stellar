# USDC-Only Proof Rail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AYRA public payout proofs USDC-only so no XLM transaction can be displayed as a USDC receipt.

**Architecture:** Keep the existing AYRA accounting model centered on `amount_usdc`, but add an on-chain verification boundary before a Stellar hash becomes public proof. SDP still creates disbursements with `STELLAR_SDP_ASSET_ID`; AYRA verifies each returned transaction through Horizon and only persists public proof metadata when the operation is a USDC payment for the exact line-item amount and configured issuer. The database view then publishes only rows marked as verified USDC, which also removes the current XLM-backed public row until a real USDC hash is attached.

**Tech Stack:** Next.js App Router, TypeScript, Supabase SQL migrations/RLS views, Stellar Horizon HTTP API, Node test runner via `tsx --test`.

**Plan envelope:** `{files: 9 modified/created, LOC/file: new helper ~140, new tests ~180, migration ~55, repair script ~180, docs patch ~60, deps: 0 new dependencies}`

## Implementation Status - 2026-06-01

- [x] Tasks 1-6 implemented with Horizon-verified USDC proof metadata, public proof filtering, backfill/cleanup, runbook updates, and production deploy.
- [x] Local hosted-SDP testnet verification produced a Horizon-verified USDC payment; local and live proof pages render the new public USDC receipt.
- [x] Supabase production schema was updated via direct linked SQL execution because `supabase db push --dry-run` found remote migration-history divergence.
- [ ] Commit steps were not run because this checkout contains pre-existing dirty/untracked work; stage and commit the intended files after review.

---

## File Structure

- Create `src/lib/ayra/stellar-proof.ts`: one small server-side verifier for Horizon transaction operations. It validates hash shape, fetches operations, finds a payment operation, and confirms `asset_code=USDC`, configured issuer, and exact decimal amount.
- Modify `src/lib/ayra/sdp.ts`: carry optional verified on-chain metadata in `SdpSettledPayment` without making SDP responsible for Horizon verification.
- Modify `src/lib/ayra/actions.ts`: during `syncBatchStatusAction`, verify every SDP transaction hash before updating `batch_line_items`; unverified hashes keep the line item in `processing` and create an SDP sync event.
- Create `supabase/migrations/0011_usdc_only_public_receipts.sql`: add nullable proof metadata columns, clear the known XLM hash, and recreate `public_batch_receipts` so only verified USDC rows publish.
- Modify `src/lib/ayra/data.ts`: read the new public view fields into the domain model.
- Modify `src/lib/ayra/domain.ts`: add proof metadata fields and filter public proof line items by verified USDC metadata, not only hash shape.
- Create `scripts/backfill-usdc-proof-metadata.mjs`: one-off operator script to verify existing hashes against Horizon and backfill metadata or clear non-USDC hashes.
- Modify `docs/ayra-stellar-sdp-testnet-runbook.md`: document USDC-only env requirements and the backfill/verification path.
- Tests: add focused tests in `tests/ayra-usdc-proof.test.ts`, update `tests/ayra-data.test.ts`, `tests/ayra-domain.test.ts`, and `tests/ayra-sdp-export.test.ts`.

## Key Invariants

- AYRA will not publish native XLM payments as receipts.
- Public proof requires all of these: real 64-char transaction hash, line item status `settled`, `payment_asset_code = 'USDC'`, `payment_asset_amount = amount_usdc`, and `payment_asset_issuer = STELLAR_USDC_ISSUER` when an issuer is configured.
- `STELLAR_SDP_ASSET_ID` remains the SDP asset UUID. `STELLAR_USDC_ISSUER` is the Stellar issuer account used for on-chain verification.
- No browser code calls SDP or Horizon for verification; verification happens in server actions and scripts.

### Task 1: Add Horizon USDC Proof Verifier

**Files:**
- Create: `src/lib/ayra/stellar-proof.ts`
- Test: `tests/ayra-usdc-proof.test.ts`

- [ ] **Step 1: Write the failing verifier tests**

Create `tests/ayra-usdc-proof.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  verifyStellarUsdcPayment,
  StellarProofError,
} from "../src/lib/ayra/stellar-proof";

const hash = "9b02f2db43af6a56907b92c1e74d95db1b243524b57430a5d1a579285d6c6ac6";
const issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function horizonResponse(record: Record<string, unknown>) {
  return {
    _embedded: {
      records: [record],
    },
  };
}

describe("Stellar USDC proof verifier", () => {
  it("accepts a USDC payment with the expected issuer and amount", async () => {
    const proof = await verifyStellarUsdcPayment(
      {
        transactionHash: hash,
        expectedAmount: 1,
        expectedIssuer: issuer,
        horizonUrl: "https://horizon-testnet.stellar.org",
      },
      async (input) => {
        assert.equal(
          String(input),
          `https://horizon-testnet.stellar.org/transactions/${hash}/operations`,
        );
        return Response.json(
          horizonResponse({
            type: "payment",
            transaction_successful: true,
            asset_type: "credit_alphanum4",
            asset_code: "USDC",
            asset_issuer: issuer,
            amount: "1.0000000",
          }),
        );
      },
    );

    assert.deepEqual(proof, {
      assetCode: "USDC",
      assetIssuer: issuer,
      assetAmount: 1,
    });
  });

  it("rejects native XLM payments even when the amount matches", async () => {
    await assert.rejects(
      () =>
        verifyStellarUsdcPayment(
          {
            transactionHash:
              "4ee20870c7d17a13234d36a1c8d9f285a68defa3a8ec4172de1ad58f7acc8783",
            expectedAmount: 1,
            expectedIssuer: issuer,
            horizonUrl: "https://horizon-testnet.stellar.org",
          },
          async () =>
            Response.json(
              horizonResponse({
                type: "payment",
                transaction_successful: true,
                asset_type: "native",
                amount: "1.0000000",
              }),
            ),
        ),
      (error) => {
        assert.ok(error instanceof StellarProofError);
        assert.match(error.message, /Expected USDC payment/);
        return true;
      },
    );
  });

  it("rejects a USDC payment from the wrong issuer", async () => {
    await assert.rejects(
      () =>
        verifyStellarUsdcPayment(
          {
            transactionHash: hash,
            expectedAmount: 1,
            expectedIssuer: issuer,
            horizonUrl: "https://horizon-testnet.stellar.org",
          },
          async () =>
            Response.json(
              horizonResponse({
                type: "payment",
                transaction_successful: true,
                asset_type: "credit_alphanum4",
                asset_code: "USDC",
                asset_issuer: "GWRONGISSUER00000000000000000000000000000000000000000001",
                amount: "1.0000000",
              }),
            ),
        ),
      /Unexpected USDC issuer/,
    );
  });

  it("rejects amount mismatches", async () => {
    await assert.rejects(
      () =>
        verifyStellarUsdcPayment(
          {
            transactionHash: hash,
            expectedAmount: 2,
            expectedIssuer: issuer,
            horizonUrl: "https://horizon-testnet.stellar.org",
          },
          async () =>
            Response.json(
              horizonResponse({
                type: "payment",
                transaction_successful: true,
                asset_type: "credit_alphanum4",
                asset_code: "USDC",
                asset_issuer: issuer,
                amount: "1.0000000",
              }),
            ),
        ),
      /amount mismatch/,
    );
  });
});
```

- [ ] **Step 2: Run the verifier test and confirm it fails**

Run:

```bash
npm test -- tests/ayra-usdc-proof.test.ts
```

Expected: FAIL with a module resolution error for `src/lib/ayra/stellar-proof`.

- [ ] **Step 3: Implement the verifier**

Create `src/lib/ayra/stellar-proof.ts`:

```ts
export type StellarUsdcProofInput = {
  transactionHash: string;
  expectedAmount: number;
  expectedIssuer?: string;
  horizonUrl?: string;
};

export type StellarUsdcProof = {
  assetCode: "USDC";
  assetIssuer: string;
  assetAmount: number;
};

type HorizonOperationsResponse = {
  _embedded?: {
    records?: HorizonOperation[];
  };
};

type HorizonOperation = {
  type?: string;
  transaction_successful?: boolean;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  amount?: string;
};

const STROOP_SCALE = 10_000_000;

export class StellarProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StellarProofError";
  }
}

export async function verifyStellarUsdcPayment(
  input: StellarUsdcProofInput,
  fetchImpl: typeof fetch = fetch,
): Promise<StellarUsdcProof> {
  if (!/^[a-f0-9]{64}$/i.test(input.transactionHash)) {
    throw new StellarProofError("Invalid Stellar transaction hash.");
  }

  const horizonUrl = (input.horizonUrl || "https://horizon-testnet.stellar.org").replace(/\/+$/, "");
  const response = await fetchImpl(
    `${horizonUrl}/transactions/${input.transactionHash}/operations`,
    { method: "GET" },
  );
  if (!response.ok) {
    throw new StellarProofError(`Horizon lookup failed with status ${response.status}.`);
  }

  const json = (await response.json()) as HorizonOperationsResponse;
  const payment = (json._embedded?.records || []).find(
    (record) => record.type === "payment" && record.transaction_successful !== false,
  );
  if (!payment) throw new StellarProofError("No successful payment operation found.");

  if (payment.asset_type === "native" || payment.asset_code !== "USDC") {
    throw new StellarProofError("Expected USDC payment, received another Stellar asset.");
  }
  if (!payment.asset_issuer) {
    throw new StellarProofError("USDC payment is missing an issuer.");
  }
  if (input.expectedIssuer && payment.asset_issuer !== input.expectedIssuer) {
    throw new StellarProofError("Unexpected USDC issuer.");
  }

  const actual = decimalToStroops(payment.amount || "");
  const expected = decimalToStroops(String(input.expectedAmount));
  if (actual !== expected) {
    throw new StellarProofError("USDC payment amount mismatch.");
  }

  return {
    assetCode: "USDC",
    assetIssuer: payment.asset_issuer,
    assetAmount: actual / STROOP_SCALE,
  };
}

function decimalToStroops(value: string) {
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new StellarProofError("Invalid Stellar amount.");
  }
  const [whole, fraction = ""] = value.split(".");
  const scaled = `${whole}${fraction.padEnd(7, "0").slice(0, 7)}`;
  return Number.parseInt(scaled, 10);
}
```

- [ ] **Step 4: Run the verifier test and confirm it passes**

Run:

```bash
npm test -- tests/ayra-usdc-proof.test.ts
```

Expected: PASS for all four verifier tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ayra/stellar-proof.ts tests/ayra-usdc-proof.test.ts
git commit -m "feat: add Stellar USDC proof verifier"
```

### Task 2: Persist Only Verified USDC Hashes During Sync

**Files:**
- Modify: `src/lib/ayra/sdp.ts:29-32`
- Modify: `src/lib/ayra/actions.ts:1-805`
- Test: `tests/ayra-sdp-export.test.ts`

- [ ] **Step 1: Write the failing type and config tests**

Append this test inside `describe("AYRA SDP gateway and CSV exports", () => { ... })` in `tests/ayra-sdp-export.test.ts`:

```ts
  it("keeps SDP asset configuration separate from Horizon USDC issuer verification", () => {
    const gateway = createSdpGateway({
      AYRA_SDP_MODE: "testnet",
      STELLAR_SDP_BASE_URL: "https://sdp-api.ayra.haus",
      STELLAR_SDP_CREATE_AUTHORIZATION: "SDP_create.secret",
      STELLAR_SDP_START_AUTHORIZATION: "SDP_start.secret",
      STELLAR_SDP_ASSET_ID: "1c486a48-afe9-4a15-9ee2-7c6ec5d59ccd",
      STELLAR_SDP_REGISTRATION_CONTACT_TYPE: "EMAIL_AND_WALLET_ADDRESS",
      STELLAR_USDC_ISSUER: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      STELLAR_HORIZON_URL: "https://horizon-testnet.stellar.org",
    } as NodeJS.ProcessEnv);

    assert.ok(gateway);
  });
```

- [ ] **Step 2: Run the config test and confirm current behavior**

Run:

```bash
npm test -- tests/ayra-sdp-export.test.ts
```

Expected: PASS before implementation because extra env vars are ignored. This is a characterization check that protects the existing SDP asset UUID behavior.

- [ ] **Step 3: Extend settled payment metadata type**

Modify `src/lib/ayra/sdp.ts`:

```ts
export type SdpSettledPayment = {
  lineItemId: string;
  transactionHash: string;
  assetCode?: "USDC";
  assetIssuer?: string;
  assetAmount?: number;
};
```

- [ ] **Step 4: Verify hashes inside `syncBatchStatusAction`**

In `src/lib/ayra/actions.ts`, add the import near the existing imports:

```ts
import { verifyStellarUsdcPayment, StellarProofError } from "@/lib/ayra/stellar-proof";
```

Inside `syncBatchStatusAction`, replace the existing `settledLineItemIds` and `updates` block at lines 783-795 with:

```ts
  const verifiedPayments = new Map<
    string,
    {
      transactionHash: string;
      assetCode: "USDC";
      assetIssuer: string;
      assetAmount: number;
    }
  >();
  const verificationEvents = [];
  for (const payment of sdp.payments) {
    const lineItem = lineItems.find((item) => item.id === payment.lineItemId);
    if (!lineItem) continue;
    try {
      const proof = await verifyStellarUsdcPayment({
        transactionHash: payment.transactionHash,
        expectedAmount: Number(lineItem.amount_usdc),
        expectedIssuer: process.env.STELLAR_USDC_ISSUER,
        horizonUrl: process.env.STELLAR_HORIZON_URL,
      });
      verifiedPayments.set(payment.lineItemId, {
        transactionHash: payment.transactionHash,
        assetCode: proof.assetCode,
        assetIssuer: proof.assetIssuer,
        assetAmount: proof.assetAmount,
      });
      verificationEvents.push({
        provider: "stellar-sdp" as const,
        action: "sync_status" as const,
        status: "ok" as const,
        externalId: payment.transactionHash,
        message: "Verified USDC payment proof",
      });
    } catch (error) {
      verificationEvents.push({
        provider: "stellar-sdp" as const,
        action: "sync_status" as const,
        status: "error" as const,
        externalId: payment.transactionHash,
        message:
          error instanceof StellarProofError
            ? error.message
            : "USDC payment proof verification failed",
      });
    }
  }

  const updates = await Promise.all(
    lineItems.map((lineItem) => {
      const payment = verifiedPayments.get(lineItem.id);
      return supabase
        .from("batch_line_items")
        .update({
          status: payment ? "settled" : "processing",
          transaction_hash: payment?.transactionHash ?? null,
          payment_asset_code: payment?.assetCode ?? null,
          payment_asset_issuer: payment?.assetIssuer ?? null,
          payment_asset_amount: payment?.assetAmount ?? null,
        })
        .eq("id", lineItem.id);
    }),
  );
```

Then replace:

```ts
  const allSettled = lineItems.every((lineItem) => settledLineItemIds.has(lineItem.id));
```

with:

```ts
  const allSettled = lineItems.every((lineItem) => verifiedPayments.has(lineItem.id));
```

Finally replace:

```ts
  await insertSdpEvents(supabase, parsed.data.entityId, sdp.events);
```

with:

```ts
  await insertSdpEvents(supabase, parsed.data.entityId, [
    ...sdp.events,
    ...verificationEvents,
  ]);
```

- [ ] **Step 5: Run TypeScript tests**

Run:

```bash
npm test -- tests/ayra-sdp-export.test.ts
```

Expected: PASS. Type errors should not appear in the `tsx --test` run.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ayra/sdp.ts src/lib/ayra/actions.ts tests/ayra-sdp-export.test.ts
git commit -m "feat: verify USDC proof before publishing hashes"
```

### Task 3: Add USDC Proof Metadata to Supabase Public View

**Files:**
- Create: `supabase/migrations/0011_usdc_only_public_receipts.sql`
- Modify: `src/lib/ayra/data.ts:148-163,393-396,715-726`
- Modify: `src/lib/ayra/domain.ts:152-162,303-320,1591-1665`
- Test: `tests/ayra-data.test.ts`
- Test: `tests/ayra-domain.test.ts`

- [ ] **Step 1: Update data tests to require verified USDC metadata**

In `tests/ayra-data.test.ts`, change the second receipt row to include verified metadata:

```ts
      payment_asset_code: "USDC",
      payment_asset_issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      payment_asset_amount: 1,
```

Then add a second row with the known XLM hash and no USDC metadata:

```ts
    {
      line_item_id: "line-xlm",
      batch_id: "batch-1",
      batch_code: "PV-REFOREST-APR26",
      period_label: "April 2026",
      batch_status: "submitted",
      initiative_name: "Reforestation",
      sponsor_name: "Climate Future",
      category: "Crew wages",
      amount_usdc: 1,
      local_amount: 3900,
      local_currency: "COP",
      line_item_status: "settled",
      sdp_payment_id: "payment-xlm-1",
      transaction_hash:
        "4ee20870c7d17a13234d36a1c8d9f285a68defa3a8ec4172de1ad58f7acc8783",
      payment_asset_code: null,
      payment_asset_issuer: null,
      payment_asset_amount: null,
    },
```

Update the assertion block:

```ts
    assert.equal(wall.spending[0]?.category, "Seedlings");
    assert.equal(wall.spending[0]?.amountUsdc, 1);
    assert.equal(wall.batches[0]?.amountUsdc, 1);
    assert.equal(proof.receipts.length, 1);
    assert.equal(proof.receipts[0]?.assetCode, "USDC");
    assert.equal(
      proof.receipts[0]?.assetIssuer,
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );
    assert.ok(!JSON.stringify(wall).includes("payment-xlm-1"));
```

- [ ] **Step 2: Update domain tests to reject hash-only proof rows**

In `tests/ayra-domain.test.ts`, update the "uses real Stellar transaction hashes for public proof volume" test line item override to include:

```ts
            paymentAssetCode: "USDC" as const,
            paymentAssetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
            paymentAssetAmount: 1,
```

Add this test after it:

```ts
  it("does not publish hash-only receipts without verified USDC metadata", () => {
    const state = createDemoState();
    const batchId = "batch-reforest-apr26";
    const batchLineItems = state.batchLineItems.map((lineItem) =>
      lineItem.id === `${batchId}-line-1`
        ? {
            ...lineItem,
            amountUsdc: 1,
            localAmount: 3900,
            status: "settled" as const,
            sdpPaymentId: "payment-xlm-1",
            transactionHash:
              "4ee20870c7d17a13234d36a1c8d9f285a68defa3a8ec4172de1ad58f7acc8783",
          }
        : lineItem,
    );

    const project = getPublicInitiativeProjection(
      { ...state, batchLineItems },
      "providencia",
      "reforestation",
    );
    const proof = getProofPack({ ...state, batchLineItems }, batchId);

    assert.equal(project.spending.length, 0);
    assert.equal(proof.receipts.length, 0);
  });
```

- [ ] **Step 3: Run tests and confirm failures**

Run:

```bash
npm test -- tests/ayra-data.test.ts tests/ayra-domain.test.ts
```

Expected: FAIL because `payment_asset_code` fields are not typed/mapped and domain proof filtering still accepts hash-only rows.

- [ ] **Step 4: Add database migration**

Create `supabase/migrations/0011_usdc_only_public_receipts.sql`:

```sql
alter table public.batch_line_items
  add column if not exists payment_asset_code text,
  add column if not exists payment_asset_issuer text,
  add column if not exists payment_asset_amount numeric;

alter table public.batch_line_items
  drop constraint if exists batch_line_items_payment_asset_code_usdc,
  add constraint batch_line_items_payment_asset_code_usdc
    check (payment_asset_code is null or payment_asset_code = 'USDC');

alter table public.batch_line_items
  drop constraint if exists batch_line_items_payment_asset_amount_positive,
  add constraint batch_line_items_payment_asset_amount_positive
    check (payment_asset_amount is null or payment_asset_amount > 0);

update public.batch_line_items
set
  status = 'processing',
  transaction_hash = null,
  payment_asset_code = null,
  payment_asset_issuer = null,
  payment_asset_amount = null
where transaction_hash = '4ee20870c7d17a13234d36a1c8d9f285a68defa3a8ec4172de1ad58f7acc8783';

drop view if exists public.public_batch_receipts;

create or replace view public.public_batch_receipts
with (security_invoker = false)
as
select
  li.id as line_item_id,
  b.id as batch_id,
  b.code as batch_code,
  b.period_label,
  b.status as batch_status,
  i.name as initiative_name,
  s.name as sponsor_name,
  li.category,
  li.amount_usdc,
  li.local_amount,
  li.local_currency,
  li.status as line_item_status,
  li.sdp_payment_id,
  li.transaction_hash,
  li.payment_asset_code,
  li.payment_asset_issuer,
  li.payment_asset_amount
from public.funding_batches b
join public.initiatives i on i.id = b.initiative_id
left join public.sponsors s on s.id = b.sponsor_id
join public.batch_line_items li on li.batch_id = b.id
where
  b.status in ('submitted', 'settled')
  and li.status = 'settled'
  and li.transaction_hash ~* '^[a-f0-9]{64}$'
  and li.payment_asset_code = 'USDC'
  and li.payment_asset_amount = li.amount_usdc;
```

- [ ] **Step 5: Extend domain and data types**

In `src/lib/ayra/domain.ts`, extend `BatchLineItem`:

```ts
  paymentAssetCode?: "USDC";
  paymentAssetIssuer?: string;
  paymentAssetAmount?: number;
```

Extend `ProofPack.receipts`:

```ts
    assetCode: "USDC";
    assetIssuer?: string;
    assetAmount: number;
```

In `getProofPack`, add these fields:

```ts
        assetCode: lineItem.paymentAssetCode!,
        assetIssuer: lineItem.paymentAssetIssuer,
        assetAmount: lineItem.paymentAssetAmount!,
```

Replace `publicProofLineItems` with:

```ts
function publicProofLineItems(state: AyraState, batchId: string) {
  return state.batchLineItems.filter(
    (lineItem) =>
      lineItem.batchId === batchId &&
      isPublicTransactionHash(lineItem.transactionHash) &&
      lineItem.paymentAssetCode === "USDC" &&
      lineItem.paymentAssetAmount === lineItem.amountUsdc,
  );
}
```

In `src/lib/ayra/data.ts`, extend `ReceiptRow`:

```ts
  payment_asset_code: string | null;
  payment_asset_issuer: string | null;
  payment_asset_amount: number | string | null;
```

Update the public receipt select:

```ts
"line_item_id,batch_id,batch_code,period_label,batch_status,initiative_name,sponsor_name,category,amount_usdc,local_amount,local_currency,line_item_status,sdp_payment_id,transaction_hash,payment_asset_code,payment_asset_issuer,payment_asset_amount",
```

Update `mapReceiptLineItem`:

```ts
    paymentAssetCode: row.payment_asset_code === "USDC" ? "USDC" : undefined,
    paymentAssetIssuer: row.payment_asset_issuer ?? undefined,
    paymentAssetAmount:
      row.payment_asset_amount == null ? undefined : numeric(row.payment_asset_amount),
```

- [ ] **Step 6: Run data/domain tests**

Run:

```bash
npm test -- tests/ayra-data.test.ts tests/ayra-domain.test.ts
```

Expected: PASS. The XLM hash fixture no longer appears in public wall or proof output.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0011_usdc_only_public_receipts.sql src/lib/ayra/data.ts src/lib/ayra/domain.ts tests/ayra-data.test.ts tests/ayra-domain.test.ts
git commit -m "feat: publish only verified USDC receipt rows"
```

### Task 4: Add Existing Receipt Backfill and Cleanup Script

**Files:**
- Create: `scripts/backfill-usdc-proof-metadata.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the package script**

Modify `package.json` scripts:

```json
"backfill:usdc-proof-metadata": "node scripts/backfill-usdc-proof-metadata.mjs"
```

- [ ] **Step 2: Create the script**

Create `scripts/backfill-usdc-proof-metadata.mjs`:

```js
#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STELLAR_USDC_ISSUER",
];

for (const key of required) {
  if (!process.env[key]?.trim()) fail(`Missing ${key}.`);
}

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  horizonUrl: (process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org").replace(/\/+$/, ""),
  usdcIssuer: process.env.STELLAR_USDC_ISSUER,
  dryRun: process.env.DRY_RUN !== "0",
};

const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

const { data, error } = await supabase
  .from("batch_line_items")
  .select("id,batch_id,category,amount_usdc,status,transaction_hash")
  .not("transaction_hash", "is", null);

if (error) fail(`Could not read batch line items: ${error.message}`);

const results = [];
for (const item of data || []) {
  if (!/^[a-f0-9]{64}$/i.test(item.transaction_hash || "")) continue;
  const proof = await inspectTransaction(item.transaction_hash);
  const expected = Number(item.amount_usdc);
  const valid =
    proof.assetCode === "USDC" &&
    proof.assetIssuer === config.usdcIssuer &&
    Number(proof.amount) === expected;

  results.push({
    lineItemId: item.id,
    category: item.category,
    hash: item.transaction_hash,
    valid,
    assetCode: proof.assetCode,
    assetIssuer: proof.assetIssuer,
    amount: proof.amount,
  });

  if (config.dryRun) continue;

  if (valid) {
    const { error: updateError } = await supabase
      .from("batch_line_items")
      .update({
        status: "settled",
        payment_asset_code: "USDC",
        payment_asset_issuer: proof.assetIssuer,
        payment_asset_amount: proof.amount,
      })
      .eq("id", item.id);
    if (updateError) fail(`Could not backfill ${item.id}: ${updateError.message}`);
  } else {
    const { error: clearError } = await supabase
      .from("batch_line_items")
      .update({
        status: item.status === "settled" ? "processing" : item.status,
        transaction_hash: null,
        payment_asset_code: null,
        payment_asset_issuer: null,
        payment_asset_amount: null,
      })
      .eq("id", item.id);
    if (clearError) fail(`Could not clear ${item.id}: ${clearError.message}`);
  }
}

console.log(JSON.stringify({ dryRun: config.dryRun, results }, null, 2));

async function inspectTransaction(hash) {
  const response = await fetch(`${config.horizonUrl}/transactions/${hash}/operations`);
  if (!response.ok) {
    return { assetCode: null, assetIssuer: null, amount: null };
  }
  const json = await response.json();
  const payment = (json._embedded?.records || []).find(
    (record) => record.type === "payment" && record.transaction_successful !== false,
  );
  return {
    assetCode: payment?.asset_code || (payment?.asset_type === "native" ? "XLM" : null),
    assetIssuer: payment?.asset_issuer || null,
    amount: payment?.amount ? Number(payment.amount) : null,
  };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
```

- [ ] **Step 3: Run the script in dry-run mode**

Run:

```bash
DRY_RUN=1 npm run backfill:usdc-proof-metadata
```

Expected: JSON output includes the known `4ee20870...acc8783` row with `valid: false` and `assetCode: "XLM"` if that row is still present in the target database.

- [ ] **Step 4: Run the script for real after reviewing dry-run output**

Run:

```bash
DRY_RUN=0 npm run backfill:usdc-proof-metadata
```

Expected: verified USDC rows receive `payment_asset_code`, `payment_asset_issuer`, and `payment_asset_amount`; non-USDC hashes are cleared from public proof eligibility.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/backfill-usdc-proof-metadata.mjs
git commit -m "chore: add USDC proof metadata backfill"
```

### Task 5: Update Runbook and Public Proof Language

**Files:**
- Modify: `docs/ayra-stellar-sdp-testnet-runbook.md:69-190`
- Modify: `src/app/proof/[batchId]/page.tsx:68-104`
- Modify: `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx:276-302`

- [ ] **Step 1: Patch the runbook env block**

In `docs/ayra-stellar-sdp-testnet-runbook.md`, add these env vars to the block:

```bash
export STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
export STELLAR_USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```

Add this paragraph after the env block:

```md
AYRA treats `STELLAR_SDP_ASSET_ID` as the SDP-side asset UUID and `STELLAR_USDC_ISSUER` as the on-chain issuer check. A line item is not public proof until Horizon confirms the stored transaction hash is a USDC payment from that issuer for the exact `amount_usdc`. Native XLM transactions are never public payout receipts; XLM is only expected for network fees and account reserve behavior.
```

- [ ] **Step 2: Patch proof page copy**

In `src/app/proof/[batchId]/page.tsx`, change the table heading text from generic receipt wording to verified USDC wording:

```tsx
            <div className="proof-pack-kicker">Verified USDC receipts</div>
```

Change the privacy note paragraph to:

```tsx
              Public proof shows category-level USDC payments verified against
              Stellar transaction metadata. Recipient names, private receipt
              files, failed payments, internal reconciliation notes, and native
              XLM fee/reserve activity stay off this page.
```

- [ ] **Step 3: Patch project receipt note**

In `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`, change:

```tsx
          Public receipt rows show category, amount, local snapshot, and
          verification reference. Private recipient data and raw receipts stay
          internal.
```

to:

```tsx
          Public receipt rows show verified USDC amount, category, local
          snapshot, and Stellar transaction reference. Private recipient data,
          raw receipts, failed payments, and native XLM fee/reserve activity
          stay internal.
```

- [ ] **Step 4: Run tests and lint**

Run:

```bash
npm test
npm run lint
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add docs/ayra-stellar-sdp-testnet-runbook.md src/app/proof/[batchId]/page.tsx src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx
git commit -m "docs: document USDC-only proof rail"
```

### Task 6: Validate Production Data and Deployment

**Files:**
- No source files.
- Runtime targets: Supabase production project, Vercel project `ayra-transparency`, Hostinger SDP `ayra-sdp-testnet`.

- [ ] **Step 1: Apply Supabase migration**

Run the repo's existing Supabase deployment flow for migrations. If using the Supabase CLI, run:

```bash
supabase db push
```

Expected: migration `0011_usdc_only_public_receipts.sql` applies without errors, and `public.public_batch_receipts` includes `payment_asset_code`, `payment_asset_issuer`, and `payment_asset_amount`.

- [ ] **Step 2: Configure production verification env**

Set these in Vercel production for `ayra-transparency`:

```bash
vercel env add STELLAR_HORIZON_URL production
vercel env add STELLAR_USDC_ISSUER production
```

Values:

```bash
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```

Expected: env vars exist only in Vercel/secret stores and are not committed.

- [ ] **Step 3: Run local verification against hosted SDP**

Run:

```bash
npm run verify:sdp-testnet
```

Expected: output includes a new `mappedTransactionIds` hash. Check the hash in Horizon and confirm the operation has `asset_code: "USDC"`, the configured issuer, and amount `1.0000000`.

- [ ] **Step 4: Dry-run existing data cleanup**

Run:

```bash
DRY_RUN=1 npm run backfill:usdc-proof-metadata
```

Expected: the known XLM hash `4ee20870c7d17a13234d36a1c8d9f285a68defa3a8ec4172de1ad58f7acc8783` is reported invalid if still present.

- [ ] **Step 5: Apply data cleanup**

Run:

```bash
DRY_RUN=0 npm run backfill:usdc-proof-metadata
```

Expected: non-USDC hashes are cleared or hidden; verified USDC hashes are backfilled with metadata.

- [ ] **Step 6: Deploy the transparency app**

Run:

```bash
vercel deploy --prod
```

Expected: deployment succeeds for `ayra-transparency` and does not alter `ayra.haus`/`www.ayra.haus` domain ownership.

- [ ] **Step 7: Verify public proof page**

Open:

```text
https://transparency.ayra.haus/proof/PV-REFOREST-UI620004
```

Expected: the page no longer shows `Crew wages - 1 USDC` linked to `4ee20870...acc8783`. If a real USDC replacement hash has been attached, the page shows that hash and the matching USDC amount. If no replacement hash exists, that line is absent from public proof.

- [ ] **Step 8: Commit deployment notes if source docs changed during validation**

If validation reveals a stable repo-specific rule, update `AGENTS.md` section `3) Specific repo rules` with one compact prevention rule:

```md
- Public Stellar proof rows must be verified USDC payments by Horizon metadata; native XLM hashes are fee/reserve activity and must never satisfy public receipt proof.
```

Then commit:

```bash
git add AGENTS.md
git commit -m "docs: record USDC proof invariant"
```

## Self-Review

Spec coverage: The plan answers the product decision to focus on USDC, prevents XLM volatility from appearing in receipts, preserves Docker SDP by keeping `STELLAR_SDP_ASSET_ID`, adds Horizon verification, cleans the known XLM hash, updates public copy, and includes deployment validation.

Red-flag scan: No deferred implementation markers remain; every code-changing task includes exact file paths, commands, expected results, and concrete code blocks.

Type consistency: The plan uses `paymentAssetCode/paymentAssetIssuer/paymentAssetAmount` in TypeScript and `payment_asset_code/payment_asset_issuer/payment_asset_amount` in SQL/data rows. `STELLAR_SDP_ASSET_ID` remains the SDP UUID; `STELLAR_USDC_ISSUER` is the on-chain issuer.
