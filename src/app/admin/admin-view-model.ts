import { getUsdCopRate } from "@/lib/ayra/currency";
import { getProofPack, type AyraState, type ProofPack } from "@/lib/ayra/domain";

export type AdminViewModel = Awaited<ReturnType<typeof buildAdminViewModel>>;

export type AdminProofOption = {
  batchId: string;
  batchCode: string;
  periodLabel: string;
  sponsorName?: string;
  publicLabel: ProofPack["publicLabel"];
  receiptCount: number;
  totalUsdc: number;
  createdAt: string;
};

export async function buildAdminViewModel(
  state: AyraState,
  selectedProofBatchId?: string,
) {
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
  const proofOptions = getAdminProofOptions(state);
  const selectedProofOption =
    proofOptions.find((option) => option.batchId === selectedProofBatchId) ??
    proofOptions[0];
  const lineItemBatch =
    state.batches.find((batch) => batch.code === "PV-REFOREST-APR26") ??
    state.batches.find((batch) => batch.status === "submitted") ??
    state.batches[0]!;
  const proof = selectedProofOption
    ? getProofPack(state, selectedProofOption.batchId)
    : null;
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
    proofOptions,
    selectedProofBatchId: selectedProofOption?.batchId ?? null,
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

export function getAdminProofOptions(state: AyraState): AdminProofOption[] {
  return state.batches
    .filter((batch) => batch.status === "submitted" || batch.status === "settled")
    .flatMap((batch) => {
      const proof = getProofPack(state, batch.id);
      if (proof.receipts.length === 0) return [];

      return [
        {
          batchId: proof.batchId,
          batchCode: proof.batchCode,
          periodLabel: proof.periodLabel,
          sponsorName: proof.sponsorName,
          publicLabel: proof.publicLabel,
          receiptCount: proof.receipts.length,
          totalUsdc: proof.receipts.reduce((sum, item) => sum + item.amountUsdc, 0),
          createdAt: batch.createdAt,
        },
      ];
    })
    .sort((a, b) => {
      const byCreatedAt = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      return byCreatedAt || a.batchCode.localeCompare(b.batchCode);
    });
}
