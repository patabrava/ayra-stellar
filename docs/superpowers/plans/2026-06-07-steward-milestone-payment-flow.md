# Steward Milestone + Payment Flow Plan

## Goal
Implement `docs/superpowers/specs/2026-06-07-steward-milestone-payment-flow-design.md`: separate public steward updates from private milestone evidence, require approved unused private milestone submissions for normal payments, and allow admin-created advances without milestone evidence.

## Operating Route
- Bridgecode: `EYE` for implementation/debugging, `LLM_FRIENDLY_PLAN_CODE_DEBUG` for plan/test/reporting.
- Superpowers: worktree isolation, TDD, execution, verification-before-completion.
- Scope: one coherent vertical slice across domain, persistence, actions, steward UI, admin UI, migration, and tests.

## Budget
`{files: 13-15, LOC/file: target <=1000 except existing domain/action files may remain near repo size, deps: 0 new}`

## Implementation Block
1. Domain contract
   - Add `MilestoneSubmission`, `MilestoneSubmissionStatus`, `PaymentKind`.
   - Add `AyraState.milestoneSubmissions`.
   - Add domain mutations for private submission submit/review.
   - Enforce normal payment link to one approved unused same-initiative submission.
   - Allow advance payment without milestone link.

2. Persistence contract
   - Add Supabase migration for `milestone_submissions`.
   - Add `funding_batches.payment_kind` and `funding_batches.milestone_submission_id`.
   - Enforce same-initiative, approved-only, one-payment-per-submission constraints at the database boundary.
   - Map operator-only private evidence rows; keep public reads privacy-safe.

3. Server actions
   - Add steward private milestone submission action.
   - Add admin milestone review action.
   - Extend batch creation validation with `paymentKind` and `milestoneSubmissionId`.
   - Audit submission, review, and batch creation events.

4. Steward UI
   - Keep existing public update composer public-only.
   - Add a separate private milestone package form with private document upload.
   - Show evidence history without making private docs public.

5. Admin UI
   - Add payment type selector.
   - For normal payments, require an approved unused milestone package for the selected initiative.
   - For advances, hide milestone package selection and show exception copy.

6. Tests and validation
   - Domain tests for public/private separation, normal payment link requirement, no reuse, and advance exception.
   - Data tests for private operator rows and public privacy boundary.
   - Source/UI tests for separate steward forms and admin controls.
   - Status tests for new operator feedback states.
   - Build, lint, and browser smoke on desktop/mobile.

## Risks
- Supabase generated types may not know about the new table before migration/type regeneration; keep casts local and narrow.
- Existing live `funding_batches` rows may have no milestone link; migration must avoid invalidating historical rows during creation while enforcing future writes.
- Browser smoke uses demo/operator fallback state locally unless live Supabase env is configured.

## Pass/Fail
Pass when:
- `npm test`, `npm run build`, and `npm run lint` exit 0.
- Browser shows steward public updates and private milestone packages as separate surfaces.
- Browser shows admin normal payment default with approved milestone package selector and advance exception state available.
- Public data mapping excludes private evidence paths.

Fail when:
- Normal payments can be created without an approved unused private milestone submission.
- Private evidence appears in public projections/proof pages.
- Advance payments require milestone evidence.
