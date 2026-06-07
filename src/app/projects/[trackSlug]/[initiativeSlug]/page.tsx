import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { SiteFooter } from "@/components/ayra/site-footer";
import { AdvisorPanel } from "@/components/ayra/advisor-panel";
import { AyraLogo, Chip, Hash } from "@/components/ayra/ui";
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

const projectImageBySlug = {
  reforestation: {
    alt: "Reforestation crew planting seedlings on Providencia",
    src: "/mockups/reforest.jpg",
  },
  "dog-sterilization": {
    alt: "Dog sterilization field clinic on Providencia",
    src: "/mockups/steril.jpg",
  },
  reef: {
    alt: "Reef restoration field work off Providencia",
    src: "/mockups/reef.jpg",
  },
} as const;

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
  const image =
    projectImageBySlug[
      project.initiative.slug as keyof typeof projectImageBySlug
    ] ?? projectImageBySlug.reforestation;

  return (
    <main className="public-shell">
      <nav className="public-nav" aria-label="Project page">
        <Link className="wordmark" href={`/?track=${project.track.slug}`}>
          <AyraLogo alt="" />
          <span>AYRA</span>
        </Link>
        <div className="public-nav-actions flex flex-wrap justify-end gap-2">
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

      <AdvisorPanel
        initiativeSlug={project.initiative.slug}
        trackSlug={project.track.slug}
      />

      <section className="px-[var(--pad-page)] py-16 md:py-20">
        <Link
          className="public-dim mb-6 inline-flex items-center gap-2 text-sm"
          href={`/?track=${project.track.slug}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {project.track.name}
        </Link>
        <div className="grid gap-10 lg:grid-cols-[1fr_0.72fr]">
          <div>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="place-line">{project.initiative.name}</div>
                <h1 className="display mt-5 max-w-3xl text-5xl font-medium md:text-6xl">
                  {project.initiative.headline}
                </h1>
                <p className="public-muted mt-5 max-w-2xl text-lg leading-8">
                  {project.initiative.description}
                </p>
              </div>
              <span className="score">
                <strong>{project.initiative.leagueScore}</strong> / 99
              </span>
            </div>
            <div className="project-detail-visual">
              <Image
                alt={image.alt}
                height={1152}
                priority
                sizes="(min-width: 1024px) 58vw, 100vw"
                src={image.src}
                width={928}
              />
            </div>

            <div className="project-dossier">
              <section className="progress-rail" aria-label="Project progress">
                <div>
                  <div className="public-muted text-sm">
                    {project.initiative.targetMetricLabel}
                  </div>
                  <div className="display mt-4 text-5xl font-medium">
                    {progress}%
                  </div>
                </div>
                <div>
                  <div className="bar-track">
                    <div className="bar-fill" style={widthVar(progress)} />
                  </div>
                  <div className="public-dim mt-3 flex justify-between text-sm">
                    <span>
                      {project.initiative.targetMetricCurrent.toLocaleString(
                        "en-US",
                      )}{" "}
                      today
                    </span>
                    <span>
                      Goal ·{" "}
                      {project.initiative.targetMetricGoal.toLocaleString(
                        "en-US",
                      )}
                    </span>
                  </div>
                </div>
              </section>

              <section className="proof-rule" aria-label="Public proof rule">
                <div className="public-muted text-sm">Public proof rule</div>
                <div className="proof-rule-list">
                  <Chip tone="info">Category spend</Chip>
                  <Chip tone="ok">Approved updates</Chip>
                  <Chip>Payment receipts</Chip>
                </div>
                <p className="public-dim text-sm leading-6">
                  Project pages show approved field updates and category spend,
                  never private contacts or raw receipt files.
                </p>
              </section>

              <section className="batch-volume" aria-label="Visible payment volume">
                <span className="public-muted text-sm">Visible payment volume</span>
                <strong>{formatUsdc(totalSubmitted)}</strong>
                <span>
                  Submitted and settled payments only. Drafts, failures, and
                  operational exceptions stay internal.
                </span>
              </section>
            </div>

            <div className="mt-10 grid gap-3">
              {project.spending.slice(0, 5).map((item) => (
                <div
                  className="grid items-center gap-3 text-sm md:grid-cols-[150px_1fr_120px]"
                  key={`${item.batchCode}-${item.category}`}
                >
                  <span className="public-muted">{item.category}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill block"
                      style={widthVar((item.amountUsdc / maxSpend) * 100)}
                    />
                  </span>
                  <span className="mono public-dim">
                    {formatUsdc(item.amountUsdc)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <aside className="updates-timeline" aria-label="Project updates">
            <div className="mb-4 flex items-end justify-between border-b border-[var(--dark-rule)] pb-3">
              <h2 className="display text-3xl font-medium">Updates</h2>
              <span className="mono public-dim text-xs">Latest first</span>
            </div>
            <div className="updates-timeline-list">
              {project.updates.map((update) => (
                <article
                  className="updates-timeline-item"
                  key={update.id}
                >
                  <div className="mono public-dim text-xs uppercase">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(update.publishedAt))}{" "}
                    · {update.milestoneCode}
                  </div>
                  <p className="public-muted mt-4 leading-7">{update.caption}</p>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-[var(--dark-rule)] bg-[var(--public-bg-low)] px-[var(--pad-page)] py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display text-4xl font-medium">
              Receipts · {project.initiative.name}
            </h2>
            <p className="public-dim mt-2">
              Payment-level proof from canonical records.
            </p>
          </div>
          {proof ? (
            <Link
              className="btn ghost"
              href={`/proof/${proof.batchId}`}
            >
              Open proof <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
        </div>

        <div className="overflow-x-auto border border-[var(--dark-rule)]">
          <table className="t min-w-[720px] text-[var(--public-fg)]">
            <thead>
              <tr>
                <th>Payment</th>
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
                    <td className="mono public-dim">{batch.periodLabel}</td>
                    <td>{formatUsdc(receipt.amountUsdc)}</td>
                    <td>{receipt.category}</td>
                    <td className="mono public-dim">
                      {formatLocal(receipt.localAmount, receipt.localCurrency)}
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <Hash value={receipt.transactionHash} />
                        <ExternalLink className="public-dim h-4 w-4" />
                      </span>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
        <p className="public-dim mt-5 max-w-3xl text-sm leading-6">
          Public receipt rows show verified USDC amount, category, local
          snapshot, and Stellar transaction reference. Recipient names, private
          files, failed payments, and native XLM fee or reserve activity stay
          in the admin console.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
