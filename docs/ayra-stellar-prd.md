# AYRA Stellar MVP PRD

## Problem Statement

AYRA needs a simple but real full-stack product that connects initiative intake, steward operations, grantee-linked updates, admin-controlled payment batching, Stellar SDP payment status, and public transparency into one canonical system.

The current app is still mostly a visual scaffold. The product decisions already define the intended model, but agents need a PRD that turns those decisions into executable scope: which records are canonical, which roles can act, which payment states matter, which public information is safe to show, and what must be verified before the MVP is considered complete.

The immediate problem is not to build a narrow static demo. The product needs the simplest complete version of the end-to-end happy path, centered on the first track and initiative, while keeping the model extensible enough for more tracks and initiatives later.

## Solution

Build AYRA Stellar as a Next.js full-stack application backed by Supabase for database, auth, storage, RLS, and server-side privileged operations. The app owns the canonical data model. Stellar SDP is used only as the payment execution and payment-status backend through a server-side integration boundary.

The first smoke path centers on the `Providencia` track and the `Reforestation` initiative. The MVP supports application intake, admin approval, role promotion, steward and grantee-contact submissions, moderation, payout-address verification, manual batch creation, SDP submission/sync, proof-pack generation, and a public transparency wall that only shows approved public records.

The first implementation should stay simple. It should use magic-link auth, manual approval, manual address verification, one payout address per initiative, manual batch creation, category-level public spending, separate public/private storage handling, and a stubbed SDP mode before proving the real Stellar testnet path.

## User Stories

1. As a public visitor, I want to see the Providencia transparency wall, so that I can understand what AYRA is funding.
2. As a public visitor, I want approved updates to appear latest first, so that I can quickly see recent progress.
3. As a public visitor, I want to switch between tracks, so that the same wall can support more programs later.
4. As a public visitor, I want to see category-level spending instead of private recipient names, so that transparency does not expose sensitive personal information.
5. As a public visitor, I want to see submitted batches as in-flight activity, so that I know money movement is underway before settlement.
6. As a public visitor, I want settled batches to be clearly labeled as `Cleared`, so that I can distinguish planned or submitted funding from completed funding.
7. As a public visitor, I want a simple proof tab with batch-level receipts, so that I can inspect payment proof without internal audit noise.
8. As a public visitor, I want public media and captions to be curated, so that the wall remains trustworthy and safe.
9. As a public visitor, I want only approved records to be visible, so that drafts, rejected submissions, and internal review material are never exposed.
10. As a prospective steward, I want to apply to manage an initiative or propose a track, so that AYRA can review whether I should receive portal access.
11. As a prospective steward, I want application approval to be separate from funding approval, so that I understand that access does not automatically grant money.
12. As an applicant, I want to provide proposed track, initiative, scope, contact, and operational details, so that admins can review my request.
13. As an applicant, I want to be promoted only after admin approval, so that role access is intentionally granted.
14. As an admin, I want an application queue, so that I can review prospective stewards and initiative proposals.
15. As an admin, I want to approve an applicant into a steward, grantee contact, or both when needed, so that users get the correct scoped access.
16. As an admin, I want role promotion to be explicit, so that no application creates privileged access automatically.
17. As an admin, I want tracks and initiatives to be first-class records, so that AYRA can support multiple programs without changing the architecture.
18. As an admin, I want Providencia and Reforestation seeded as the canonical smoke path, so that demos and tests operate on known data.
19. As a steward, I want to manage my initiative portal after approval, so that I can submit public progress updates.
20. As a steward, I want to submit media, captions, and milestone tags, so that admins can publish meaningful progress updates.
21. As a steward, I want my submissions to enter moderation instead of publishing immediately, so that public transparency remains curated.
22. As a steward, I want to receive sanitized status feedback for rejected or incomplete submissions, so that I can fix issues without seeing private admin-only receipt data.
23. As a grantee contact, I want scoped login access linked to a grantee record, so that I can submit updates only for my assigned grantee.
24. As a grantee contact, I want my update submissions to use the same moderation queue as steward submissions, so that admins have one operational review lane.
25. As an admin, I want to create grantee records separately from user login roles, so that beneficiary identity and portal access remain distinct.
26. As an admin, I want to link one or more grantee contacts to a grantee, so that the correct people can submit updates without becoming full stewards.
27. As an admin, I want to verify one Stellar payout address per initiative, so that batch line items cannot be submitted to SDP before destination checks are complete.
28. As an admin, I want address verification to be manual in version one, so that the MVP avoids automated challenge-based verification complexity.
29. As an admin, I want to create funding batches manually, so that money movement always requires operator intent.
30. As an admin, I want stewards and grantee contacts blocked from triggering payouts, so that payment authority remains centralized.
31. As an admin, I want batch line items to become immutable once submitted, so that submitted payment instructions stay auditable.
32. As an admin, I want changes after submission to create a new batch or adjustment record, so that payment history is preserved.
33. As an admin, I want batch statuses standardized as `draft`, `ready`, `submitted`, and `settled`, so that the UI and SDP sync share one lifecycle.
34. As an admin, I want failed or operational payment states visible only internally, so that the public wall does not expose noisy operational details.
35. As an admin, I want to attach sponsor or funder attribution when appropriate, so that public proof packs can credit funders without overcomplicating the first version.
36. As an admin, I want to upload or attach private financial receipts only to admin reconciliation records, so that sensitive files never become public uploads.
37. As an admin, I want separate storage handling for public update media and private receipts, so that access policy is enforceable.
38. As an admin, I want public update media to use controlled public delivery, so that public content can be displayed safely.
39. As an admin, I want private receipts readable only by admins, so that steward and grantee-contact roles cannot access raw sensitive files.
40. As an admin, I want every sensitive mutation to happen server-side, so that browser clients never receive privileged keys or broad write access.
41. As an admin, I want an audit log from the start, so that approvals, role changes, moderation, batch transitions, and SDP sync events are traceable.
42. As an admin, I want audit entries to capture actor, action, entity type, entity id, timestamp, and before/after summaries, so that operations are reviewable without storing full snapshots by default.
43. As an admin, I want proof data generated from canonical database records on demand, so that proof packs do not become a second source of truth.
44. As an admin, I want CSV export first, so that operational data can be handed off without building a complex reporting system.
45. As a sponsor, I want appropriate attribution on initiatives, batches, or proof packs, so that funding can be recognized when suitable.
46. As a developer, I want SDP integration isolated behind one server-side boundary, so that mock mode and real testnet mode can share the same app workflow.
47. As a developer, I want the browser blocked from calling SDP directly, so that SDP credentials and payment execution stay server-side.
48. As a developer, I want a seeded smoke test covering application, approval, upload, moderation, batch creation, and public proof surfaces, so that the end-to-end happy path is continuously verifiable.
49. As a developer, I want a second testnet verification path for real Stellar SDP disbursement and status sync, so that the integration is proven beyond stubs.
50. As a developer, I want synthetic demo identities only, so that seed data does not introduce real personal data into local or demo environments.

## Implementation Decisions

- Build the MVP as a Next.js full-stack application using TypeScript, Tailwind CSS, Supabase, and server-side mutations.
- Treat the app database as the canonical source of truth. Mock content and static screens are visual references only.
- Use Supabase for auth, database, storage, RLS, and service-role server operations.
- Use magic-link auth only in version one. Passwords and social login are out of scope.
- Model roles in database records rather than relying only on auth metadata.
- Support the roles `admin`, `steward`, `grantee_contact`, and `applicant`.
- Treat `grantee` as a beneficiary record, not a login role.
- Allow users to hold multiple roles only when explicitly assigned.
- Require admin approval before an applicant can become a steward, grantee contact, or both.
- Keep a unified app shell, but gate views by authoritative auth, database roles, and RLS.
- Permit a demo/operator role filter only as a UI convenience. It must not bypass server authorization.
- Make tracks and initiatives first-class records from the start.
- Seed the first smoke path with `Providencia` as the track and `Reforestation` as the initiative.
- Keep applications as intake records. Approval grants portal access and record creation, not funding approval.
- Let an application propose a new initiative under an existing track or a proposed new track.
- Create steward profiles and scoped grantee-contact profiles only after admin approval.
- Represent milestones as first-class records scoped to initiatives.
- Scope milestone updates to one initiative and one milestone at a time.
- Allow milestone updates to carry optional internal initials for attribution.
- Use a single moderation queue for steward and grantee-contact update submissions.
- Limit initial moderation actions to `approve`, `edit-and-approve`, `reject`, and `save draft`.
- Publish only approved updates, milestone completions, and eligible batch events.
- Keep pending, draft, rejected, and internal review records out of public reads.
- Show public spending at category level instead of individual recipient level.
- Hide private steward and grantee-contact information from public surfaces.
- Use USDC as the canonical settlement and accounting asset.
- Store local currency equivalents as FX snapshots. For Providencia, the local display starts as COP.
- Keep EUR out of version one.
- Include light sponsor attribution on initiatives, batches, and proof packs when present and appropriate.
- Use one manually verified Stellar payout address per initiative in version one.
- Do not support phone-based receiver registration in version one.
- Block batch submission until the target initiative payout address is verified.
- Keep all money movement admin-controlled through manually created batches.
- Build a batch lifecycle with the canonical states `draft`, `ready`, `submitted`, and `settled`.
- Keep failed and operational payment states internal to admin views.
- Show `submitted` batches publicly as in-flight transparency.
- Show `settled` batches publicly with the label `Cleared`.
- Make submitted batches and submitted line items immutable.
- Require post-submission changes to be represented by a new batch or adjustment record.
- Isolate Stellar SDP behind one server-side payment gateway module.
- The payment gateway must support mock mode and real testnet mode through the same app-facing interface.
- The SDP boundary must cover batch creation, instruction upload, marking ready, payment-status sync, and mapping SDP payment ids and transaction hashes back to canonical records.
- Never expose raw SDP API keys to the browser.
- Use server-side actions for internal mutations where appropriate.
- Reserve route handlers for webhooks, uploads, and external endpoints.
- Store steward public media and private receipts in separated storage buckets or separated policy domains.
- Public update media may be displayed through controlled signed URL behavior.
- Private receipts must be readable only by admins.
- Steward and grantee-contact roles receive sanitized status feedback, not raw receipt access.
- Generate proof pages from canonical database records on demand.
- Do not duplicate proof data into a separate source of truth unless a later caching decision explicitly requires it.
- Add an audit log table from the start.
- Audit log entries should store actor, action, entity type, entity id, timestamp, and before/after summary.
- Audit logs should not store full before/after snapshots by default.
- Use UTC as the canonical database timestamp format.
- Format local times only in the UI.
- Prefer archive or soft-delete behavior over hard delete for audit-heavy records.

The implementation should be organized around the following deep modules:

- Authorization and role resolution: exposes stable checks for current user role, scoped record access, and privileged server operations.
- Application approval workflow: owns application intake states, admin decisions, and promotion into canonical records and roles.
- Operational domain model: owns tracks, initiatives, milestones, grantees, grantee contacts, payout addresses, sponsors, and funding allocations.
- Submission moderation workflow: owns steward/grantee-contact update submission, edit-and-approve behavior, rejection feedback, draft handling, and public publication.
- Batch state machine: owns batch creation, line item eligibility, immutable submission, lifecycle transitions, and public/internal status mapping.
- SDP gateway: owns mock and testnet payment execution, sync events, external identifiers, transaction hashes, retries, and error normalization.
- Public transparency projection: owns the public wall, approved feed ordering, category-level totals, public proof tab, and privacy-safe presentation.
- Storage policy boundary: owns public update media access, private receipt access, and signed URL behavior.
- Audit logging: owns structured audit entries for privileged actions and state transitions.
- Seed and verification harness: owns synthetic demo records, smoke-path setup, and test execution entry points.

## Testing Decisions

- Good tests should verify external behavior and persisted outcomes, not private implementation details.
- The primary smoke test should prove the seeded happy path from application intake through public proof visibility.
- The seeded smoke path must use synthetic data only.
- The first seed should include one canonical user per role, one track, one initiative, one milestone sequence, one approved update, one batch, one payout address, and one proof entry.
- The smoke test should verify application submission, admin approval, role promotion, steward upload, moderation approval, batch creation, payout-address gating, public wall visibility, and proof-tab visibility.
- The batch state machine should be tested as a deep module because it encodes important lifecycle and immutability rules.
- The authorization and role-resolution module should be tested because it protects all privileged and scoped access.
- The application approval workflow should be tested because it separates intake from role promotion and funding approval.
- The moderation workflow should be tested because it controls what can become public.
- The SDP gateway should be tested in mock mode first so the app workflow can be verified without external payment dependencies.
- A real Stellar testnet verification should be added after the stubbed smoke path passes.
- The testnet verification must prove SDP submission, payment id mapping, status sync, and transaction hash persistence.
- Storage policy should be tested for public media visibility and private receipt denial for non-admin roles.
- Public transparency should be tested from the user-visible surface and the persisted database state.
- Current repo prior art is minimal; the PRD assumes new test infrastructure must be added rather than extending an existing test suite.
- Existing scaffold pages provide product copy and surface references, but they should not be treated as behavioral test prior art.

## Out of Scope

- VIIO adapter integration.
- H5 AI suggestions.
- AI-assisted reconciliation suggestions beyond manual or deterministic rules.
- Automated challenge-based payout-address verification.
- Phone-based receiver registration.
- Password login.
- Social login.
- Multiple payout addresses per initiative.
- Steward-triggered payouts.
- Grantee-contact-triggered payouts.
- Auto-batching.
- Public search.
- Advanced public filters.
- Public raw recipient names.
- Public private-contact information.
- Public raw receipt downloads.
- Redacted receipt downloads for version one.
- EUR display or accounting.
- Detailed internal audit UI beyond the basic admin operational needs.
- Full reporting suite beyond initial CSV export.
- Complex proof-pack generation beyond a simple PDF-like proof page.
- Hard-delete workflows for audit-heavy records.

## Further Notes

- The default decision rule is simplicity.
- The MVP should prove the complete happy path as early as possible.
- The stubbed SDP path is the first acceptance layer for app workflow correctness.
- The real Stellar testnet path is the second acceptance layer for payment integration correctness.
- If the team wants a narrower milestone split, the natural split is: first, Supabase schema/RLS/seed; second, app surfaces and server actions; third, stubbed SDP smoke test; fourth, real testnet verification.
- Issue-tracker publishing is not covered by the current repo context. This PRD is ready as a local artifact, but publishing with a `ready-for-agent` label requires the project issue tracker and triage label setup to be provided or installed.
