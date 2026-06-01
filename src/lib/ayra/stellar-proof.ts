export type StellarUsdcProofInput = {
  transactionHash: string;
  expectedAmount: number;
  expectedIssuer?: string;
  expectedDestination?: string;
  horizonUrl?: string;
};

export type StellarUsdcProof = {
  assetCode: "USDC";
  assetIssuer: string;
  assetAmount: number;
};

type HorizonOperationsResponse = {
  _embedded?: {
    records?: HorizonOperation[];
  };
};

type HorizonOperation = {
  type?: string;
  transaction_successful?: boolean;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  amount?: string;
  to?: string;
};

const DEFAULT_HORIZON_URL = "https://horizon-testnet.stellar.org";
const STROOP_SCALE = 10_000_000;

export class StellarProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StellarProofError";
  }
}

export async function verifyStellarUsdcPayment(
  input: StellarUsdcProofInput,
  fetchImpl: typeof fetch = fetch,
): Promise<StellarUsdcProof> {
  if (!/^[a-f0-9]{64}$/i.test(input.transactionHash)) {
    throw new StellarProofError("Invalid Stellar transaction hash.");
  }

  const expectedAmountStroops = numberToStroops(input.expectedAmount);
  const horizonUrl = (input.horizonUrl ?? DEFAULT_HORIZON_URL).replace(/\/+$/, "");
  const response = await fetchImpl(
    `${horizonUrl}/transactions/${input.transactionHash}/operations`,
    { method: "GET" },
  );

  if (!response.ok) {
    throw new StellarProofError(
      `Horizon lookup failed with status ${response.status}.`,
    );
  }

  const json = (await response.json()) as HorizonOperationsResponse;
  const successfulPayments = (json._embedded?.records ?? []).filter(
    (record) => record.type === "payment" && record.transaction_successful === true,
  );

  if (successfulPayments.length === 0) {
    throw new StellarProofError("No successful payment operation found.");
  }

  const usdcPayments = successfulPayments.filter(
    (record) =>
      (record.asset_type === "credit_alphanum4" ||
        record.asset_type === "credit_alphanum12") &&
      record.asset_code === "USDC",
  );
  if (usdcPayments.length === 0) {
    throw new StellarProofError("Expected USDC payment, received another Stellar asset.");
  }

  const issuerPayments = input.expectedIssuer
    ? usdcPayments.filter((record) => record.asset_issuer === input.expectedIssuer)
    : usdcPayments;
  if (issuerPayments.length === 0) {
    throw new StellarProofError("Unexpected USDC issuer.");
  }

  const destinationPayments = input.expectedDestination
    ? issuerPayments.filter((record) => record.to === input.expectedDestination)
    : issuerPayments;
  if (destinationPayments.length === 0) {
    throw new StellarProofError("Unexpected USDC destination.");
  }

  for (const payment of destinationPayments) {
    const paymentAmountStroops = stringToStroops(payment.amount);
    if (paymentAmountStroops === expectedAmountStroops) {
      return {
        assetCode: "USDC",
        assetIssuer: requireIssuer(payment.asset_issuer),
        assetAmount: Number(paymentAmountStroops) / STROOP_SCALE,
      };
    }
  }

  throw new StellarProofError("USDC amount mismatch.");
}

function requireIssuer(value: string | undefined) {
  if (!value) {
    throw new StellarProofError("USDC payment is missing an issuer.");
  }
  return value;
}

function numberToStroops(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new StellarProofError("Expected amount must be a non-negative finite number.");
  }

  const scaled = value * STROOP_SCALE;
  const rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 1e-6) {
    throw new StellarProofError(
      "Expected amount must resolve to an exact 7-decimal Stellar amount.",
    );
  }

  return BigInt(rounded);
}

function stringToStroops(value: string | undefined) {
  if (!value) {
    throw new StellarProofError("USDC payment is missing an amount.");
  }

  const match = /^(\d+)(?:\.(\d{1,7}))?$/.exec(value);
  if (!match) {
    throw new StellarProofError("USDC payment amount is not a valid Stellar amount.");
  }

  const whole = match[1];
  const fractional = (match[2] ?? "").padEnd(7, "0");
  return BigInt(whole) * BigInt(STROOP_SCALE) + BigInt(fractional);
}
