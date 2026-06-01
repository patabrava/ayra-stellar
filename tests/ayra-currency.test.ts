import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeBatchCurrencyAmounts,
  formatUsdCopRate,
} from "../src/lib/ayra/currency";

describe("AYRA batch currency conversion", () => {
  it("derives COP from USDC using the daily USD/COP rate", () => {
    assert.deepEqual(
      normalizeBatchCurrencyAmounts(
        {
          amountUsdc: 2,
          localCurrency: "COP",
          amountSource: "usdc",
        },
        4025.25,
      ),
      {
        amountUsdc: 2,
        localAmount: 8051,
        localCurrency: "COP",
      },
    );
  });

  it("derives USDC from COP when the local amount is the edited source", () => {
    assert.deepEqual(
      normalizeBatchCurrencyAmounts(
        {
          amountUsdc: 1,
          localAmount: 8051,
          localCurrency: "COP",
          amountSource: "local",
        },
        4025.25,
      ),
      {
        amountUsdc: 2,
        localAmount: 8051,
        localCurrency: "COP",
      },
    );
  });

  it("does not preserve a stale opposite amount when the edited source is clear", () => {
    assert.deepEqual(
      normalizeBatchCurrencyAmounts(
        {
          amountUsdc: 2,
          localAmount: 1,
          localCurrency: "COP",
          amountSource: "usdc",
        },
        4000,
      ),
      {
        amountUsdc: 2,
        localAmount: 8000,
        localCurrency: "COP",
      },
    );
  });

  it("formats the source rate for operator readback", () => {
    assert.equal(formatUsdCopRate(4025.2), "4,025.20");
  });
});
