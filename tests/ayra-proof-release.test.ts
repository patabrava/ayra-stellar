import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDemoState, getProofPack } from "../src/lib/ayra/domain";
import {
  assertProofPackReleaseEligible,
  canonicalJson,
  createProofPackRelease,
  verifyProofPackRelease,
} from "../src/lib/ayra/proof-release";

function eligibleProof() {
  const state = createDemoState();
  const batch = state.batches.find((item) => item.code === "PV-REFOREST-APR26")!;
  batch.status = "settled";
  const line = state.batchLineItems.find(
    (item) => item.batchId === batch.id && item.transactionHash,
  )!;
  line.attributionMatchStatus = "matched";
  return getProofPack(state, batch.id);
}

describe("AYRA immutable proof releases", () => {
  it("canonicalizes object keys and omits undefined values deterministically", () => {
    assert.equal(
      canonicalJson({ z: 1, nested: { b: undefined, a: "ok" }, a: 2 }),
      '{"a":2,"nested":{"a":"ok"},"z":1}',
    );
  });

  it("creates a digest-verifiable release for a cleared, matched proof pack", () => {
    const release = createProofPackRelease(eligibleProof(), {
      version: 1,
      appCommit: "abc123",
      deploymentId: "dpl_123",
    });

    assert.equal(release.payload.schemaVersion, "1.0");
    assert.equal(release.payload.releaseVersion, 1);
    assert.equal(release.payload.stellarNetwork, "testnet");
    assert.match(release.sha256, /^[a-f0-9]{64}$/);
    assert.equal(verifyProofPackRelease(release.payload, release.sha256), true);
    assert.equal(
      verifyProofPackRelease(
        { ...release.payload, periodLabel: "tampered" },
        release.sha256,
      ),
      false,
    );
  });

  it("rejects in-flight, unmatched, and wrong-network issuer evidence", () => {
    const proof = eligibleProof();
    assert.throws(
      () => assertProofPackReleaseEligible({ ...proof, publicLabel: "In flight" }),
      /settled batch/,
    );
    assert.throws(
      () =>
        assertProofPackReleaseEligible({
          ...proof,
          receipts: proof.receipts.map((item) => ({
            ...item,
            attributionMatchStatus: "unmatched",
          })),
        }),
      /matched attribution/,
    );
    assert.throws(
      () =>
        assertProofPackReleaseEligible({
          ...proof,
          stellarNetwork: "pubnet",
        }),
      /USDC issuer does not match pubnet/,
    );
  });
});
