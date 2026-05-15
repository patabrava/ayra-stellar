# AYRA Stellar Live Supabase Handoff

## Current Branch
- `codex/ayra-supabase-live-wiring`

## What Is Working Now
- Supabase project `asndmrrortkvljjpnumr` has three MCP-applied migrations:
  - `0001_ayra_stellar_mvp`
  - `0002_seed_grantee_contact_link`
  - `0003_public_receipts_line_item_ids`
- Public wall reads live Supabase data when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.
- `/apply` can submit an anonymous public application through the browser and persist it to Supabase.
- `/admin` and `/steward` load as current operator/demo surfaces; they are not yet auth-gated live role portals.
- Deterministic domain tests and Supabase row mapping tests cover the current domain/mapping behavior.

## Verification Completed
- `npm test`: 5 tests passing.
- `npm run lint`: passing.
- `npm run build`: passing after allowing network access for `next/font` Google font fetches.
- Route smoke with local server:
  - `/` contains `21,500 USDC`.
  - `/admin` contains `Operator console`.
  - `/steward` contains `Steward portal`.
  - `/apply` contains `Apply to manage a track initiative`.
- Browser `/apply` live submission:
  - Submitted `codex-live-20260515-final@example.org`.
  - Landed on `/apply?status=submitted`.
  - Supabase readback confirmed status `pending` and initiative `Final browser verification nursery`.
- Supabase readback confirmed:
  - `tracks`: 1
  - `initiatives`: 3
  - `grantee_contacts`: 1
  - `public_batch_receipts` with line item IDs: 7

## Important Current Limit
The app has a live public data/read and anonymous application intake slice. It does not yet satisfy the full PRD/hrrlme MVP because auth, role-scoped operations, storage, and real SDP are still missing.

## Next Implementation Blocks
1. Auth and role-gated shell
   - Implement Supabase magic-link auth.
   - Resolve current profile from `auth.users`.
   - Gate `/admin` by `admin`, `/steward` by scoped `steward` or `grantee_contact`.
   - Remove hidden actor IDs from forms.
   - Add tests for role resolution and denied access.

2. Real application approval workflow
   - Promote approved applicants into profile/user role records.
   - Create steward profile, grantee, grantee contact, initiative, payout address, and starter milestones when relevant.
   - Audit every approval mutation.

3. Authenticated steward/grantee submissions
   - Submit updates from current session/profile.
   - Enforce initiative/grantee scope in server code and RLS.
   - Keep sanitized feedback visible to submitters.

4. Live batch/payment rules
   - Enforce verified payout address before `ready` or `submitted` batches at the database/server boundary.
   - Keep submitted line item immutability.
   - Move mock SDP behavior behind a server-side gateway module instead of inline action logic.

5. Stellar SDP gateway
   - Implement gateway methods for create batch, upload instructions, mark ready, sync status.
   - Persist SDP batch IDs, payment IDs, transaction hashes, and normalized sync events.
   - Add mock gateway tests first, then real Stellar testnet verification.

6. Supabase Storage and receipts
   - Create separated public update media and private receipt buckets/policies via Supabase MCP migrations.
   - Add upload route/action.
   - Ensure private receipts are admin-only and public media uses controlled access.

7. CSV export and proof route
   - Implement CSV export for operational handoff.
   - Add a dedicated proof page/route generated from canonical batch records.

8. Reconciliation/funding allocation model
   - Add missing reconciliation/funding allocation records from the PRD once the admin payment flow is auth-gated.

## Suggested Skills Next Session
- `superpowers:using-superpowers`
- `superpowers:systematic-debugging`
- `superpowers:test-driven-development`
- `superpowers:verification-before-completion`
- `playwright`
- `handoff`

## Key References
- `docs/ayra-stellar-prd.md`
- `docs/hrrlme.md`
- `agentic/canon.md`
- `agentic/plan.md`
- `src/lib/ayra/data.ts`
- `src/lib/ayra/actions.ts`
- `supabase/migrations/`
