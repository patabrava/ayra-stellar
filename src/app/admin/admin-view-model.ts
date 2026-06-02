import { getUsdCopRate } from "@/lib/ayra/currency";
import { getProofPack, type AyraState } from "@/lib/ayra/domain";

export type AdminViewModel = Awaited<ReturnType<typeof buildAdminViewModel>>;

export async function buildAdminViewModel(state: AyraState) {
  const providencia =
    state.tracks.find((item) => item.slug === "providencia") ?? state.tracks[0]!;
  const reforest =
    state.initiatives.find((item) => item.slug === "reforestation") ??
    state.initiatives[0]!;
  const defaultSponsor =
    state.sponsors.find((item) => item.slug === "climate-future") ??
    state.sponsors[0];
  const pendingApplications = state.applications.filter(
    (item) => item.status === "pending",
  );
  const pendingUpdates = state.updates.filter((item) => item.status === "pending");
  const pendingAddresses = state.payoutAddresses.filter(
    (item) => item.status === "pending",
  );
  const allocated = state.batchLineItems.reduce(
    (sum, item) => sum + item.amountUsdc,
    0,
  );
  const committed = state.batches
    .filter((batch) => batch.status === "submitted" || batch.status === "settled")
    .reduce((sum, batch) => sum + batchTotal(state, batch.id), 0);
  const proofBatch =
    state.batches.find((batch) => batch.status === "settled") ?? state.batches[0]!;
  const lineItemBatch =
    state.batches.find((batch) => batch.code === "PV-REFOREST-APR26") ??
    state.batches.find((batch) => batch.status === "submitted") ??
    state.batches[0]!;
  const proof = getProofPack(state, proofBatch.id);
  let usdCopRate: Awaited<ReturnType<typeof getUsdCopRate>> | null = null;
  try {
    usdCopRate = await getUsdCopRate();
  } catch {
    usdCopRate = null;
  }

  return {
    providencia,
    reforest,
    defaultSponsor,
    pendingApplications,
    pendingUpdates,
    pendingAddresses,
    allocated,
    committed,
    proof,
    lineItemBatch,
    usdCopRate,
    paymentRailLabel:
      process.env.AYRA_SDP_MODE === "testnet"
        ? "Stellar testnet"
        : "Provider setup pending",
  };
}

export function batchTotal(state: AyraState, batchId: string) {
  return state.batchLineItems
    .filter((item) => item.batchId === batchId)
    .reduce((sum, item) => sum + item.amountUsdc, 0);
}
