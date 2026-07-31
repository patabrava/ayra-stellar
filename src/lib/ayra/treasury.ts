import type { AyraState } from "@/lib/ayra/domain";
import {
  CIRCLE_STELLAR_MAINNET_USDC_ISSUER,
  type StellarNetwork,
} from "@/lib/ayra/stellar-network";

const DEFAULT_MAINNET_DISTRIBUTION_PUBLIC_KEY =
  "GCOI3CSCECWMCJM5B2LFZXRWKUA5K2YCL2NE7FAB6TGOBGTGR5FTPOW4";
const HORIZON_URL = "https://horizon.stellar.org";

type TreasuryEnvironment = Record<string, string | undefined>;

export type TreasuryReadinessStatus = "ready" | "attention" | "blocked";

export type TreasuryCheck = {
  label: string;
  status: TreasuryReadinessStatus;
  detail: string;
};

export type TreasuryReadiness = {
  distributionPublicKey: string;
  distributionExplorerUrl: string;
  checkedAt: string;
  apiHealth: EndpointHealth;
  dashboardHealth: EndpointHealth;
  distribution: DistributionAccountReadiness;
  recipient: RecipientReadiness;
  releaseSwitchEnabled: boolean;
  readyForLiveBatch: boolean;
  checks: TreasuryCheck[];
};

export type EndpointHealth = {
  url: string;
  ok: boolean;
  status: number | null;
};

export type DistributionAccountReadiness = {
  exists: boolean;
  xlmBalance: number;
  usdcBalance: number;
  hasCircleUsdcTrustline: boolean;
};

export type RecipientReadiness = {
  readyCount: number;
  pendingCount: number;
  missingCount: number;
};

export async function getAdminTreasuryReadiness(
  state: AyraState,
  env: TreasuryEnvironment = process.env,
): Promise<TreasuryReadiness> {
  const distributionPublicKey = getMainnetDistributionPublicKey(env);
  const [apiHealth, dashboardHealth, distribution] = await Promise.all([
    endpointHealth(
      env.STELLAR_MAINNET_SDP_BASE_URL ?? "https://sdp-mainnet-api.ayra.haus",
      "/health",
    ),
    endpointHealth(
      env.STELLAR_MAINNET_SDP_DASHBOARD_URL ??
        "https://sdp-mainnet-dashboard.ayra.haus",
    ),
    inspectDistributionAccount(distributionPublicKey),
  ]);
  const recipient = summarizeRecipientReadiness(state, "pubnet");
  const releaseSwitchEnabled = env.AYRA_MAINNET_PAYMENTS_ENABLED === "1";
  const checks = buildTreasuryChecks({
    apiHealth,
    dashboardHealth,
    distribution,
    recipient,
    releaseSwitchEnabled,
  });

  return {
    distributionPublicKey,
    distributionExplorerUrl: `https://stellar.expert/explorer/public/account/${distributionPublicKey}`,
    checkedAt: new Date().toISOString(),
    apiHealth,
    dashboardHealth,
    distribution,
    recipient,
    releaseSwitchEnabled,
    readyForLiveBatch: checks.every((check) => check.status === "ready"),
    checks,
  };
}

export function buildTreasuryChecks({
  apiHealth,
  dashboardHealth,
  distribution,
  recipient,
  releaseSwitchEnabled,
}: {
  apiHealth: EndpointHealth;
  dashboardHealth: EndpointHealth;
  distribution: DistributionAccountReadiness;
  recipient: RecipientReadiness;
  releaseSwitchEnabled: boolean;
}): TreasuryCheck[] {
  return [
    {
      label: "SDP API",
      status: apiHealth.ok ? "ready" : "blocked",
      detail: apiHealth.ok
        ? "Mainnet API health endpoint is reachable."
        : "Mainnet API is not reachable from the admin console.",
    },
    {
      label: "SDP dashboard",
      status: dashboardHealth.ok ? "ready" : "attention",
      detail: dashboardHealth.ok
        ? "Dashboard is reachable for operator setup."
        : "Dashboard did not return a successful status.",
    },
    {
      label: "Distribution XLM",
      status:
        distribution.exists && distribution.xlmBalance > 0 ? "ready" : "blocked",
      detail:
        distribution.exists && distribution.xlmBalance > 0
          ? `${formatBalance(distribution.xlmBalance)} XLM available for reserves and fees.`
          : "Distribution account still needs XLM funding.",
    },
    {
      label: "Circle USDC trustline",
      status: distribution.hasCircleUsdcTrustline ? "ready" : "blocked",
      detail: distribution.hasCircleUsdcTrustline
        ? "Circle Stellar USDC trustline is active."
        : "Circle Stellar USDC trustline is missing.",
    },
    {
      label: "Distribution USDC",
      status: distribution.usdcBalance > 0 ? "ready" : "blocked",
      detail:
        distribution.usdcBalance > 0
          ? `${formatBalance(distribution.usdcBalance)} USDC available for disbursement.`
          : "Distribution account is ready to receive sponsor-approved USDC.",
    },
    {
      label: "Recipient readiness",
      status: recipient.readyCount > 0 ? "ready" : "blocked",
      detail:
        recipient.readyCount > 0
          ? `${recipient.readyCount} verified pubnet recipient ${
              recipient.readyCount === 1 ? "address" : "addresses"
            } available.`
          : "No verified pubnet recipient address is available yet.",
    },
    {
      label: "Mainnet release switch",
      status: releaseSwitchEnabled ? "ready" : "attention",
      detail: releaseSwitchEnabled
        ? "Mainnet payment submission is enabled."
        : "Mainnet payment submission is intentionally disabled.",
    },
  ];
}

export function summarizeRecipientReadiness(
  state: AyraState,
  network: StellarNetwork,
): RecipientReadiness {
  const addresses = state.payoutAddresses.filter(
    (address) => address.stellarNetwork === network,
  );
  const readyCount = addresses.filter(
    (address) => address.status === "verified" || address.status === "locked",
  ).length;
  const pendingCount = addresses.filter((address) => address.status === "pending")
    .length;

  return {
    readyCount,
    pendingCount,
    missingCount: readyCount + pendingCount === 0 ? 1 : 0,
  };
}

function getMainnetDistributionPublicKey(env: TreasuryEnvironment) {
  return (
    env.STELLAR_MAINNET_DISTRIBUTION_PUBLIC_KEY?.trim() ||
    env.NEXT_PUBLIC_STELLAR_MAINNET_DISTRIBUTION_PUBLIC_KEY?.trim() ||
    DEFAULT_MAINNET_DISTRIBUTION_PUBLIC_KEY
  );
}

async function endpointHealth(baseUrl: string, path = ""): Promise<EndpointHealth> {
  const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return { url, ok: response.ok, status: response.status };
  } catch {
    return { url, ok: false, status: null };
  }
}

async function inspectDistributionAccount(
  publicKey: string,
): Promise<DistributionAccountReadiness> {
  try {
    const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 404) return emptyDistribution();
    if (!response.ok) return emptyDistribution();

    const account = (await response.json()) as {
      balances?: Array<{
        asset_type: string;
        asset_code?: string;
        asset_issuer?: string;
        balance?: string;
      }>;
    };
    const balances = account.balances ?? [];
    const native = balances.find((balance) => balance.asset_type === "native");
    const usdc = balances.find(
      (balance) =>
        balance.asset_code === "USDC" &&
        balance.asset_issuer === CIRCLE_STELLAR_MAINNET_USDC_ISSUER,
    );

    return {
      exists: true,
      xlmBalance: Number(native?.balance ?? 0),
      usdcBalance: Number(usdc?.balance ?? 0),
      hasCircleUsdcTrustline: Boolean(usdc),
    };
  } catch {
    return emptyDistribution();
  }
}

function emptyDistribution(): DistributionAccountReadiness {
  return {
    exists: false,
    xlmBalance: 0,
    usdcBalance: 0,
    hasCircleUsdcTrustline: false,
  };
}

function formatBalance(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 7,
    minimumFractionDigits: value > 0 && value < 1 ? 7 : 0,
  }).format(value);
}
