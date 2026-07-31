# SCF Tranche 3 Acceptance Record

Updated: 2026-07-14

This record distinguishes repository completion, deployed verification, and evidence that must originate outside AYRA. A row is complete only when its listed evidence exists.

| Deliverable | Acceptance evidence | Current state |
| --- | --- | --- |
| D3.1 Mainnet deployment and hardening | Separate pubnet SDP project; funded distribution account; pinned images; MFA; kill switch; runbook; web deployment and database migration | Partially complete: isolated pubnet pre-activation stack and web/database releases are live and verified; authorized funding, tenant/TSS activation, API credentials, and AYRA DNS cutover remain |
| D3.2 First live Providencia batch | Partner-approved pubnet recipient; sponsor-funded line items; settled Horizon hashes; line-item statuses; immutable release | Blocked: production has zero verified payout addresses that exist on pubnet with Circle USDC |
| D3.3 QA and proof operations | Unit/lint/build; wrong-network, issuer, amount, destination, trustline, hash, switch, attribution, and digest failures; live HTTP/browser checks | Automated and live infrastructure/proof checks complete; mainnet settlement E2E remains blocked by the D3.1/D3.2 external gates |
| D3.4 Coordination and handoff | Versioned proof pack; mainnet runbook; rollback; next-track notes; acceptance record | Immutable historical testnet proof release v1, runbook, rollback, and acceptance record are live; final mainnet operator handoff follows activation |
| D3.5 Local field execution | Dated partner activation, local verification, approved public media, impact report, named evidence owner | Externally blocked: no genuine partner-originated field package is present |

## 2026-07-14 release evidence

- Release source commit: `e2277c6efbda018c45f221b0b4fd60c21392bdd7`
- Vercel deployment: `dpl_9ba4kB5Bep5kVfGJzS8F1xeL56iM`, `READY`, aliased to `https://transparency.ayra.haus`
- Supabase migration: `0015`; 47/47 historical batches and 11/11 payout addresses read back as `testnet`
- Hostinger project: `ayra-sdp-mainnet`; deployment action `104111319`; four containers running with Postgres healthy
- Temporary pre-activation API: `https://sdp-mainnet-api.187.124.16.6.sslip.io/health` (`200`)
- Temporary pre-activation dashboard: `https://sdp-mainnet-dashboard.187.124.16.6.sslip.io` (`200`)
- Browser acceptance: the production proof page rendered `Stellar testnet`, `Cleared`, 1/1 attribution matched, and a testnet-correct explorer link; the mainnet dashboard rendered the SDP sign-in screen
- Mainnet distribution public key: `GCOI3CSCECWMCJM5B2LFZXRWKUA5K2YCL2NE7FAB6TGOBGTGR5FTPOW4`; Horizon returns account missing, so no funding or trustline is claimed
- Immutable proof release: `https://transparency.ayra.haus/proof/5fc399e0-9628-4da6-9840-ac1c26f958ad/release?version=1`
- Proof release SHA-256: `667710fd9d405eb1ab78f59ad493e003ba44fd6ace0af30bd048856027b9587b`; independent recomputation passed
- Payment activation verifier: API/dashboard pass; distribution funding, approved recipient, and kill switch remain closed

This evidence proves a safe pre-activation deployment, not a completed mainnet disbursement or genuine field activation.

## Required release evidence

- Git commit and immutable deployment ID
- Supabase migration readback and historical testnet backfill count
- Hostinger project/container readback and logs
- DNS/TLS and API/dashboard HTTP checks
- Distribution account public key and Horizon balances (never its seed)
- Partner-approved recipient public key and Circle USDC trustline
- Mainnet batch/disbursement/payment IDs and transaction hashes
- Version 1 proof JSON, CSV, SHA-256, and database release row
- Browser screenshots of public proof and network-correct explorer link
- Named field-evidence owner and source files

## Field evidence template

For each funded activation, record:

1. initiative, milestone, sponsor, and batch reference;
2. activity date and Providencia location;
3. local partner and verifier names/roles;
4. work completed and measurable result;
5. source record IDs tied to the payment line items;
6. public media consent and original capture metadata;
7. exceptions, corrective actions, and operator approval;
8. links to the immutable proof release and Stellar pubnet transaction.

Do not backfill this section with seeded records, Codex QA media, or reconstructed testimony.
