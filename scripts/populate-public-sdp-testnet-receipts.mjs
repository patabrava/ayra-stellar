#!/usr/bin/env node

import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

loadDotEnv();

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STELLAR_SDP_BASE_URL",
  "STELLAR_SDP_CREATE_AUTHORIZATION",
  "STELLAR_SDP_ASSET_ID",
  "STELLAR_USDC_ISSUER",
];

for (const key of required) {
  if (!process.env[key]?.trim()) fail(`Missing ${key}.`);
}

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  sdpBaseUrl: process.env.STELLAR_SDP_BASE_URL.replace(/\/+$/, ""),
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
    process.env.STELLAR_SDP_TEST_RECEIVER_EMAIL ||
    "ayra-sdp-public-proof@example.org",
  walletAddress: process.env.STELLAR_SDP_TEST_WALLET_ADDRESS || "",
  walletAddressMemo: process.env.STELLAR_SDP_TEST_WALLET_ADDRESS_MEMO || "",
  count: positiveInt(process.env.AYRA_PUBLIC_SDP_RECEIPT_COUNT, 20),
  amount: process.env.AYRA_PUBLIC_SDP_RECEIPT_AMOUNT_USDC || "1",
  attempts: positiveInt(process.env.STELLAR_SDP_SYNC_ATTEMPTS, 12),
  delayMs: positiveInt(process.env.STELLAR_SDP_SYNC_DELAY_MS, 10000),
};

if (config.registrationContactType !== "EMAIL_AND_WALLET_ADDRESS") {
  fail("Only EMAIL_AND_WALLET_ADDRESS is supported.");
}

const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
const runCode = `PV-REFOREST-SDP-${runId}`;
const periodLabel = `SDP testnet receipt ${runId}`;
const categories = [
  "Crew wages",
  "Seedlings",
  "Tools and transport",
  "Training",
  "Monitoring",
];
const lineItems = Array.from({ length: config.count }, (_, index) => {
  const number = index + 1;
  return {
    id: randomUUID(),
    category: `${categories[index % categories.length]} ${String(number).padStart(2, "0")}`,
    amountUsdc: Number(config.amount),
    localAmount: Number(config.amount) * 3900,
    batchId: randomUUID(),
    batchCode: `${runCode}-${String(number).padStart(2, "0")}`,
    externalPaymentId: `${runCode.toLowerCase()}-${String(number).padStart(2, "0")}`,
  };
});

const initiative = await loadReforestation();
const operatorProfileId = await loadOperatorProfileId();
await verifyConfiguredPayoutDestination(initiative.id);
await hideMockOnlyPublicBatches(initiative.id);

const disbursements = [];
for (const lineItem of lineItems) {
  const disbursement = await createDisbursement(lineItem.batchCode);
  await uploadInstructions(disbursement.id, lineItem);
  await startDisbursement(disbursement.id);
  disbursements.push({
    lineItemId: lineItem.id,
    sdpBatchId: disbursement.id,
  });
}
const payments = await pollSettledPayments();

if (payments.length < config.count) {
  fail(`Only ${payments.length}/${config.count} SDP payments returned transaction hashes.`);
}
const verifiedPayments = await verifyPayments(payments);

await persistPublicReceipts({
  initiativeId: initiative.id,
  operatorProfileId,
  disbursements,
  payments: verifiedPayments,
});

console.log(
  JSON.stringify(
    {
      runCode,
      ayraBatchIds: lineItems.map((lineItem) => lineItem.batchId),
      sdpDisbursementIds: disbursements.map((item) => item.sdpBatchId),
      insertedReceipts: verifiedPayments.length,
      transactionHashes: verifiedPayments.map((payment) => payment.transactionHash),
    },
    null,
    2,
  ),
);

async function loadReforestation() {
  const { data, error } = await supabase
    .from("initiatives")
    .select("id,slug,name")
    .eq("slug", "reforestation")
    .single();
  if (error || !data) fail("Could not find Reforestation initiative.");
  return data;
}

async function loadOperatorProfileId() {
  const preferredEmail =
    process.env.AYRA_PUBLIC_SDP_OPERATOR_EMAIL || "nicolas@ayra.haus";
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", preferredEmail)
    .maybeSingle();
  if (error) fail("Could not read operator profile.");
  if (data?.id) return data.id;

  const { data: fallback, error: fallbackError } = await supabase
    .from("profiles")
    .select("id")
    .limit(1)
    .single();
  if (fallbackError || !fallback) fail("Could not find any operator profile.");
  return fallback.id;
}

async function verifyConfiguredPayoutDestination(initiativeId) {
  const { data, error } = await supabase
    .from("payout_addresses")
    .select("address")
    .eq("initiative_id", initiativeId)
    .in("status", ["verified", "locked"])
    .limit(1)
    .maybeSingle();
  if (error || !data?.address) fail("Could not find a verified payout address.");
  config.walletAddress = data.address;
}

async function hideMockOnlyPublicBatches(initiativeId) {
  const { data: batches, error } = await supabase
    .from("funding_batches")
    .select("id,code,sdp_batch_id,batch_line_items(id,sdp_payment_id,transaction_hash)")
    .eq("initiative_id", initiativeId)
    .in("status", ["submitted", "settled"]);
  if (error) fail("Could not read existing public batches.");

  const mockOnlyBatchIds = (batches || [])
    .filter((batch) => {
      const lineItems = batch.batch_line_items || [];
      const hasRealHash = lineItems.some((item) =>
        /^[a-f0-9]{64}$/i.test(item.transaction_hash || ""),
      );
      const hasMockReference =
        String(batch.sdp_batch_id || "").startsWith("mock-") ||
        lineItems.some((item) =>
          String(item.transaction_hash || item.sdp_payment_id || "").startsWith("mock-"),
        );
      return hasMockReference && !hasRealHash;
    })
    .map((batch) => batch.id);

  if (mockOnlyBatchIds.length === 0) return;

  const { error: lineError } = await supabase
    .from("batch_line_items")
    .update({
      status: "draft",
      sdp_payment_id: null,
      transaction_hash: null,
      payment_asset_code: null,
      payment_asset_issuer: null,
      payment_asset_amount: null,
    })
    .in("batch_id", mockOnlyBatchIds);
  if (lineError) fail("Could not clear mock line item references.");

  const { error: batchError } = await supabase
    .from("funding_batches")
    .update({
      status: "draft",
      submitted_at: null,
      settled_at: null,
      sdp_batch_id: null,
    })
    .in("id", mockOnlyBatchIds);
  if (batchError) fail("Could not hide mock-only public batches.");
}

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

async function uploadInstructions(disbursementId, lineItem) {
  const form = new FormData();
  form.set(
    "file",
    new Blob([instructionsCsv(lineItem)], { type: "text/csv" }),
    `${lineItem.batchCode.toLowerCase()}.csv`,
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

async function pollSettledPayments() {
  const byLineItem = new Map();
  for (let index = 0; index < config.attempts; index += 1) {
    for (const lineItem of lineItems) {
      if (byLineItem.has(lineItem.id)) continue;
      const response = await sdpFetch(
        `/payments?q=${encodeURIComponent(lineItem.externalPaymentId)}&type=DISBURSEMENT`,
        {
          method: "GET",
          authorization: config.createAuthorization,
        },
      );
      const payment = extractPayments(response).find(
        (item) =>
          item.external_payment_id === lineItem.externalPaymentId ||
          item.id === lineItem.externalPaymentId,
      );
      if (payment?.stellar_transaction_id) {
        byLineItem.set(lineItem.id, {
          lineItemId: lineItem.id,
          sdpPaymentId: payment.id || payment.external_payment_id,
          transactionHash: payment.stellar_transaction_id,
        });
      }
    }
    if (byLineItem.size >= config.count) break;
    if (index < config.attempts - 1) await delay(config.delayMs);
  }
  return Array.from(byLineItem.values());
}

async function verifyPayments(payments) {
  const verified = [];
  for (const payment of payments) {
    const lineItem = lineItems.find((item) => item.id === payment.lineItemId);
    if (!lineItem) continue;
    const proof = await inspectTransaction(payment.transactionHash);
    const valid =
      proof.assetCode === "USDC" &&
      proof.assetIssuer === config.usdcIssuer &&
      proof.destination === config.walletAddress &&
      decimalToStroops(String(proof.amount)) === decimalToStroops(String(lineItem.amountUsdc));
    if (!valid) {
      fail(
        `Transaction ${payment.transactionHash} is not verified USDC for ${lineItem.amountUsdc}.`,
      );
    }
    verified.push({
      ...payment,
      assetCode: "USDC",
      assetIssuer: proof.assetIssuer,
      assetAmount: Number(proof.amount),
    });
  }
  return verified;
}

async function persistPublicReceipts({
  initiativeId,
  operatorProfileId,
  disbursements,
  payments,
}) {
  const now = new Date().toISOString();
  const sdpBatchByLineItem = new Map(
    disbursements.map((item) => [item.lineItemId, item.sdpBatchId]),
  );
  const { error: batchError } = await supabase.from("funding_batches").insert(
    lineItems.map((lineItem) => ({
      id: lineItem.batchId,
      initiative_id: initiativeId,
      code: lineItem.batchCode,
      period_label: periodLabel,
      status: "settled",
      created_by_profile_id: operatorProfileId,
      created_at: now,
      submitted_at: now,
      settled_at: now,
      sdp_batch_id: sdpBatchByLineItem.get(lineItem.id),
    })),
  );
  if (batchError) fail("Could not insert settled AYRA batch.");

  const paymentByLineItem = new Map(
    payments.map((payment) => [payment.lineItemId, payment]),
  );
  const { error: lineError } = await supabase.from("batch_line_items").insert(
    lineItems.map((lineItem) => {
      const payment = paymentByLineItem.get(lineItem.id);
      return {
        id: lineItem.id,
        batch_id: lineItem.batchId,
        category: lineItem.category,
        amount_usdc: lineItem.amountUsdc,
        local_amount: lineItem.localAmount,
        local_currency: "COP",
        status: "settled",
        sdp_payment_id: payment.sdpPaymentId,
        transaction_hash: payment.transactionHash,
        payment_asset_code: payment.assetCode,
        payment_asset_issuer: payment.assetIssuer,
        payment_asset_amount: payment.assetAmount,
      };
    }),
  );
  if (lineError) fail("Could not insert settled AYRA line items.");

  const { error: eventError } = await supabase.from("sdp_sync_events").insert(
    lineItems.flatMap((lineItem) => {
      const sdpBatchId = sdpBatchByLineItem.get(lineItem.id);
      return [
        {
          batch_id: lineItem.batchId,
          provider: "stellar-sdp",
          action: "create_batch",
          status: "ok",
          external_id: sdpBatchId,
          created_at: now,
        },
        {
          batch_id: lineItem.batchId,
          provider: "stellar-sdp",
          action: "sync_status",
          status: "ok",
          external_id: sdpBatchId,
          message: "1 payment settled",
          created_at: now,
        },
      ];
    }),
  );
  if (eventError) fail("Could not insert SDP sync events.");
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

  const response = await fetch(`${config.sdpBaseUrl}${path}`, {
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

function instructionsCsv(lineItem) {
  return [
    "email,walletAddress,walletAddressMemo,id,amount,paymentID",
    [
      csv(config.receiverEmail),
      csv(config.walletAddress),
      csv(config.walletAddressMemo),
      csv(lineItem.id),
      csv(config.amount),
      csv(lineItem.externalPaymentId),
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

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function decimalToStroops(value) {
  const match = /^(\d+)(?:\.(\d{1,7}))?$/.exec(value);
  if (!match) return null;
  return BigInt(match[1]) * 10_000_000n + BigInt((match[2] || "").padEnd(7, "0"));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadDotEnv() {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
