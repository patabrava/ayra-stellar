#!/usr/bin/env node

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

for (const key of [
  "DISTRIBUTION_ACCOUNT_ENCRYPTION_PASSPHRASE",
  "CHANNEL_ACCOUNT_ENCRYPTION_PASSPHRASE",
]) {
  const value = env.get(key);
  if (value && !value.startsWith("S")) failures.push(`${key} must be a Stellar secret key`);
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

console.log(
  JSON.stringify({
    ok: true,
    hostnames: {
      api: env.get("SDP_API_HOST"),
      dashboard: env.get("SDP_DASHBOARD_HOST"),
    },
  }),
);
