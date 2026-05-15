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
