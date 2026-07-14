# AYRA Stellar SDP Mainnet Runbook

Last reviewed: 2026-07-14

## Safety invariant

Mainnet is a new SDP instance, database, account set, and credential namespace. Never change the network variables of `ayra-sdp-testnet`, reuse its keys, or reinterpret its receipts as pubnet.

The application kill switch is `AYRA_MAINNET_PAYMENTS_ENABLED`. It defaults to `0`. Turning it on authorizes software to contact the mainnet SDP only after all other checks pass; it does not replace sponsor approval, recipient verification, funding, or operator review.

## 1. Preflight

```bash
npm test
npm run lint
npm run build
npm audit --omit=dev
npm run generate:sdp-mainnet-env
npm run verify:hostinger-sdp-mainnet-env
```

Record the release commit and deployment ID. Confirm `ayra-sdp-testnet` is healthy before touching the VPS.

## 2. DNS and TLS

Create A records for `sdp-mainnet-api.ayra.haus` and `sdp-mainnet-dashboard.ayra.haus` pointing to `187.124.16.6`. Do not change the apex, `www`, `transparency`, or the existing testnet SDP records. Verify both names resolve before deployment.

Traefik obtains certificates after the containers start. A TLS or DNS failure is a stop condition; do not substitute an unencrypted endpoint.

## 3. Distribution account funding

The generated environment prints the distribution public key only. Fund that exact pubnet account from an authorized treasury source. Minimum funding must cover:

- the account base reserve;
- the Circle USDC trustline reserve;
- the configured 5 XLM tenant bootstrap;
- the channel account and its reserve;
- a documented fee buffer.

After XLM lands, add the Circle Stellar USDC trustline for issuer `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`, then transfer the sponsor-approved USDC. Record the public transaction hashes. Never expose the distribution seed.

## 4. Deploy the isolated project

Deploy `deploy/hostinger-sdp-mainnet/docker-compose.yml` as Hostinger project `ayra-sdp-mainnet`, passing the generated `.env` through Hostinger's project environment field. The compose project pins backend `6.6.1`, frontend `6.6.0`, public Horizon, the public network passphrase, and MFA enabled.

Acceptance checks:

```bash
curl -fsS https://sdp-mainnet-api.ayra.haus/health
curl -I https://sdp-mainnet-dashboard.ayra.haus
```

Then inspect all four containers. Postgres and API must be healthy/running; frontend must be running; TSS must remain running after channel-account creation. Review logs for testnet endpoints, migration failures, unfunded-account errors, secret output, or restart loops.

Complete dashboard owner setup and MFA before creating API credentials or assets. Create the USDC asset with the exact Circle issuer and record its SDP asset UUID.

## 5. Wire the application

Add these production secrets without changing the existing testnet values:

```text
STELLAR_MAINNET_SDP_BASE_URL=https://sdp-mainnet-api.ayra.haus
STELLAR_MAINNET_SDP_CREATE_AUTHORIZATION=<secret>
STELLAR_MAINNET_SDP_START_AUTHORIZATION=<secret>
STELLAR_MAINNET_SDP_TENANT_NAME=default
STELLAR_MAINNET_SDP_ASSET_ID=<mainnet USDC asset UUID>
STELLAR_MAINNET_SDP_REGISTRATION_CONTACT_TYPE=EMAIL_AND_WALLET_ADDRESS
STELLAR_MAINNET_SDP_DASHBOARD_URL=https://sdp-mainnet-dashboard.ayra.haus
STELLAR_MAINNET_DISTRIBUTION_PUBLIC_KEY=<public G address>
```

Keep `AYRA_STELLAR_NETWORK=testnet` and `AYRA_MAINNET_PAYMENTS_ENABLED=0` during infrastructure validation. Network identity is stored per batch, so historical testnet receipts remain valid after pubnet is enabled.

## 6. Recipient gate

The local partner submits a new payout address while `AYRA_STELLAR_NETWORK=pubnet`. An admin verifies it only after Horizon proves that the account exists on pubnet and has the Circle USDC trustline. Testnet registry entries cannot satisfy this gate.

Record partner approval, recipient account, initiative, sponsor, amount, and milestone package. A copied, shared, or operator-owned QA address is not acceptable field evidence.

## 7. Final readiness and first batch

Set the verifier inputs and run:

```bash
npm run verify:sdp-mainnet -- --require-ready
```

Only after it passes:

1. set `AYRA_STELLAR_NETWORK=pubnet`;
2. set `AYRA_MAINNET_PAYMENTS_ENABLED=1`;
3. redeploy and create the approved one-line batch;
4. submit once, then sync until Horizon verifies the destination, amount, issuer, and hash;
5. reconcile every line to its source record;
6. freeze proof release version 1 and download JSON/CSV;
7. independently recompute the JSON SHA-256 and check the hash on Stellar Expert public network.

Immediately return the kill switch to `0` after the scoped first batch unless an ongoing approval explicitly authorizes further batches.

## 8. Failure injection and rollback

Before acceptance, demonstrate that each case fails closed: wrong network, disabled switch, absent account, missing trustline, wrong issuer, wrong destination, amount mismatch, invalid transaction hash, SDP unavailable, unmatched attribution, and tampered proof JSON.

On any live failure:

1. set the kill switch to `0`;
2. do not resubmit until the SDP and Horizon states are reconciled;
3. preserve database, logs, batch ID, payment ID, and transaction hash;
4. keep testnet online;
5. stop only `ayra-sdp-mainnet` if containment requires it.

## 9. Field evidence and handoff

Climate Future or the local partner must supply dated, attributable field evidence for the funded work: activation record, partner confirmation, location/date, approved public media, local verification, and impact metric. QA screenshots or operator-authored records must be labeled QA and cannot close D3.5.

For the next track, clone the operational checklist, not the accounts or database. Reverify sponsor authority, payout network, recipient trustline, line-item attribution, and evidence owner from zero.
