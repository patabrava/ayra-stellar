# Implementation Block

Goal: Build first MVP slice from `docs/ayra-stellar-prd.md` and `docs/hrrlme.md` using mockup-defined UI/branding.

`{files, LOC/file, deps}`: app/domain/schema/test files only; target <900 LOC/file; one dev dependency `tsx` for TypeScript tests; no runtime dependency added.

Slices:
- Domain: canonical records, seed state, role approval, update moderation, payout gating, batch lifecycle, mock SDP, public projection, proof pack.
- Data contract: Supabase schema, RLS, seed data, audit log, immutable submitted line-item trigger.
- Server boundary: form actions validate inputs and write to Supabase only when service-role env plus UUID ids are present; otherwise local demo redirects.
- UI: public wall dark cinematic mockup stance; admin/steward/apply light operational mockup stance.
- Verification: `npm test`, `npm run lint`, `npm run build`, local browser check for `/`, `/admin`, `/steward`, `/apply`.

Risks:
- Live Supabase reads are not yet wired into pages; schema/actions are ready, pages use deterministic seed data for first version.
- Real Stellar SDP testnet path remains second acceptance layer after stub path.

## Batch Composer Initiative Anchor

Goal: Fix the admin batch composer so operators can see which initiative a batch belongs to before creating or submitting it.

`{files, LOC/file, deps}`: `src/app/admin/page.tsx` (+80-140 LOC), optional tiny client component if live preview is needed (+60-120 LOC), `src/lib/ayra/actions.ts` only if form wiring needs cleanup (+0-20 LOC), `deps: 0`.

Behavior:
- Replace the hidden hardcoded initiative binding in the batch composer with an explicit initiative selector or equivalent visible initiative block.
- Show the selected initiative’s name, track, code, steward, and active verified payout address in the same composer region.
- Keep `batch reference` editable, but make it clearly subordinate to the selected initiative.
- Preserve server-side destination resolution from the selected initiative; do not add a free-form destination field unless the product rule changes.
- Keep `createBatchAction()` and `submitBatchAction()` fail-closed when the selected initiative lacks a verified payout address.

Boundaries:
- UI must explain the target initiative without requiring the operator to inspect the registry section below the fold.
- Server remains source of truth for payout address selection and SDP submission.

Validation:
- Open `/admin` and confirm the composer identifies the target initiative directly in the form.
- Change the initiative selection and confirm the visible payout destination preview changes with it.
- Create a batch and confirm the resulting batch row belongs to the selected initiative.
- Submit the batch and confirm the same initiative’s verified payout address is used.

Risks:
- If multiple verified payout addresses exist for one initiative, the current server path still selects the first matching one; the UI should make the active address visible but does not yet resolve address plurality.
- If the selected initiative has no verified payout address, the create/submit path must continue to fail closed with `payout-required`.
