import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { settleLineItemsWithVerifiedPayments } from "../src/lib/ayra/batch-sync";

const lineItems = [
  { id: "line-1", amount_usdc: "1" },
  { id: "line-2", amount_usdc: "2" },
];

describe("AYRA batch sync", () => {
  it("keeps a submitted batch open when any mapped payment fails Horizon proof", async () => {
    const result = await settleLineItemsWithVerifiedPayments({
      lineItems,
      payments: [
        { lineItemId: "line-1", transactionHash: "a".repeat(64) },
        { lineItemId: "line-2", transactionHash: "b".repeat(64) },
      ],
      expectedUsdcIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      expectedDestination: "GDESTINATION",
      verifyPayment: async ({ transactionHash }) => {
        if (transactionHash === "b".repeat(64)) {
          throw new Error("No successful payment operation found.");
        }
        return {
          assetCode: "USDC",
          assetIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
          assetAmount: 1,
        };
      },
    });

    assert.equal(result.allSettled, false);
    assert.deepEqual(
      result.lineItemUpdates.map((update) => ({
        id: update.lineItemId,
        status: update.status,
        transactionHash: update.transactionHash,
      })),
      [
        { id: "line-1", status: "settled", transactionHash: "a".repeat(64) },
        { id: "line-2", status: "processing", transactionHash: null },
      ],
    );
    assert.match(result.events[1]?.message ?? "", /No successful payment operation/);
  });

  it("uses the stored pubnet identity for issuer and Horizon verification", async () => {
    const calls: Array<{ expectedIssuer?: string; horizonUrl?: string }> = [];
    const result = await settleLineItemsWithVerifiedPayments({
      lineItems: [lineItems[0]!],
      payments: [{ lineItemId: "line-1", transactionHash: "a".repeat(64) }],
      network: "pubnet",
      expectedDestination: "GDESTINATION",
      verifyPayment: async (input) => {
        calls.push({
          expectedIssuer: input.expectedIssuer,
          horizonUrl: input.horizonUrl,
        });
        return {
          assetCode: "USDC",
          assetIssuer: input.expectedIssuer!,
          assetAmount: 1,
        };
      },
    });

    assert.equal(result.allSettled, true);
    assert.deepEqual(calls, [
      {
        expectedIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        horizonUrl: "https://horizon.stellar.org",
      },
    ]);
  });
});
