export type SdpBatchRef = {
  id: string;
  code: string;
  sdpBatchId?: string | null;
};

export type SdpLineItemRef = {
  id: string;
  category: string;
  amountUsdc: number;
};

export type SdpGatewayEvent = {
  provider: "mock" | "stellar-sdp";
  action: "create_batch" | "upload_instructions" | "mark_ready" | "sync_status";
  status: "ok" | "error";
  externalId?: string;
  message?: string;
};

export type SdpSubmittedPayment = {
  lineItemId: string;
  paymentId: string;
};

export type SdpSettledPayment = {
  lineItemId: string;
  transactionHash: string;
};

export type SdpSubmitResult = {
  externalBatchId: string;
  payments: SdpSubmittedPayment[];
  events: SdpGatewayEvent[];
};

export type SdpSyncResult = {
  payments: SdpSettledPayment[];
  events: SdpGatewayEvent[];
};

export type SdpGateway = {
  submitBatch: (
    batch: SdpBatchRef,
    lineItems: SdpLineItemRef[],
  ) => Promise<SdpSubmitResult>;
  syncStatus: (
    batch: SdpBatchRef,
    lineItems: SdpLineItemRef[],
  ) => Promise<SdpSyncResult>;
};

function idCode(code: string) {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function createMockSdpGateway(): SdpGateway {
  return {
    async submitBatch(batch, lineItems) {
      const code = idCode(batch.code);
      const externalBatchId = `mock-sdp-${code}`;
      return {
        externalBatchId,
        payments: lineItems.map((lineItem, index) => ({
          lineItemId: lineItem.id,
          paymentId: `mock-payment-${code}-${index + 1}`,
        })),
        events: [
          {
            provider: "mock",
            action: "create_batch",
            status: "ok",
            externalId: externalBatchId,
          },
          {
            provider: "mock",
            action: "upload_instructions",
            status: "ok",
            externalId: externalBatchId,
            message: `${lineItems.length} instruction(s) uploaded`,
          },
          {
            provider: "mock",
            action: "mark_ready",
            status: "ok",
            externalId: externalBatchId,
          },
        ],
      };
    },
    async syncStatus(batch, lineItems) {
      const code = idCode(batch.code);
      return {
        payments: lineItems.map((lineItem, index) => ({
          lineItemId: lineItem.id,
          transactionHash: `mock-tx-${code}-${index + 1}`,
        })),
        events: [
          {
            provider: "mock",
            action: "sync_status",
            status: "ok",
            externalId: batch.sdpBatchId ?? `mock-sdp-${code}`,
            message: `${lineItems.length} payment(s) settled`,
          },
        ],
      };
    },
  };
}

export function createSdpGateway() {
  return createMockSdpGateway();
}
