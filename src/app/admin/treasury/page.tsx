import { AlertTriangle, ExternalLink, ServerCog, ShieldCheck } from "lucide-react";

import { AdminShell } from "@/app/admin/admin-shell";
import { buildAdminViewModel } from "@/app/admin/admin-view-model";
import { Chip, Hash } from "@/components/ayra/ui";
import { requireAdminSession } from "@/lib/ayra/session";
import {
  CIRCLE_STELLAR_MAINNET_USDC_ISSUER,
  getConfiguredStellarNetwork,
} from "@/lib/ayra/stellar-network";
import { getAdminTreasuryReadiness } from "@/lib/ayra/treasury";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function AdminTreasuryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireAdminSession("/admin/treasury");
  const [view, treasury] = await Promise.all([
    buildAdminViewModel(session.state),
    getAdminTreasuryReadiness(session.state),
  ]);
  const appNetwork = getConfiguredStellarNetwork();

  return (
    <AdminShell
      activeHref="/admin/treasury"
      session={session}
      status={params?.status}
      view={view}
    >
      <section>
        <div className="section-head">
          <div>
            <h1>Treasury operations</h1>
            <p className="section-sub">
              Mainnet distribution readiness, SDP reachability, recipient gate,
              and payment-release state. Signing and seed custody stay outside
              the browser.
            </p>
          </div>
          <a
            className="btn ghost"
            href={treasury.distributionExplorerUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Stellar account <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="stat-grid mb-5">
          <div className="stat">
            <div className="stat-k">Distribution XLM</div>
            <div className="stat-v text-2xl">
              {formatBalance(treasury.distribution.xlmBalance)}
            </div>
            <div className="stat-d">reserves and network fees</div>
          </div>
          <div className="stat">
            <div className="stat-k">Distribution USDC</div>
            <div className="stat-v text-2xl">
              {formatBalance(treasury.distribution.usdcBalance)}
            </div>
            <div className="stat-d">available for disbursement</div>
          </div>
          <div className="stat">
            <div className="stat-k">Circle trustline</div>
            <div className="stat-v text-2xl">
              {treasury.distribution.hasCircleUsdcTrustline ? "Active" : "Missing"}
            </div>
            <div className="stat-d">USDC issuer locked to Circle</div>
          </div>
          <div className="stat">
            <div className="stat-k">Live batch gate</div>
            <div className="stat-v text-2xl">
              {treasury.readyForLiveBatch ? "Ready" : "Blocked"}
            </div>
            <div className="stat-d">
              {treasury.readyForLiveBatch
                ? "all checks passing"
                : "requires remaining checklist items"}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
          <div className="grid content-start gap-4">
            <section className="panel">
              <div className="panel-head">
                <span className="panel-title">Distribution account</span>
                <Chip tone={treasury.distribution.exists ? "ok" : "err"}>
                  {treasury.distribution.exists ? "active" : "missing"}
                </Chip>
              </div>
              <div className="panel-body grid gap-4">
                <div>
                  <div className="payment-registry-label">Public key</div>
                  <div className="mt-1">
                    <Hash value={treasury.distributionPublicKey} />
                  </div>
                </div>
                <div>
                  <div className="payment-registry-label">USDC issuer</div>
                  <div className="mt-1">
                    <Hash value={CIRCLE_STELLAR_MAINNET_USDC_ISSUER} />
                  </div>
                </div>
                <div className="border border-rule bg-[var(--ops-surface)] p-3 text-sm leading-6 text-ink-muted">
                  Send sponsor-approved Stellar mainnet USDC to this account
                  only after the XLM reserve and trustline rows show ready.
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <span className="panel-title">Execution boundary</span>
                <Chip tone={appNetwork === "pubnet" ? "ok" : "info"}>
                  {appNetwork}
                </Chip>
              </div>
              <div className="panel-body grid gap-3 text-sm leading-6 text-ink-muted">
                <p>
                  AYRA admins can verify recipients, create batches, submit
                  through SDP, sync settlement, and freeze proof packs. Treasury
                  signing and private key custody remain outside this app.
                </p>
                <div className="grid gap-2">
                  <StateLine
                    label="Release switch"
                    tone={treasury.releaseSwitchEnabled ? "ok" : "warn"}
                    value={
                      treasury.releaseSwitchEnabled
                        ? "Mainnet submissions enabled"
                        : "Mainnet submissions disabled"
                    }
                  />
                  <StateLine
                    label="Recipient addresses"
                    tone={treasury.recipient.readyCount > 0 ? "ok" : "err"}
                    value={`${treasury.recipient.readyCount} ready, ${treasury.recipient.pendingCount} pending`}
                  />
                </div>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel-head">
              <span className="panel-title">Readiness checklist</span>
              <Chip tone={treasury.readyForLiveBatch ? "ok" : "warn"}>
                {treasury.readyForLiveBatch ? "ready" : "blocked"}
              </Chip>
            </div>
            <div className="payment-registry-list">
              {treasury.checks.map((check) => (
                <article className="payment-registry-row" key={check.label}>
                  <div className="payment-registry-main">
                    <div className="payment-registry-identity">
                      <div className="row-name">{check.label}</div>
                      <div className="row-meta">{check.detail}</div>
                    </div>
                    <div className="payment-registry-status">
                      <span className="payment-registry-label">State</span>
                      <Chip tone={toneForStatus(check.status)}>
                        {labelForStatus(check.status)}
                      </Chip>
                    </div>
                  </div>
                  <div className="payment-registry-action">
                    {iconForStatus(check.status)}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="panel mt-4 overflow-x-auto">
          <div className="panel-head">
            <span className="panel-title">Live endpoints</span>
            <Chip tone="info">
              checked {new Date(treasury.checkedAt).toLocaleTimeString("en-US")}
            </Chip>
          </div>
          <table className="t min-w-[760px]">
            <thead>
              <tr>
                <th>Service</th>
                <th>URL</th>
                <th>Status</th>
                <th>Operator meaning</th>
              </tr>
            </thead>
            <tbody>
              <EndpointRow
                label="SDP API"
                meaning="Payment creation and status sync boundary"
                ok={treasury.apiHealth.ok}
                status={treasury.apiHealth.status}
                url={treasury.apiHealth.url}
              />
              <EndpointRow
                label="SDP dashboard"
                meaning="Operator setup, MFA, credentials, and asset review"
                ok={treasury.dashboardHealth.ok}
                status={treasury.dashboardHealth.status}
                url={treasury.dashboardHealth.url}
              />
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function EndpointRow({
  label,
  meaning,
  ok,
  status,
  url,
}: {
  label: string;
  meaning: string;
  ok: boolean;
  status: number | null;
  url: string;
}) {
  return (
    <tr>
      <td>{label}</td>
      <td>
        <a className="hashish" href={url} rel="noopener noreferrer" target="_blank">
          {url}
        </a>
      </td>
      <td>
        <Chip tone={ok ? "ok" : "err"}>{status ?? "offline"}</Chip>
      </td>
      <td>{meaning}</td>
    </tr>
  );
}

function StateLine({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "ok" | "warn" | "err" | "info";
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-rule px-3 py-2">
      <span className="text-ink-muted">{label}</span>
      <Chip tone={tone}>{value}</Chip>
    </div>
  );
}

function toneForStatus(status: "ready" | "attention" | "blocked") {
  if (status === "ready") return "ok";
  if (status === "attention") return "warn";
  return "err";
}

function labelForStatus(status: "ready" | "attention" | "blocked") {
  if (status === "ready") return "Ready";
  if (status === "attention") return "Review";
  return "Blocked";
}

function iconForStatus(status: "ready" | "attention" | "blocked") {
  const className = "h-5 w-5";
  if (status === "ready") {
    return <ShieldCheck aria-label="Ready" className={className} />;
  }
  if (status === "attention") {
    return <AlertTriangle aria-label="Review required" className={className} />;
  }
  return <ServerCog aria-label="Blocked" className={className} />;
}

function formatBalance(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 7,
    minimumFractionDigits: value > 0 && value < 1 ? 7 : 0,
  }).format(value);
}
