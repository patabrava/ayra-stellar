import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { AdminShell } from "@/app/admin/admin-shell";
import { buildAdminViewModel } from "@/app/admin/admin-view-model";
import { Chip, Hash, Money } from "@/components/ayra/ui";
import { FormSubmitButton } from "@/components/ayra/form-submit-button";
import { freezeProofPackReleaseAction } from "@/lib/ayra/actions";
import { requireAdminSession } from "@/lib/ayra/session";

type PageProps = {
  searchParams?: Promise<{ batchId?: string; status?: string }>;
};

export default async function AdminProofPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireAdminSession("/admin/proof");
  const view = await buildAdminViewModel(session.state, params?.batchId);
  const proof = view.proof;
  const proofPackCountLabel = `${view.proofOptions.length} ${
    view.proofOptions.length === 1 ? "pack" : "packs"
  }`;
  const proofTotal =
    proof?.receipts.reduce((sum, item) => sum + item.amountUsdc, 0) ?? 0;

  return (
    <AdminShell
      activeHref="/admin/proof"
      session={session}
      status={params?.status}
      view={view}
    >
      <section>
        <div className="section-head">
          <div>
            <h1>Proof packs</h1>
            <p className="section-sub">
              Select one verified payment and preview the public proof pack
              generated from canonical records.
            </p>
          </div>
        </div>
        {proof ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Payment selector</span>
                <Chip tone="info">{proofPackCountLabel}</Chip>
              </div>
              <div className="panel-body grid gap-2">
                {view.proofOptions.map((option) => {
                  const isSelected = option.batchId === view.selectedProofBatchId;

                  return (
                    <Link
                      aria-current={isSelected ? "page" : undefined}
                      className={[
                        "block border p-3 transition",
                        isSelected
                          ? "border-[var(--accent-admin)] bg-[var(--accent-soft)]"
                          : "border-rule bg-[var(--ops-surface)] hover:border-[var(--ink)]",
                      ].join(" ")}
                      href={`/admin/proof?batchId=${encodeURIComponent(option.batchId)}`}
                      key={option.batchId}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="row-name break-words">{option.batchCode}</div>
                          <div className="row-meta">
                            {option.periodLabel} ·{" "}
                            {option.sponsorName ?? "General fund"}
                          </div>
                        </div>
                        <Chip tone={option.publicLabel === "Cleared" ? "ok" : "info"}>
                          {option.publicLabel}
                        </Chip>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase text-ink-muted">
                        <span>{option.receiptCount} receipts</span>
                        <span>
                          <Money amount={option.totalUsdc} />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="grid content-start gap-4">
              <div className="panel">
                <div className="panel-head">
                  <span className="panel-title">
                    {proof.sponsorName ?? "General fund"} · {proof.periodLabel}
                  </span>
                  <Chip tone={proof.publicLabel === "Cleared" ? "ok" : "info"}>
                    {proof.publicLabel}
                  </Chip>
                </div>
                <div className="panel-body grid gap-5">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                    <div>
                      <div className="text-xs uppercase text-ink-muted">Selected payment</div>
                      <h2 className="mt-1 text-xl font-medium">{proof.batchCode}</h2>
                      <div className="mt-2">
                        <Chip tone={proof.stellarNetwork === "pubnet" ? "ok" : "info"}>
                          {proof.stellarNetwork === "pubnet"
                            ? "Stellar public network"
                            : "Stellar testnet"}
                        </Chip>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                        Public proof shows category-level USDC payments verified
                        against Stellar transaction metadata. Private receipt
                        files remain admin-only.
                      </p>
                    </div>
                    <div className="grid justify-items-start gap-2 md:justify-items-end">
                      <Link
                        className="btn primary"
                        href={`/proof/${proof.batchId}`}
                      >
                        Open public proof <ExternalLink className="h-4 w-4" />
                      </Link>
                      {proof.publicLabel === "Cleared" ? (
                        <form action={freezeProofPackReleaseAction}>
                          <input name="batchId" type="hidden" value={proof.batchId} />
                          <FormSubmitButton
                            className="btn"
                            pendingLabel="Freezing release..."
                          >
                            Freeze versioned release
                          </FormSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  <div className="stat-grid">
                    <div className="stat">
                      <div className="stat-k">Backed</div>
                      <div className="stat-v">
                        <Money amount={proofTotal} />
                      </div>
                    </div>
                    <div className="stat">
                      <div className="stat-k">Verified receipts</div>
                      <div className="stat-v">{proof.receipts.length}</div>
                    </div>
                    <div className="stat">
                      <div className="stat-k">Settlement</div>
                      <div className="stat-v text-2xl">{proof.publicLabel}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel overflow-x-auto">
                <div className="panel-head">
                  <span className="panel-title">Verified on-chain receipts</span>
                  <Chip tone="ok">{proof.receipts.length} verified</Chip>
                </div>
                <table className="t min-w-[760px]">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>USDC</th>
                      <th>Asset</th>
                      <th>Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proof.receipts.map((receipt) => (
                      <tr key={receipt.id}>
                        <td>{receipt.category}</td>
                        <td>
                          <Money amount={receipt.amountUsdc} />
                        </td>
                        <td>
                          <Chip tone="ok">{receipt.assetCode}</Chip>
                        </td>
                        <td>
                          <Hash
                            stellarNetwork={proof.stellarNetwork}
                            value={receipt.transactionHash}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">No verified proof packs</span>
            </div>
            <div className="panel-body">
              <p className="max-w-2xl text-sm leading-6 text-ink-muted">
                Submitted or settled payments appear here after their public
                receipt lines have verified USDC transaction metadata.
              </p>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
