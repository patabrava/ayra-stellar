import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdminCsv,
  buildStewardCsv,
} from "../src/lib/ayra/export";
import {
  createMockSdpGateway,
} from "../src/lib/ayra/sdp";

describe("AYRA SDP gateway and CSV exports", () => {
  it("maps mock SDP submission and settlement through stable external ids", async () => {
    const gateway = createMockSdpGateway();
    const batch = { id: "batch-1", code: "PV-TEST-MAY26" };
    const lineItems = [
      { id: "line-1", category: "Crew wages", amountUsdc: 1200 },
      { id: "line-2", category: "Tools", amountUsdc: 300 },
    ];

    const submitted = await gateway.submitBatch(batch, lineItems);
    assert.equal(submitted.externalBatchId, "mock-sdp-pv-test-may26");
    assert.deepEqual(
      submitted.events.map((event) => event.action),
      ["create_batch", "upload_instructions", "mark_ready"],
    );
    assert.equal(submitted.payments[1]?.paymentId, "mock-payment-pv-test-may26-2");

    const settled = await gateway.syncStatus({
      ...batch,
      sdpBatchId: submitted.externalBatchId,
    }, lineItems);
    assert.equal(settled.events[0]?.action, "sync_status");
    assert.match(settled.payments[0]?.transactionHash ?? "", /^mock-tx-pv-test-may26-1/);
  });

  it("exports admin and steward CSV without leaking private receipt paths publicly", () => {
    const rows = buildAdminCsv({
      batches: [
        {
          code: "PV-TEST-MAY26",
          periodLabel: "May 2026",
          status: "settled",
          initiativeName: "Reforestation",
          category: "Crew wages",
          amountUsdc: 1200,
          localAmount: 4_680_000,
          localCurrency: "COP",
          sdpPaymentId: "mock-payment-1",
          transactionHash: "mock-tx-1",
          privateReceiptPath: "receipts/batch-1/crew.pdf",
        },
      ],
    });
    assert.match(rows, /private_receipt_path/);
    assert.match(rows, /receipts\/batch-1\/crew\.pdf/);

    const stewardRows = buildStewardCsv({
      rows: [
        {
          code: "PV-TEST-MAY26",
          periodLabel: "May 2026",
          status: "settled",
          category: "Crew wages",
          amountUsdc: 1200,
          localAmount: 4_680_000,
          localCurrency: "COP",
          sdpPaymentId: "mock-payment-1",
          transactionHash: "mock-tx-1",
        },
      ],
    });
    assert.match(stewardRows, /PV-TEST-MAY26/);
    assert.doesNotMatch(stewardRows, /private_receipt/);
  });
});
