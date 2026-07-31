import type { AyraState, ProofPack } from "@/lib/ayra/domain";

type AdminCsvRow = {
  code: string;
  periodLabel: string;
  status: string;
  initiativeName: string;
  category: string;
  amountUsdc: number;
  localAmount: number;
  localCurrency: string;
  sdpPaymentId?: string;
  transactionHash?: string;
  privateReceiptPath?: string;
};

type StewardCsvRow = Omit<AdminCsvRow, "initiativeName" | "privateReceiptPath">;

function csvEscape(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

export function buildAdminCsv({ batches }: { batches: AdminCsvRow[] }) {
  const headers = [
    "batch_code",
    "period",
    "status",
    "initiative",
    "category",
    "amount_usdc",
    "local_amount",
    "local_currency",
    "sdp_payment_id",
    "transaction_hash",
    "private_receipt_path",
  ];
  return toCsv(
    headers,
    batches.map((row) => ({
      batch_code: row.code,
      period: row.periodLabel,
      status: row.status,
      initiative: row.initiativeName,
      category: row.category,
      amount_usdc: row.amountUsdc,
      local_amount: row.localAmount,
      local_currency: row.localCurrency,
      sdp_payment_id: row.sdpPaymentId,
      transaction_hash: row.transactionHash,
      private_receipt_path: row.privateReceiptPath,
    })),
  );
}

export function buildStewardCsv({ rows }: { rows: StewardCsvRow[] }) {
  const headers = [
    "batch_code",
    "period",
    "status",
    "category",
    "amount_usdc",
    "local_amount",
    "local_currency",
    "sdp_payment_id",
    "transaction_hash",
  ];
  return toCsv(
    headers,
    rows.map((row) => ({
      batch_code: row.code,
      period: row.periodLabel,
      status: row.status,
      category: row.category,
      amount_usdc: row.amountUsdc,
      local_amount: row.localAmount,
      local_currency: row.localCurrency,
      sdp_payment_id: row.sdpPaymentId,
      transaction_hash: row.transactionHash,
    })),
  );
}

export function buildPublicBatchCsv(proof: ProofPack) {
  const headers = [
    "batch_code",
    "period",
    "status",
    "stellar_network",
    "category",
    "amount_usdc",
    "local_amount",
    "local_currency",
    "source_record_external_id",
    "line_item_external_id",
    "node_code",
    "track_code",
    "milestone_code",
    "recipient_category",
    "attribution_match_status",
    "transaction_hash",
  ];
  return toCsv(
    headers,
    proof.receipts.map((receipt) => ({
      batch_code: proof.batchCode,
      period: proof.periodLabel,
      status: proof.publicLabel,
      stellar_network: proof.stellarNetwork,
      category: receipt.category,
      amount_usdc: receipt.amountUsdc,
      local_amount: receipt.localAmount,
      local_currency: receipt.localCurrency,
      source_record_external_id: receipt.sourceRecordExternalId,
      line_item_external_id: receipt.externalId,
      node_code: receipt.nodeCode,
      track_code: receipt.trackCode,
      milestone_code: receipt.milestoneCode,
      recipient_category: receipt.recipientCategory,
      attribution_match_status: receipt.attributionMatchStatus,
      transaction_hash: receipt.transactionHash,
    })),
  );
}

export function adminCsvFromState(state: AyraState) {
  const receiptByLine = new Map(
    state.reconciliationItems.map((item) => [item.lineItemId, item.privateReceiptPath]),
  );
  return buildAdminCsv({
    batches: state.batchLineItems.map((line) => {
      const batch = state.batches.find((item) => item.id === line.batchId);
      const initiative = state.initiatives.find(
        (item) => item.id === batch?.initiativeId,
      );
      return {
        code: batch?.code ?? line.batchId,
        periodLabel: batch?.periodLabel ?? "",
        status: batch?.status ?? line.status,
        initiativeName: initiative?.name ?? "",
        category: line.category,
        amountUsdc: line.amountUsdc,
        localAmount: line.localAmount,
        localCurrency: line.localCurrency,
        sdpPaymentId: line.sdpPaymentId,
        transactionHash: line.transactionHash,
        privateReceiptPath: receiptByLine.get(line.id),
      };
    }),
  });
}

export function stewardCsvFromState(state: AyraState, initiativeIds: string[]) {
  const scoped = new Set(initiativeIds);
  const batches = state.batches.filter((batch) => scoped.has(batch.initiativeId));
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));
  return buildStewardCsv({
    rows: state.batchLineItems
      .filter((line) => batchById.has(line.batchId))
      .map((line) => {
        const batch = batchById.get(line.batchId);
        return {
          code: batch?.code ?? line.batchId,
          periodLabel: batch?.periodLabel ?? "",
          status: batch?.status ?? line.status,
          category: line.category,
          amountUsdc: line.amountUsdc,
          localAmount: line.localAmount,
          localCurrency: line.localCurrency,
          sdpPaymentId: line.sdpPaymentId,
          transactionHash: line.transactionHash,
        };
      }),
  });
}
