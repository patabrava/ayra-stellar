# Steward Milestone Payment Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split public steward updates from private milestone evidence, then require normal admin payments to link to one unused approved milestone submission while allowing advance payments without that link.

**Architecture:** Model private evidence as `milestone_submissions`, keep public updates on `initiative_updates`, and attach `payment_kind` plus optional `milestone_submission_id` to `funding_batches`. Enforce the normal-payment link in domain helpers, server actions, and database constraints/triggers; render the steward and admin screens from the same mapped state.

**Tech Stack:** Next.js App Router, TypeScript, Supabase SQL/RLS/storage, Node test runner, Playwright smoke checks. `{files: ~9 modified + 1 migration + this plan, LOC/file: <1000 target for touched files, deps: 0}`

---

### Task 1: Domain Contract

**Files:**
- Modify: `src/lib/ayra/domain.ts`
- Test: `tests/ayra-domain.test.ts`

- [ ] **Step 1: Write failing domain tests**

Add tests that prove:
- `submitMilestoneSubmission()` creates a private submitted package without adding a public update.
- admins can approve/reject submissions.
- normal `createFundingBatch()` requires one approved unused submission from the same initiative.
- advance `createFundingBatch()` skips the submission link.
- a submission cannot back two normal payments.

Run: `npm test -- tests/ayra-domain.test.ts`
Expected: FAIL because the new types/functions/options do not exist.

- [ ] **Step 2: Implement minimal domain state**

Add:
- `MilestoneSubmissionStatus = "draft" | "submitted" | "approved" | "rejected"`
- `PaymentKind = "normal" | "advance"`
- `MilestoneSubmission`
- `Batch.paymentKind`
- `Batch.milestoneSubmissionId?`
- `AyraState.milestoneSubmissions`

Add domain functions:
- `submitMilestoneSubmission(state, input)`
- `reviewMilestoneSubmission(state, input)`
- `approvedUnusedMilestoneSubmissions(state, initiativeId)`

Extend `FundingBatchInput` with:
- `paymentKind?: PaymentKind`
- `milestoneSubmissionId?: string`

Validation:
- default kind is `normal`
- normal payments require an approved same-initiative submission
- normal payments reject already-linked submissions
- advance payments force no milestone link

Run: `npm test -- tests/ayra-domain.test.ts`
Expected: PASS.

### Task 2: Supabase Mapping + Migration

**Files:**
- Modify: `src/lib/ayra/data.ts`
- Create: `supabase/migrations/0013_milestone_submissions_payment_kind.sql`
- Test: `tests/ayra-data.test.ts`

- [ ] **Step 1: Write failing mapping tests**

Add operator-row fixtures for one approved milestone submission and one normal linked batch. Assert `stateFromOperatorRows()` maps submissions and payment metadata; public rows stay privacy-safe and do not expose private document paths.

Run: `npm test -- tests/ayra-data.test.ts`
Expected: FAIL because row fields and state fields are missing.

- [ ] **Step 2: Implement mapping and SQL**

SQL:
- create `milestone_submission_status` enum.
- create `milestone_submissions` with initiative, milestone, submitter, status, title, summary, `private_document_path`, timestamps, reviewer fields.
- enable RLS.
- allow admins all access.
- allow scoped stewards/grantee contacts to insert/read their own initiative submissions.
- add `payment_kind text not null default 'normal'` to `funding_batches`.
- add `milestone_submission_id uuid unique references milestone_submissions(id)`.
- add trigger/check function enforcing: normal requires approved submission, advance requires no submission, submission initiative matches batch initiative.

Mapping:
- include `milestoneSubmissions` in public/operator row types and state.
- select submissions only in authenticated/operator load.
- select `payment_kind,milestone_submission_id` on batches.

Run: `npm test -- tests/ayra-data.test.ts`
Expected: PASS.

### Task 3: Server Actions

**Files:**
- Modify: `src/lib/ayra/actions.ts`
- Test: `tests/ayra-admin-batch-form.test.ts`

- [ ] **Step 1: Write failing source-contract tests**

Assert:
- `submitMilestoneSubmissionAction` inserts into `milestone_submissions`, not `initiative_updates`.
- `reviewMilestoneSubmissionAction` updates submission status.
- `createBatchAction` reads `paymentKind` and `milestoneSubmissionId`.
- normal payment validation rejects missing milestone submission.
- advance payment inserts null `milestone_submission_id`.

Run: `npm test -- tests/ayra-admin-batch-form.test.ts`
Expected: FAIL because actions are missing.

- [ ] **Step 2: Implement actions**

Add schemas and actions:
- `milestoneSubmissionSchema`
- `reviewMilestoneSubmissionAction`
- `submitMilestoneSubmissionAction`

Storage:
- use existing `optionalFile`, `safeStorageName`, `uploadFile`.
- upload private evidence to `ayra-private-receipts` under `milestone-submissions/<submissionId>/...`.

Batch action:
- accept `paymentKind`.
- require `milestoneSubmissionId` for normal.
- insert `payment_kind` and `milestone_submission_id`.
- redirect statuses: `milestone-required`, `milestone-unavailable`, `advance-created` as needed.

Run: `npm test -- tests/ayra-admin-batch-form.test.ts`
Expected: PASS.

### Task 4: Steward + Admin UI

**Files:**
- Modify: `src/app/steward/page.tsx`
- Modify: `src/app/admin/batches/page.tsx`
- Modify: `src/lib/ayra/status.ts`
- Test: `tests/e2e/steward-payout-feedback.spec.ts`, `tests/ayra-status.test.ts`

- [ ] **Step 1: Write failing UI/status tests**

Assert steward page has separate public update and private milestone package forms. Assert admin page has `Payment type`, shows normal milestone dropdown context, includes an empty-state explanation, and includes an advance branch. Assert status copy exists for milestone submission and payment milestone errors.

Run: `npm test -- tests/ayra-status.test.ts tests/ayra-admin-batch-form.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement UI**

Steward:
- rename public composer to public update language.
- add separate private milestone package form with milestone, title, summary, private evidence file.
- list recent private submissions with status chips.

Admin:
- add payment type radio/select.
- add approved unused submission dropdown scoped to selected/default initiative.
- include data attributes or option metadata for client-side filtering if needed; server validation remains authoritative.
- show advance payment explanation and no milestone dropdown requirement for advance.

Status:
- add steward `milestone-submitted`.
- add admin `milestone-required`, `milestone-unavailable`, `advance-created`.

Run: `npm test -- tests/ayra-status.test.ts tests/ayra-admin-batch-form.test.ts`
Expected: PASS.

### Task 5: Full Verification

**Files:**
- No new implementation files unless a focused helper is needed.

- [ ] **Step 1: Run unit/integration tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Browser smoke**

Run local app and verify:
- `/steward` shows separate public update and private milestone package panels.
- `/admin/batches` shows payment type and approved milestone submission context.
- public proof pages still omit private document paths.

Expected: no visual overlap, no private evidence shown publicly.
