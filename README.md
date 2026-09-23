# Providencia Payment Rails on Stellar

Providencia Onchain is the AYRA transparency and payment-rail application for
Providencia, a Colombian Caribbean island. The code is owned and operated by
CREADOR LABS UG (haftungsbeschränkt), Germany, which builds and operates AYRA
and is the award recipient and contracting entity for the SCF Build Awards.
Camilo Echeverri, CTO, leads and builds the implementation through the
[`patabrava` GitHub account](https://github.com/patabrava). His LinkedIn
profile is [linkedin.com/in/caem2017](https://de.linkedin.com/in/caem2017).
If a specialist contributor is added, they commit under their own GitHub
account and are named in the tranche report.

Climate Future e.V. runs the field program on the island with AYRA (local
relationships, merchant visits, training). VIIO supports ground operations in
Colombia. Neither has an engineering role and neither is paid from the SCF
technical budget.

## What exists today (SCF #42, Integration Track, completed August 2026)

- A Stellar Disbursement Platform (SDP) instance in production, with its
  distribution account on mainnet.
- The public transparency dashboard at
  [transparency.ayra.haus](https://transparency.ayra.haus/). Each published
  disbursement links to its transaction on Stellar Expert.
- Reconciliation keyed by transaction hash, joining each payment to its
  project, milestone and tranche, and a versioned proof export with a SHA-256
  checksum (see [`schema/v1`](schema/v1/)).
- CI/CD with tagged releases, automated tests and verification scripts for the
  application and the Stellar integration.
- The first mainnet disbursement, and the only one so far: a 5 USDC
  validation payment to the first incubated project on 31 July 2026
  ([transaction](https://stellar.expert/explorer/public/tx/00ab066acacd36efeac21ab73ecd0f8cb47c7d26a8d47889deb6c2c3ae7d6fb8)).

The live deployment shows mainnet records only and uses no simulated records.
No merchant payments or merchant network exist yet; that is what the SCF #46
scope builds and what its Tranche 3 metric measures.

## What the SCF #46 scope adds (Integration Track, resubmission of SCF #45)

The grant funds Stellar-integrated development only, 400 hours in three
tranches:

1. SDP embedded wallet for residents, Stellar Wallets Kit for merchants, SDP
   activation disbursements, the WhatsApp request and receipt flow, the COP
   exit port, and CI/CD for the new services.
2. COP withdrawal hardening, the merchant registry, attribution and
   reconciliation, the monitoring plan and threat model, an end-to-end
   testnet run with failure injection, and validation sessions on testnet.
3. Mainnet deployment and runbook, the onchain reconciliation views and
   Tranche 3 metric (Dashboard v2), merchant production enablement, mainnet
   QA, mainnet validation sessions, and the acceptance query, schema and
   evidence bundle.

AYRA never holds user funds, COP or cash. Nothing in the flow signs or
approves a payment automatically.

### Tranche 3 onchain metric

- Metric: active merchant accounts on Stellar mainnet, with floors on distinct payers and on volume.
- Threshold: at least 25 active merchants, at least 75 distinct payer accounts, and at least 1,000 USDC of qualifying payment volume.
- Window: any 30 consecutive days after the new features go live on mainnet, ending before the Tranche 3 submission.
- Active merchant: a merchant in the registry whose registered Stellar address receives at least 10 qualifying payments from at least 3 distinct payer accounts on at least 5 different days in the window. One merchant counts once, even if their registered address changes during the window.
- Qualifying payment: a mainnet USDC (Circle) payment to a registered merchant address, worth at least COP 5,000 at the time of the transaction.
- Excluded: payments from registered merchants or from accounts controlled by CREADOR LABS, AYRA, VIIO, Climate Future or team members; SDP disbursements; testnet activity; self-payments; and repeated round trips between the same two accounts.
- Verification: the acceptance query in the repository runs against Horizon or Stellar RPC and reproduces the result. We share the registered merchant addresses and the addresses controlled by the team and partners with SCF reviewers privately; the public dashboard shows the aggregate counts.
- Where payer USDC comes from: separately funded activation balances through SDP, residents' and visitors' own USDC, or provider on-ramps. None of it comes from this budget, and the disbursements themselves never count.
- Scale: 25 merchants is about 5% of the more than 500 businesses in our island catalogue.

The metric text is identical in the SCF submission, in the technical
architecture document (section 9.2) and in
[`docs/scf-tranche-3-metric.md`](docs/scf-tranche-3-metric.md).

## Rate basis

The budget uses USD 100 per hour for technical implementation. The work is
done in Germany, where the 2026 freelance.de study (more than 3,300
respondents) reports an average IT freelancer rate of EUR 101.98 per hour
([source](https://www.freelance.de/blog/freelancer-studie-2026-alle-ergebnisse-der-neuen-studie-auf-einen-blick/)).
Every budgeted hour is implementation or validation work tied to a named
deliverable.

## What is outside this grant

Funded separately and not part of this repository's SCF technical budget:
merchant recruitment, marketing, events, incentives, activation balances,
field staff and field operations, and the case study film and editorial work.

## License

The repository is licensed under the Apache License 2.0 (see
[`LICENSE`](LICENSE)). The reusable schema lives under
[`schema/v1`](schema/v1/).

## Development setup

### Requirements

- Node.js 20+
- npm
- Docker Desktop
- The sibling SDP backend repository at
  `../SDP/stellar-disbursement-platform-backend`
- Supabase project credentials for AYRA
- A Stellar testnet receiver wallet address for verification

Mainnet deployment is intentionally separate from local and testnet setup. See
[`docs/ayra-stellar-sdp-mainnet-runbook.md`](docs/ayra-stellar-sdp-mainnet-runbook.md)
before provisioning or funding the public-network rail.

## 1. Start the SDP Docker stack

Keep Docker Desktop open for the whole session. AYRA talks to the local SDP
backend while you work, so the container must stay up.

From the SDP repo:

```bash
cd ../SDP/stellar-disbursement-platform-backend
make setup
```

On the first run, use the SDP wizard to choose:

- testnet
- single tenant
- generated accounts
- local environment
- tenant and user initialization

If the stack is already initialized, you can bring up the local services with:

```bash
docker compose -p sdp --env-file dev/.env.default \
  -f dev/docker-compose-sdp.yml \
  -f dev/docker-compose-tss.yml \
  -f dev/docker-compose-frontend.yml \
  -f dev/docker-compose-ayra-local.yml \
  up -d --no-build db sdp-api sdp-tss sdp-frontend
```

Leave that stack running while you use AYRA.

## 2. Configure AYRA

Copy `.env.example` to `.env` if you need a fresh local file, then fill in the
real values for your workspace.

Use these settings for the testnet flow:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AYRA_SDP_MODE=testnet
AYRA_STELLAR_NETWORK=testnet
AYRA_MAINNET_PAYMENTS_ENABLED=0
STELLAR_SDP_BASE_URL=http://localhost:8000
STELLAR_SDP_CREATE_AUTHORIZATION=SDP_<id>.<secret>
STELLAR_SDP_START_AUTHORIZATION=SDP_<id>.<secret-or-same-if-allowed>
STELLAR_SDP_TENANT_NAME=default
STELLAR_SDP_ASSET_ID=<testnet-asset-id-from-sdp>
STELLAR_SDP_REGISTRATION_CONTACT_TYPE=EMAIL_AND_WALLET_ADDRESS
STELLAR_SDP_TEST_RECEIVER_EMAIL=ayra-sdp-smoke@example.org
STELLAR_SDP_TEST_WALLET_ADDRESS=<receiver-stellar-public-key>
STELLAR_SDP_TEST_WALLET_ADDRESS_MEMO=
STELLAR_SDP_TEST_AMOUNT_USDC=1
STELLAR_SDP_SYNC_ATTEMPTS=12
STELLAR_SDP_SYNC_DELAY_MS=10000
```

Notes:

- `AYRA_SDP_MODE=testnet` is required for the live SDP flow.
- `AYRA_STELLAR_NETWORK=testnet` preserves the default development and current
  production rail. Pubnet batches use separate SDP credentials and remain
  disabled unless every mainnet release gate passes.
- `STELLAR_SDP_CREATE_AUTHORIZATION` and `STELLAR_SDP_START_AUTHORIZATION`
  must match the authorization format required by your local SDP instance.
- The local verifier expects a real Stellar testnet wallet address.

## 3. Install and run AYRA

From this repo:

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js. By default it is
`http://localhost:3000`, but if that port is already in use Next.js may
choose another local port such as `http://localhost:3201`.

## 4. What to test

- Public wall: `/`
- Application intake: `/apply`
- Admin console: `/admin`
- Steward portal: `/steward`
- Public proof page: `/proof/[batchId]`
- Project detail page: `/projects/[trackSlug]/[initiativeSlug]`

The end-to-end testnet flow is:

1. Submit a public application.
2. Approve the application in the admin console.
3. Sign in as a steward and submit a payout address.
4. Verify the payout address in the admin console.
5. Create and submit a batch.
6. Sync the batch until the payment settles.
7. Open the public proof page and confirm the settled receipt.

## 5. Optional checks

```bash
npm test
npm run lint
npm run build
npm run verify:sdp-testnet
npm run verify:sdp-mainnet
```

## Troubleshooting

- If SDP requests fail, confirm Docker Desktop is still running and the SDP
  stack is up.
- If you see `AYRA_SDP_MODE` errors, the app is still on mock mode.
- If the verifier fails with 401/403, the SDP authorization value or tenant
  name is wrong.
- If sync never settles, keep the SDP stack running and retry after the TSS job
  has advanced on testnet.
