#!/usr/bin/env node

import fs from "node:fs";

const HORIZON_URL = "https://horizon.stellar.org";
const CIRCLE_USDC_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

loadDotEnv();

if (process.env.AYRA_STELLAR_NETWORK !== "pubnet") {
  fail("AYRA_STELLAR_NETWORK must be pubnet for the mainnet readiness check.");
}

const baseUrl = required("STELLAR_MAINNET_SDP_BASE_URL").replace(/\/+$/, "");
const dashboardUrl = process.env.STELLAR_MAINNET_SDP_DASHBOARD_URL?.replace(
  /\/+$/,
  "",
);
const distributionAccount = required("STELLAR_MAINNET_DISTRIBUTION_PUBLIC_KEY");
const recipientAccount = process.env.STELLAR_MAINNET_TEST_WALLET_ADDRESS?.trim();

const health = await httpStatus(`${baseUrl}/health`);
const dashboard = dashboardUrl ? await httpStatus(dashboardUrl, "HEAD") : null;
const distribution = await inspectAccount(distributionAccount);
const recipient = recipientAccount
  ? await inspectAccount(recipientAccount)
  : { exists: false, xlmBalance: 0, usdcBalance: 0, hasCircleUsdcTrustline: false };

const distributionFunded =
  distribution.exists &&
  distribution.xlmBalance > 0 &&
  distribution.hasCircleUsdcTrustline &&
  distribution.usdcBalance > 0;
const mainnetUsdcReady =
  recipient.exists && recipient.hasCircleUsdcTrustline;
const releaseSwitchEnabled =
  process.env.AYRA_MAINNET_PAYMENTS_ENABLED === "1";
const paymentActivationReady =
  health.ok && distributionFunded && mainnetUsdcReady && releaseSwitchEnabled;

console.log(
  JSON.stringify(
    {
      network: "pubnet",
      horizonUrl: HORIZON_URL,
      circleUsdcIssuer: CIRCLE_USDC_ISSUER,
      sdpApi: health,
      sdpDashboard: dashboard,
      distributionAccount: {
        publicKey: distributionAccount,
        ...distribution,
        funded: distributionFunded,
      },
      recipientAccount: recipientAccount
        ? { publicKey: recipientAccount, ...recipient }
        : null,
      mainnetUsdcReady,
      releaseSwitchEnabled,
      paymentActivationReady,
      blockers: [
        !health.ok ? "sdp-api-unhealthy" : null,
        !distributionFunded ? "distribution-account-unfunded" : null,
        !recipientAccount ? "recipient-account-not-configured" : null,
        recipientAccount && !mainnetUsdcReady
          ? "recipient-circle-usdc-trustline-missing"
          : null,
        !releaseSwitchEnabled ? "mainnet-release-switch-disabled" : null,
      ].filter(Boolean),
    },
    null,
    2,
  ),
);

if (process.argv.includes("--require-ready") && !paymentActivationReady) {
  process.exit(1);
}

async function inspectAccount(accountId) {
  if (!/^G[A-Z2-7]{55}$/.test(accountId)) {
    fail("A configured mainnet public account ID is invalid.");
  }
  const response = await fetch(`${HORIZON_URL}/accounts/${accountId}`);
  if (response.status === 404) {
    return {
      exists: false,
      xlmBalance: 0,
      usdcBalance: 0,
      hasCircleUsdcTrustline: false,
    };
  }
  if (!response.ok) {
    fail(`Horizon account lookup failed with HTTP ${response.status}.`);
  }
  const account = await response.json();
  const balances = account.balances ?? [];
  const native = balances.find((item) => item.asset_type === "native");
  const usdc = balances.find(
    (item) =>
      item.asset_code === "USDC" &&
      item.asset_issuer === CIRCLE_USDC_ISSUER,
  );
  return {
    exists: true,
    xlmBalance: Number(native?.balance ?? 0),
    usdcBalance: Number(usdc?.balance ?? 0),
    hasCircleUsdcTrustline: Boolean(usdc),
  };
}

async function httpStatus(url, method = "GET") {
  try {
    const response = await fetch(url, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    return { url, status: response.status, ok: response.ok };
  } catch (error) {
    return {
      url,
      status: null,
      ok: false,
      error: error instanceof Error ? error.message : "request failed",
    };
  }
}

function required(key) {
  const value = process.env[key]?.trim();
  if (!value) fail(`Missing ${key}.`);
  return value;
}

function loadDotEnv() {
  const dotenvPath = fs.existsSync(".env.local") ? ".env.local" : ".env";
  if (!fs.existsSync(dotenvPath)) return;
  for (const line of fs.readFileSync(dotenvPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
