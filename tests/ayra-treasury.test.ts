import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AyraState } from "@/lib/ayra/domain";
import {
  buildTreasuryChecks,
  summarizeRecipientReadiness,
} from "@/lib/ayra/treasury";

describe("admin treasury readiness", () => {
  it("requires distribution USDC before live batch readiness", () => {
    const checks = buildTreasuryChecks({
      apiHealth: { url: "https://sdp-mainnet-api.ayra.haus/health", ok: true, status: 200 },
      dashboardHealth: {
        url: "https://sdp-mainnet-dashboard.ayra.haus",
        ok: true,
        status: 200,
      },
      distribution: {
        exists: true,
        xlmBalance: 26.9040905,
        usdcBalance: 0,
        hasCircleUsdcTrustline: true,
      },
      recipient: { readyCount: 1, pendingCount: 0, missingCount: 0 },
      releaseSwitchEnabled: true,
    });

    assert.deepEqual(
      checks.filter((check) => check.status === "blocked").map((check) => check.label),
      ["Distribution USDC"],
    );
  });

  it("counts only verified or locked pubnet payout addresses as ready", () => {
    const state = {
      payoutAddresses: [
        {
          id: "pending-pubnet",
          initiativeId: "initiative",
          address: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          stellarNetwork: "pubnet",
          status: "pending",
          submittedAt: "2026-07-31T00:00:00.000Z",
        },
        {
          id: "ready-pubnet",
          initiativeId: "initiative",
          address: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
          stellarNetwork: "pubnet",
          status: "verified",
          submittedAt: "2026-07-31T00:00:00.000Z",
          verifiedAt: "2026-07-31T00:01:00.000Z",
        },
        {
          id: "ready-testnet",
          initiativeId: "initiative",
          address: "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
          stellarNetwork: "testnet",
          status: "locked",
          submittedAt: "2026-07-31T00:00:00.000Z",
          verifiedAt: "2026-07-31T00:01:00.000Z",
        },
      ],
    } as AyraState;

    assert.deepEqual(summarizeRecipientReadiness(state, "pubnet"), {
      readyCount: 1,
      pendingCount: 1,
      missingCount: 0,
    });
  });
});
