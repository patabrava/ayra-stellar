import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { AdminShell } from "@/app/admin/admin-shell";
import { buildAdminViewModel } from "@/app/admin/admin-view-model";
import { Chip, Hash, Money } from "@/components/ayra/ui";
import { requireAdminSession } from "@/lib/ayra/session";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function AdminProofPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireAdminSession("/admin/proof");
  const view = await buildAdminViewModel(session.state);

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
              Simple public proof pages generated from canonical batch records.
            </p>
          </div>
        </div>
        <div className="grid-2">
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Composer</span>
            </div>
            <div className="panel-body grid gap-4">
              <div className="field">
                <label>Batch</label>
                <input readOnly value={view.proof.batchCode} />
              </div>
              <div className="field">
                <label>Sponsor</label>
                <input readOnly value={view.proof.sponsorName ?? "General fund"} />
              </div>
              <Link
                className="btn primary justify-self-start"
                href={`/proof/${view.proof.batchId}`}
              >
                Generate preview <ShieldCheck className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">
                {view.proof.sponsorName} · {view.proof.periodLabel}
              </span>
              <Chip tone="ok">{view.proof.publicLabel}</Chip>
            </div>
            <div className="panel-body">
              <div className="stat-grid">
                <div className="stat">
                  <div className="stat-k">Backed</div>
                  <div className="stat-v">
                    <Money
                      amount={view.proof.receipts.reduce(
                        (sum, item) => sum + item.amountUsdc,
                        0,
                      )}
                    />
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-k">Settled on-chain</div>
                  <div className="stat-v">100%</div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink-muted">
                Page 1 summarizes batch totals. Page 2 lists category-level
                receipts. Private receipt files remain admin-only.
              </p>
            </div>
          </div>
        </div>

        <div className="panel mt-4 overflow-x-auto">
          <div className="panel-head">
            <span className="panel-title">Verified on-chain receipts</span>
            <Chip tone="ok">{view.proof.receipts.length} verified</Chip>
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
              {view.proof.receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td>{receipt.category}</td>
                  <td>
                    <Money amount={receipt.amountUsdc} />
                  </td>
                  <td>
                    <Chip tone="ok">{receipt.assetCode}</Chip>
                  </td>
                  <td>
                    <Hash value={receipt.transactionHash} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
