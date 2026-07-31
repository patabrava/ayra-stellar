# Payout Address Memo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist an optional verified-recipient Stellar memo and pass it unchanged through AYRA's live SDP payment paths.

**Architecture:** Add one nullable database field and a small pure validator. Extend the existing payout-address domain/data boundary, steward/admin UI, and both SDP destination loaders without changing the batch or proof contracts.

**Tech Stack:** PostgreSQL/Supabase migration, Next.js server actions, TypeScript, Node test runner, Stellar SDP CSV.

---

## File map

- Create `supabase/migrations/0016_payout_address_memo.sql`: nullable memo storage and byte-length constraint.
- Create `src/lib/ayra/payout-address.ts`: trim and validate optional memos.
- Modify `src/lib/ayra/domain.ts`: expose memo on `PayoutAddress`.
- Modify `src/lib/ayra/data.ts`: select and map the database field.
- Modify `src/lib/ayra/actions.ts`: accept, persist, and forward the memo in interactive SDP submission.
- Modify `src/lib/ayra/batch-sync.ts`: forward the memo in background/manual sync submission.
- Modify `src/app/steward/page.tsx`: collect and display the memo.
- Modify `src/app/admin/registry/page.tsx`: show the memo during verification.
- Create `tests/ayra-payout-address-memo.test.ts`: pure validation and wiring regression coverage.
- Modify `AGENTS.md`: add a durable rule that payout destinations requiring memos must store and verify them before SDP submission.

### Task 1: Memo contract and migration

- [ ] **Step 1: Write the failing validator and wiring tests**

Create `tests/ayra-payout-address-memo.test.ts` with assertions that `normalizeWalletAddressMemo()` trims `4192883277`, returns `undefined` for blank input, rejects values over 28 UTF-8 bytes, and that the action/sync source selects and forwards `wallet_address_memo`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx tsx --test tests/ayra-payout-address-memo.test.ts`

Expected: FAIL because `src/lib/ayra/payout-address.ts` does not exist and the wiring is absent.

- [ ] **Step 3: Add the validator and migration**

Implement `normalizeWalletAddressMemo(value)` as a trim plus `TextEncoder().encode(value).length <= 28` check. Add migration `0016_payout_address_memo.sql` with nullable `wallet_address_memo text` and a matching `octet_length` check constraint.

- [ ] **Step 4: Add the domain/data contract**

Add `walletAddressMemo?: string` to `PayoutAddress`, add `wallet_address_memo` to `PayoutAddressRow`, the operator select, and `mapPayoutAddress()`.

### Task 2: Steward and registry workflow

- [ ] **Step 1: Extend payout submission**

Parse `walletAddressMemo`, normalize it before writing, and insert it as `wallet_address_memo`. Preserve `null` for memo-less destinations.

- [ ] **Step 2: Extend the live role screens**

Add the optional memo input beneath the payout address in `/steward`, show the active memo beside the active address, and add a Memo column to `/admin/registry`.

- [ ] **Step 3: Run the focused test and verify partial GREEN**

Run: `npx tsx --test tests/ayra-payout-address-memo.test.ts`

Expected: validator and UI/action wiring assertions pass; SDP loader assertions remain red until Task 3.

### Task 3: SDP propagation

- [ ] **Step 1: Extend both destination loaders**

Change each payout-address select from `address` to `address,wallet_address_memo` and return `walletAddressMemo: address.wallet_address_memo ?? null` in `src/lib/ayra/actions.ts` and `src/lib/ayra/batch-sync.ts`.

- [ ] **Step 2: Verify GREEN**

Run: `npx tsx --test tests/ayra-payout-address-memo.test.ts tests/ayra-sdp-export.test.ts`

Expected: PASS with the SDP instruction CSV preserving the supplied memo.

- [ ] **Step 3: Run the full quality gate**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, lint exits 0, production build exits 0.

- [ ] **Step 4: Record the correction rule and commit**

Update `AGENTS.md`, then commit the implementation and tests with `feat: support Stellar payout memos`.

### Task 4: Production release and live payment

- [ ] **Step 1: Apply migration before application deploy**

Apply `0016_payout_address_memo.sql` to the linked production Supabase project and read the column/constraint back.

- [ ] **Step 2: Push and deploy**

Push the branch, deploy the transparency project only to `transparency.ayra.haus`, and verify public/login/protected routes plus fresh Vercel logs.

- [ ] **Step 3: Run the live frontend workflow**

Through `/steward` and `/admin`: add `A00 · Launch advance`, submit the supplied address and memo, verify it, publish the selected construction update, create a 5 USDC advance batch labeled `5 USDC validation payment`, submit once, and sync until settled.

- [ ] **Step 4: Freeze and verify proof**

Resolve attribution, freeze version 1, download JSON/CSV, recompute SHA-256, verify Horizon destination/issuer/amount/memo, and switch mainnet payments back off.

- [ ] **Step 5: Capture delivery evidence**

Capture admin Registry, Payments, Proof, public project, public proof, and Stellar explorer screenshots under `output/playwright/`; deliver the screenshots and verified proof bundle.
