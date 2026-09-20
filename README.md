# Providencia Onchain AYRA x Climate Future

Providencia Onchain is the AYRA transparency and payment-rail application for
the AYRA x Climate Future programme in Providencia. The code is owned and
operated by CREADOR LABS UG (haftungsbeschränkt), which contracts and invoices
the technical work. Camilo Echeverri leads the implementation through the
[`patabrava` GitHub account](https://github.com/patabrava), with specialist
freelancers engaged by CREADOR LABS UG when needed. Camilo remains responsible
for the technical delivery and review of the funded scope. His public LinkedIn
profile is [linkedin.com/in/caem2017](https://de.linkedin.com/in/caem2017).

AYRA provides the technical platform. Climate Future sources and coordinates
projects and field activity. Marketing, go-to-market work, broad onboarding,
events, incentives, and other programme operations are outside this technical
grant and are funded separately.

## Current evidence status

The live transparency site is [transparency.ayra.haus](https://transparency.ayra.haus/).
This repository contains the award-1 application and transparency workflow,
Stellar Disbursement Platform integration, testnet verification, public proof
surfaces, and the separately gated mainnet release path.

The live deployment shows mainnet payment records from the existing project and
does not use simulated records. The SCF #46 proposal does not claim that its
new merchant-adoption gate has already been met: live merchant rollout follows
completion of the new technical development and separately funded go-to-market
execution. Mainnet release controls, recipient checks, funding, operator review
and public-proof requirements remain part of the production process.

The SCF #46 technical scope will add the wallet request and receipt flow, SDP
activation integration, COP off-ramp adapter, attribution and reconciliation,
monitoring, threat-model support, mainnet hardening, runbook, and an
integration-neutral openly licensed schema and export surface.

## Ownership and project identity

- Project: **Providencia Onchain (AYRA x Climate Future)**
- Legal entity: **CREADOR LABS UG (haftungsbeschränkt)**
- Technical lead: **Camilo Echeverri**
- Platform operator: **AYRA**
- Field and project sourcing partner: **Climate Future**
- Engineering partner paid from this grant: **CREADOR LABS UG and its named
  development work; VIIO receives nothing from this budget**
- Repository owner: **CREADOR LABS UG**

Merchant-level records remain access-controlled. Public surfaces show
aggregates and authorised programme payments only.

## What exists today

- Next.js and Supabase application for project intake, moderation, stewardship,
  grantee-linked updates, payment batching, reconciliation, and public proof.
- Stellar Disbursement Platform integration with preserved testnet history.
- Separate, disabled-by-default mainnet configuration and release runbook.
- Public proof pages and transparency surfaces at the live dashboard.
- Automated tests and verification scripts for the application and Stellar
  integration.

## What the SCF #46 technical grant will deliver

The grant is solely for development of Stellar-integrated technical components:

1. Wallet path, WhatsApp request and receipt primitive, SDP activation
   integration, and COP off-ramp adapter.
2. Attribution, reconciliation, monitoring, threat-model support, Dashboard v2
   aggregates, and a mainnet hardening/runbook package.
3. Narrow structured validation sessions with initial merchants and residents;
   broad real-user acquisition and on-island facilitation remain separately
   funded.
4. An integration-neutral schema and exports under the openly licensed
   [`schema/v1`](schema/v1/) path.

Tranche 3 is intended to be verified by onchain activity after the new mainnet
features launch: 25 active merchant accounts and at least 75 distinct payer
accounts in one 30-consecutive-day window. An active merchant account is one
registered merchant address on the transparency dashboard that receives at
least 10 qualifying onchain USDC payments of at least COP 1,000 from at least 3
distinct payer accounts during the window. One merchant equals one registered
address. Testnet payments and payments controlled by AYRA, CREADOR LABS, VIIO,
Climate Future, Camilo, or their related wallets are excluded. The COP value is
calculated at transaction time. The final SCF submission and acceptance query
are the authoritative metric definition. See
[`docs/scf-tranche-3-metric.md`](docs/scf-tranche-3-metric.md) for the current
reproducibility specification.

## German development-rate basis

The proposal uses a USD 100/hour technical implementation rate. The work is
developed in Germany by CREADOR LABS UG and is budgeted as technical
implementation time, not marketing or field operations. This rate is consistent
with current German senior and lead freelance-development ranges: freelance.de
reports a 2026 average freelancer rate of EUR 102/hour, while current German
rate references place senior developers around EUR 85–120/hour and lead or
architect work around EUR 110–150/hour. The proposal cites these German
benchmarks alongside the budget’s exact hours and deliverables.

## What is outside this grant

The following are funded separately and are not part of this repository’s SCF
technical budget:

- Marketing, go-to-market, campaigns, education, events, incentives, and broad
  merchant or resident acquisition.
- Sourcing and selecting projects, Studios, founder support, and programme
  operations.
- Live-volume provider fees and operational reporting during the field Season.
- Evidence reporting, case study, and Proof Pack production.

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

### Local and SDP setup

- Node.js 20+
- npm
- Docker Desktop running
- The sibling SDP backend repo at `../SDP/stellar-disbursement-platform-backend`
- Supabase project credentials for AYRA
- A Stellar testnet receiver wallet address for verification

Mainnet deployment is intentionally separate from local/testnet setup. See
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
