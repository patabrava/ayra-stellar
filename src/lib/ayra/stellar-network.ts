export type StellarNetwork = "testnet" | "pubnet";

export const STELLAR_TESTNET_USDC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
export const CIRCLE_STELLAR_MAINNET_USDC_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

type StellarEnvironment = Record<string, string | undefined>;

export type StellarNetworkConfig = {
  network: StellarNetwork;
  horizonUrl: string;
  usdcIssuer: string;
  explorerNetwork: "testnet" | "public";
};

const canonicalConfig: Record<StellarNetwork, StellarNetworkConfig> = {
  testnet: {
    network: "testnet",
    horizonUrl: "https://horizon-testnet.stellar.org",
    usdcIssuer: STELLAR_TESTNET_USDC_ISSUER,
    explorerNetwork: "testnet",
  },
  pubnet: {
    network: "pubnet",
    horizonUrl: "https://horizon.stellar.org",
    usdcIssuer: CIRCLE_STELLAR_MAINNET_USDC_ISSUER,
    explorerNetwork: "public",
  },
};

export function isStellarNetwork(value: unknown): value is StellarNetwork {
  return value === "testnet" || value === "pubnet";
}

export function requireStellarNetwork(value: unknown): StellarNetwork {
  if (!isStellarNetwork(value)) {
    throw new Error("Stellar network must be testnet or pubnet.");
  }
  return value;
}

export function getConfiguredStellarNetwork(
  env: StellarEnvironment = process.env,
): StellarNetwork {
  const value = env.AYRA_STELLAR_NETWORK?.trim() || "testnet";
  if (!isStellarNetwork(value)) {
    throw new Error("AYRA_STELLAR_NETWORK must be testnet or pubnet.");
  }
  return value;
}

export function resolveStellarNetworkConfig(
  network: StellarNetwork,
  env: StellarEnvironment = process.env,
): StellarNetworkConfig {
  const canonical = canonicalConfig[network];
  const horizonOverride = normalizeUrl(env.STELLAR_HORIZON_URL);
  const issuerOverride = env.STELLAR_USDC_ISSUER?.trim();

  if (horizonOverride && horizonOverride !== canonical.horizonUrl) {
    throw new Error(`STELLAR_HORIZON_URL does not match ${network}.`);
  }
  if (issuerOverride && issuerOverride !== canonical.usdcIssuer) {
    throw new Error(`STELLAR_USDC_ISSUER does not match ${network}.`);
  }

  return { ...canonical };
}

export function getStellarExpertTransactionUrl(
  transactionHash: string,
  network: StellarNetwork,
) {
  if (!/^[a-f0-9]{64}$/i.test(transactionHash)) return null;
  const { explorerNetwork } = resolveStellarNetworkConfig(network, {});
  return `https://stellar.expert/explorer/${explorerNetwork}/tx/${transactionHash}`;
}

export function requireMainnetPaymentsEnabled(
  network: StellarNetwork,
  env: StellarEnvironment = process.env,
) {
  if (network === "pubnet" && env.AYRA_MAINNET_PAYMENTS_ENABLED !== "1") {
    throw new Error("Mainnet payments are disabled by the release switch.");
  }
}

function normalizeUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, "");
}
