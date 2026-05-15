import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Leaf, ReceiptText } from "lucide-react";

import { Chip, Hash } from "@/components/ayra/ui";
import { loadPublicAyraState } from "@/lib/ayra/data";
import {
  formatLocal,
  formatUsdc,
  getProofPack,
  getPublicWallProjection,
} from "@/lib/ayra/domain";

type PageProps = {
  searchParams?: Promise<{ track?: string }>;
};

function percent(current: number, goal: number) {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 1000) / 10);
}

function widthVar(value: number): CSSProperties {
  return { "--w": `${value}%` } as CSSProperties;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const state = await loadPublicAyraState();
  const wall = getPublicWallProjection(state, params?.track ?? "providencia");
  const active = wall.activeInitiative;
  const clearedBatch =
    state.batches.find((batch) => batch.status === "settled") ?? state.batches[0];
  const proof = getProofPack(state, clearedBatch.id);
  const progress = percent(active.targetMetricCurrent, active.targetMetricGoal);
  const maxSpend = Math.max(...wall.spending.map((item) => item.amountUsdc), 1);
  const totalSubmitted = wall.batches.reduce(
    (sum, batch) => sum + batch.amountUsdc,
    0,
  );

  return (
    <main className="public-shell">
      <nav className="public-nav" aria-label="Public wall">
        <Link className="wordmark" href="#top">
          AYRA <span>{wall.track.name}</span>
        </Link>
        <div className="flex flex-wrap gap-2">
          <a className="public-anchor" href="#receipts">
            Receipts
          </a>
          <Link className="public-anchor" href="/apply">
            Apply
          </Link>
          <Link className="public-anchor" href="/admin">
            Operator
          </Link>
        </div>
      </nav>

      <section id="top" className="px-[var(--pad-page)] py-20 md:py-32">
        <div className="max-w-6xl">
          <div className="place-line">{wall.track.name} · 2026</div>
          <h1 className="hero-title mt-7">
            Providencia,
            <br />
            lived in.
            <br />
            Funded by AYRA.
          </h1>
          <p className="mt-8 max-w-xl text-xl leading-8 text-white/55">
            <strong className="text-white/80">Monthly receipts.</strong> Verified
            in one tap, with category-level spending and no private recipient data
            on the public surface.
          </p>
        </div>
      </section>

      <section
        className="grid gap-4 px-[var(--pad-page)] pb-24 md:grid-cols-3"
        aria-label="Initiatives"
      >
        {wall.initiatives.map((initiative, index) => (
          <a
            className="initiative-tile"
            href="#initiative"
            key={initiative.id}
            aria-label={`Open ${initiative.name}`}
          >
            <div
              className={
                index === 1 ? "viz viz-alt" : index === 2 ? "viz viz-reef" : "viz"
              }
            >
              <span className="mono absolute left-4 top-4 text-xs text-white/75">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(wall.initiatives.length).padStart(2, "0")}
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <h2 className="display text-3xl font-medium">
                  {initiative.name}
                </h2>
                <span className="score">
                  <strong>{initiative.leagueScore}</strong> Score
                </span>
              </div>
              <p className="mt-4 min-h-16 text-sm leading-6 text-white/55">
                {initiative.description}
              </p>
              <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-white/80">
                Back this <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </a>
        ))}
      </section>

      <section id="initiative" className="public-panel">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.72fr]">
          <div>
            <a className="mb-6 inline-block text-sm text-white/45" href="#top">
              Back to the wall
            </a>
            <div className="viz min-h-[360px] border border-[var(--dark-rule)]" />
            <div className="mt-8 flex flex-wrap items-start justify-between gap-6">
              <div>
                <h2 className="display max-w-3xl text-5xl font-medium md:text-7xl">
                  {active.headline}
                </h2>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/58">
                  {active.description}
                </p>
              </div>
              <span className="score">
                <strong>{active.leagueScore}</strong> / 99
              </span>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="chart-card">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-white/65">{active.targetMetricLabel}</span>
                  <span className="mono text-white/45">
                    Goal · {active.targetMetricGoal.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="bar-track mt-6">
                  <div className="bar-fill" style={widthVar(progress)} />
                </div>
                <div className="mt-3 flex justify-between text-sm text-white/50">
                  <span>{active.targetMetricCurrent.toLocaleString("en-US")} today</span>
                  <span>{progress}%</span>
                </div>
              </div>

              <div className="chart-card">
                <div className="text-sm text-white/65">Visible batch volume</div>
                <div className="display mt-4 text-4xl font-medium">
                  {formatUsdc(totalSubmitted)}
                </div>
                <p className="mt-3 text-sm leading-6 text-white/45">
                  Submitted and settled batches only. Drafts, failures, and
                  operational exceptions stay internal.
                </p>
              </div>

              <div className="chart-card">
                <div className="text-sm text-white/65">Public proof rule</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip tone="info">Category spend</Chip>
                  <Chip tone="ok">Approved updates</Chip>
                  <Chip>Batch receipts</Chip>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/45">
                  Private contacts, raw receipts, and internal reconciliation
                  never appear on this wall.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-3">
              {wall.spending.slice(0, 5).map((item) => (
                <div
                  className="grid items-center gap-3 text-sm md:grid-cols-[150px_1fr_120px]"
                  key={`${item.batchCode}-${item.category}`}
                >
                  <span className="text-white/70">{item.category}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill block"
                      style={widthVar((item.amountUsdc / maxSpend) * 100)}
                    />
                  </span>
                  <span className="mono text-white/45">
                    {formatUsdc(item.amountUsdc)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside aria-label="Updates">
            <div className="mb-4 flex items-end justify-between border-b border-[var(--dark-rule)] pb-3">
              <h3 className="display text-3xl font-medium">Updates</h3>
              <span className="mono text-xs text-white/35">Latest first</span>
            </div>
            <div className="space-y-4">
              {wall.updates.map((update) => (
                <article
                  className="border border-[var(--dark-rule)] bg-white/[0.025] p-5"
                  key={update.id}
                >
                  <div className="mono text-xs uppercase tracking-[0.06em] text-white/35">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(update.publishedAt))}{" "}
                    · {update.initiativeName} · {update.milestoneCode}
                  </div>
                  <p className="mt-4 leading-7 text-white/68">{update.caption}</p>
                  <a
                    className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--accent)]"
                    href="#receipts"
                  >
                    View receipts <ReceiptText className="h-4 w-4" />
                  </a>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section
        id="receipts"
        className="border-t border-[var(--dark-rule)] bg-black/20 px-[var(--pad-page)] py-16"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display text-4xl font-medium">
              Receipts · {proof.initiativeName} · {proof.periodLabel}
            </h2>
            <p className="mt-2 text-white/45">
              Batch-level proof from canonical records.
            </p>
          </div>
          <Chip tone={proof.publicLabel === "Cleared" ? "ok" : "info"}>
            {proof.publicLabel}
          </Chip>
        </div>

        <div className="overflow-x-auto border border-[var(--dark-rule)]">
          <table className="t min-w-[720px] text-white">
            <thead>
              <tr>
                <th>Month</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Local snapshot</th>
                <th>On-chain reference</th>
              </tr>
            </thead>
            <tbody>
              {proof.receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="mono text-white/50">{proof.periodLabel}</td>
                  <td>{formatUsdc(receipt.amountUsdc)}</td>
                  <td>{receipt.category}</td>
                  <td className="mono text-white/50">
                    {formatLocal(receipt.localAmount, receipt.localCurrency)}
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <Hash value={receipt.transactionHash ?? receipt.sdpPaymentId} />
                      <ExternalLink className="h-4 w-4 text-white/35" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-white/42">
          Recipient-level names, private receipt files, failed payment details,
          and reconciliation notes remain inside the admin console.
        </p>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--dark-rule)] px-[var(--pad-page)] py-8 text-sm text-white/38">
        <span>AYRA Stellar · public transparency wall</span>
        <span className="inline-flex items-center gap-2">
          <Leaf className="h-4 w-4 text-[var(--accent)]" />
          Providencia smoke path
        </span>
      </footer>
    </main>
  );
}
