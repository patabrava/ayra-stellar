# AYRA Stellar

AYRA Stellar is a Next.js + Supabase app for managing the reforestation track
workflow. This repo is configured to run against the Stellar Disbursement
Platform with preserved testnet history and a separately gated Stellar public
network rail.

## What you need

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
