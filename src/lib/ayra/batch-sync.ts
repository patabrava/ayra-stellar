import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createSdpGateway,
  SdpGatewayError,
  type SdpGateway,
  type SdpGatewayEvent,
  type SdpSettledPayment,
} from "@/lib/ayra/sdp";
import {
  StellarProofError,
  verifyStellarUsdcPayment,
  type StellarUsdcProof,
  type StellarUsdcProofInput,
} from "@/lib/ayra/stellar-proof";

type BatchRow = {
  id: string;
  initiative_id: string;
  code: string;
  sdp_batch_id: string | null;
};

type LineItemRow = {
  id: string;
  category?: string | null;
  amount_usdc: string | number;
};

type SdpDestination = {
  receiverEmail: string;
  walletAddress: string;
  walletAddressMemo?: string | null;
};

type LineItemSettlementUpdate = {
  lineItemId: string;
  status: "settled" | "processing";
  transactionHash: string | null;
  assetCode: "USDC" | null;
  assetIssuer: string | null;
  assetAmount: number | null;
};

type VerifyPayment = (
  input: StellarUsdcProofInput,
) => Promise<StellarUsdcProof>;

export async function settleLineItemsWithVerifiedPayments(input: {
  lineItems: LineItemRow[];
  payments: SdpSettledPayment[];
  expectedUsdcIssuer?: string;
  expectedDestination: string;
  horizonUrl?: string;
  verifyPayment?: VerifyPayment;
}) {
  const verifiedPayments = new Map<string, {
    transactionHash: string;
    proof: StellarUsdcProof;
  }>();
  const events: SdpGatewayEvent[] = [];
  const verifyPayment = input.verifyPayment ?? verifyStellarUsdcPayment;

  for (const payment of input.payments) {
    const lineItem = input.lineItems.find((item) => item.id === payment.lineItemId);
    if (!lineItem) continue;
    if (!input.expectedUsdcIssuer) {
      events.push({
        provider: "stellar-sdp",
        action: "sync_status",
        status: "error",
        externalId: payment.transactionHash,
        message: "Missing STELLAR_USDC_ISSUER for USDC proof verification",
      });
      continue;
    }

    try {
      const proof = await verifyPayment({
        transactionHash: payment.transactionHash,
        expectedAmount: Number(lineItem.amount_usdc),
        expectedIssuer: input.expectedUsdcIssuer,
        expectedDestination: input.expectedDestination,
        horizonUrl: input.horizonUrl,
      });
      verifiedPayments.set(payment.lineItemId, {
        transactionHash: payment.transactionHash,
        proof,
      });
      events.push({
        provider: "stellar-sdp",
        action: "sync_status",
        status: "ok",
        externalId: payment.transactionHash,
        message: "Verified USDC payment proof",
      });
    } catch (error) {
      events.push({
        provider: "stellar-sdp",
        action: "sync_status",
        status: "error",
        externalId: payment.transactionHash,
        message:
          error instanceof StellarProofError || error instanceof Error
            ? error.message
            : "USDC payment proof verification failed",
      });
    }
  }

  const lineItemUpdates: LineItemSettlementUpdate[] = input.lineItems.map((lineItem) => {
    const payment = verifiedPayments.get(lineItem.id);
    return {
      lineItemId: lineItem.id,
      status: payment ? "settled" : "processing",
      transactionHash: payment?.transactionHash ?? null,
      assetCode: payment?.proof.assetCode ?? null,
      assetIssuer: payment?.proof.assetIssuer ?? null,
      assetAmount: payment?.proof.assetAmount ?? null,
    };
  });

  return {
    allSettled: input.lineItems.every((lineItem) =>
      verifiedPayments.has(lineItem.id),
    ),
    lineItemUpdates,
    events,
  };
}

export async function syncSubmittedBatches(
  supabase: SupabaseClient,
  options: { limit?: number; gateway?: SdpGateway } = {},
) {
  const { data: batches, error } = await supabase
    .from("funding_batches")
    .select("id,initiative_id,code,sdp_batch_id")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .limit(options.limit ?? 20);
  if (error || !batches) throw new Error("Could not load submitted batches.");

  const results = [];
  for (const batch of batches as BatchRow[]) {
    results.push(await syncSubmittedBatch(supabase, batch, options.gateway));
  }
  return results;
}

export async function syncSubmittedBatch(
  supabase: SupabaseClient,
  batch: BatchRow,
  gateway: SdpGateway = createSdpGateway(),
) {
  const { data: lineItems, error: lineItemError } = await supabase
    .from("batch_line_items")
    .select("id,category,amount_usdc")
    .eq("batch_id", batch.id);
  if (lineItemError || !lineItems || lineItems.length === 0) {
    return { batchId: batch.id, status: "line-item-error" as const };
  }

  const destination = await loadSdpDestination(supabase, batch.initiative_id);
  if (!destination) return { batchId: batch.id, status: "payout-required" as const };

  let sdp;
  try {
    sdp = await gateway.syncStatus(
      { id: batch.id, code: batch.code, sdpBatchId: batch.sdp_batch_id },
      (lineItems as LineItemRow[]).map((item) => ({
        id: item.id,
        category: item.category ?? "Payment",
        amountUsdc: Number(item.amount_usdc),
        receiverEmail: destination.receiverEmail,
        walletAddress: destination.walletAddress,
        walletAddressMemo: destination.walletAddressMemo,
      })),
    );
  } catch (error) {
    await insertSdpEvents(supabase, batch.id, sdpEventsFromError(error));
    return { batchId: batch.id, status: "sdp-error" as const };
  }

  const settlement = await settleLineItemsWithVerifiedPayments({
    lineItems: lineItems as LineItemRow[],
    payments: sdp.payments,
    expectedUsdcIssuer: process.env.STELLAR_USDC_ISSUER?.trim(),
    expectedDestination: destination.walletAddress,
    horizonUrl: process.env.STELLAR_HORIZON_URL?.trim(),
  });

  const updates = await Promise.all(
    settlement.lineItemUpdates.map((update) =>
      supabase
        .from("batch_line_items")
        .update({
          status: update.status,
          transaction_hash: update.transactionHash,
          payment_asset_code: update.assetCode,
          payment_asset_issuer: update.assetIssuer,
          payment_asset_amount: update.assetAmount,
        })
        .eq("id", update.lineItemId),
    ),
  );
  if (updates.some((result) => result.error)) {
    return { batchId: batch.id, status: "line-item-error" as const };
  }

  const { error: batchUpdateError } = await supabase
    .from("funding_batches")
    .update({
      status: settlement.allSettled ? "settled" : "submitted",
      settled_at: settlement.allSettled ? new Date().toISOString() : null,
    })
    .eq("id", batch.id)
    .eq("status", "submitted");
  if (batchUpdateError) return { batchId: batch.id, status: "batch-error" as const };

  if (settlement.allSettled) {
    await supabase
      .from("funding_allocations")
      .update({ status: "settled" })
      .eq("batch_id", batch.id);
    await supabase
      .from("reconciliation_items")
      .update({ status: "reconciled", reconciled_at: new Date().toISOString() })
      .eq("batch_id", batch.id)
      .eq("status", "receipt_attached");
  }
  await insertSdpEvents(supabase, batch.id, [...sdp.events, ...settlement.events]);

  return {
    batchId: batch.id,
    status: settlement.allSettled ? "settled" as const : "submitted" as const,
  };
}

async function loadSdpDestination(
  supabase: SupabaseClient,
  initiativeId: string,
): Promise<SdpDestination | null> {
  const { data: address, error: addressError } = await supabase
    .from("payout_addresses")
    .select("address")
    .eq("initiative_id", initiativeId)
    .in("status", ["verified", "locked"])
    .limit(1)
    .maybeSingle();
  if (addressError || !address?.address) return null;

  const { data: grantee } = await supabase
    .from("grantees")
    .select("contact_profile_id")
    .eq("initiative_id", initiativeId)
    .not("contact_profile_id", "is", null)
    .limit(1)
    .maybeSingle();

  let receiverEmail = `receiver+${initiativeId}@ayra.example.org`;
  if (grantee?.contact_profile_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", grantee.contact_profile_id)
      .maybeSingle();
    if (profile?.email) receiverEmail = profile.email;
  }

  return {
    receiverEmail,
    walletAddress: address.address,
    walletAddressMemo: null,
  };
}

async function insertSdpEvents(
  supabase: SupabaseClient,
  batchId: string,
  events: SdpGatewayEvent[],
) {
  if (events.length === 0) return;
  await supabase.from("sdp_sync_events").insert(
    events.map((event) => ({
      batch_id: batchId,
      provider: event.provider,
      action: event.action,
      status: event.status,
      external_id: event.externalId ?? null,
      message: event.message ?? null,
    })),
  );
}

function sdpEventsFromError(error: unknown) {
  return error instanceof SdpGatewayError ? error.events : [];
}
