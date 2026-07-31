# Applicant Main Image and Gallery Approval Design

## Goal

Every new initiative application must include one authentic, high-quality main project image and may include up to eight additional gallery photos. All media stays private while the application is pending. During review, the admin chooses which submitted photos are suitable for publication. When the admin approves the application, AYRA publishes the selected main image and selected gallery photos automatically.

The ownership model is: **the applicant supplies the image; the admin controls publication**.

## Current State

- `/apply` accepts proposal and contact data but no image.
- Public application submission inserts directly into `applications` through the anonymous Supabase REST API.
- Admin approval promotes an application into a track, initiative, profile, roles, grantee, and milestones.
- Homepage and project-page artwork is selected from hard-coded mockup files by initiative slug.
- The first Providencia application was approved before an image field existed.

The missing contract is therefore not just a file input. AYRA needs ordered multi-file intake, a private submission boundary, admin selection and reordering, a safe publication transition, and database-backed public rendering.

## Product Decisions

### Required main image and optional gallery

The application form requires exactly one main image and accepts up to eight optional gallery photos. Every submitted photo requires:

- concise alternative text describing what is visible
- optional photographer or source credit

The complete media set also requires one rights confirmation stating that the applicant owns every submitted image or has permission for AYRA to publish it.

The accepted source formats are JPEG, PNG, and WebP. SVG and video are excluded. Each source file may be up to 10 MB.

- The main image must be landscape and at least 2000 by 1125 pixels because it supplies the homepage and project hero.
- Gallery photos may be landscape or portrait. Each must be at least 1200 pixels on its longest side and at least 800 pixels on its shortest side.
- The complete submission is capped at nine images and 60 MB to keep a remote-island connection from producing an unbounded request.

The browser should provide immediate format, size, orientation, and dimension feedback, but the server remains the source of truth and repeats the validation.

### Admin publication control

The admin application review shows:

- a 16:9 preview of the proposed main image
- a thumbnail grid of all gallery submissions
- original filename, dimensions, alternative text, and optional credit for every photo
- rights-confirmation state
- a simple focal-position control: center, top, bottom, left, or right
- selection controls for every gallery photo
- move earlier/later controls that establish the public gallery order
- an action that promotes any submitted gallery photo to be the main image while demoting the previous main image into the gallery

Approval is blocked if the main image is missing, invalid, unselected, or cannot be promoted to public storage. Gallery photos are optional, and the admin may exclude unsuitable photos without rejecting the whole proposal. The admin can replace media before approval. The same add, replace, remove, reorder, and main-image controls remain available after approval.

### No pre-approval publication

Pending application media is never served from a public bucket and never appears in public state. Approval is the publication boundary.

## Data Model

Add `hero_image_rights_confirmed` to `applications`, false by default for legacy rows.

Add `application_media`, readable only by admins, with:

- `id`, `application_id`, and generated private `storage_path`
- `role` constrained to `main` or `gallery`
- original name, MIME type, width, and height
- required alternative text and optional credit
- `selected_for_public`, default true
- `sort_order`
- focal position constrained to center, top, bottom, left, or right
- timestamps

A partial unique index enforces exactly zero or one `main` row per application at the database level. The server requires exactly one before accepting a new submission.

Add `initiative_media`, publicly readable only when its parent initiative is public, with:

- `id`, `initiative_id`, and public `storage_path`
- `role` constrained to `main` or `gallery`
- alternative text, optional credit, width, height, focal position, and `sort_order`
- timestamps

A partial unique index enforces one public `main` row per initiative. Normalized media rows are necessary now that selection and ordering apply to multiple photos. Private application storage paths never appear in public queries.

## Storage and Security

Create two storage buckets:

1. `ayra-private-application-media`
   - private
   - JPEG, PNG, and WebP only
   - 10 MB object limit
   - readable and manageable only by admins through RLS

2. `ayra-public-initiative-media`
   - public read
   - uploads, replacements, and deletes restricted to admins

The public application action performs private upload through a narrow server-side privileged path after validating the complete form. Anonymous users do not receive general storage write permission and cannot choose storage object paths.

Object paths use generated application identifiers and sanitized extensions, not applicant names or email addresses. Logs and audit summaries never include the private image URL or applicant contact details.

## Application Submission Flow

1. The applicant completes the proposal, selects one main image and up to eight gallery photos, writes alternative text for each, optionally adds credits, orders the gallery, and confirms publication rights for the complete set.
2. Client-side validation gives immediate feedback for unsupported type, excessive size, insufficient dimensions, a non-landscape main image, too many gallery photos, or an excessive combined payload.
3. The server validates the proposal fields, file bytes/type, size, dimensions, alternative text, and rights confirmation.
4. The server creates an application identifier and media identifiers and uploads all validated files to private generated paths.
5. The application and ordered `application_media` rows are inserted with their validated metadata.
6. If any upload or database write fails, the server removes every private object created by the attempt and removes the incomplete application/media rows before returning an error.
7. A successful submission remains `pending`; no public initiative or public media object exists yet.

This replaces the current anonymous REST-only insert with a server-controlled submission operation, because a private file and database row must be handled as one workflow.

## Approval and Publication Flow

1. The admin reviews the pending application, main preview, and gallery grid through short-lived signed URLs.
2. The admin may exclude gallery photos, reorder them, promote one to main, change focal position, or upload replacements.
3. On approval, the server rechecks that the application is pending and has valid, rights-confirmed media.
4. The server copies the selected main image and selected gallery photos to stable initiative-scoped public object paths.
5. Application promotion creates or updates the initiative and its ordered `initiative_media` rows with public paths and presentation metadata.
6. Only after successful media publication and initiative promotion does the application become `approved`.
7. The approval audit entry records the application ID, initiative ID, published media IDs/count, and actor, but not private applicant data.
8. Homepage and project-page caches are revalidated.

If any public upload or promotion step fails, the application stays pending and the admin receives a recoverable error. Every public object created by the failed attempt is removed, while previously published initiative media remains unchanged. The workflow must be idempotent so retrying approval does not create duplicate media, grantees, roles, or milestones.

## Public Rendering

The public projection includes an ordered `initiativeMedia` collection with role, URL, alternative text, credit, dimensions, focal position, and sort order.

- The homepage lead image and initiative cards use the initiative's database-backed hero.
- The project detail page uses the same main image and renders selected gallery photos beneath the project dossier in approved order.
- Gallery thumbnails open an accessible native dialog/lightbox with previous, next, close, keyboard arrow, Escape, and visible-focus behavior.
- The gallery adapts from one column on narrow screens to two or three columns when space permits without forcing uniform crops on portrait photos.
- Next Image continues to provide responsive delivery and optimization from the approved high-resolution source.
- Alternative text comes from the approved application metadata.
- Credit is shown unobtrusively on the project detail page when present.
- The stored focal position maps to CSS `object-position` so the important subject remains visible without destructive cropping.

Hard-coded mockup images may remain only as a compatibility fallback for seeded demo initiatives. A production initiative created from the new application flow must never be featured publicly without an approved hero.

## Existing First Project

The already-approved Providencia application has no media because it predates this feature. The admin UI exposes an explicit `Add project media` action for its promoted initiative, requiring a main image and permitting up to eight gallery photos.

Until an admin uploads and publishes that hero:

- the initiative remains available in the operator system
- it is not selected as the homepage featured project
- the admin sees a clear `Hero image required` state

Once the admin upload succeeds, `initiative_media` is populated and the project becomes eligible for homepage display without requiring the application to be recreated or re-approved.

## Rejection and Replacement

- Rejecting a pending application keeps its private media for 30 days for dispute/review recovery, after which a cleanup operation may delete it.
- Private media is never promoted for a rejected application.
- Replacing pending media deletes superseded private objects only after replacements are safely stored and linked.
- Replacing approved media publishes the complete new selected media set first, replaces the initiative media rows second, and removes superseded public objects last.
- Deletion/retention cleanup is operational maintenance and may be implemented as a follow-up if no scheduler exists; it must not weaken the publication boundary.

## Accessibility, Consent, and Quality

- The file input has visible instructions and error text associated through accessible descriptions.
- Alternative text is required per photo and has a 240-character limit.
- The rights confirmation explicitly mentions public homepage and project-page use.
- Applicant guidance asks for authentic field photography, good daylight, a clear subject, and no text overlays or logos.
- The guidance warns against identifiable children or vulnerable people unless appropriate consent has been obtained.
- Admin main preview uses the same 16:9 frame and focal position as the homepage; gallery previews preserve each photo's natural aspect ratio.

## Error and Status Handling

Add specific recoverable statuses for:

- missing image
- too many gallery images
- total submission too large
- unsupported image type
- file too large
- dimensions too small
- rights confirmation missing
- private upload failure
- public promotion failure
- legacy initiative missing a hero

Messages tell the applicant or admin what must change. Generic storage or database details are not exposed to the browser.

## Validation Strategy

### Unit and contract tests

- application schema requires per-image alt text and rights confirmation
- file validation distinguishes main and gallery dimension rules and enforces per-file, count, and total-size limits
- public application submission writes ordered private media metadata and rolls back every object/row on partial failure
- data mappers include ordered initiative media but do not expose application private paths publicly
- approval refuses missing media and stays pending on promotion failure
- approval copies only admin-selected media once, writes stable ordering, and is safe to retry
- main/gallery role switching preserves exactly one main row
- replacement order preserves the previously published main image and gallery when a new upload fails

### Browser regression

- applicant cannot submit without a valid image and rights confirmation
- applicant can preview, describe, reorder, and submit one valid main image with optional gallery photos
- admin can see private previews, exclude/reorder gallery photos, promote a gallery photo to main, and set focal position
- approval publishes only the chosen photos and removes the item from the pending queue
- the approved main image appears on homepage and detail page, while selected gallery photos appear only on the detail page in admin order
- gallery dialog works with mouse, keyboard arrows, Escape, and visible focus across desktop and mobile widths
- an admin can add main and gallery media to the already-approved legacy initiative
- rejected, pending, and admin-excluded images cannot be fetched publicly

### Database and storage verification

- migration applies cleanly to existing mainnet data
- RLS prevents anonymous reads of private application media
- RLS prevents non-admin writes to the public initiative bucket
- approved initiative media contains public paths and no private application path

## Acceptance Criteria

- Every newly submitted application requires one valid main image and its alternative text, may include up to eight valid gallery photos with individual alternative text, and requires publication-rights confirmation for the whole set.
- Pending and rejected application media is not public.
- Admin sees the real image before deciding.
- A pending application cannot become approved unless exactly one selected main image is successfully published.
- Approval automatically makes the main image available to the homepage and project page and selected gallery photos available to the project gallery.
- Admin selection, role switching, exclusion, and ordering determine the exact public media set.
- The already-approved first project has an admin remediation path and is not publicly featured without a real hero.
- Admin can safely add, replace, remove, reorder, or change the main image later.
- Existing seeded demo initiatives remain usable through an explicit compatibility fallback.
- Tests prove the end-to-end intake, review, approval, publication, replacement, and privacy boundaries.

## Scope Boundary

This first implementation intentionally does not include:

- video hero media
- applicant accounts or post-submission editing
- a freeform crop editor
- automatic AI image generation or enhancement
- public access to pending application media
- mandatory photographer credit when the applicant owns the image

Those capabilities can be added later without changing the core applicant-supplies/admin-publishes contract.

## Implementation Surfaces

The implementation will touch:

- a Supabase migration for the application rights field, normalized media tables, buckets, constraints, and policies
- application intake validation and the `/apply` form
- a server-side application submission/storage adapter
- admin application review, main/gallery previews, selection, ordering, role switching, focal position, approval, and replacement actions
- application promotion and rollback behavior
- AYRA domain/data row types and mappers
- homepage main-image selection and accessible project gallery
- status copy, privacy copy, and advisor application guidance
- unit, contract, database-policy, and Playwright regression coverage
