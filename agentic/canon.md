# AYRA Stellar Canon

Purpose: Next.js/Supabase MVP for initiative intake, role promotion, steward/grantee updates, admin-controlled Stellar SDP batches, and privacy-safe public transparency.

Stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase schema/RLS/storage boundary, server actions for internal mutations, mock SDP gateway first.

Canonical smoke path: `Providencia` track, `Reforestation` initiative, steward/grantee contact `Leidy Mendoza`, USDC accounting with COP snapshots, one locked Stellar payout address, submitted April batch, settled March batch, approved public updates.

Runtime rule: database is production truth; `src/lib/ayra/domain.ts` is deterministic demo/test truth until Supabase env-backed reads are wired. Browser never calls SDP or service-role Supabase directly.

Public rule: public wall shows approved updates, submitted/settled batches, category-level line items, and batch-level proofs only. It must not expose steward email, grantee contact data, raw receipts, failed payment details, or internal reconciliation notes.

Operational rule: admin mutations are server-side, audit logged, role-gated in domain tests and RLS, and batch line items are immutable after submission except payment status/ids/hash sync.
