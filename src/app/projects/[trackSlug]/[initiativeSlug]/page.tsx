import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Leaf } from "lucide-react";

import { Chip, Hash } from "@/components/ayra/ui";
import { loadPublicAyraState } from "@/lib/ayra/data";
import {
  formatLocal,
  formatUsdc,
  getProofPack,
  getPublicInitiativeProjection,
} from "@/lib/ayra/domain";

type PageProps = {
  params: Promise<{ trackSlug: string; initiativeSlug: string }>;
};

function percent(current: number, goal: number) {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 1000) / 10);
}

function widthVar(value: number): CSSProperties {
  return { "--w": `${value}%` } as CSSProperties;
}

export default async function InitiativePage({ params }: PageProps) {
  const { trackSlug, initiativeSlug } = await params;
  const state = await loadPublicAyraState();
  const track = state.tracks.find((item) => item.slug === trackSlug) ?? state.tracks[0];
  if (!track) notFound();
  const initiativeExists = state.initiatives.some(
    (item) => item.trackId === track.id && item.slug === initiativeSlug,
  );
  if (!initiativeExists) notFound();
  const project = getPublicInitiativeProjection(state, trackSlug, initiativeSlug);
  const progress = percent(
    project.initiative.targetMetricCurrent,
    project.initiative.targetMetricGoal,
  );
  const maxSpend = Math.max(...project.spending.map((item) => item.amountUsdc), 1);
  const totalSubmitted = project.batches.reduce(
    (sum, batch) => sum + batch.amountUsdc,
    0,
  );
  const proofBatch =
    project.batches.find((batch) => batch.status === "settled") ??
    project.batches[0];
  const proof = proofBatch ? getProofPack(state, proofBatch.id) : null;

  return (
    <main className="public-shell">
      <nav className="public-nav" aria-label="Project page">
        <Link className="wordmark" href={`/?track=${project.track.slug}`}>
          AYRA <span>{project.track.name}</span>
        </Link>
        <div className="flex flex-wrap justify-end gap-2">
          {project.siblingInitiatives.map((initiative) => (
            <Link
              aria-current={
                initiative.slug === project.initiative.slug ? "page" : undefined
              }
              className={
                initiative.slug === project.initiative.slug
                  ? "public-anchor active"
                  : "public-anchor"
              }
              href={`/projects/${project.track.slug}/${initiative.slug}`}
              key={initiative.id}
            >
              {initiative.name}
            </Link>
          ))}
          <Link className="public-anchor" href={`/?track=${project.track.slug}`}>
            Overview
          </Link>
        </div>
      </nav>

      <section className="px-[var(--pad-page)] py-16 md:py-20">
        <Link
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/45"
          href={`/?track=${project.track.slug}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {project.track.name}
        </Link>
        <div className="grid gap-10 lg:grid-cols-[1fr_0.72fr]">
          <div>
            <div className="viz min-h-[360px] border border-[var(--dark-rule)]" />
            <div className="mt-8 flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="place-line">{project.initiative.name}</div>
                <h1 className="display mt-6 max-w-3xl text-5xl font-medium md:text-7xl">
                  {project.initiative.headline}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/58">
                  {project.initiative.description}
                </p>
              </div>
              <span className="score">
                <strong>{project.initiative.leagueScore}</strong> / 99
              </span>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="chart-card">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-white/65">
                    {project.initiative.targetMetricLabel}
                  </span>
                  <span className="mono text-white/45">
                    Goal ·{" "}
                    {project.initiative.targetMetricGoal.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="bar-track mt-6">
                  <div className="bar-fill" style={widthVar(progress)} />
                </div>
                <div className="mt-3 flex justify-between text-sm text-white/50">
                  <span>
                    {project.initiative.targetMetricCurrent.toLocaleString("en-US")} today
                  </span>
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
                  never appear on this project page.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-3">
              {project.spending.slice(0, 5).map((item) => (
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

          <aside aria-label="Project updates">
            <div className="mb-4 flex items-end justify-between border-b border-[var(--dark-rule)] pb-3">
              <h2 className="display text-3xl font-medium">Updates</h2>
              <span className="mono text-xs text-white/35">Latest first</span>
            </div>
            <div className="space-y-4">
              {project.updates.map((update) => (
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
                    · {update.milestoneCode}
                  </div>
                  <p className="mt-4 leading-7 text-white/68">{update.caption}</p>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-[var(--dark-rule)] bg-black/20 px-[var(--pad-page)] py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display text-4xl font-medium">
              Receipts · {project.initiative.name}
            </h2>
            <p className="mt-2 text-white/45">
              Batch-level proof from canonical records.
            </p>
          </div>
          {proof ? (
            <Link
              className="btn ghost border-white/20 text-white"
              href={`/proof/${proof.batchId}`}
            >
              Open proof <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        <div className="overflow-x-auto border border-[var(--dark-rule)]">
          <table className="t min-w-[720px] text-white">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Local snapshot</th>
                <th>On-chain reference</th>
              </tr>
            </thead>
            <tbody>
              {project.batches.flatMap((batch) => {
                const batchProof = getProofPack(state, batch.id);
                return batchProof.receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td className="mono text-white/50">{batch.periodLabel}</td>
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
                ));
              })}
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
          {project.track.name} · {project.initiative.name}
        </span>
      </footer>
    </main>
  );
}
