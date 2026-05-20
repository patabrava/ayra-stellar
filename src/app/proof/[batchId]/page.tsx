import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { Chip, Hash, Money } from "@/components/ayra/ui";
import { loadPublicAyraState } from "@/lib/ayra/data";
import { formatLocal, getProofPack } from "@/lib/ayra/domain";

type PageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function ProofPage({ params }: PageProps) {
  const { batchId } = await params;
  const state = await loadPublicAyraState();
  let proof;
  try {
    proof = getProofPack(state, batchId);
  } catch {
    notFound();
  }

  const total = proof.receipts.reduce((sum, item) => sum + item.amountUsdc, 0);

  return (
    <main className="public-proof min-h-screen bg-[var(--public-bg)] text-[var(--public-fg)]">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <Link
          className="btn ghost"
          href={`/projects/${proof.trackSlug}/${proof.initiativeSlug}`}
        >
          <ArrowLeft className="h-4 w-4" /> Project page
        </Link>

        <section className="mt-8 border border-[var(--public-rule)] bg-[var(--public-panel)] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="public-dim text-sm uppercase">
                Public proof pack
              </div>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold md:text-6xl">
                {proof.batchCode}
              </h1>
              <p className="public-muted mt-4 max-w-2xl">
                {proof.initiativeName} · {proof.periodLabel}
                {proof.sponsorName ? ` · ${proof.sponsorName}` : ""}
              </p>
            </div>
            <Chip tone={proof.publicLabel === "Cleared" ? "ok" : "info"}>
              {proof.publicLabel}
            </Chip>
          </div>

          <div className="stat-grid mt-8">
            <div className="stat stat-invert">
              <div className="stat-k">Total</div>
              <div className="stat-v">
                <Money amount={total} />
              </div>
            </div>
            <div className="stat stat-invert">
              <div className="stat-k">Receipt lines</div>
              <div className="stat-v">{proof.receipts.length}</div>
            </div>
            <div className="stat stat-invert">
              <div className="stat-k">Source</div>
              <div className="stat-v text-2xl">Canonical DB</div>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="t min-w-[760px] text-[var(--public-fg)]">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Local</th>
                  <th>Payment proof</th>
                </tr>
              </thead>
              <tbody>
                {proof.receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td>{receipt.category}</td>
                    <td>
                      <Money amount={receipt.amountUsdc} />
                    </td>
                    <td>{formatLocal(receipt.localAmount, receipt.localCurrency)}</td>
                    <td>
                      <Hash value={receipt.transactionHash ?? receipt.sdpPaymentId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex items-start gap-3 border border-[var(--public-rule)] bg-[var(--public-bg-low)] p-4">
            <ShieldCheck className="mt-1 h-5 w-5 text-[var(--ok)]" />
            <p className="public-muted text-sm leading-6">
              This page intentionally excludes recipient names, private receipt files,
              failed payment details, and internal reconciliation notes.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
