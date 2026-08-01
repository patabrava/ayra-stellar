# Applicant Main Image and Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require one main project image, accept up to eight gallery photos, let admins curate the public set, and publish approved media automatically to the homepage and project page.

**Architecture:** A dedicated media module validates real JPEG/PNG/WebP bytes and extracts dimensions without a new dependency. Application media is stored in a private bucket and normalized `application_media` rows; admin approval copies only selected rows to a public bucket and normalized `initiative_media` rows. Public pages consume ordered initiative media, while seeded mockups remain an explicit demo-only fallback.

**Tech Stack:** Next.js 16 server actions, React 19, TypeScript, Zod, Supabase Postgres/Storage/RLS, Node test runner, Playwright.

---

## File Map

- Create `supabase/migrations/0016_application_project_media.sql`: rights field, normalized media tables, constraints, buckets, and RLS.
- Create `src/lib/ayra/project-media.ts`: media constraints, byte parsing, metadata parsing, storage paths, and role/order operations.
- Create `src/lib/ayra/project-media-storage.ts`: private upload compensation and public promotion helpers with injectable Supabase boundary.
- Create `src/components/ayra/application-media-field.tsx`: main/gallery selection, previews, per-photo metadata, and ordering.
- Create `src/components/ayra/project-gallery.tsx`: accessible responsive gallery dialog.
- Modify `src/lib/ayra/application-intake.ts`, `src/app/apply/page.tsx`, and `src/lib/ayra/actions.ts`: required media intake and compensated submission.
- Modify `src/lib/ayra/domain.ts` and `src/lib/ayra/data.ts`: application and initiative media projections.
- Modify `src/app/admin/applications/page.tsx`: signed previews, selection, ordering, role switching, and approval.
- Modify `src/app/admin/registry/page.tsx`: legacy approved-initiative media upload/remediation.
- Modify `src/app/page.tsx` and `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`: public main image and gallery.
- Modify user-facing status, privacy, and advisor copy.
- Add focused unit/contract/Playwright coverage.

### Task 1: Database and storage contract

**Files:**
- Create: `supabase/migrations/0016_application_project_media.sql`

- [ ] **Step 1: Implement normalized tables and constraints**

Create `application_media` and `initiative_media` with `role in ('main','gallery')`, non-negative `sort_order`, positive dimensions, non-empty alt text, focal positions, timestamps, cascade deletes, and unique partial indexes for one main row per parent. Add `hero_image_rights_confirmed boolean not null default false` to applications.

- [ ] **Step 2: Implement storage boundaries**

Create private `ayra-private-application-media` and public `ayra-public-initiative-media` buckets, each with a 10 MB object cap and JPEG/PNG/WebP MIME allow-list. Only admins may read/write private objects; anyone may read public initiative objects; only admins may write them. Public table RLS reads initiative media only when the parent initiative is `live` or `funding`.

- [ ] **Step 3: Verify and commit**

Run `rg -n "application_media|initiative_media|private-application|public-initiative|unique.*main|is_admin" supabase/migrations/0016_application_project_media.sql`. Expected: all contracts and policies are present. Commit only the migration.

### Task 2: Byte-level validation and metadata contract

**Files:**
- Create: `src/lib/ayra/project-media.ts`
- Create: `tests/ayra-project-media.test.ts`
- Modify: `src/lib/ayra/application-intake.ts`
- Modify: `tests/ayra-application-intake.test.ts`

- [ ] **Step 1: Write failing tests**

Cover PNG, JPEG, WebP VP8/VP8L/VP8X dimensions; MIME/signature mismatch; unsupported type; 10 MB per-file cap; nine-file and 60 MB set caps; main minimum 2000x1125 landscape; gallery minimum 1200 longest/800 shortest; alt 5–240; rights required; safe generated paths; role switching and stable ordering.

- [ ] **Step 2: Run focused tests to prove red**

Run `npm test -- --test-name-pattern="project media|application intake"`. Expected: failure because the new module/contracts do not exist.

- [ ] **Step 3: Implement the module**

Export constants, `ProjectMediaError` with stable codes, `validateProjectImage(file, role)`, `validateProjectMediaSet(main, gallery)`, private/public path builders, focal/role types, and pure `promoteToMain`/`reorderMedia` helpers. Parse image headers directly with `DataView`; do not trust filename or declared MIME alone.

- [ ] **Step 4: Extend intake metadata schema and pass tests**

Accept a JSON media metadata array containing stable client keys, role, alt, credit, and order; require exactly one main entry and at most eight gallery entries; require the whole-set rights literal. Run the focused command until green.

- [ ] **Step 5: Commit validator slice**

Commit the module, schema, and tests only.

### Task 3: Applicant media UI and compensated private submission

**Files:**
- Create: `src/components/ayra/application-media-field.tsx`
- Modify: `src/app/apply/page.tsx`
- Modify: `src/lib/ayra/actions.ts`
- Create: `src/lib/ayra/project-media-storage.ts`
- Create: `tests/ayra-project-media-storage.test.ts`
- Modify: `tests/e2e/ayra-seeded-smoke.spec.ts`

- [ ] **Step 1: Write failing storage compensation tests**

Use an injectable adapter to prove uploaded private objects are all removed when a later upload or row insert fails, paths are generated server-side, and successful rows preserve role/order/alt/credit/dimensions.

- [ ] **Step 2: Build the accessible media field**

Render one required `mainImage` input and one `galleryImages` input with `multiple`. The component reads browser dimensions, shows a 16:9 main preview and natural-ratio gallery previews, collects per-photo alt/credit, supports remove and move earlier/later, emits `mediaMetadata` JSON, shows per-file and combined errors through `aria-describedby`, and keeps native form semantics.

- [ ] **Step 3: Implement server-controlled submission**

Parse proposal, metadata, main file, and gallery files. Revalidate all bytes/dimensions and ensure metadata maps to files by generated client index—not applicant-controlled paths. In configured mode use the service client to insert the pending application, upload every private object, and insert media rows. On any failure delete created objects and the incomplete application. Preserve deterministic demo submission without external storage.

- [ ] **Step 4: Add applicant-facing status recovery and pass focused tests**

Map missing main, excess count/total size, unsupported file, insufficient dimensions, rights, private upload, and save errors to direct status copy. Run project-media, intake, storage, and status tests until green.

- [ ] **Step 5: Commit intake slice**

Commit only the new component, actions/storage changes, focused tests, and direct copy.

### Task 4: Domain and data projections

**Files:**
- Modify: `src/lib/ayra/domain.ts`
- Modify: `src/lib/ayra/data.ts`
- Modify: `tests/ayra-data.test.ts`
- Create: `tests/ayra-project-media-domain.test.ts`

- [ ] **Step 1: Write failing projection tests**

Prove public state includes ordered initiative media and never private application paths. Prove operator state includes private review metadata and public URLs are derived only from the public bucket.

- [ ] **Step 2: Implement media types, queries, and mappers**

Add `ApplicationMedia` and `InitiativeMedia` types, collections in `AyraState`, public/operator queries, mapper functions, and demo rows matching current mockup images. Build public URLs from `storage_path` at the data boundary. Keep the existing initiative shape stable.

- [ ] **Step 3: Run data/domain tests and commit**

Run `npm test -- --test-name-pattern="data|domain|project media"`. Preserve the pre-existing modified `tests/ayra-domain.test.ts` from the original checkout by working from committed HEAD and avoiding unrelated rewrites.

### Task 5: Admin curation and atomic approval publication

**Files:**
- Modify: `src/app/admin/applications/page.tsx`
- Modify: `src/lib/ayra/actions.ts`
- Modify: `src/lib/ayra/project-media-storage.ts`
- Create: `tests/ayra-project-media-promotion.test.ts`
- Modify: `tests/e2e/admin-approval-feedback.spec.ts`

- [ ] **Step 1: Write failing promotion tests**

Cover: no selected main blocks approval; excluded gallery is never copied; selected order is stable; gallery-to-main switching leaves one main; partial public upload removes attempt objects; retry upserts stable paths; application stays pending on failure.

- [ ] **Step 2: Render private signed previews and controls**

Create signed URLs server-side for admin review. Show main and gallery metadata, rights state, inclusion checkboxes, earlier/later controls, focal selector, and `Use as main`. Each mutation is an admin server action that checks the application is pending and preserves exactly one selected main.

- [ ] **Step 3: Publish the curated set before final approval**

Download selected private objects, upload stable initiative-scoped public objects, promote application records, replace initiative media rows, and only then mark the application approved. Compensate all new public objects if promotion or status update fails. Audit published IDs/count and revalidate admin, `/`, and project paths.

- [ ] **Step 4: Pass promotion/admin tests and commit**

Run `npm test -- --test-name-pattern="project media promotion|project media|status"` and the focused admin Playwright spec. Expected: green.

### Task 6: Legacy initiative media management

**Files:**
- Modify: `src/app/admin/registry/page.tsx`
- Modify: `src/lib/ayra/actions.ts`
- Modify: `src/lib/ayra/project-media-storage.ts`
- Create: `tests/ayra-initiative-media-replacement.test.ts`

- [ ] **Step 1: Write failing replacement tests**

Prove a legacy initiative without media requires a main image, optional gallery respects limits, a failed replacement preserves the complete prior public set, and a successful replacement removes superseded objects only after new rows commit.

- [ ] **Step 2: Implement `Add project media` and edit controls**

Use the same media field in admin mode, allowing main/gallery add, replace, remove, order, role, alt, credit, and focal changes. Audit `initiative.media_updated`. Show `Main image required` beside public initiatives without main media.

- [ ] **Step 3: Pass focused tests and commit**

Run replacement/project-media tests until green, then commit this slice.

### Task 7: Public main image and accessible gallery

**Files:**
- Create: `src/components/ayra/project-gallery.tsx`
- Create: `src/lib/ayra/public-project-media.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/ayra-public-project-media.test.ts`
- Modify: `tests/e2e/ayra-seeded-smoke.spec.ts`

- [ ] **Step 1: Write failing resolver and browser tests**

Prove database main wins, gallery order is respected, missing production main excludes homepage featuring, seeded demo fallbacks remain, alt/credit render, and gallery opens/closes/navigates by click, ArrowLeft/ArrowRight, and Escape.

- [ ] **Step 2: Implement public media resolver and homepage**

Resolve initiative main/gallery from state. Homepage features the first initiative with a main image; use hard-coded mockups only for known demo slugs. Render remote storage URLs with `unoptimized` unless Next remote configuration explicitly supports the configured host. Apply focal position through `object-position`.

- [ ] **Step 3: Implement gallery dialog**

Render responsive natural-aspect thumbnails and a native `<dialog>` lightbox with title, credit, close, previous, next, focus restoration, visible focus, Escape, arrow keys, body-scroll containment, and reduced-motion-safe behavior.

- [ ] **Step 4: Pass public unit/browser tests and commit**

Run the resolver unit test and seeded Playwright flow until green.

### Task 8: Privacy and advisor consistency

**Files:**
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/lib/ayra/advisor.ts`
- Modify: `tests/ayra-advisor.test.ts`

- [ ] **Step 1: Add failing copy assertions**

Require the advisor to explain one main image, optional gallery, private review, rights, admin selection, and automatic approved publication. Require privacy copy to distinguish pending private media from approved public media.

- [ ] **Step 2: Implement direct copy and pass tests**

Keep bucket/database terminology out of user-facing prose. Run `npm test -- --test-name-pattern="advisor|privacy|status"` until green and commit.

### Task 9: Full verification, main integration, and push

**Files:**
- Modify only files required to repair failures.

- [ ] **Step 1: Run one complete regression block**

Run `npm test && npm run lint && npm run build && npx playwright test tests/e2e/ayra-seeded-smoke.spec.ts tests/e2e/admin-approval-feedback.spec.ts`. Repair any failure and rerun this exact block.

- [ ] **Step 2: Run real browser validation**

Start the production build and inspect `/apply`, `/admin/applications`, `/admin/registry`, `/`, and a project page with the in-app browser. Exercise invalid/valid files, per-photo metadata, gallery order, admin selection/main switching, responsive widths, keyboard behavior, visible focus, image loading, and console health. When live Supabase credentials are available, apply the migration to the configured project and verify private/public access plus row readback with disposable records.

- [ ] **Step 3: Finish and integrate**

Use `superpowers:verification-before-completion` and `superpowers:finishing-a-development-branch`. Merge the feature branch into local `main` without discarding the original checkout's unrelated working changes, rerun the complete regression block on merged `main`, and push `main` to its configured remote.

- [ ] **Step 4: Verify published result**

Confirm the remote branch contains the merge commit. If deployment is connected, verify the deployment and live routes. Report code, migration/deployment state, browser evidence, commit, and any external blocker precisely.
