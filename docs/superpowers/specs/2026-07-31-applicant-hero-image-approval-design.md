# Applicant Hero Image Approval Design

## Goal

Every new initiative application must include one authentic, high-quality project image. The image stays private while the application is pending. When an admin approves the application, AYRA publishes that image as the initiative's hero image and uses it automatically on the public homepage and project detail page.

The ownership model is: **the applicant supplies the image; the admin controls publication**.

## Current State

- `/apply` accepts proposal and contact data but no image.
- Public application submission inserts directly into `applications` through the anonymous Supabase REST API.
- Admin approval promotes an application into a track, initiative, profile, roles, grantee, and milestones.
- Homepage and project-page artwork is selected from hard-coded mockup files by initiative slug.
- The first Providencia application was approved before an image field existed.

The missing contract is therefore not just a file input. AYRA needs a private submission boundary, an admin preview, a safe publication transition, and database-backed public rendering.

## Product Decisions

### Required applicant image

The application form requires exactly one hero image plus:

- concise alternative text describing what is visible
- optional photographer or source credit
- a required rights confirmation stating that the applicant owns the image or has permission for AYRA to publish it

The accepted source formats are JPEG, PNG, and WebP. SVG and video are excluded from this flow. The maximum source file size is 10 MB. The source image must be landscape and at least 2000 by 1125 pixels so it remains useful for the homepage, project page, and responsive derivatives.

The browser should provide immediate format, size, orientation, and dimension feedback, but the server remains the source of truth and repeats the validation.

### Admin publication control

The admin application queue shows:

- a 16:9 preview
- original filename and dimensions
- alternative text
- credit, when supplied
- rights-confirmation state
- a simple focal-position control: center, top, bottom, left, or right

Approval is blocked if the image is missing, invalid, or cannot be promoted to public storage. The admin can reject the proposal or replace the image before approval. The same admin replacement control remains available after approval so the public hero can be corrected without changing the application decision.

### No pre-approval publication

Pending application media is never served from a public bucket and never appears in public state. Approval is the publication boundary.

## Data Model

Add nullable media fields to `applications` so existing rows can migrate safely:

- `hero_image_path` — private storage object path
- `hero_image_original_name`
- `hero_image_mime_type`
- `hero_image_width`
- `hero_image_height`
- `hero_image_alt`
- `hero_image_credit`
- `hero_image_rights_confirmed` — boolean, false by default for legacy rows
- `hero_image_focal_position` — constrained to center, top, bottom, left, or right; center by default

Add public presentation fields to `initiatives`:

- `hero_image_url`
- `hero_image_alt`
- `hero_image_credit`
- `hero_image_focal_position`

One image per application and one current hero per initiative make explicit columns simpler than introducing reusable media entities. The private application path is not copied into public initiative queries.

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

1. The applicant completes the proposal, selects one image, writes alternative text, optionally adds credit, and confirms publication rights.
2. Client-side validation gives immediate feedback for unsupported type, excessive size, insufficient dimensions, or portrait orientation.
3. The server validates the proposal fields, file bytes/type, size, dimensions, alternative text, and rights confirmation.
4. The server creates an application identifier and uploads the image to the private bucket under that identifier.
5. The application row is inserted with the private path and validated metadata.
6. If the database insert fails, the server deletes the uploaded private object before returning an error.
7. A successful submission remains `pending`; no public initiative or public media object exists yet.

This replaces the current anonymous REST-only insert with a server-controlled submission operation, because a private file and database row must be handled as one workflow.

## Approval and Publication Flow

1. The admin reviews the pending application and its private image preview.
2. The admin optionally changes the focal position or uploads a replacement.
3. On approval, the server rechecks that the application is pending and has valid, rights-confirmed media.
4. The server copies the approved image bytes to the public initiative bucket using a stable initiative-scoped object path.
5. Application promotion creates or updates the initiative with the resulting public URL, alternative text, credit, and focal position.
6. Only after successful media publication and initiative promotion does the application become `approved`.
7. The approval audit entry records the application ID, initiative ID, public hero object path, and actor, but not private applicant data.
8. Homepage and project-page caches are revalidated.

If public upload or promotion fails, the application stays pending and the admin receives a recoverable error. Any newly created public object is removed when the remaining approval steps fail. The workflow must be idempotent so retrying approval does not create duplicate public objects, grantees, roles, or milestones.

## Public Rendering

The public initiative projection includes `heroImageUrl`, `heroImageAlt`, `heroImageCredit`, and `heroImageFocalPosition`.

- The homepage lead image and initiative cards use the initiative's database-backed hero.
- The project detail page uses the same hero metadata.
- Next Image continues to provide responsive delivery and optimization from the approved high-resolution source.
- Alternative text comes from the approved application metadata.
- Credit is shown unobtrusively on the project detail page when present.
- The stored focal position maps to CSS `object-position` so the important subject remains visible without destructive cropping.

Hard-coded mockup images may remain only as a compatibility fallback for seeded demo initiatives. A production initiative created from the new application flow must never be featured publicly without an approved hero.

## Existing First Project

The already-approved Providencia application has no private hero because it predates this feature. The migration keeps its fields nullable, and the admin UI exposes an explicit `Add project hero` action for its promoted initiative.

Until an admin uploads and publishes that hero:

- the initiative remains available in the operator system
- it is not selected as the homepage featured project
- the admin sees a clear `Hero image required` state

Once the admin upload succeeds, the same initiative hero fields are populated and the project becomes eligible for homepage display without requiring the application to be recreated or re-approved.

## Rejection and Replacement

- Rejecting a pending application keeps its private image for 30 days for dispute/review recovery, after which a cleanup operation may delete it.
- Private media is never promoted for a rejected application.
- Replacing a pending image deletes the superseded private object after the replacement is safely stored and linked.
- Replacing an approved initiative hero publishes the new object first, updates the initiative second, and removes the previous public object last.
- Deletion/retention cleanup is operational maintenance and may be implemented as a follow-up if no scheduler exists; it must not weaken the publication boundary.

## Accessibility, Consent, and Quality

- The file input has visible instructions and error text associated through accessible descriptions.
- Alternative text is required and has a practical length limit.
- The rights confirmation explicitly mentions public homepage and project-page use.
- Applicant guidance asks for authentic field photography, good daylight, a clear subject, and no text overlays or logos.
- The guidance warns against identifiable children or vulnerable people unless appropriate consent has been obtained.
- Admin preview uses the same 16:9 frame and focal position as the homepage.

## Error and Status Handling

Add specific recoverable statuses for:

- missing image
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

- application schema requires alt text and rights confirmation
- file validation accepts only allowed type, size, landscape orientation, and minimum dimensions
- public application submission writes the expected private metadata and rolls back on row failure
- data mappers include initiative hero fields but do not expose application private paths publicly
- approval refuses missing media and stays pending on promotion failure
- approval copies media once, writes hero metadata, and is safe to retry
- replacement order preserves the previously published hero when a new upload fails

### Browser regression

- applicant cannot submit without a valid image and rights confirmation
- applicant can preview and successfully submit a valid image
- admin can see the private preview and focal position
- approval publishes the image and removes the item from the pending queue
- the approved image appears on both the homepage and project detail page with the submitted alternative text
- an admin can add a hero to the already-approved legacy initiative
- rejected or pending images cannot be fetched publicly

### Database and storage verification

- migration applies cleanly to existing mainnet data
- RLS prevents anonymous reads of private application media
- RLS prevents non-admin writes to the public initiative bucket
- approved initiative row contains the public hero URL and no private path

## Acceptance Criteria

- Every newly submitted application requires one valid project image, alternative text, and publication-rights confirmation.
- Pending and rejected application media is not public.
- Admin sees the real image before deciding.
- A pending application cannot become approved unless its hero is successfully published.
- Approval automatically makes the image available to the homepage and project page.
- The already-approved first project has an admin remediation path and is not publicly featured without a real hero.
- Admin can safely replace a hero later.
- Existing seeded demo initiatives remain usable through an explicit compatibility fallback.
- Tests prove the end-to-end intake, review, approval, publication, replacement, and privacy boundaries.

## Scope Boundary

This first implementation intentionally does not include:

- a multi-image gallery
- video hero media
- applicant accounts or post-submission editing
- a freeform crop editor
- automatic AI image generation or enhancement
- public access to pending application media
- mandatory photographer credit when the applicant owns the image

Those capabilities can be added later without changing the core applicant-supplies/admin-publishes contract.

## Implementation Surfaces

The implementation will touch:

- a Supabase migration for application/initiative columns, buckets, constraints, and policies
- application intake validation and the `/apply` form
- a server-side application submission/storage adapter
- admin application review, hero preview, focal position, approval, and replacement actions
- application promotion and rollback behavior
- AYRA domain/data row types and mappers
- homepage and project detail image selection
- status copy, privacy copy, and advisor application guidance
- unit, contract, database-policy, and Playwright regression coverage

