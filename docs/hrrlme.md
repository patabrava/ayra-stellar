# AYRA Stellar Grill-Me Session Notes

This document captures the decisions reached during the design interview for the AYRA Stellar app. It is intended as the source handoff for the PRD and the initial implementation plan.

## Core Product Direction

- Build the full simplest version, not only a narrow milestone-one prototype.
- The app owns the canonical data model.
- Stellar SDP is the payment execution and payment-status backend.
- The VIIO adapter is not part of this implementation.
- The app should support multiple tracks.
- The first canonical smoke-path track is `Providencia`.
- The first canonical initiative is `Reforestation`.
- The first implementation must stay simple and focus on the end-to-end happy path.

## User Model

- `admin` is the operator role.
- `steward` is the primary portal/operator role for initiatives.
- `grantee` is a beneficiary record, not a login role.
- `grantee_contact` is a scoped login role linked to a grantee record.
- `applicant` is the pre-approval state for people applying to manage a track or initiative.
- A user can hold multiple roles if explicitly assigned.
- Role promotion happens only through explicit admin approval.
- Admins approve first, then users can become steward, grantee_contact, or both when needed.
- A unified app shell should show different views by role.
- The UI can include a role filter/switcher for demo and operator convenience, but auth and RLS remain authoritative.

## Application and Intake Flow

- The first application flow is for initiative and steward approval, not for funding approval.
- Applications are separate intake records.
- An application can become a new initiative under an existing track or a proposed new track.
- Applicants do not automatically become stewards or grantee contacts.
- Approved applicants are promoted by admin into the right record and role.
- The application queue is intentionally simple.
- Application approval grants portal access, not money.

## Track and Initiative Structure

- Tracks are first-class records.
- Initiatives are first-class records nested under tracks.
- The canonical smoke-path track is `Providencia`.
- The canonical smoke-path initiative is `Reforestation`.
- The data model must support additional tracks and initiatives from day one.
- The seed data should still center on one track and one initiative for the first happy path.

## Steward and Grantee Relationship

- A steward operates the portal for a track or initiative.
- A grantee is the beneficiary identity tied to the funding destination.
- A grantee can have one or more contacts with login access.
- Grantee contacts can submit milestone updates.
- Grantee contacts are scoped only to their own grantee record.
- Steward and grantee-contact submissions share the same moderation queue.
- The admin decides what gets published.
- The steward remains the primary operational portal role.

## Payout and Funding Flow

- Money movement happens only through admin-created batches.
- Stewards and grantee contacts cannot trigger payouts directly.
- Each initiative starts with one verified payout address.
- The payout address is a Stellar address.
- The first version uses direct Stellar addresses only.
- Phone-based receiver registration is not part of version one.
- The payout address must be verified before any batch line item can be sent to SDP.
- Address verification is manual in version one.
- The first version does not need automated challenge-based address verification.
- The first version uses one payout address per initiative.
- Submitted batches are immutable.
- If something changes after submission, a new batch or adjustment record is created.

## Public Transparency Model

- Public transparency shows category-level spending, not individual recipient names.
- Public details hide private steward and grantee contact information.
- The public wall shows only approved content.
- Pending, draft, rejected, and internal review states never appear publicly.
- The public wall is a single filtered feed per track.
- The public wall defaults to `Providencia`.
- The public wall keeps only the track selector as the primary navigation control.
- No search bar is needed in version one.
- No advanced public filters are needed in version one.
- Public content is manually curated by admin approval.
- The public feed includes only approved updates, milestone completions, and batch-cleared events.
- The public wall should show latest approved updates first.
- The public wall should show submitted batches as in-flight transparency.
- The public wall uses a clear `Cleared` label for settled batches.
- The public wall shows the current and past batches only.
- The public wall has a separate proof tab.
- The proof tab shows batch-level receipts only.
- The proof tab is simpler than a detailed internal audit screen.

## Currency and Accounting

- USDC is the canonical settlement and accounting asset.
- The local currency display is secondary.
- For Providencia, the local currency display starts as COP.
- The public UI can show USDC plus COP equivalent.
- Local currency values should use a stored FX snapshot.
- EUR is not part of the first version.

## Sponsor and Funding Attribution

- Sponsor attribution is included, but lightly.
- A batch or initiative can be linked to a named sponsor or funder.
- Public sponsor attribution appears only when appropriate.
- Proof packs include sponsor attribution when present.

## Updates and Media

- Steward uploads are public-update focused.
- Grantees can also submit updates when linked and approved.
- Financial receipts stay in the admin reconciliation flow.
- Public updates include media, captions, and milestone tags.
- Receipts are not part of public uploads.
- Public uploads do not auto-publish.
- Admin moderates all submissions before publication.
- Initial moderation actions are limited to `approve`, `edit-and-approve`, `reject`, and `save draft`.
- The first moderation workflow stays simple.

## Receipts and Privacy

- Raw receipt files are admin-only.
- Stewards and grantee contacts do not get direct raw receipt access.
- The first version uses sanitized status feedback only.
- No redacted receipt downloads are included in version one.
- Admin can attach a short sanitized explanation such as accepted, rejected, missing fields, or amount mismatch.
- This keeps GDPR and sensitive-file handling simple.
- Supabase Storage is used for uploaded assets.
- Public updates and private receipts are separated into different buckets.
- Public updates use signed URLs.
- Private receipts are only readable by admins.

## AI and Automation

- H5 AI suggestions are out of scope for the first version.
- Reconciliation suggestions can be manual or deterministic initially.
- The first build focuses on the end-to-end user journey, not AI assistance.

## Authentication and Security

- Supabase is the database, auth provider, and storage provider.
- Magic-link auth only is used in version one.
- No passwords are needed at first.
- No social login is needed at first.
- App roles are modeled in the database, not only in auth metadata.
- Use `profiles` plus role tables and scoped profile tables.
- Public reads are only for approved/public records.
- Client-side broad write access is not allowed.
- All sensitive mutations happen server-side.
- UTC is the canonical timestamp format in the database.
- Local-time formatting happens only in the UI.
- Soft delete or archive is preferred over hard delete for audit-heavy records.
- An audit log table should exist from the start.
- The audit log should store actor, action, entity type, entity id, timestamp, and before/after summary.
- The audit log should not store full snapshots by default.
- Raw SDP API keys never reach the browser.

## Tech Stack

- The app is a Next.js full-stack application.
- The app uses TypeScript.
- The app uses Tailwind CSS.
- The app uses Supabase JS helpers.
- The app uses Next.js server-side actions for internal mutations.
- Route handlers are reserved for webhooks, uploads, and external endpoints.
- The app should remain data-driven from the Supabase schema.
- Mock content should not become the implementation source of truth.
- The existing static mockups are visual references, not the runtime architecture.

## Data Model Direction

- Core tables should include profiles, user roles, tracks, initiatives, applications, steward profiles, grantee records, grantee contacts, payout addresses, sponsors, funding allocations, milestones, batches, batch line items, steward updates, update media, reconciliation items, proof packs, sdp sync events, and audit logs.
- Applications are intake records only.
- Tracks and initiatives are canonical operational records.
- Grantee is a beneficiary record, not a login role.
- Steward and grantee contact profiles are scoped records linked to auth users.
- Milestones are first-class records inside initiatives.
- Milestone updates are scoped to one initiative and one milestone at a time.
- Milestone updates can carry optional initials for internal attribution.

## Batching Rules

- Batch creation is manual in version one.
- Admin selects approved items and assembles a batch.
- Batch line items come from approved records and funding allocations.
- Batch line items become immutable once submitted to SDP.
- Batch statuses are standardized across the app.
- The canonical batch lifecycle is `draft -> ready -> submitted -> settled`.
- `failed` and similar operational states are visible in admin only.
- Public wall shows `submitted` as in-flight and `Cleared` for settled.
- The batch proof view is batch-level, not transaction-noisy.

## SDP Integration Strategy

- The app keeps a stubbed SDP boundary for smoke testing.
- A single server-side module should isolate SDP integration.
- The module should support mock mode and real testnet mode.
- The first smoke test can use stubbed SDP responses.
- The second test must use a real Stellar testnet disbursement path.
- The SDP boundary should support create batch, upload instructions, mark ready, sync payments, and map payment IDs and transaction hashes.
- Next.js server-side code owns the SDP call path.
- The browser never calls SDP directly.

## Storage and Export

- Supabase Storage holds steward media and private receipts.
- Separate buckets or prefixes are used for public updates and private receipts.
- The first export format is CSV.
- The first proof page is a simple PDF-like proof page.
- Proof data is generated from the canonical database records on demand.
- Proof data should not be duplicated in multiple places by default.

## Testing Strategy

- The first test layer is a seeded smoke test.
- The smoke test proves the app workflow end to end using seeded demo data.
- The smoke test covers application, approval, upload, moderation, batch creation, and public proof surfaces.
- The second test layer is a real Stellar testnet disbursement path.
- The testnet path proves SDP integration and payment-status sync.
- Seeded demo users and records are required.
- The seed should include one canonical user per role.
- The seed should include one track, one initiative, one milestone sequence, one approved update, one batch, and one proof entry.
- Demo identities should be synthetic only.
- The first seed should center on `Providencia / Reforestation`.
- Tests should exercise behavior, not implementation details.

## Development Order

- The first build step is the Supabase schema and RLS migrations.
- The next step is seed data.
- The next step is the UI surfaces.
- The next step is server actions and the SDP stub boundary.
- The next step is the smoke test.
- The next step is the real testnet test.

## Simplified Queue Model

- The first admin console includes applications, payout verification, updates moderation, batches, reconciliation, and proof packs.
- The admin console also includes a shared activity feed.
- The public wall’s `Updates` section is the canonical public activity feed.
- The admin activity feed is separate and internal.
- The public wall feed is manually curated.
- The public wall only shows approved records.

## Further Notes

- Simplicity is the default rule for future decisions.
- The goal is to test the end-to-end happy path as soon as possible.
- The first version should not overengineer search, filters, AI suggestions, auto-batching, or automated address verification.
- Every later enhancement should preserve the same canonical record model.
- The first implementation should be built around the real data model rather than mock UI content.

