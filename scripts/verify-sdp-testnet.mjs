#!/usr/bin/env node

import fs from "node:fs";

loadDotEnv();

const required = [
  "STELLAR_SDP_BASE_URL",
  "STELLAR_SDP_CREATE_AUTHORIZATION",
  "STELLAR_SDP_ASSET_ID",
  "STELLAR_SDP_TEST_WALLET_ADDRESS",
  "STELLAR_USDC_ISSUER",
];

if (process.env.AYRA_SDP_MODE !== "testnet") {
  fail("AYRA_SDP_MODE must be testnet.");
}

for (const key of required) {
  if (!process.env[key]?.trim()) fail(`Missing ${key}.`);
}

const config = {
  baseUrl: process.env.STELLAR_SDP_BASE_URL.replace(/\/+$/, ""),
  createAuthorization: process.env.STELLAR_SDP_CREATE_AUTHORIZATION,
  startAuthorization:
    process.env.STELLAR_SDP_START_AUTHORIZATION ||
    process.env.STELLAR_SDP_CREATE_AUTHORIZATION,
  tenantName: process.env.STELLAR_SDP_TENANT_NAME || "",
  assetId: process.env.STELLAR_SDP_ASSET_ID,
  horizonUrl: (process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org").replace(/\/+$/, ""),
  usdcIssuer: process.env.STELLAR_USDC_ISSUER,
  registrationContactType:
    process.env.STELLAR_SDP_REGISTRATION_CONTACT_TYPE ||
    "EMAIL_AND_WALLET_ADDRESS",
  receiverEmail:
    process.env.STELLAR_SDP_TEST_RECEIVER_EMAIL || "ayra-sdp-smoke@example.org",
  walletAddress: process.env.STELLAR_SDP_TEST_WALLET_ADDRESS,
  walletAddressMemo: process.env.STELLAR_SDP_TEST_WALLET_ADDRESS_MEMO || "",
  amount: process.env.STELLAR_SDP_TEST_AMOUNT_USDC || "1",
  attempts: Number(process.env.STELLAR_SDP_SYNC_ATTEMPTS || 6),
  delayMs: Number(process.env.STELLAR_SDP_SYNC_DELAY_MS || 5000),
};

if (config.registrationContactType !== "EMAIL_AND_WALLET_ADDRESS") {
  fail("Only EMAIL_AND_WALLET_ADDRESS is supported by the AYRA MVP verifier.");
}

const batchCode = `AYRA-SDP-SMOKE-${new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace(/\..+$/, "Z")}`;
const paymentExternalId = `${batchCode.toLowerCase()}-line-1`;

const disbursement = await createDisbursement(batchCode);
await uploadInstructions(disbursement.id, batchCode);
await startDisbursement(disbursement.id);
const payments = await pollPayments(paymentExternalId);
const verifiedPayments = await verifyPayments(payments);

const mappedPaymentIds = verifiedPayments.map((payment) => payment.id).filter(Boolean);
const transactionIds = verifiedPayments
  .map((payment) => payment.stellar_transaction_id)
  .filter(Boolean);
const hasSuccess = verifiedPayments.some((payment) => payment.status === "SUCCESS");

console.log(
  JSON.stringify(
    {
      ayraBatchCode: batchCode,
      sdpDisbursementId: disbursement.id,
      mappedSdpPaymentIds: mappedPaymentIds,
      mappedTransactionIds: transactionIds,
      verifiedAsset: transactionIds.length > 0 ? "USDC" : null,
      verifiedIssuer: transactionIds.length > 0 ? config.usdcIssuer : null,
      finalAyraStatusMapping: hasSuccess ? "settled" : "submitted",
    },
    null,
    2,
  ),
);

async function createDisbursement(name) {
  const response = await sdpFetch("/disbursements", {
    method: "POST",
    authorization: config.createAuthorization,
    json: {
      name,
      asset_id: config.assetId,
      registration_contact_type: config.registrationContactType,
      wallet_id: "",
      verification_field: "",
    },
  });
  if (!response.id) fail("SDP create response did not include id.");
  return response;
}

async function uploadInstructions(disbursementId, batchCode) {
  const form = new FormData();
  form.set(
    "file",
    new Blob([instructionsCsv()], { type: "text/csv" }),
    `${batchCode.toLowerCase()}.csv`,
  );
  await sdpFetch(`/disbursements/${encodeURIComponent(disbursementId)}/instructions`, {
    method: "POST",
    authorization: config.createAuthorization,
    body: form,
  });
}

async function startDisbursement(disbursementId) {
  await sdpFetch(`/disbursements/${encodeURIComponent(disbursementId)}/status`, {
    method: "PATCH",
    authorization: config.startAuthorization,
    json: { status: "STARTED" },
  });
}

async function pollPayments(externalPaymentId) {
  for (let index = 0; index < config.attempts; index += 1) {
    const response = await sdpFetch(
      `/payments?q=${encodeURIComponent(externalPaymentId)}&type=DISBURSEMENT`,
      {
        method: "GET",
        authorization: config.createAuthorization,
      },
    );
    const payments = extractPayments(response).filter(
      (payment) =>
        payment.external_payment_id === externalPaymentId ||
        payment.id === externalPaymentId,
    );
    if (
      payments.some((payment) => payment.stellar_transaction_id) ||
      index === config.attempts - 1
    ) {
      return payments;
    }
    await delay(config.delayMs);
  }
  return [];
}

async function verifyPayments(payments) {
  const verified = [];
  for (const payment of payments) {
    if (!payment.stellar_transaction_id) continue;
    const proof = await inspectTransaction(payment.stellar_transaction_id);
    const valid =
      proof.assetCode === "USDC" &&
      proof.assetIssuer === config.usdcIssuer &&
      proof.destination === config.walletAddress &&
      decimalToStroops(String(proof.amount)) === decimalToStroops(String(config.amount));
    if (!valid) {
      fail(`Transaction ${payment.stellar_transaction_id} is not verified USDC.`);
    }
    verified.push(payment);
  }
  return verified.length > 0 ? verified : payments.filter((payment) => !payment.stellar_transaction_id);
}

async function inspectTransaction(hash) {
  const response = await fetch(`${config.horizonUrl}/transactions/${hash}/operations`);
  if (!response.ok) {
    fail(`Horizon lookup for ${hash} failed with HTTP ${response.status}.`);
  }
  const json = await response.json();
  const payment = (json._embedded?.records || []).find(
    (record) => record.type === "payment" && record.transaction_successful === true,
  );
  const isCreditAsset =
    payment?.asset_type === "credit_alphanum4" ||
    payment?.asset_type === "credit_alphanum12";
  return {
    assetCode: isCreditAsset
      ? payment?.asset_code || null
      : payment?.asset_type === "native"
        ? "XLM"
        : null,
    assetIssuer: isCreditAsset ? payment?.asset_issuer || null : null,
    amount: payment?.amount || null,
    destination: payment?.to || null,
  };
}

async function sdpFetch(path, init) {
  const headers = new Headers();
  headers.set("Authorization", init.authorization);
  if (config.tenantName) headers.set("SDP-Tenant-Name", config.tenantName);
  if (init.json) headers.set("Content-Type", "application/json");

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: init.method,
    headers,
    body: init.json ? JSON.stringify(init.json) : init.body,
  });
  if (!response.ok) {
    await response.text().catch(() => "");
    fail(`SDP ${init.method} ${path} failed with HTTP ${response.status}.`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

function instructionsCsv() {
  return [
    "email,walletAddress,walletAddressMemo,id,amount,paymentID",
    [
      csv(config.receiverEmail),
      csv(config.walletAddress),
      csv(config.walletAddressMemo),
      "line-1",
      csv(config.amount),
      csv(paymentExternalId),
    ].join(","),
    "",
  ].join("\n");
}

function extractPayments(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (response?.data && typeof response.data === "object") return [response.data];
  return [];
}

function csv(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decimalToStroops(value) {
  const match = /^(\d+)(?:\.(\d{1,7}))?$/.exec(value);
  if (!match) return null;
  return BigInt(match[1]) * 10_000_000n + BigInt((match[2] || "").padEnd(7, "0"));
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
