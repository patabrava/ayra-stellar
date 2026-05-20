import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { Hash } from "@/components/ayra/ui";
import { loadPublicAyraState } from "@/lib/ayra/data";
import { formatLocal, formatUsdc, getProofPack } from "@/lib/ayra/domain";

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
      <div className="proof-wrap">
        <Link
          className="proof-back btn ghost"
          href={`/projects/${proof.trackSlug}/${proof.initiativeSlug}`}
        >
          <ArrowLeft className="h-4 w-4" /> Project page
        </Link>

        <section className="proof-pack" aria-labelledby="proof-title">
          <div className="proof-pack-head">
            <div>
              <div className="proof-pack-kicker">Public proof pack</div>
              <h1 className="proof-pack-title" id="proof-title">
                {proof.batchCode}
              </h1>
              <p className="proof-pack-subtitle">
                {proof.initiativeName} · {proof.periodLabel}
                {proof.sponsorName ? ` · ${proof.sponsorName}` : ""}
              </p>
            </div>
            <div className="proof-stamp">{proof.publicLabel}</div>
          </div>

          <div className="proof-ledger-strip" aria-label="Proof pack summary">
            <div className="proof-ledger-cell">
              <span>Total</span>
              <strong>{formatUsdc(total)}</strong>
            </div>
            <div className="proof-ledger-cell">
              <span>Receipt lines</span>
              <strong>{proof.receipts.length}</strong>
            </div>
            <div className="proof-ledger-cell">
              <span>Source</span>
              <strong>Canonical DB</strong>
            </div>
          </div>

          <div className="receipt-region">
            <div className="proof-pack-kicker">Category-level receipts</div>
            <div className="receipt-table-wrap mt-3">
              <table className="receipt-table">
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
                        {formatUsdc(receipt.amountUsdc)}
                      </td>
                      <td>
                        {formatLocal(receipt.localAmount, receipt.localCurrency)}
                      </td>
                      <td>
                        <Hash
                          value={receipt.transactionHash ?? receipt.sdpPaymentId}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="proof-exclusion">
            <ShieldCheck className="mt-1 h-5 w-5" />
            <p className="text-sm leading-6">
              This category ledger shows public amounts and payment references
              only. Recipient names, private receipt files, failed payments, and
              reconciliation notes stay internal.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
