import { createHash, timingSafeEqual } from "node:crypto";

import type { ProofPack } from "@/lib/ayra/domain";
import { resolveStellarNetworkConfig } from "@/lib/ayra/stellar-network";

export type ProofPackReleasePayload = ProofPack & {
  schemaVersion: "1.0";
  releaseVersion: number;
  appCommit: string;
  deploymentId: string | null;
};

export function assertProofPackReleaseEligible(proof: ProofPack) {
  if (proof.publicLabel !== "Cleared") {
    throw new Error("Proof releases require a settled batch.");
  }
  if (proof.receipts.length === 0) {
    throw new Error("Proof releases require at least one verified receipt.");
  }

  const config = resolveStellarNetworkConfig(proof.stellarNetwork, {});
  for (const receipt of proof.receipts) {
    if (!receipt.transactionHash || !/^[a-f0-9]{64}$/i.test(receipt.transactionHash)) {
      throw new Error("Every proof release receipt requires a real transaction hash.");
    }
    if (receipt.assetCode !== "USDC") {
      throw new Error("Every proof release receipt must be USDC.");
    }
    if (receipt.assetIssuer !== config.usdcIssuer) {
      throw new Error(
        `Receipt USDC issuer does not match ${proof.stellarNetwork}.`,
      );
    }
    if (receipt.assetAmount !== receipt.amountUsdc) {
      throw new Error("Receipt asset amount does not match the public line item.");
    }
    if (receipt.attributionMatchStatus !== "matched") {
      throw new Error("Every proof release receipt requires matched attribution.");
    }
  }
}

export function createProofPackRelease(
  proof: ProofPack,
  input: {
    version: number;
    appCommit: string;
    deploymentId?: string;
  },
) {
  assertProofPackReleaseEligible(proof);
  if (!Number.isSafeInteger(input.version) || input.version < 1) {
    throw new Error("Proof release version must be a positive integer.");
  }
  if (!input.appCommit.trim()) {
    throw new Error("Proof releases require an application commit.");
  }

  const payload: ProofPackReleasePayload = {
    schemaVersion: "1.0",
    releaseVersion: input.version,
    appCommit: input.appCommit.trim(),
    deploymentId: input.deploymentId?.trim() || null,
    ...proof,
  };
  return {
    payload,
    sha256: sha256(payload),
  };
}

export function verifyProofPackRelease(
  payload: ProofPackReleasePayload,
  expectedSha256: string,
) {
  if (!/^[a-f0-9]{64}$/i.test(expectedSha256)) return false;
  const actual = Buffer.from(sha256(payload), "hex");
  const expected = Buffer.from(expectedSha256, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalValue(value));
}

function sha256(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item === undefined ? null : canonicalValue(item),
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalValue(item)]),
    );
  }
  return value;
}
