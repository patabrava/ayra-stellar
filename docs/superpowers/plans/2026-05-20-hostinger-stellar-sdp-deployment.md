# Hostinger Stellar SDP Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a public Stellar Disbursement Platform testnet instance on a Hostinger VPS through Hostinger MCP and wire the live AYRA transparency app to it.

**Architecture:** Keep AYRA on Vercel at `transparency.ayra.haus`; deploy Stellar SDP separately as a Hostinger Docker Compose project named `ayra-sdp-testnet`. The Hostinger project runs Postgres, SDP API, TSS, dashboard, and Caddy TLS proxy, exposing only `https://sdp-api.ayra.haus` and `https://sdp-dashboard.ayra.haus` to the public internet. AYRA continues to call SDP only from server-side code through `STELLAR_SDP_BASE_URL` and never exposes SDP credentials to the browser.

**Tech Stack:** Hostinger API MCP, Hostinger VPS Docker Manager, Docker Compose, Caddy 2, PostgreSQL 14, `stellar/sdp-v2:latest`, `stellar/stellar-disbursement-platform-frontend:edge`, Stellar testnet Horizon/RPC, Vercel env vars, AYRA `npm run verify:sdp-testnet`. `{files: 4 created, 3 modified, LOC/file: deploy/hostinger-sdp/docker-compose.yml ~185, deploy/hostinger-sdp/.env.example ~60, deploy/hostinger-sdp/README.md ~170, scripts/verify-hostinger-sdp-env.mjs ~125, docs/ayra-stellar-sdp-testnet-runbook.md +45, .gitignore +1, package.json +1, deps: 0}`

---

## Source Checks

- Hostinger MCP official setup: https://www.hostinger.com/support/11079316-hostinger-api-mcp-server/
- Hostinger MCP tool catalog: https://hub.docker.com/mcp/server/hostinger-mcp-server/tools
- Hostinger GitHub Action fallback reference: https://www.hostinger.com/support/deploy-to-hostinger-vps-using-github-actions/
- Stellar SDP Docker Compose deployment: https://developers.stellar.org/docs/platforms/stellar-disbursement-platform/admin-guide/deploy-the-sdp
- Stellar SDP advanced configuration: https://developers.stellar.org/docs/platforms/stellar-disbursement-platform/admin-guide/advanced-configuration
- Current AYRA SDP boundary: `src/lib/ayra/sdp.ts`
- Current AYRA SDP testnet runbook: `docs/ayra-stellar-sdp-testnet-runbook.md`

## File Structure

- Create `deploy/hostinger-sdp/docker-compose.yml`: production-like Hostinger Docker Compose stack with Caddy TLS proxy, Postgres, SDP API, TSS, and SDP dashboard.
- Create `deploy/hostinger-sdp/.env.example`: required runtime variables with fixed public hostnames and blank secrets; real `.env` remains untracked.
- Create `deploy/hostinger-sdp/README.md`: operator runbook for Hostinger MCP deployment, DNS, firewall, project lifecycle, and AYRA/Vercel wiring.
- Create `scripts/verify-hostinger-sdp-env.mjs`: local validator for required `.env` keys and unsafe default detection before deploying through MCP.
- Modify `.gitignore`: ignore `deploy/hostinger-sdp/.env`.
- Modify `package.json`: add `verify:hostinger-sdp-env`.
- Modify `docs/ayra-stellar-sdp-testnet-runbook.md`: add a hosted Hostinger section that keeps the local Docker path intact.

No changes to AYRA app behavior. No Supabase schema changes. No Vercel domain reassignment for `ayra.haus` or `www.ayra.haus`.

## Task 1: Validate Hostinger MCP Access

**Files:**
- No file changes
- Uses Hostinger MCP tools after the Hostinger MCP server is enabled in the executing environment

- [ ] **Step 1: Confirm Hostinger MCP is installed in the executing agent**

Run tool discovery for Hostinger:

```text
tool_search query: Hostinger MCP VPS Docker project DNS firewall
```

Expected: the active tool list includes Hostinger MCP tools such as `VPS_getVirtualMachinesV1`, `VPS_createNewProjectV1`, `DNS_updateDNSRecordsV1`, and `VPS_getProjectLogsV1`.

If the Hostinger tools are absent, install the MCP server using the official Hostinger MCP package:

```bash
npm install -g hostinger-api-mcp
```

Add this MCP server config to the agent environment that will execute deployment:

```json
{
  "mcpServers": {
    "hostinger-api": {
      "command": "hostinger-api-mcp",
      "env": {
        "DEBUG": "false",
        "API_TOKEN": "set-through-the-agent-secret-store"
      }
    }
  }
}
```

Expected: Hostinger MCP starts without writing the API token into a repository file.

- [ ] **Step 2: Read available VPS instances**

Call Hostinger MCP:

```text
VPS_getVirtualMachinesV1
```

Expected: response includes at least one running VPS with Docker Manager support. Record its `virtualMachineId`, public IPv4 address, plan RAM, and current hostname in the execution notes.

- [ ] **Step 2a: Store runtime identifiers for the rest of the plan**

Use the Hostinger MCP response from Step 2 to set these shell variables in the execution terminal:

```bash
export HOSTINGER_VM_ID="the virtualMachineId returned by VPS_getVirtualMachinesV1"
export HOSTINGER_VPS_IPV4="the public IPv4 address returned by VPS_getVirtualMachinesV1"
export OPERATOR_IPV4="$(curl -fsS https://api.ipify.org)"
```

Expected: `printf '%s\n' "$HOSTINGER_VM_ID" "$HOSTINGER_VPS_IPV4" "$OPERATOR_IPV4"` prints three non-empty values.

- [ ] **Step 3: Reject undersized infrastructure before deployment**

Call Hostinger MCP:

```text
VPS_getVirtualMachineDetailsV1 virtualMachineId=$HOSTINGER_VM_ID
```

Expected: the selected VPS has Docker available and at least 4GB RAM. If the VPS has less than 4GB RAM, stop and ask for a larger VPS because Stellar documents 4GB+ RAM for the full SDP stack.

- [ ] **Step 4: Check for an existing SDP project**

Call Hostinger MCP:

```text
VPS_getProjectListV1 virtualMachineId=$HOSTINGER_VM_ID
```

Expected: no active project named `ayra-sdp-testnet`. If it exists, call `VPS_getProjectContentsV1` and `VPS_getProjectContainersV1` first, then decide whether to update it with `VPS_updateProjectV1` instead of replacing it.

## Task 2: Add Hostinger SDP Compose Artifacts

**Files:**
- Create: `deploy/hostinger-sdp/docker-compose.yml`
- Create: `deploy/hostinger-sdp/.env.example`
- Create: `scripts/verify-hostinger-sdp-env.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Create the deployment directory**

Run:

```bash
mkdir -p deploy/hostinger-sdp
```

Expected: directory exists at `deploy/hostinger-sdp`.

- [ ] **Step 2: Write the Docker Compose stack**

Create `deploy/hostinger-sdp/docker-compose.yml`:

```yaml
name: ayra-sdp-testnet

services:
  caddy:
    image: caddy:2.8-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      SDP_API_HOST: ${SDP_API_HOST}
      SDP_DASHBOARD_HOST: ${SDP_DASHBOARD_HOST}
    command:
      - sh
      - -c
      - |
        cat >/etc/caddy/Caddyfile <<'CADDYFILE'
        {$SDP_API_HOST} {
          encode zstd gzip
          reverse_proxy sdp-api:8000
        }

        {$SDP_DASHBOARD_HOST} {
          encode zstd gzip
          reverse_proxy sdp-frontend:80
        }
        CADDYFILE
        caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
    volumes:
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      sdp-api:
        condition: service_started
      sdp-frontend:
        condition: service_started

  db:
    image: postgres:14-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: sdp
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${DATABASE_NAME}
      PGDATA: /data/postgres
    volumes:
      - postgres-db:/data/postgres
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sdp -d ${DATABASE_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 12

  sdp-api:
    image: stellar/sdp-v2:latest
    restart: unless-stopped
    environment:
      ADMIN_ACCOUNT: ${ADMIN_ACCOUNT}
      ADMIN_API_KEY: ${ADMIN_API_KEY}
      ADMIN_PORT: "8003"
      BASE_URL: https://${SDP_API_HOST}
      SDP_UI_BASE_URL: https://${SDP_DASHBOARD_HOST}
      DATABASE_NAME: ${DATABASE_NAME}
      DATABASE_URL: postgres://sdp:${POSTGRES_PASSWORD}@db:5432/${DATABASE_NAME}?sslmode=disable
      ENVIRONMENT: production
      LOG_LEVEL: INFO
      PORT: "8000"
      METRICS_PORT: "8002"
      METRICS_TYPE: PROMETHEUS
      EMAIL_SENDER_TYPE: DRY_RUN
      SMS_SENDER_TYPE: DRY_RUN
      HORIZON_URL: https://horizon-testnet.stellar.org
      RPC_URL: https://soroban-testnet.stellar.org
      RPC_REQUEST_AUTH_HEADER_KEY: ""
      RPC_REQUEST_AUTH_HEADER_VALUE: ""
      NETWORK_TYPE: testnet
      NETWORK_PASSPHRASE: "Test SDF Network ; September 2015"
      SEP10_SIGNING_PUBLIC_KEY: ${SEP10_SIGNING_PUBLIC_KEY}
      SEP10_SIGNING_PRIVATE_KEY: ${SEP10_SIGNING_PRIVATE_KEY}
      SEP10_CLIENT_ATTRIBUTION_REQUIRED: "true"
      SEP24_JWT_SECRET: ${SEP24_JWT_SECRET}
      DISTRIBUTION_PUBLIC_KEY: ${DISTRIBUTION_PUBLIC_KEY}
      DISTRIBUTION_SEED: ${DISTRIBUTION_SEED}
      DISTRIBUTION_ACCOUNT_ENCRYPTION_PASSPHRASE: ${DISTRIBUTION_ACCOUNT_ENCRYPTION_PASSPHRASE}
      CHANNEL_ACCOUNT_ENCRYPTION_PASSPHRASE: ${CHANNEL_ACCOUNT_ENCRYPTION_PASSPHRASE}
      DEFAULT_TENANT_DISTRIBUTION_ACCOUNT_TYPE: DISTRIBUTION_ACCOUNT.STELLAR.ENV
      DEFAULT_TENANT_OWNER_EMAIL: ${DEFAULT_TENANT_OWNER_EMAIL}
      DEFAULT_TENANT_OWNER_FIRST_NAME: AYRA
      DEFAULT_TENANT_OWNER_LAST_NAME: Operator
      INSTANCE_NAME: AYRA SDP Testnet
      SINGLE_TENANT_MODE: "true"
      TENANT_XLM_BOOTSTRAP_AMOUNT: "5"
      CAPTCHA_TYPE: GOOGLE_RECAPTCHA_V3
      RECAPTCHA_SITE_KEY: ""
      RECAPTCHA_SITE_SECRET_KEY: ""
      DISABLE_MFA: "true"
      DISABLE_RECAPTCHA: "true"
      CORS_ALLOWED_ORIGINS: https://transparency.ayra.haus,https://${SDP_DASHBOARD_HOST}
      SCHEDULER_RECEIVER_INVITATION_JOB_SECONDS: "30"
      SCHEDULER_PAYMENT_JOB_SECONDS: "30"
      ENABLE_SEP45: "false"
      ENABLE_EMBEDDED_WALLETS: "false"
      EC256_PRIVATE_KEY: ${EC256_PRIVATE_KEY}
    command:
      - sh
      - -c
      - |
        ./stellar-disbursement-platform db admin migrate up
        ./stellar-disbursement-platform db tss migrate up
        ./stellar-disbursement-platform db auth migrate up --all
        ./stellar-disbursement-platform db sdp migrate up --all
        ./stellar-disbursement-platform db setup-for-network --all
        ./stellar-disbursement-platform serve
    depends_on:
      db:
        condition: service_healthy

  sdp-tss:
    image: stellar/sdp-v2:latest
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://sdp:${POSTGRES_PASSWORD}@db:5432/${DATABASE_NAME}?sslmode=disable
      NETWORK_PASSPHRASE: "Test SDF Network ; September 2015"
      HORIZON_URL: https://horizon-testnet.stellar.org
      RPC_URL: https://soroban-testnet.stellar.org
      RPC_REQUEST_AUTH_HEADER_KEY: ""
      RPC_REQUEST_AUTH_HEADER_VALUE: ""
      NUM_CHANNEL_ACCOUNTS: "3"
      MAX_BASE_FEE: "1000000"
      TSS_METRICS_PORT: "9002"
      TSS_METRICS_TYPE: TSS_PROMETHEUS
      DISTRIBUTION_PUBLIC_KEY: ${DISTRIBUTION_PUBLIC_KEY}
      DISTRIBUTION_SEED: ${DISTRIBUTION_SEED}
      DISTRIBUTION_ACCOUNT_ENCRYPTION_PASSPHRASE: ${DISTRIBUTION_ACCOUNT_ENCRYPTION_PASSPHRASE}
      CHANNEL_ACCOUNT_ENCRYPTION_PASSPHRASE: ${CHANNEL_ACCOUNT_ENCRYPTION_PASSPHRASE}
    command:
      - sh
      - -c
      - |
        ./stellar-disbursement-platform channel-accounts ensure 1
        ./stellar-disbursement-platform tss
    depends_on:
      db:
        condition: service_healthy
      sdp-api:
        condition: service_started

  sdp-frontend:
    image: stellar/stellar-disbursement-platform-frontend:edge
    restart: unless-stopped
    environment:
      SDP_API_HOST: ${SDP_API_HOST}
    command:
      - sh
      - -c
      - |
        cat >/usr/share/nginx/html/settings/env-config.js <<EOF
        window._env_ = {
          API_URL: "https://${SDP_API_HOST}",
          STELLAR_EXPERT_URL: "https://stellar.expert/explorer/testnet",
          HORIZON_URL: "https://horizon-testnet.stellar.org",
          RPC_ENABLED: false,
          RECAPTCHA_SITE_KEY: "",
          SINGLE_TENANT_MODE: true
        };
        EOF
        nginx -g 'daemon off;'
    depends_on:
      sdp-api:
        condition: service_started

volumes:
  postgres-db:
  caddy-data:
  caddy-config:
```

Expected: `docker compose -f deploy/hostinger-sdp/docker-compose.yml config` fails locally until an env file is supplied; that is correct because secrets are required.

- [ ] **Step 3: Write the env example**

Create `deploy/hostinger-sdp/.env.example`:

```dotenv
# Public hostnames. Keep ayra.haus and www.ayra.haus on the landing project.
SDP_API_HOST=sdp-api.ayra.haus
SDP_DASHBOARD_HOST=sdp-dashboard.ayra.haus

# Database. Generate POSTGRES_PASSWORD with: openssl rand -hex 32
DATABASE_NAME=sdp_ayra_testnet
POSTGRES_PASSWORD=

# Hostinger/SDP admin. Generate ADMIN_API_KEY with: openssl rand -hex 32
ADMIN_ACCOUNT=AYRA-sdp-admin
ADMIN_API_KEY=

# Stellar testnet distribution account. Generate with Task 3 Step 1.
DISTRIBUTION_PUBLIC_KEY=
DISTRIBUTION_SEED=

# Stellar SEP-10 signing account. Generate with Task 3 Step 1.
SEP10_SIGNING_PUBLIC_KEY=
SEP10_SIGNING_PRIVATE_KEY=

# Encryption secrets. Generate each with: openssl rand -hex 32
DISTRIBUTION_ACCOUNT_ENCRYPTION_PASSPHRASE=
CHANNEL_ACCOUNT_ENCRYPTION_PASSPHRASE=
SEP24_JWT_SECRET=

# EC private key. Generate with Task 3 Step 2.
EC256_PRIVATE_KEY=

# Dashboard owner identity.
DEFAULT_TENANT_OWNER_EMAIL=capoks817@gmail.com
```

Expected: this file contains no real secret values.

- [ ] **Step 4: Ignore the real env file**

Add this line to `.gitignore`:

```gitignore
deploy/hostinger-sdp/.env
```

Run:

```bash
git diff -- .gitignore
```

Expected: only the new Hostinger SDP env ignore rule is added.

- [ ] **Step 5: Add the env validator**

Create `scripts/verify-hostinger-sdp-env.mjs`:

```js
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve("deploy/hostinger-sdp/.env");

const required = [
  "SDP_API_HOST",
  "SDP_DASHBOARD_HOST",
  "DATABASE_NAME",
  "POSTGRES_PASSWORD",
  "ADMIN_ACCOUNT",
  "ADMIN_API_KEY",
  "DISTRIBUTION_PUBLIC_KEY",
  "DISTRIBUTION_SEED",
  "SEP10_SIGNING_PUBLIC_KEY",
  "SEP10_SIGNING_PRIVATE_KEY",
  "DISTRIBUTION_ACCOUNT_ENCRYPTION_PASSPHRASE",
  "CHANNEL_ACCOUNT_ENCRYPTION_PASSPHRASE",
  "SEP24_JWT_SECRET",
  "EC256_PRIVATE_KEY",
  "DEFAULT_TENANT_OWNER_EMAIL",
];

const expectedHosts = {
  SDP_API_HOST: "sdp-api.ayra.haus",
  SDP_DASHBOARD_HOST: "sdp-dashboard.ayra.haus",
};

function parseEnv(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
    values.set(key, value);
  }
  return values;
}

if (!fs.existsSync(envPath)) {
  console.error(`Missing ${envPath}. Create it from deploy/hostinger-sdp/.env.example.`);
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
const failures = [];

for (const key of required) {
  if (!env.get(key)) failures.push(`Missing ${key}`);
}

for (const [key, expected] of Object.entries(expectedHosts)) {
  if (env.get(key) && env.get(key) !== expected) {
    failures.push(`${key} must be ${expected}`);
  }
}

for (const key of ["POSTGRES_PASSWORD", "ADMIN_API_KEY", "SEP24_JWT_SECRET"]) {
  const value = env.get(key);
  if (value && value.length < 32) failures.push(`${key} must be at least 32 characters`);
}

if (env.get("DISTRIBUTION_SEED") === env.get("SEP10_SIGNING_PRIVATE_KEY")) {
  failures.push("DISTRIBUTION_SEED and SEP10_SIGNING_PRIVATE_KEY must be different accounts");
}

if (env.get("DISTRIBUTION_PUBLIC_KEY") === env.get("SEP10_SIGNING_PUBLIC_KEY")) {
  failures.push("DISTRIBUTION_PUBLIC_KEY and SEP10_SIGNING_PUBLIC_KEY must be different accounts");
}

if (env.get("SDP_API_HOST") === "transparency.ayra.haus") {
  failures.push("SDP_API_HOST must not be the AYRA transparency app host");
}

if (env.get("SDP_DASHBOARD_HOST") === "transparency.ayra.haus") {
  failures.push("SDP_DASHBOARD_HOST must not be the AYRA transparency app host");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  hostnames: {
    api: env.get("SDP_API_HOST"),
    dashboard: env.get("SDP_DASHBOARD_HOST"),
  },
}));
```

Expected: validator fails until a real `.env` exists and passes once required secrets are present.

- [ ] **Step 6: Add the npm script**

Modify `package.json` scripts:

```json
"verify:hostinger-sdp-env": "node scripts/verify-hostinger-sdp-env.mjs"
```

Run:

```bash
npm run verify:hostinger-sdp-env
```

Expected before `.env` exists: FAIL with `Missing .../deploy/hostinger-sdp/.env`.

- [ ] **Step 7: Commit deployment artifacts**

Run:

```bash
git add .gitignore package.json deploy/hostinger-sdp/docker-compose.yml deploy/hostinger-sdp/.env.example scripts/verify-hostinger-sdp-env.mjs
git commit -m "chore: add Hostinger SDP deployment artifacts"
```

Expected: commit contains only deployment artifacts and the npm validator script.

## Task 3: Prepare Hostinger Runtime Secrets

**Files:**
- Create locally but never commit: `deploy/hostinger-sdp/.env`
- Reads: `deploy/hostinger-sdp/.env.example`

- [ ] **Step 1: Generate Stellar testnet keypairs**

Run:

```bash
npm exec --yes --package @stellar/stellar-sdk -- node - <<'NODE'
const { Keypair } = require("@stellar/stellar-sdk");
for (const label of ["distribution", "sep10"]) {
  const kp = Keypair.random();
  console.log(`${label.toUpperCase()}_PUBLIC_KEY=${kp.publicKey()}`);
  console.log(`${label.toUpperCase()}_SECRET=${kp.secret()}`);
}
NODE
```

Expected: output includes four values. Map them into `.env` like this:

```dotenv
DISTRIBUTION_PUBLIC_KEY=generated DISTRIBUTION_PUBLIC_KEY value
DISTRIBUTION_SEED=generated DISTRIBUTION_SECRET value
SEP10_SIGNING_PUBLIC_KEY=generated SEP10_PUBLIC_KEY value
SEP10_SIGNING_PRIVATE_KEY=generated SEP10_SECRET value
```

- [ ] **Step 2: Fund the testnet accounts**

Run:

```bash
source deploy/hostinger-sdp/.env
curl -fsS "https://friendbot.stellar.org?addr=${DISTRIBUTION_PUBLIC_KEY}" >/tmp/ayra-sdp-distribution-friendbot.json
curl -fsS "https://friendbot.stellar.org?addr=${SEP10_SIGNING_PUBLIC_KEY}" >/tmp/ayra-sdp-sep10-friendbot.json
```

Expected: both curl commands exit `0`. Confirm account existence:

```bash
curl -fsS "https://horizon-testnet.stellar.org/accounts/${DISTRIBUTION_PUBLIC_KEY}" | rg '"account_id"'
curl -fsS "https://horizon-testnet.stellar.org/accounts/${SEP10_SIGNING_PUBLIC_KEY}" | rg '"account_id"'
```

Expected: each command prints one `"account_id"` line.

- [ ] **Step 3: Generate non-Stellar secrets**

Run:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt
```

Expected: five hex values and one PEM key. Map the hex values into `POSTGRES_PASSWORD`, `ADMIN_API_KEY`, `DISTRIBUTION_ACCOUNT_ENCRYPTION_PASSPHRASE`, `CHANNEL_ACCOUNT_ENCRYPTION_PASSPHRASE`, and `SEP24_JWT_SECRET`. Map the PEM block into `EC256_PRIVATE_KEY` as a quoted single-line value with literal `\n` separators.

- [ ] **Step 4: Validate `.env` before any Hostinger write**

Run:

```bash
npm run verify:hostinger-sdp-env
```

Expected:

```json
{"ok":true,"hostnames":{"api":"sdp-api.ayra.haus","dashboard":"sdp-dashboard.ayra.haus"}}
```

## Task 4: Configure DNS And Firewall Through Hostinger MCP

**Files:**
- No repository file changes
- Uses Hostinger MCP tools

- [ ] **Step 1: Create a snapshot before changing the VPS**

Call Hostinger MCP:

```text
VPS_createSnapshotV1 virtualMachineId=$HOSTINGER_VM_ID
```

Expected: Hostinger action starts successfully. Poll status:

```text
VPS_getActionsV1 virtualMachineId=$HOSTINGER_VM_ID
```

Expected: latest snapshot action reaches a successful state before deployment continues.

Record the snapshot id for rollback:

```bash
export HOSTINGER_PRE_DEPLOY_SNAPSHOT_ID="the snapshot id returned by VPS_createSnapshotV1"
```

- [ ] **Step 2: Validate DNS records**

Use `$HOSTINGER_VPS_IPV4` from Task 1. Call Hostinger MCP:

```text
DNS_validateDNSRecordsV1 domain=ayra.haus records=[
  { "type": "A", "name": "sdp-api", "content": "$HOSTINGER_VPS_IPV4", "ttl": 300 },
  { "type": "A", "name": "sdp-dashboard", "content": "$HOSTINGER_VPS_IPV4", "ttl": 300 }
]
```

Expected: validation succeeds with no `422` errors.

- [ ] **Step 3: Apply DNS records**

Call Hostinger MCP:

```text
DNS_updateDNSRecordsV1 domain=ayra.haus overwrite=false records=[
  { "type": "A", "name": "sdp-api", "content": "$HOSTINGER_VPS_IPV4", "ttl": 300 },
  { "type": "A", "name": "sdp-dashboard", "content": "$HOSTINGER_VPS_IPV4", "ttl": 300 }
]
```

Expected: `sdp-api.ayra.haus` and `sdp-dashboard.ayra.haus` point to the selected VPS. Do not change `ayra.haus`, `www.ayra.haus`, or `transparency.ayra.haus`.

- [ ] **Step 4: Configure the public firewall**

Call Hostinger MCP:

```text
VPS_createNewFirewallV1 name=ayra-sdp-public
```

Record the returned firewall id:

```bash
export HOSTINGER_FIREWALL_ID="the firewall id returned by VPS_createNewFirewallV1"
```

Add rules:

```text
VPS_createFirewallRuleV1 firewallId=$HOSTINGER_FIREWALL_ID protocol=TCP port=80 source=0.0.0.0/0 action=accept
VPS_createFirewallRuleV1 firewallId=$HOSTINGER_FIREWALL_ID protocol=TCP port=443 source=0.0.0.0/0 action=accept
VPS_createFirewallRuleV1 firewallId=$HOSTINGER_FIREWALL_ID protocol=TCP port=22 source=$OPERATOR_IPV4/32 action=accept
VPS_activateFirewallV1 virtualMachineId=$HOSTINGER_VM_ID firewallId=$HOSTINGER_FIREWALL_ID
VPS_syncFirewallV1 virtualMachineId=$HOSTINGER_VM_ID firewallId=$HOSTINGER_FIREWALL_ID
```

Expected: ports `80` and `443` are public for Caddy. Port `22` is restricted to the operator IP. Ports `5432`, `8000`, `8002`, `8003`, `9000`, and `9002` are not publicly open.

## Task 5: Deploy The SDP Project Through Hostinger MCP

**Files:**
- Reads: `deploy/hostinger-sdp/docker-compose.yml`
- Reads local untracked: `deploy/hostinger-sdp/.env`

- [ ] **Step 1: Render compose config locally**

Run:

```bash
docker compose --env-file deploy/hostinger-sdp/.env -f deploy/hostinger-sdp/docker-compose.yml config >/tmp/ayra-sdp-hostinger-compose.yml
```

Expected: command exits `0`; rendered file contains no blank required variables.

- [ ] **Step 2: Check rendered compose for accidental secret output before sharing logs**

Run:

```bash
rg -n "DISTRIBUTION_SEED|SEP10_SIGNING_PRIVATE_KEY|POSTGRES_PASSWORD|ADMIN_API_KEY|EC256_PRIVATE_KEY" /tmp/ayra-sdp-hostinger-compose.yml
```

Expected: matches exist because the rendered compose contains secrets. Do not paste `/tmp/ayra-sdp-hostinger-compose.yml` into chat, logs, tickets, or committed files.

- [ ] **Step 3: Deploy the project with Hostinger MCP**

Call Hostinger MCP with the original compose file contents and the `.env` key/value map supplied as private project environment variables:

```text
VPS_createNewProjectV1
virtualMachineId=$HOSTINGER_VM_ID
projectName=ayra-sdp-testnet
dockerComposeYamlContents=contents of deploy/hostinger-sdp/docker-compose.yml
environmentVariables=key/value pairs parsed from deploy/hostinger-sdp/.env
```

Expected: Hostinger creates or replaces Docker Compose project `ayra-sdp-testnet`.

- [ ] **Step 4: Watch project and container status**

Call Hostinger MCP:

```text
VPS_getProjectListV1 virtualMachineId=$HOSTINGER_VM_ID
VPS_getProjectContainersV1 virtualMachineId=$HOSTINGER_VM_ID projectName=ayra-sdp-testnet
VPS_getProjectLogsV1 virtualMachineId=$HOSTINGER_VM_ID projectName=ayra-sdp-testnet
```

Expected: containers `db`, `sdp-api`, `sdp-tss`, `sdp-frontend`, and `caddy` are running. Logs show migration completion and no repeated restart loop.

- [ ] **Step 5: Verify public HTTPS endpoints**

Run from local machine:

```bash
curl -fsS https://sdp-api.ayra.haus/health
curl -I https://sdp-dashboard.ayra.haus
```

Expected: API health returns HTTP `200`; dashboard returns HTTP `200` or `302`.

- [ ] **Step 6: Commit deployment run notes without secrets**

Create `deploy/hostinger-sdp/README.md`:

```markdown
# AYRA Hostinger SDP Testnet

This folder defines the public Hostinger Docker Compose deployment for the AYRA Stellar SDP testnet instance.

## Hosts

- API: `https://sdp-api.ayra.haus`
- Dashboard: `https://sdp-dashboard.ayra.haus`
- AYRA app: `https://transparency.ayra.haus`

Do not move `ayra.haus`, `www.ayra.haus`, or `transparency.ayra.haus` while deploying SDP.

## Hostinger MCP Operations

- Inventory: `VPS_getVirtualMachinesV1`, `VPS_getVirtualMachineDetailsV1`
- Backup: `VPS_createSnapshotV1`
- DNS: `DNS_validateDNSRecordsV1`, `DNS_updateDNSRecordsV1`
- Firewall: `VPS_createNewFirewallV1`, `VPS_createFirewallRuleV1`, `VPS_activateFirewallV1`, `VPS_syncFirewallV1`
- Deploy: `VPS_createNewProjectV1`
- Inspect: `VPS_getProjectListV1`, `VPS_getProjectContainersV1`, `VPS_getProjectLogsV1`, `VPS_getProjectContentsV1`
- Update: `VPS_updateProjectV1`
- Restart: `VPS_restartProjectV1`

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
```

Run:

```bash
git add deploy/hostinger-sdp/README.md
git commit -m "docs: add Hostinger SDP deployment runbook"
```

Expected: docs commit contains no `.env` or secret values.

## Task 6: Create SDP Dashboard API Credentials

**Files:**
- No repository file changes
- Uses live dashboard and stores secrets only in Vercel/secret manager

- [ ] **Step 1: Open the dashboard**

Open:

```text
https://sdp-dashboard.ayra.haus
```

Expected: dashboard loads over HTTPS. Sign in with the seeded owner email from `DEFAULT_TENANT_OWNER_EMAIL` and complete whatever invitation/reset flow the SDP sends or displays for the first owner.

- [ ] **Step 2: Confirm testnet asset setup**

In the dashboard, confirm the distribution account is funded and a testnet disbursement asset exists. For AYRA MVP, use the same asset that the local testnet flow used successfully. Record the SDP asset UUID in a private deployment note as `STELLAR_SDP_ASSET_ID`.

Expected: dashboard can create a disbursement for `EMAIL_AND_WALLET_ADDRESS` recipients.

- [ ] **Step 3: Create the create/upload/read API key**

In dashboard API key settings, create key name:

```text
AYRA server create upload sync
```

Permissions:

```json
["read:disbursements", "write:disbursements", "read:payments", "read:receivers", "write:receivers"]
```

Expected: dashboard shows a single raw key value beginning with `SDP_`. Store it as `STELLAR_SDP_CREATE_AUTHORIZATION` in the secret store. Do not paste it into docs.

- [ ] **Step 4: Create the start/approval API key**

In dashboard API key settings, create key name:

```text
AYRA server start disbursements
```

Permissions:

```json
["read:disbursements", "write:disbursements", "read:payments"]
```

Expected: dashboard shows a second raw key value beginning with `SDP_`. Store it as `STELLAR_SDP_START_AUTHORIZATION`. If this second key is not needed by the current SDP approval configuration, still keep it separate so AYRA can satisfy the two-controller deployment path later.

## Task 7: Wire AYRA Production To Hosted SDP

**Files:**
- No repository file changes unless deployment docs need adjustment
- Uses Vercel env for project `ayra-transparency`

- [ ] **Step 1: Confirm the Vercel project**

Run from repo root:

```bash
vercel project ls | rg 'ayra-transparency'
```

Expected: `ayra-transparency` appears. If the Vercel CLI is not linked, run:

```bash
vercel link --project ayra-transparency
```

- [ ] **Step 2: Set production env values**

Run:

```bash
printf 'testnet' | vercel env add AYRA_SDP_MODE production
printf 'https://sdp-api.ayra.haus' | vercel env add STELLAR_SDP_BASE_URL production
printf 'default' | vercel env add STELLAR_SDP_TENANT_NAME production
printf 'EMAIL_AND_WALLET_ADDRESS' | vercel env add STELLAR_SDP_REGISTRATION_CONTACT_TYPE production
printf '12' | vercel env add STELLAR_SDP_SYNC_ATTEMPTS production
printf '10000' | vercel env add STELLAR_SDP_SYNC_DELAY_MS production
```

Add these sensitive values through Vercel secret input prompts, not shell history:

```bash
vercel env add STELLAR_SDP_CREATE_AUTHORIZATION production
vercel env add STELLAR_SDP_START_AUTHORIZATION production
vercel env add STELLAR_SDP_ASSET_ID production
```

Expected: Vercel stores all production env values for `ayra-transparency`.

- [ ] **Step 3: Redeploy AYRA production**

Run:

```bash
vercel deploy --prod
```

Expected: deployment finishes for `ayra-transparency`; `https://transparency.ayra.haus` still serves the AYRA app.

- [ ] **Step 4: Verify AYRA can reach hosted SDP**

Run:

```bash
npm run verify:sdp-testnet
```

with environment pointing at the hosted SDP:

```bash
AYRA_SDP_MODE=testnet
STELLAR_SDP_BASE_URL=https://sdp-api.ayra.haus
STELLAR_SDP_TENANT_NAME=default
STELLAR_SDP_REGISTRATION_CONTACT_TYPE=EMAIL_AND_WALLET_ADDRESS
STELLAR_SDP_SYNC_ATTEMPTS=12
STELLAR_SDP_SYNC_DELAY_MS=10000
```

Expected output includes:

```json
{
  "finalAyraStatusMapping": "settled"
}
```

If the result remains `submitted`, rerun after TSS has advanced or inspect `VPS_getProjectLogsV1` for `sdp-tss`.

## Task 8: Update The AYRA Runbook

**Files:**
- Modify: `docs/ayra-stellar-sdp-testnet-runbook.md`

- [ ] **Step 1: Add the hosted Hostinger section**

Append this section before `## Failure Signals`:

```markdown
## Hosted Hostinger Testnet Instance

The local Docker flow proves the SDP contract on a developer machine. The hosted
flow runs the same AYRA server-side contract against a public Hostinger SDP
instance.

Public endpoints:

- SDP API: `https://sdp-api.ayra.haus`
- SDP dashboard: `https://sdp-dashboard.ayra.haus`
- AYRA app: `https://transparency.ayra.haus`

Hostinger deployment artifacts live in `deploy/hostinger-sdp/`.

Before deploying, validate the untracked runtime env file:

```bash
npm run verify:hostinger-sdp-env
docker compose --env-file deploy/hostinger-sdp/.env -f deploy/hostinger-sdp/docker-compose.yml config >/tmp/ayra-sdp-hostinger-compose.yml
```

The rendered compose file contains secrets and must not be committed or pasted
into logs.

Hostinger MCP deployment uses:

- `DNS_validateDNSRecordsV1` and `DNS_updateDNSRecordsV1` for
  `sdp-api.ayra.haus` and `sdp-dashboard.ayra.haus`.
- `VPS_createNewFirewallV1`, `VPS_createFirewallRuleV1`,
  `VPS_activateFirewallV1`, and `VPS_syncFirewallV1` for public `80`/`443`.
- `VPS_createNewProjectV1` for initial project creation.
- `VPS_updateProjectV1`, `VPS_restartProjectV1`, `VPS_getProjectContainersV1`,
  and `VPS_getProjectLogsV1` for maintenance.

The AYRA production Vercel project `ayra-transparency` must use:

```bash
AYRA_SDP_MODE=testnet
STELLAR_SDP_BASE_URL=https://sdp-api.ayra.haus
STELLAR_SDP_TENANT_NAME=default
STELLAR_SDP_REGISTRATION_CONTACT_TYPE=EMAIL_AND_WALLET_ADDRESS
STELLAR_SDP_SYNC_ATTEMPTS=12
STELLAR_SDP_SYNC_DELAY_MS=10000
```

`STELLAR_SDP_CREATE_AUTHORIZATION`, `STELLAR_SDP_START_AUTHORIZATION`, and
`STELLAR_SDP_ASSET_ID` are production secrets and must live only in Vercel or
the operator secret store.
```

Run:

```bash
git diff -- docs/ayra-stellar-sdp-testnet-runbook.md
```

Expected: runbook now documents both local Docker and hosted Hostinger paths.

- [ ] **Step 2: Run docs and env checks**

Run:

```bash
npm run verify:hostinger-sdp-env
npm test
```

Expected: env validator passes with the untracked `.env`; existing AYRA tests pass.

- [ ] **Step 3: Commit runbook update**

Run:

```bash
git add docs/ayra-stellar-sdp-testnet-runbook.md
git commit -m "docs: document hosted Hostinger SDP testnet path"
```

Expected: commit contains runbook text only.

## Task 9: Production Smoke Test

**Files:**
- No planned file changes
- Uses Hostinger MCP, Vercel production, AYRA browser flow, and Supabase readback if needed

- [ ] **Step 1: Confirm public services**

Run:

```bash
curl -fsS https://sdp-api.ayra.haus/health
curl -I https://sdp-dashboard.ayra.haus
curl -I https://transparency.ayra.haus
```

Expected: all return successful HTTP status.

- [ ] **Step 2: Confirm containers after public health**

Call Hostinger MCP:

```text
VPS_getProjectContainersV1 virtualMachineId=$HOSTINGER_VM_ID projectName=ayra-sdp-testnet
VPS_getProjectLogsV1 virtualMachineId=$HOSTINGER_VM_ID projectName=ayra-sdp-testnet
```

Expected: `db`, `sdp-api`, `sdp-tss`, `sdp-frontend`, and `caddy` remain running with no restart loop.

- [ ] **Step 3: Run standalone external payment proof**

Run:

```bash
npm run verify:sdp-testnet
```

Expected: output includes an SDP disbursement id, mapped SDP payment ids, and either settled transaction hashes or a submitted state that later settles after TSS advances.

- [ ] **Step 4: Run the live AYRA browser journey**

In a browser against `https://transparency.ayra.haus`:

1. Submit a public application at `/apply`.
2. Log in as admin.
3. Approve the application.
4. Log in as steward.
5. Submit a Stellar payout address.
6. Return to admin and verify the payout address.
7. Create a ready batch.
8. Submit the batch to SDP.
9. Sync until settled.
10. Open the public proof page and confirm settled proof visibility.

Expected: the public proof page shows category-level settled proof and does not expose raw private receipt paths or SDP credentials.

- [ ] **Step 5: Capture final deployment state**

Run:

```bash
git status --short
```

Expected: only intended committed docs/deployment artifact changes exist. If any untracked secret or generated file appears, remove it from the working tree or add it to `.gitignore` before final handoff.

## Rollback Plan

- [ ] **Step 1: Put AYRA back on mock mode**

Run:

```bash
printf 'mock' | vercel env add AYRA_SDP_MODE production
vercel deploy --prod
```

Expected: AYRA production no longer calls hosted SDP.

- [ ] **Step 2: Stop the Hostinger SDP project**

Call Hostinger MCP:

```text
VPS_stopProjectV1 virtualMachineId=$HOSTINGER_VM_ID projectName=ayra-sdp-testnet
```

Expected: Hostinger stops the project without deleting volumes.

- [ ] **Step 3: Restore from snapshot only if the VPS is damaged**

Call Hostinger MCP only after confirming project stop/update cannot recover the server:

```text
VPS_restoreSnapshotV1 virtualMachineId=$HOSTINGER_VM_ID snapshotId=$HOSTINGER_PRE_DEPLOY_SNAPSHOT_ID
```

Expected: Hostinger restores the pre-deploy VPS state. This overwrites current VPS data, so use it only as the final recovery step.

## Self-Review

- Spec coverage: Covers Hostinger MCP setup, VPS inventory, DNS, firewall, Docker Compose deployment, SDP credentials, Vercel wiring, external verifier, browser journey, docs, commits, and rollback.
- Placeholder scan: Runtime values are represented as named variables resolved by earlier steps. No deferred markers or implementation gaps remain.
- Type consistency: Hostnames, env var names, project name, and AYRA `STELLAR_SDP_*` names match the current repo contract.
