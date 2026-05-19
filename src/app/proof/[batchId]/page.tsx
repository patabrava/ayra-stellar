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
    <main className="min-h-screen bg-ink text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <Link
          className="btn ghost border-white/20 text-white"
          href={`/projects/${proof.trackSlug}/${proof.initiativeSlug}`}
        >
          <ArrowLeft className="h-4 w-4" /> Project page
        </Link>

        <section className="mt-8 border border-white/15 bg-white/[0.04] p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="text-sm uppercase tracking-[0.18em] text-white/50">
                Public proof pack
              </div>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold md:text-6xl">
                {proof.batchCode}
              </h1>
              <p className="mt-4 max-w-2xl text-white/65">
                {proof.initiativeName} · {proof.periodLabel}
                {proof.sponsorName ? ` · ${proof.sponsorName}` : ""}
              </p>
            </div>
            <Chip tone={proof.publicLabel === "Cleared" ? "ok" : "info"}>
              {proof.publicLabel}
            </Chip>
          </div>

          <div className="stat-grid mt-8">
            <div className="stat bg-white/[0.06] text-white">
              <div className="stat-k text-white/50">Total</div>
              <div className="stat-v">
                <Money amount={total} />
              </div>
            </div>
            <div className="stat bg-white/[0.06] text-white">
              <div className="stat-k text-white/50">Receipt lines</div>
              <div className="stat-v">{proof.receipts.length}</div>
            </div>
            <div className="stat bg-white/[0.06] text-white">
              <div className="stat-k text-white/50">Source</div>
              <div className="stat-v text-2xl">Canonical DB</div>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="t min-w-[760px] text-white">
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

          <div className="mt-8 flex items-start gap-3 border border-white/15 bg-black/20 p-4">
            <ShieldCheck className="mt-1 h-5 w-5 text-[var(--ok)]" />
            <p className="text-sm leading-6 text-white/65">
              This page intentionally excludes recipient names, private receipt files,
              failed payment details, and internal reconciliation notes.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
