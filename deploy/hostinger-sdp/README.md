# AYRA Hostinger SDP Testnet

This folder defines the public Hostinger Docker Compose deployment for the AYRA Stellar SDP testnet instance.

## Hosts

- API: `https://sdp-api.ayra.haus`
- Dashboard: `https://sdp-dashboard.ayra.haus`
- AYRA app: `https://transparency.ayra.haus`

Do not move `ayra.haus`, `www.ayra.haus`, or `transparency.ayra.haus` while deploying SDP.

## Hostinger Routing

VPS `1498567` already runs the Hostinger Docker template Traefik project on host ports `80` and `443`. This stack therefore uses Traefik Docker labels instead of binding a second Caddy proxy to the same ports.

Only the Traefik routes are public:

- `sdp-api.ayra.haus` -> `sdp-api:8000`
- `sdp-dashboard.ayra.haus` -> `sdp-frontend:80`

Postgres, metrics, admin, and TSS ports are not published.

## Hostinger MCP Operations

- Inventory: `VPS_getVirtualMachinesV1`, `VPS_getVirtualMachineDetailsV1`
- Backup: `VPS_createSnapshotV1`, `VPS_getActionsV1`
- DNS: `DNS_validateDNSRecordsV1`, `DNS_updateDNSRecordsV1`
- Deploy: `VPS_createNewProjectV1`
- Inspect: `VPS_getProjectListV1`, `VPS_getProjectContainersV1`, `VPS_getProjectLogsV1`, `VPS_getProjectContentsV1`
- Maintenance: `VPS_restartProjectV1`, `VPS_startProjectV1`, `VPS_stopProjectV1`

## Local Preflight

```bash
npm run verify:hostinger-sdp-env
docker compose --env-file deploy/hostinger-sdp/.env -f deploy/hostinger-sdp/docker-compose.yml config >/tmp/ayra-sdp-hostinger-compose.yml
```

The rendered compose file contains secrets and must stay out of git and chat logs.

## Health Checks

```bash
curl -fsS https://sdp-api.ayra.haus/health
curl -I https://sdp-dashboard.ayra.haus
```

## AYRA App Wiring

Set the Vercel production env for `ayra-transparency`:

```bash
AYRA_SDP_MODE=testnet
STELLAR_SDP_BASE_URL=https://sdp-api.ayra.haus
STELLAR_SDP_CREATE_AUTHORIZATION=stored-only-in-vercel-secret-store
STELLAR_SDP_START_AUTHORIZATION=stored-only-in-vercel-secret-store
STELLAR_SDP_TENANT_NAME=default
STELLAR_SDP_ASSET_ID=read-from-sdp-dashboard-asset-uuid
STELLAR_SDP_REGISTRATION_CONTACT_TYPE=EMAIL_AND_WALLET_ADDRESS
STELLAR_SDP_SYNC_ATTEMPTS=12
STELLAR_SDP_SYNC_DELAY_MS=10000
```

## Rollback

1. Set `AYRA_SDP_MODE=mock` in Vercel production.
2. Redeploy `ayra-transparency`.
3. Stop or restart Hostinger project `ayra-sdp-testnet` with Hostinger MCP.
4. Restore the pre-deploy Hostinger snapshot only if container-level rollback fails.
