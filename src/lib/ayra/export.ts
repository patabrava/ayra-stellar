import type { AyraState } from "@/lib/ayra/domain";

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
