export const USD_COP_RATE_SOURCE_URL = "https://open.er-api.com/v6/latest/USD";

export type BatchAmountSource = "usdc" | "local";

export type BatchCurrencyInput = {
  amountUsdc?: number;
  localAmount?: number;
  localCurrency: "COP" | "USD";
  amountSource?: BatchAmountSource;
};

export type BatchCurrencyAmounts = {
  amountUsdc: number;
  localAmount: number;
  localCurrency: "COP" | "USD";
};

type ExchangeRateApiResponse = {
  result?: string;
  rates?: {
    COP?: number;
  };
  time_last_update_utc?: string;
};

export async function getUsdCopRate() {
  const configuredRate = Number(process.env.AYRA_USD_COP_RATE ?? "");
  if (Number.isFinite(configuredRate) && configuredRate > 0) {
    return {
      rate: configuredRate,
      updatedAt: "configured rate",
    };
  }

  const response = await fetch(USD_COP_RATE_SOURCE_URL, {
    next: { revalidate: 60 * 60 * 12 },
  });

  if (!response.ok) {
    throw new Error("USD/COP exchange rate request failed.");
  }

  const payload = (await response.json()) as ExchangeRateApiResponse;
  const rate = payload.rates?.COP;
  if (payload.result !== "success" || !isPositiveFinite(rate)) {
    throw new Error("USD/COP exchange rate response was invalid.");
  }

  return {
    rate,
    updatedAt: payload.time_last_update_utc,
  };
}

export function normalizeBatchCurrencyAmounts(
  input: BatchCurrencyInput,
  usdCopRate: number,
): BatchCurrencyAmounts {
  if (!isPositiveFinite(usdCopRate)) {
    throw new Error("USD/COP exchange rate must be a positive number.");
  }

  const amountUsdc = positiveOrUndefined(input.amountUsdc);
  const localAmount = positiveOrUndefined(input.localAmount);
  const source = resolveAmountSource(input.amountSource, amountUsdc, localAmount);

  if (input.localCurrency === "USD") {
    const value = source === "local" ? localAmount : amountUsdc;
    if (!isPositiveFinite(value)) {
      throw new Error("A positive USD or local amount is required.");
    }
    return {
      amountUsdc: roundCurrency(value),
      localAmount: roundCurrency(value),
      localCurrency: "USD",
    };
  }

  if (source === "local") {
    if (!isPositiveFinite(localAmount)) {
      throw new Error("A positive COP amount is required.");
    }
    return {
      amountUsdc: roundCurrency(localAmount / usdCopRate),
      localAmount: roundWhole(localAmount),
      localCurrency: "COP",
    };
  }

  if (!isPositiveFinite(amountUsdc)) {
    throw new Error("A positive USDC amount is required.");
  }

  return {
    amountUsdc: roundCurrency(amountUsdc),
    localAmount: roundWhole(amountUsdc * usdCopRate),
    localCurrency: "COP",
  };
}

export function formatUsdCopRate(rate: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(rate);
}

function resolveAmountSource(
  source: BatchAmountSource | undefined,
  amountUsdc: number | undefined,
  localAmount: number | undefined,
) {
  if (source === "local" && isPositiveFinite(localAmount)) return "local";
  if (source === "usdc" && isPositiveFinite(amountUsdc)) return "usdc";
  if (isPositiveFinite(amountUsdc)) return "usdc";
  if (isPositiveFinite(localAmount)) return "local";
  throw new Error("A positive amount is required.");
}

function positiveOrUndefined(value: number | undefined) {
  return isPositiveFinite(value) ? value : undefined;
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundWhole(value: number) {
  return Math.round(value);
}
