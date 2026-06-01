"use client";

import { useMemo, useState } from "react";

import {
  formatUsdCopRate,
  normalizeBatchCurrencyAmounts,
  type BatchAmountSource,
} from "@/lib/ayra/currency";

type BatchCurrencyFieldsProps = {
  usdCopRate: number;
  rateUpdatedAt?: string;
  defaultAmountUsdc: number;
};

export function BatchCurrencyFields({
  usdCopRate,
  rateUpdatedAt,
  defaultAmountUsdc,
}: BatchCurrencyFieldsProps) {
  const initial = useMemo(
    () =>
      normalizeBatchCurrencyAmounts(
        {
          amountUsdc: defaultAmountUsdc,
          localCurrency: "COP",
          amountSource: "usdc",
        },
        usdCopRate,
      ),
    [defaultAmountUsdc, usdCopRate],
  );
  const [amountUsdc, setAmountUsdc] = useState(formatAmount(initial.amountUsdc));
  const [localAmount, setLocalAmount] = useState(String(initial.localAmount));
  const [localCurrency, setLocalCurrency] = useState<"COP" | "USD">("COP");
  const [amountSource, setAmountSource] = useState<BatchAmountSource>("usdc");

  const updateAmounts = (
    nextValue: string,
    nextSource: BatchAmountSource,
    nextCurrency = localCurrency,
  ) => {
    setAmountSource(nextSource);
    if (nextSource === "usdc") {
      setAmountUsdc(nextValue);
    } else {
      setLocalAmount(nextValue);
    }

    const numericValue = parseAmount(nextValue);
    if (!numericValue) return;

    const normalized = normalizeBatchCurrencyAmounts(
      {
        amountUsdc: nextSource === "usdc" ? numericValue : parseAmount(amountUsdc),
        localAmount: nextSource === "local" ? numericValue : parseAmount(localAmount),
        localCurrency: nextCurrency,
        amountSource: nextSource,
      },
      usdCopRate,
    );
    setAmountUsdc(formatAmount(normalized.amountUsdc));
    setLocalAmount(
      nextCurrency === "USD"
        ? formatAmount(normalized.localAmount)
        : String(normalized.localAmount),
    );
  };

  const onCurrencyChange = (value: "COP" | "USD") => {
    setLocalCurrency(value);
    const sourceValue = amountSource === "usdc" ? amountUsdc : localAmount;
    updateAmounts(sourceValue, amountSource, value);
  };

  return (
    <div className="grid gap-2">
      <div className="grid-3">
        <div className="field">
          <label htmlFor="amountUsdc">USDC</label>
          <input
            id="amountUsdc"
            inputMode="decimal"
            name="amountUsdc"
            onChange={(event) => updateAmounts(event.target.value, "usdc")}
            value={amountUsdc}
          />
        </div>
        <div className="field">
          <label htmlFor="localAmount">{localCurrency}</label>
          <input
            id="localAmount"
            inputMode="decimal"
            name="localAmount"
            onChange={(event) => updateAmounts(event.target.value, "local")}
            value={localAmount}
          />
        </div>
        <div className="field">
          <label htmlFor="localCurrency">Currency</label>
          <select
            id="localCurrency"
            name="localCurrency"
            onChange={(event) => onCurrencyChange(event.target.value as "COP" | "USD")}
            value={localCurrency}
          >
            <option>COP</option>
            <option>USD</option>
          </select>
        </div>
      </div>
      <input name="amountSource" type="hidden" value={amountSource} />
      <p className="text-xs leading-5 text-ink-muted">
        Daily market rate: 1 USD = {formatUsdCopRate(usdCopRate)} COP
        {rateUpdatedAt ? `, ${rateUpdatedAt}` : ""}.
      </p>
    </div>
  );
}

function parseAmount(value: string) {
  const parsed = Number(value.replaceAll(",", "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
