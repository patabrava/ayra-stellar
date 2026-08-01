# SCF Tranche 3 Acceptance Record

Updated: 2026-08-01

This record distinguishes repository completion, deployed verification, and evidence that must originate outside AYRA. A row is complete only when its listed evidence exists.

| Deliverable | Acceptance evidence | Current state |
| --- | --- | --- |
| D3.1 Mainnet deployment and hardening | Separate pubnet SDP project; funded distribution account; pinned images; MFA; kill switch; runbook; web deployment and database migration | Complete for controlled validation: SDP API/dashboard, TSS settlement, Circle trustline, API credentials, admin treasury, and public deployment were exercised live; the kill switch is closed after settlement |
| D3.2 First live Providencia batch | Partner-approved pubnet recipient; sponsor-funded line items; settled Horizon hashes; line-item statuses; immutable release | Complete for the 5 USDC validation scope: verified recipient and memo, settled pubnet payment, matched attribution, CSV, and immutable release v3; this does not represent the full EUR 750 A00 advance |
| D3.3 QA and proof operations | Unit/lint/build; wrong-network, issuer, amount, destination, trustline, hash, switch, attribution, and digest failures; live HTTP/browser checks | Complete: 161 automated tests, lint, production build, live admin/public browser checks, independent Horizon readback, and independent release-digest verification passed |
| D3.4 Coordination and handoff | Versioned proof pack; mainnet runbook; rollback; next-track notes; acceptance record | Complete for the validation release: mainnet proof v3, CSV, transaction/operation JSON, screenshots, runbook, rollback, and evidence manifest are present |
| D3.5 Local field execution | Dated partner activation, local verification, approved public media, impact report, named evidence owner | Partially complete: a shop-construction photo and caption are approved and visible publicly; signed agreements, private receipt, media consent/capture metadata, and a named evidence owner are not present in the workspace |

## 2026-08-01 live mainnet validation evidence

- Batch: `A00-LUZMARINA-VALIDATION-20260801`; batch ID `b1cbe779-4aa2-4deb-b6a5-fb79ca15e0b6`
- Payment: `5 USDC validation payment`; amount `5.0000000 USDC`; local snapshot `COP 16,003`
- Recipient: `GB5CLRWUCBQ6DFK2LR5ZMWJ7QCVEB3XKMPTQUYCDIYB4DRZJBEW6M26D`; memo ID `4192883277`
- Circle issuer: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
- SDP disbursement: `4be3df92-c802-4c6e-9189-34681e6c7dfa`; SDP payment: `7a2240ad-16dd-4436-8832-c32441f242f7`
- Successful Stellar transaction: `00ab066acacd36efeac21ab73ecd0f8cb47c7d26a8d47889deb6c2c3ae7d6fb8`; ledger `63741286`; `2026-08-01T00:21:14Z`
- [Public proof](https://transparency.ayra.haus/proof/b1cbe779-4aa2-4deb-b6a5-fb79ca15e0b6)
- [Proof CSV](https://transparency.ayra.haus/proof/b1cbe779-4aa2-4deb-b6a5-fb79ca15e0b6/export)
- [Immutable release v3](https://transparency.ayra.haus/proof/b1cbe779-4aa2-4deb-b6a5-fb79ca15e0b6/release?version=3)
- Release SHA-256: `0ce1c2c1250688dd389ca9be83e909804c418a9c15bb93f98ff2c28382581771`; independent canonical recomputation matched the stored database value
- Application commit: `1d42a8b0285ffe3374ac89b0102fc8cb50ac4d60`; production deployment `dpl_3hPTTb27cLZ1wwbRXjnsMZXgNqie`
- Live safety readback after settlement: `0.4852200 USDC`, `26.9040705 XLM`, Circle trustline ready, recipient ready, SDP endpoints `200`, and mainnet submissions disabled
- Approved public field evidence: shop and nursery structure construction photo with privacy-safe caption and alt text
- Evidence bundle: `outputs/scf-tranche-3-2026-08-01/`

The recipient is a hosted deposit address. Horizon records the inbound 5 USDC payment with the requested memo, followed 50 seconds later by an automatic 5 USDC forwarding payment from the destination address. Hosted-wallet ledger credit must be confirmed by the recipient account holder.

The admin reconciliation item remains `needs_receipt` because no genuine private receipt was supplied. The signed grant agreement, signed property-use agreement, and media consent/capture metadata are also absent from the workspace. These records must be added before claiming that the proposal's full A00 condition and full EUR 750 / COP 2.85m advance are complete.

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
