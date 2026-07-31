# AYRA Hostinger SDP Mainnet

This folder defines a second, isolated Stellar Disbursement Platform project for pubnet. It does not replace or reuse `ayra-sdp-testnet`.

## Hosts

- Intended API: `https://sdp-mainnet-api.ayra.haus`
- Intended dashboard: `https://sdp-mainnet-dashboard.ayra.haus`
- Transparency app: `https://transparency.ayra.haus`

The 2026-07-14 pre-activation deployment uses temporary TLS endpoints because the available Vercel role cannot edit the authoritative AYRA DNS zone:

- API: `https://sdp-mainnet-api.187.124.16.6.sslip.io`
- Dashboard: `https://sdp-mainnet-dashboard.187.124.16.6.sslip.io`

These endpoints are for infrastructure validation only. Replace them with the intended AYRA records before payment activation.

Postgres, metrics, admin, and TSS ports are internal. Traefik exposes only API port 8000 and dashboard port 80 over TLS.

## Release pins

- SDP backend/TSS: `6.6.1`
- SDP frontend: `6.6.0`
- Postgres: `14-alpine`

Update these deliberately after testnet validation; never deploy `latest` or `edge` to the mainnet project.

## Local preparation

```bash
npm run generate:sdp-mainnet-env
npm run verify:hostinger-sdp-mainnet-env
docker compose --env-file deploy/hostinger-sdp-mainnet/.env \
  -f deploy/hostinger-sdp-mainnet/docker-compose.yml config >/tmp/ayra-sdp-mainnet.yml
```

The generated `.env` and rendered compose contain private keys. They are gitignored, must remain mode `0600`, and must not be pasted into issues, logs, or chat.

## Activation boundary

Creating the project is not payment authorization. Keep `AYRA_MAINNET_PAYMENTS_ENABLED=0` until all of these are true:

1. the separate distribution account exists on pubnet and has enough XLM for reserves, bootstrap, channels, and fees;
2. the distribution account has the Circle Stellar USDC trustline and sponsor-funded USDC;
3. a partner-approved Providencia recipient exists on pubnet with the same trustline;
4. API, dashboard, TSS, MFA, and database-isolation checks pass;
5. the line items and sponsor authorization are approved.

Use `npm run verify:sdp-mainnet -- --require-ready` for the final non-spending readiness gate.

An unfunded distribution account leaves the API in observable pre-activation mode and the TSS waiting for funding. This is expected. Restart the project after authorized funding so the default tenant, trustline, and channel account are provisioned before creating API credentials.

## Rollback

1. Set `AYRA_MAINNET_PAYMENTS_ENABLED=0` and redeploy the web app.
2. Stop `ayra-sdp-mainnet`; do not stop `ayra-sdp-testnet`.
3. Preserve the mainnet Postgres volume and proof records for investigation.
4. Restore service only after the failed gate is corrected and the readiness verifier passes.
