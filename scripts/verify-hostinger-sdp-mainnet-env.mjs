#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve("deploy/hostinger-sdp-mainnet/.env");
if (!fs.existsSync(envPath)) {
  fail(`Missing ${envPath}. Run npm run generate:sdp-mainnet-env first.`);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
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
const failures = [];

for (const key of required) {
  if (!env.get(key)) failures.push(`Missing ${key}`);
}
if (env.get("SDP_API_HOST") !== "sdp-mainnet-api.ayra.haus") {
  failures.push("SDP_API_HOST must be sdp-mainnet-api.ayra.haus");
}
if (env.get("SDP_DASHBOARD_HOST") !== "sdp-mainnet-dashboard.ayra.haus") {
  failures.push("SDP_DASHBOARD_HOST must be sdp-mainnet-dashboard.ayra.haus");
}
if (env.get("DATABASE_NAME") !== "sdp_ayra_mainnet") {
  failures.push("DATABASE_NAME must be sdp_ayra_mainnet");
}
for (const key of ["DISTRIBUTION_PUBLIC_KEY", "SEP10_SIGNING_PUBLIC_KEY"]) {
  if (env.get(key) && !/^G[A-Z2-7]{55}$/.test(env.get(key))) {
    failures.push(`${key} must be a Stellar public account ID`);
  }
}
for (const key of [
  "DISTRIBUTION_SEED",
  "SEP10_SIGNING_PRIVATE_KEY",
  "DISTRIBUTION_ACCOUNT_ENCRYPTION_PASSPHRASE",
  "CHANNEL_ACCOUNT_ENCRYPTION_PASSPHRASE",
]) {
  if (env.get(key) && !/^S[A-Z2-7]{55}$/.test(env.get(key))) {
    failures.push(`${key} must be a Stellar secret key`);
  }
}
for (const key of ["POSTGRES_PASSWORD", "ADMIN_API_KEY", "SEP24_JWT_SECRET"]) {
  if (env.get(key) && env.get(key).length < 64) {
    failures.push(`${key} must be at least 64 characters`);
  }
}
if (env.get("DISTRIBUTION_SEED") === env.get("SEP10_SIGNING_PRIVATE_KEY")) {
  failures.push("Distribution and SEP-10 accounts must be different");
}
if (!env.get("EC256_PRIVATE_KEY")?.includes("BEGIN PRIVATE KEY")) {
  failures.push("EC256_PRIVATE_KEY must be a PKCS#8 private key");
}

if (failures.length) fail(failures.map((item) => `- ${item}`).join("\n"));

console.log(
  JSON.stringify({
    ok: true,
    network: "pubnet",
    hosts: {
      api: env.get("SDP_API_HOST"),
      dashboard: env.get("SDP_DASHBOARD_HOST"),
    },
    distributionPublicKey: env.get("DISTRIBUTION_PUBLIC_KEY"),
    secretsPrinted: false,
  }),
);

function parseEnv(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    values.set(
      trimmed.slice(0, index),
      trimmed.slice(index + 1).replace(/^['"]|['"]$/g, ""),
    );
  }
  return values;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
