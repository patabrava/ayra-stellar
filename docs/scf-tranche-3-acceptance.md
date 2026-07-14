# SCF Tranche 3 Acceptance Record

Updated: 2026-07-14

This record distinguishes repository completion, deployed verification, and evidence that must originate outside AYRA. A row is complete only when its listed evidence exists.

| Deliverable | Acceptance evidence | Current state |
| --- | --- | --- |
| D3.1 Mainnet deployment and hardening | Separate pubnet SDP project; funded distribution account; pinned images; MFA; kill switch; runbook; web deployment and database migration | Software/release controls implemented; live mainnet stack and funding require deployment readback |
| D3.2 First live Providencia batch | Partner-approved pubnet recipient; sponsor-funded line items; settled Horizon hashes; line-item statuses; immutable release | Blocked: production has zero verified payout addresses that exist on pubnet with Circle USDC |
| D3.3 QA and proof operations | Unit/lint/build; wrong-network, issuer, amount, destination, trustline, hash, switch, attribution, and digest failures; live HTTP/browser checks | Automated failure controls implemented; live post-deploy checks pending |
| D3.4 Coordination and handoff | Versioned proof pack; mainnet runbook; rollback; next-track notes; acceptance record | Repository artifacts implemented; production proof release pending migration/deploy |
| D3.5 Local field execution | Dated partner activation, local verification, approved public media, impact report, named evidence owner | Externally blocked: no genuine partner-originated field package is present |

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
