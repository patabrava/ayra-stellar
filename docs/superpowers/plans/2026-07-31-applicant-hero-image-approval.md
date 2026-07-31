# Applicant Hero Image Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require a quality project hero with every new application, keep it private during review, and publish it automatically to the homepage and project page when an admin approves.

**Architecture:** A focused image-validation module owns file constraints and header-based dimensions. The public server action uses the Supabase service client to upload a generated-path private object and insert the application with compensation on failure. Approval copies the object into an admin-write/public-read bucket before promoting the application, and initiative hero metadata becomes the single public rendering source with demo-only fallbacks.

**Tech Stack:** Next.js 16 server actions, React 19, TypeScript, Zod, Supabase Postgres/Storage/RLS, Node test runner, Playwright.

---

## File Map

- Create `supabase/migrations/0015_application_hero_media.sql`: media columns, checks, storage buckets, and RLS.
- Create `src/lib/ayra/application-hero.ts`: constants, byte signature/dimension validation, safe extension/path helpers.
- Create `src/components/ayra/application-hero-field.tsx`: accessible required image picker and client preview/dimension feedback.
- Modify `src/lib/ayra/application-intake.ts`: metadata schema and limits.
- Modify `src/app/apply/page.tsx`: multipart image, alt, credit, and rights controls.
- Modify `src/lib/ayra/actions.ts`: private submission, approval publication, focal/replacement actions, rollback, revalidation.
- Modify `src/lib/ayra/public-write.ts`: keep the JSON row-shaping helper aligned for contract tests; live file submissions move to the server action.
- Modify `src/lib/ayra/domain.ts`: application and initiative hero fields plus demo values.
- Modify `src/lib/ayra/data.ts`: select and map private admin metadata and public initiative metadata.
- Modify `src/app/admin/applications/page.tsx`: private signed preview, metadata, focal selector, approval guard, replacement.
- Modify `src/app/page.tsx`: database-backed hero selection and production featuring rule.
- Modify `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`: database-backed hero and optional credit.
- Modify `src/lib/ayra/status.ts`, `src/app/privacy/page.tsx`, and `src/lib/ayra/advisor.ts`: actionable copy and consent/publication explanation.
- Create/modify focused unit and Playwright tests under `tests/` and `tests/e2e/`.

### Task 1: Persist and protect hero metadata

**Files:**
- Create: `supabase/migrations/0015_application_hero_media.sql`

- [ ] **Step 1: Write migration assertions in the migration itself**

Add constrained application columns, public initiative columns, and storage policies. Use `hero_image_focal_position in ('center','top','bottom','left','right')`, private `ayra-private-application-media`, and public `ayra-public-initiative-media`. Grant public reads only for the latter; grant admin object management for both.

- [ ] **Step 2: Implement the migration**

The migration must include:

```sql
alter table public.applications
  add column if not exists hero_image_path text,
  add column if not exists hero_image_original_name text,
  add column if not exists hero_image_mime_type text,
  add column if not exists hero_image_width integer,
  add column if not exists hero_image_height integer,
  add column if not exists hero_image_alt text,
  add column if not exists hero_image_credit text,
  add column if not exists hero_image_rights_confirmed boolean not null default false,
  add column if not exists hero_image_focal_position text not null default 'center';

alter table public.initiatives
  add column if not exists hero_image_url text,
  add column if not exists hero_image_alt text,
  add column if not exists hero_image_credit text,
  add column if not exists hero_image_focal_position text not null default 'center';
```

Add named check constraints idempotently with `do $$ ... $$`, configure both 10 MB buckets for JPEG/PNG/WebP, and create narrowly scoped storage policies.

- [ ] **Step 3: Verify syntax and commit**

Run: `rg -n "hero_image|ayra-.*initiative-media|ayra-.*application-media" supabase/migrations/0015_application_hero_media.sql`

Expected: both table contracts, both buckets, public-read-only initiative policy, and admin policies appear.

Commit only the migration.

### Task 2: Validate real image bytes and application metadata

**Files:**
- Create: `src/lib/ayra/application-hero.ts`
- Modify: `src/lib/ayra/application-intake.ts`
- Create: `tests/ayra-application-hero.test.ts`
- Modify: `tests/ayra-application-intake.test.ts`

- [ ] **Step 1: Write failing validator tests**

Cover PNG dimensions, JPEG dimensions, WebP dimensions, mismatched MIME/signature, unsupported type, greater than 10 MB, portrait/small dimensions, safe extension/path generation, missing alt, and missing rights confirmation.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- --test-name-pattern="application hero|application intake"`

Expected: FAIL because the hero module and required fields do not exist.

- [ ] **Step 3: Implement the byte validator**

Expose this contract:

```ts
export const APPLICATION_HERO_ACCEPT = "image/jpeg,image/png,image/webp";
export const MAX_APPLICATION_HERO_BYTES = 10 * 1024 * 1024;
export const MIN_APPLICATION_HERO_WIDTH = 2000;
export const MIN_APPLICATION_HERO_HEIGHT = 1125;

export type ValidatedApplicationHero = {
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  extension: "jpg" | "png" | "webp";
};

export async function validateApplicationHero(file: File): Promise<ValidatedApplicationHero>;
export function privateApplicationHeroPath(applicationId: string, extension: string): string;
export function publicInitiativeHeroPath(initiativeId: string, extension: string): string;
```

Parse dimensions directly from PNG IHDR, JPEG SOF markers, and WebP VP8/VP8L/VP8X headers. Throw stable error codes represented by an exported `ApplicationHeroError` class.

- [ ] **Step 4: Extend intake schema and pass tests**

Add required `heroImageAlt` (5–240 characters), optional `heroImageCredit` (max 160), required literal `heroImageRightsConfirmed: true`, and focal-position schema. Run the focused tests until PASS.

- [ ] **Step 5: Commit focused validator work**

Commit only the validator, intake schema, and focused tests.

### Task 3: Build required applicant upload and private submission

**Files:**
- Create: `src/components/ayra/application-hero-field.tsx`
- Modify: `src/app/apply/page.tsx`
- Modify: `src/lib/ayra/actions.ts`
- Modify: `src/lib/ayra/public-write.ts`
- Modify: `tests/ayra-public-write.test.ts`
- Modify: `tests/e2e/ayra-seeded-smoke.spec.ts`

- [ ] **Step 1: Write failing submission contracts**

Update the REST row-shape test for hero metadata and the browser application flow so file, alt, and rights are required. Add a valid generated 2000x1125 PNG fixture for Playwright.

- [ ] **Step 2: Build the accessible applicant field**

The client component must render `name="heroImageFile"`, use the accept constant, show a 16:9 preview, inspect dimensions with a browser `Image`, associate errors via `aria-describedby`, and prevent ordinary submission when invalid. It must retain native `required` enforcement.

- [ ] **Step 3: Replace anonymous live insertion with a compensated server operation**

In `submitApplicationAction`:

```ts
const applicationId = crypto.randomUUID();
const hero = await validateApplicationHero(requiredFile(formData, "heroImageFile"));
const privatePath = privateApplicationHeroPath(applicationId, hero.extension);
const supabase = createSupabaseAdminClient();
```

Upload bytes to the private bucket, insert the application row with explicit ID and hero metadata, and delete the private object if insertion fails. Preserve demo-mode redirect behavior before requiring service credentials. Map stable validation errors to specific `/apply?status=...` outcomes.

- [ ] **Step 4: Update copy and run focused tests**

Run: `npm test -- --test-name-pattern="application hero|application intake|public Supabase writes"`

Expected: PASS.

- [ ] **Step 5: Commit intake slice**

Commit only applicant-form, action, helper, and related test changes.

### Task 4: Project hero domain and public projection

**Files:**
- Modify: `src/lib/ayra/domain.ts`
- Modify: `src/lib/ayra/data.ts`
- Modify: `tests/ayra-data.test.ts`
- Modify: `tests/ayra-domain.test.ts` only if the existing user changes can be preserved cleanly; otherwise add a separate focused test file.

- [ ] **Step 1: Write failing mapping tests**

Assert that public initiatives map URL, alt, credit, and focal position while public state never contains private application paths. Assert operator applications map their private hero review metadata.

- [ ] **Step 2: Extend types, queries, and mappers**

Add optional camelCase hero fields to `Initiative` and `Application`. Extend both public/operator initiative selects and the operator application select. Map only approved initiative fields into public state. Add demo hero values matching existing mockup assets so demo regressions remain deterministic.

- [ ] **Step 3: Run data/domain tests and commit**

Run: `npm test -- --test-name-pattern="data|domain"`

Expected: PASS without discarding any pre-existing edits.

### Task 5: Publish during approval and support admin remediation

**Files:**
- Modify: `src/lib/ayra/actions.ts`
- Modify: `src/app/admin/applications/page.tsx`
- Create: `src/components/ayra/admin-hero-preview.tsx` only if signed-preview state requires a client boundary.
- Create: `tests/ayra-hero-promotion.test.ts`

- [ ] **Step 1: Write failing promotion tests**

Extract a testable media-promotion helper and cover missing private path, download failure, public upload failure, stable public path, focal metadata, and cleanup when later promotion fails.

- [ ] **Step 2: Add private previews and admin controls**

Generate short-lived signed URLs server-side for pending application rows. Render the same 16:9 `object-position` preview used publicly, metadata, focal selector, rights state, and clear `Hero image required` state. Add an admin replacement form for pending applications and initiatives lacking/repairing a hero.

- [ ] **Step 3: Make approval media-first and retry-safe**

Select all hero metadata. Refuse approval without rights-confirmed media. Download the private object, upload it with `upsert: true` to the stable initiative public path, and pass hero fields into `promoteApplication`. If later promotion fails, delete only a public object created by this attempt. Revalidation includes `/`, the project route, admin applications, and registry.

- [ ] **Step 4: Implement post-approval add/replace action**

Validate the admin file with the same server validator, upload the new public object first, update the initiative second, then remove the superseded object. Audit `initiative.hero_updated` and retain the old hero if any preceding step fails.

- [ ] **Step 5: Run promotion tests and commit**

Run: `npm test -- --test-name-pattern="hero promotion|application hero"`

Expected: PASS.

### Task 6: Render approved heroes publicly

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/projects/[trackSlug]/[initiativeSlug]/page.tsx`
- Modify: `src/app/globals.css` only if the existing image classes cannot express focal position/credit.
- Modify: `tests/e2e/ayra-seeded-smoke.spec.ts`

- [ ] **Step 1: Write failing public rendering checks**

Assert a database hero wins over slug mockups, its alt text renders, focal position reaches `object-position`, and optional credit appears on detail. Assert a production initiative without a hero is not selected as the lead feature.

- [ ] **Step 2: Implement one hero resolver**

Create a small local resolver or focused module returning `{src, alt, focalPosition, credit}`. Use database fields first. Permit mockup fallbacks only for deterministic demo/seed slugs. Use `unoptimized` for absolute Supabase URLs unless remote image configuration explicitly covers the current project host.

- [ ] **Step 3: Pass browser-visible tests and commit**

Run the focused public rendering tests. Expected: approved image on overview and detail, demo images unchanged.

### Task 7: Status, privacy, and advisor consistency

**Files:**
- Modify: `src/lib/ayra/status.ts`
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/lib/ayra/advisor.ts`
- Modify: `tests/ayra-status.test.ts`
- Modify: `tests/ayra-advisor.test.ts`

- [ ] **Step 1: Add failing copy assertions**

Cover specific image-validation recovery text, private-until-approved language, and advisor guidance that applicants supply the image while admins publish it.

- [ ] **Step 2: Implement direct user-side copy**

Keep storage/bucket terminology out of ordinary UI. Explain accepted formats, dimensions, rights, private review, and automatic publication after approval.

- [ ] **Step 3: Run focused tests and commit**

Run: `npm test -- --test-name-pattern="status|advisor"`

Expected: PASS.

### Task 8: Final real regression-validation block

**Files:**
- Modify only files required to repair failures found by this block.

- [ ] **Step 1: Run the complete automated block**

```bash
npm test
npm run lint
npm run build
npx playwright test tests/e2e/ayra-seeded-smoke.spec.ts tests/e2e/admin-approval-feedback.spec.ts
```

Expected: all unit/contract tests pass, ESLint exits zero, production build succeeds, and both application/admin journeys pass.

- [ ] **Step 2: Run the real browser block**

Start the app once and use the in-app browser to verify `/apply`, `/admin/applications`, `/`, and one project detail route. Exercise valid and invalid file selection, keyboard labels/focus, private preview, approval, database-backed public image, responsive layout, image loading, and console health. If live Supabase is available, use a disposable application and read back its application/initiative rows and storage visibility. Do not alter the accepted Providencia record without a real approved image from the user.

- [ ] **Step 3: Repair and rerun the same full block if needed**

Pass only if the applicant cannot submit invalid media, the admin can review and publish valid media, pending media is not public, the approved hero renders on overview/detail, the legacy remediation state is visible, and no regression/build/console failure remains.

- [ ] **Step 4: Commit final repairs and hand off**

Commit only files belonging to this feature. Report any deployment or database-migration action still required separately from code completion.

