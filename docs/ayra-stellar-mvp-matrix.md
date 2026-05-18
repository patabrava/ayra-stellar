# AYRA Stellar MVP Scope Matrix

This matrix pins MVP scope against repo evidence and acceptance checks so deferred
items do not re-enter the closeout as accidental requirements.

| Capability | MVP status | Repo evidence | Acceptance check | Deferred notes |
| --- | --- | --- | --- | --- |
| Public transparency wall | MVP | `src/app/page.tsx`, `getPublicWallProjection` | Browser smoke loads `/`, shows approved updates, submitted/settled batches, proof link, and privacy exclusions. | Public search and advanced filters are deferred. |
| Public track switching | MVP | `getPublicWallProjection(state, trackSlug)` | Unit test proves selected track scoping and unknown slug fallback; browser smoke sees selector links. | Track selector stays simple. |
| Application intake | MVP | `src/app/apply/page.tsx`, `submitApplicationAction` | Browser smoke submits synthetic application without Supabase env and sees submitted status. | Funding approval is separate. |
| Admin approval and promotion | MVP | `approveApplication`, `approveApplicationAction` | Domain smoke proves approval, role promotion, grantee contact creation, payout address creation, and audit log. | Auto-approval is deferred. |
| Scoped steward/grantee updates | MVP | `src/app/steward/page.tsx`, `submitUpdate`, `submitUpdateAction` | Domain and browser smoke prove scoped portal and update submission surface. | Grantee contact remains scoped, not a full admin/steward bypass. |
| Moderation queue | MVP | `moderateUpdate`, `moderateUpdateAction` | Domain smoke proves pending updates stay private until approved. | Complex review workflows are deferred. |
| One verified payout address per initiative | MVP | `payoutAddresses`, `verifyPayoutAddress`, batch gating | Domain smoke proves unverified payout blocks batch creation and verified payout allows it. | Automated challenge verification and multiple addresses are deferred. |
| Manual admin batches | MVP | `createFundingBatch`, `createBatchAction` | Domain smoke proves admin-created ready batch and immutable submitted line items. | Auto-batching and steward/grantee-triggered payouts are deferred. |
| Mock SDP submit/sync | MVP | `createMockSdpGateway`, `submitBatchAction`, `syncBatchStatusAction` | `npm test` proves stable mock payment ids and transaction hashes. | Mock remains deterministic for local smoke. |
| Real SDP testnet submit/sync | MVP | `createSdpGateway`, `scripts/verify-sdp-testnet.mjs` | `npm run verify:sdp-testnet` with testnet env creates a disbursement, uploads wallet CSV, starts it, maps payment ids/status/hash. | Requires configured and funded SDP testnet instance. |
| Privacy-safe proof page | MVP | `src/app/proof/[batchId]/page.tsx`, `getProofPack` | Browser smoke loads `/proof/<seeded-batch-id>` and verifies category receipts without private recipient or receipt leakage. | Public raw/redacted receipts are deferred. |
| CSV export | MVP | `src/lib/ayra/export.ts`, admin/steward export routes | Unit test proves admin CSV may include private receipt paths while steward CSV does not. | Full reporting suite is deferred. |
| Audit log | MVP | `auditLogs`, `insertAudit`, domain audit appenders | Domain smoke verifies approval and batch transitions add audit-backed events. | Detailed audit UI is deferred. |
| Storage separation | MVP | `ayra-public-update-media`, `ayra-private-receipts` action paths | Browser smoke checks public/steward/proof surfaces omit raw private receipt paths. | Redacted public receipt downloads are deferred. |
| Seeded browser smoke | MVP | `tests/e2e/ayra-seeded-smoke.spec.ts` | `npm run test:e2e` renders public, apply, admin, steward, and proof surfaces. | Live Supabase browser regression is separate from deterministic smoke. |
| VIIO adapter | Deferred | PRD/HRRLME out-of-scope decision | No MVP acceptance check. | Revisit after AYRA canonical data flow is stable. |
| AI suggestions | Deferred | PRD/HRRLME out-of-scope decision | No MVP acceptance check. | H5 AI and reconciliation suggestions remain out of scope. |
| Advanced public search/filter | Deferred | Public wall only needs track selector | Browser smoke only expects track selector. | Add later if public volume requires it. |
| Phone registration | Deferred | SDP adapter uses email + wallet address CSV | Testnet script uses `EMAIL_AND_WALLET_ADDRESS`. | SDP supports phone paths, but AYRA v1 does not. |
| Auto-batching | Deferred | Admin batch form is manual | Domain smoke only creates manual batch. | Operator intent stays required. |
| Multiple payout addresses | Deferred | Payout address model gates one verified address per initiative | Batch submission loads one locked/verified address. | Add address rotation later. |
| Steward/grantee payout trigger | Deferred | Server actions require admin session | Browser smoke treats steward payments as read-only. | Payment authority remains centralized. |
| Public raw or redacted receipts | Deferred | Proof page excludes private receipt paths | Browser smoke checks raw receipt path is absent from public/steward/proof pages. | Admin reconciliation keeps raw paths. |
| Full reporting suite | Deferred | CSV export only | CSV routes remain the first reporting layer. | Charts and full reports can follow after MVP. |

## Acceptance Commands

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

For the real external payment proof, configure the SDP testnet variables from
`docs/ayra-stellar-sdp-testnet-runbook.md` and run:

```bash
npm run verify:sdp-testnet
```
