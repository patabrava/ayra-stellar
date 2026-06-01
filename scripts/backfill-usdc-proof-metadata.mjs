#!/usr/bin/env node

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

loadDotEnv();

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STELLAR_USDC_ISSUER",
];

for (const key of required) {
  if (!process.env[key]?.trim()) fail(`Missing ${key}.`);
}

const config = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  horizonUrl: (process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org").replace(/\/+$/, ""),
  usdcIssuer: process.env.STELLAR_USDC_ISSUER,
  dryRun: process.env.DRY_RUN !== "0",
};

const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket },
});

const { data, error } = await supabase
  .from("batch_line_items")
  .select("id,batch_id,category,amount_usdc,status,transaction_hash,funding_batches(initiative_id)")
  .not("transaction_hash", "is", null);

if (error) fail(`Could not read batch line items: ${error.message}`);

const initiativeIds = [
  ...new Set(
    (data || [])
      .map((item) => item.funding_batches?.initiative_id)
      .filter(Boolean),
  ),
];
const destinationByInitiative = await loadLockedPayoutDestinations(initiativeIds);
const results = [];
for (const item of data || []) {
  if (!/^[a-f0-9]{64}$/i.test(item.transaction_hash || "")) continue;
  const proof = await inspectTransaction(item.transaction_hash);
  const expected = Number(item.amount_usdc);
  const destination = destinationByInitiative.get(item.funding_batches?.initiative_id);
  const valid =
    Boolean(destination) &&
    proof.assetCode === "USDC" &&
    proof.assetIssuer === config.usdcIssuer &&
    proof.destination === destination &&
    decimalToStroops(String(proof.amount)) === decimalToStroops(String(expected));

  results.push({
    lineItemId: item.id,
    category: item.category,
    hash: item.transaction_hash,
    valid,
    assetCode: proof.assetCode,
    assetIssuer: proof.assetIssuer,
    amount: proof.amount,
    destinationMatched: Boolean(destination) && proof.destination === destination,
  });

  if (config.dryRun) continue;

  if (valid) {
    const { error: updateError } = await supabase
      .from("batch_line_items")
      .update({
        status: "settled",
        payment_asset_code: "USDC",
        payment_asset_issuer: proof.assetIssuer,
        payment_asset_amount: proof.amount,
      })
      .eq("id", item.id);
    if (updateError) fail(`Could not backfill ${item.id}: ${updateError.message}`);
  } else {
    const { error: clearError } = await supabase
      .from("batch_line_items")
      .update({
        status: item.status === "settled" ? "processing" : item.status,
        transaction_hash: null,
        payment_asset_code: null,
        payment_asset_issuer: null,
        payment_asset_amount: null,
      })
      .eq("id", item.id);
    if (clearError) fail(`Could not clear ${item.id}: ${clearError.message}`);
  }
}

console.log(JSON.stringify({ dryRun: config.dryRun, results }, null, 2));

async function inspectTransaction(hash) {
  const response = await fetch(`${config.horizonUrl}/transactions/${hash}/operations`);
  if (!response.ok) {
    return { assetCode: null, assetIssuer: null, amount: null };
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
    amount: payment?.amount ? Number(payment.amount) : null,
    destination: payment?.to || null,
  };
}

async function loadLockedPayoutDestinations(initiativeIds) {
  const destinations = new Map();
  if (initiativeIds.length === 0) return destinations;

  const { data: payoutAddresses, error } = await supabase
    .from("payout_addresses")
    .select("initiative_id,address")
    .in("initiative_id", initiativeIds)
    .in("status", ["verified", "locked"]);
  if (error) fail(`Could not read locked payout addresses: ${error.message}`);

  for (const row of payoutAddresses || []) {
    if (!destinations.has(row.initiative_id)) {
      destinations.set(row.initiative_id, row.address);
    }
  }
  return destinations;
}

function loadDotEnv() {
  try {
    const dotenvPath = fs.existsSync(".env.local") ? ".env.local" : ".env";
    if (!fs.existsSync(dotenvPath)) return;
    const text = fs.readFileSync(dotenvPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Optional local convenience only.
  }
}

function decimalToStroops(value) {
  const match = /^(\d+)(?:\.(\d{1,7}))?$/.exec(value);
  if (!match) return null;
  return BigInt(match[1]) * 10_000_000n + BigInt((match[2] || "").padEnd(7, "0"));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
