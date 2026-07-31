import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDemoState,
  getProofPack,
  resolveAttributionException,
  summarizeAttributionReconciliation,
} from "../src/lib/ayra/domain";
import { buildPublicBatchCsv } from "../src/lib/ayra/export";
import { getJourneyStatus } from "../src/lib/ayra/status";

function tracedState() {
  const state = createDemoState();
  const line = state.batchLineItems.find(
    (item) => item.status === "settled" && item.transactionHash,
  )!;
  const batch = state.batches.find((item) => item.id === line.batchId)!;
  Object.assign(line, {
    sourceRecordExternalId: "VIIO-PVD-2026-03-001",
    externalId: "AYRA-LI-PVD-2026-03-001",
    nodeCode: "PVD",
    trackCode: "AYRA-PVD-REFOREST",
    milestoneCode: "M1",
    recipientCategory: "local-operator",
    attributionMatchStatus: "matched",
  });
  return { state, batch, line };
}

describe("SCF tranche 2 attribution and transparency", () => {
  it("carries stable attribution keys into the public proof projection", () => {
    const { state, batch } = tracedState();
    const receipt = getProofPack(state, batch.id).receipts[0]!;

    assert.equal(receipt.sourceRecordExternalId, "VIIO-PVD-2026-03-001");
    assert.equal(receipt.externalId, "AYRA-LI-PVD-2026-03-001");
    assert.equal(receipt.nodeCode, "PVD");
    assert.equal(receipt.trackCode, "AYRA-PVD-REFOREST");
    assert.equal(receipt.milestoneCode, "M1");
    assert.equal(receipt.recipientCategory, "local-operator");
    assert.equal(receipt.attributionMatchStatus, "matched");
  });

  it("exports a privacy-safe traced batch CSV", () => {
    const { state, batch } = tracedState();
    const csv = buildPublicBatchCsv(getProofPack(state, batch.id));

    assert.match(csv, /batch_code,period,status,stellar_network,category/);
    assert.match(csv, /testnet/);
    assert.match(csv, /VIIO-PVD-2026-03-001/);
    assert.match(csv, /AYRA-LI-PVD-2026-03-001/);
    assert.match(csv, /local-operator/);
    assert.match(csv, /matched/);
    assert.match(csv, /transaction_hash/);
    assert.doesNotMatch(csv, /private_receipt_path|recipient_name|internal_note/);
  });

  it("summarizes matched and unmatched records and resolves an exception", () => {
    const { state, batch, line } = tracedState();
    state.reconciliationItems.push({
      id: "reconciliation-attribution-exception",
      batchId: batch.id,
      lineItemId: line.id,
      status: "receipt_attached",
      attributionMatchStatus: "unmatched",
      exceptionCode: "source_record_missing",
      resolutionAction: "Attach the VIIO source-record external ID.",
      createdByProfileId: state.profiles[0]!.id,
      createdAt: "2026-07-13T12:00:00.000Z",
    });

    assert.deepEqual(summarizeAttributionReconciliation(state, batch.id), {
      matched: 0,
      unmatched: 1,
      total: 1,
    });

    const resolved = resolveAttributionException(
      state,
      "reconciliation-attribution-exception",
      "Linked verified VIIO source record.",
    );
    const item = resolved.reconciliationItems.find(
      (entry) => entry.id === "reconciliation-attribution-exception",
    )!;
    assert.equal(item.attributionMatchStatus, "matched");
    assert.equal(item.exceptionCode, undefined);
    assert.equal(item.resolutionAction, "Linked verified VIIO source record.");
    assert.equal(summarizeAttributionReconciliation(resolved, batch.id).matched, 1);
  });

  it("confirms the operator attribution resolution", () => {
    assert.equal(
      getJourneyStatus("admin", "attribution-resolved")?.title,
      "The attribution exception is resolved.",
    );
  });
});
