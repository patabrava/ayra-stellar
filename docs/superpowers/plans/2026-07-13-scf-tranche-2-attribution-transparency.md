# SCF Tranche 2 Attribution and Public Transparency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Meet tranche 2 acceptance with a canonical attribution registry, privacy-safe public batch export, matched/unmatched reconciliation output, an operator exception path, and one traced live Providencia batch.

**Architecture:** Extend canonical `batch_line_items` with stable attribution keys linked to a compact `source_records` registry. Keep private receipts and recipients operator-only, expose attribution only through the existing public proof projection, and retain receipt reconciliation while adding an independent attribution match dimension.

**Tech Stack:** Next.js App Router, TypeScript, Supabase/Postgres/RLS, Node test runner, Playwright, Vercel.

---

### Task 1: Attribution contract and database migration

**Files:**
- Create: `supabase/migrations/0014_tranche_2_attribution_transparency.sql`
- Modify: `src/lib/ayra/domain.ts`
- Modify: `src/lib/ayra/data.ts`
- Test: `tests/ayra-attribution.test.ts`

- [ ] Add failing tests proving proof receipts retain stable source, node, track, milestone, recipient-category, line-item external ID, and match status fields.
- [ ] Add `source_records`, attribution columns, reconciliation match columns, constraints, RLS, and privacy-safe public view fields.
- [ ] Backfill the settled `PV-REFOREST-SDP-20260607T065318Z-01` receipt as the traced Providencia acceptance record and mark its attribution matched.
- [ ] Map the new database fields into domain state without weakening current public/private boundaries.

### Task 2: Public exportable batch view

**Files:**
- Modify: `src/lib/ayra/export.ts`
- Modify: `src/lib/ayra/domain.ts`
- Modify: `src/app/proof/[batchId]/page.tsx`
- Create: `src/app/proof/[batchId]/export/route.ts`
- Test: `tests/ayra-attribution.test.ts`

- [ ] Add a failing CSV contract test for batch identity, totals, status, category, attribution keys, reconciliation match state, and transaction hash.
- [ ] Implement a privacy-safe public CSV builder that excludes recipient names, private receipt paths, internal notes, and failed-payment details.
- [ ] Add a batch-scoped public download route and proof-page control.
- [ ] Render the traced fields and reconciliation summary on the proof page.

### Task 3: Operator mismatch and exception path

**Files:**
- Modify: `src/app/admin/batches/page.tsx`
- Modify: `src/lib/ayra/actions.ts`
- Test: `tests/ayra-attribution.test.ts`

- [ ] Add failing tests for matched and unmatched reconciliation summaries and the transition that resolves an exception.
- [ ] Show attribution match state, mismatch reason, and prescribed next action in the admin reconciliation table.
- [ ] Add an admin-only resolution action that marks an exception matched and records the operator action.

### Task 4: Verification, migration, deployment, and live acceptance

**Files:**
- Modify: `docs/ayra-stellar-live-testing-guide.md`

- [ ] Run focused red/green tests, then `npm test`, `npm run lint`, and `npm run build`.
- [ ] Apply `0014_tranche_2_attribution_transparency.sql` to the linked production Supabase project and read back the traced batch.
- [ ] Deploy the preserved worktree to the linked `ayra-transparency` Vercel production project.
- [ ] Run one real browser regression block covering public proof, CSV download, admin reconciliation, privacy exclusions, and responsive behavior.
- [ ] Verify the final production URL and database acceptance evidence after deployment.

## Self-review

- Proposal coverage: D2.1 is covered by Task 1, D2.2 by Task 2, D2.3 by Task 3, and live acceptance evidence by Task 4.
- Scope: no mainnet work, new payment execution, field operations, or unrelated UI redesign is included.
- Privacy: public output includes attribution and verified transaction metadata only; operator-only data stays private.
- Production safety: the backfill annotates an existing settled receipt and never changes amounts, status, recipient, or transaction data.
