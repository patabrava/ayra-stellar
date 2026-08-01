import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, CheckCircle2 } from "lucide-react";

import { AdvisorPanel } from "@/components/ayra/advisor-panel";
import { PublicNav } from "@/components/ayra/public-nav";
import { PublicRichText } from "@/components/ayra/public-rich-text";
import { SiteFooter } from "@/components/ayra/site-footer";
import { loadPublicAyraState } from "@/lib/ayra/data";
import { getPublicWallProjection } from "@/lib/ayra/domain";
import { initiativeMediaFor } from "@/lib/ayra/public-project-media";

type PageProps = {
  searchParams?: Promise<{ track?: string }>;
};

const projectImages = [
  {
    alt: "Reforestation planting scene from the Providencia mockup",
    src: "/mockups/reforest.jpg",
  },
  {
    alt: "Dog sterilization scene from the Providencia mockup",
    src: "/mockups/steril.jpg",
  },
  {
    alt: "Reef restoration scene from the Providencia mockup",
    src: "/mockups/reef.jpg",
  },
  {
    alt: "Reforestation landscape panel from the Providencia mockup",
    src: "/mockups/reforest-panel.jpg",
  },
] as const;

const projectImageBySlug = {
  reforestation: projectImages[0],
  "dog-sterilization": projectImages[1],
  reef: projectImages[2],
} as const;

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const state = await loadPublicAyraState();
  const selectedTrack =
    state.tracks.find((track) => track.slug === (params?.track ?? "providencia")) ??
    state.tracks[0];
  const hasPublicWallData =
    selectedTrack &&
    state.initiatives.some(
      (initiative) => initiative.trackId === selectedTrack.id,
    );

  if (!hasPublicWallData) {
    return <EmptyPublicWall tracks={state.tracks} />;
  }

  const wall = getPublicWallProjection(state, params?.track ?? "providencia");
  const allowMockupFallback =
    process.env.AYRA_DEMO_MODE === "1" || !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const leadInitiative =
    wall.initiatives.find(
      (initiative) => initiativeMediaFor(state, initiative.id).main,
    ) ??
    (allowMockupFallback
      ? wall.initiatives.find((initiative) => initiative.slug === "reforestation") ??
        wall.initiatives[0]
      : undefined);
  const leadIndex = wall.initiatives.findIndex(
    (initiative) => initiative.id === leadInitiative?.id,
  );
  const approvedLeadImage = leadInitiative
    ? initiativeMediaFor(state, leadInitiative.id).main
    : undefined;
  const leadImage = approvedLeadImage
    ? {
        alt: approvedLeadImage.alt,
        src: approvedLeadImage.url,
        focalPosition: approvedLeadImage.focalPosition,
        height: approvedLeadImage.height,
        remote: true,
        width: approvedLeadImage.width,
      }
    : leadInitiative
      ? {
          ...(projectImageBySlug[
            leadInitiative.slug as keyof typeof projectImageBySlug
          ] ?? projectImages[Math.max(leadIndex, 0) % projectImages.length]),
          focalPosition: "center",
          height: undefined,
          remote: false,
          width: undefined,
        }
      : {
          ...projectImages[0],
          focalPosition: "center",
          height: undefined,
          remote: false,
          width: undefined,
        };
  const secondaryInitiatives = wall.initiatives.filter(
    (initiative) => initiative.id !== leadInitiative?.id,
  );
  const publishedUsdc = wall.batches.reduce(
    (total, batch) => total + batch.amountUsdc,
    0,
  );
  const progress = leadInitiative
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (leadInitiative.targetMetricCurrent /
              Math.max(leadInitiative.targetMetricGoal, 1)) *
              100,
          ),
        ),
      )
    : 0;

  return (
    <main className="public-shell">
      <a className="public-skip-link" href="#dashboard-content">
        Skip to transparency records
      </a>
      <PublicNav
        ariaLabel="Public wall"
        groups={[
          {
            label: "Programs",
            items: state.tracks.map((track) => ({
              current: track.slug === wall.track.slug,
              href: `/?track=${track.slug}`,
              label: track.name,
              title: track.name,
            })),
          },
          {
            label: "Access",
            items: [
              { href: "/apply", label: "Apply" },
              { href: "/login", label: "Login" },
            ],
          },
        ]}
        homeHref="#top"
      />

      <AdvisorPanel trackSlug={wall.track.slug} />

      <section
        id="top"
        className="public-hero"
      >
        <div className="public-hero-copy">
          <div className="place-line">{wall.track.name} · Public records</div>
          <h1 className="hero-title">
            Follow the work.
            <br />
            Verify the funding.
          </h1>
          <p className="public-hero-summary">
            Track approved milestones, field updates, and public funding records
            for {wall.track.name}. Private participant data stays private.
          </p>
          <a className="public-hero-link" href="#projects">
            Explore public records <ArrowDown aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </section>

      <div id="dashboard-content">
        <section className="public-summary" aria-labelledby="public-summary-title">
          <div className="public-summary-heading">
            <div>
              <div className="place-line">Live public view</div>
              <h2 id="public-summary-title">What is documented now</h2>
            </div>
            <p>
              Counts reflect approved public records for this program. Zero means
              no record has been published yet.
            </p>
          </div>
          <dl className="public-summary-grid">
            <div>
              <dt>Projects</dt>
              <dd>{wall.initiatives.length}</dd>
              <small>Publicly listed</small>
            </div>
            <div>
              <dt>Field updates</dt>
              <dd>{wall.updates.length}</dd>
              <small>Approved for publication</small>
            </div>
            <div>
              <dt>Funding releases</dt>
              <dd>{wall.batches.length}</dd>
              <small>With public proof</small>
            </div>
            <div>
              <dt>USDC documented</dt>
              <dd>{formatUsdc(publishedUsdc)}</dd>
              <small>Across public releases</small>
            </div>
          </dl>
        </section>

      <section className="project-wall" id="projects" aria-labelledby="projects-title">
        <div className="project-wall-heading">
          <div>
            <div className="place-line">Projects</div>
            <h2 id="projects-title">Work you can inspect</h2>
          </div>
          <p>
            Open a project to review its proposal, progress, approved media, and
            available proof records.
          </p>
        </div>
        {leadInitiative ? (
          <div className="lead-project-frame">
            <article className="lead-project">
              <div className="lead-project-copy">
                <div className="lead-project-eyebrow">
                  <span>Featured project</span>
                  <span className="project-status">
                    {formatStatus(leadInitiative.status)}
                  </span>
                </div>
                <h3 className="lead-project-title">
                  {leadInitiative.name}
                </h3>
                <div className="lead-project-summary">
                  <PublicRichText>
                    {summarize(leadInitiative.headline)}
                  </PublicRichText>
                </div>
                <div className="lead-project-facts">
                  <span>
                    {leadInitiative.targetMetricCurrent.toLocaleString("en-US")} /{" "}
                    {leadInitiative.targetMetricGoal.toLocaleString("en-US")}
                  </span>
                  <span>{leadInitiative.targetMetricLabel}</span>
                  <span>League score {leadInitiative.leagueScore}</span>
                </div>
                <div
                  aria-label={`${leadInitiative.targetMetricLabel}: ${progress}%`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={progress}
                  className="lead-project-progress"
                  role="progressbar"
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
                <Link
                  aria-label={`Open project: ${leadInitiative.name}`}
                  className="project-open-link"
                  href={`/projects/${wall.track.slug}/${leadInitiative.slug}`}
                >
                  Open project <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <Link
                aria-label={`View ${leadInitiative.name}`}
                className="lead-project-visual"
                href={`/projects/${wall.track.slug}/${leadInitiative.slug}`}
              >
                <Image
                  alt={leadImage.alt}
                  className="project-visual-image"
                  height={leadImage.height ?? 1152}
                  priority
                  sizes="(min-width: 1024px) 46vw, 100vw"
                  src={leadImage.src}
                  style={{ objectPosition: leadImage.focalPosition }}
                  unoptimized={leadImage.remote}
                  width={leadImage.width ?? 928}
                />
                <span className="lead-project-visual-label">
                  View project <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </span>
              </Link>
            </article>
          </div>
        ) : null}

        {secondaryInitiatives.length > 0 ? (
          <div className="project-index" aria-label="More projects">
            <div>
              <div className="place-line">Proof lanes</div>
              <p className="public-dim mt-4 max-w-md leading-7">
                Active and planned Providencia workstreams with public updates,
                payment receipts, and project-level proof when records are approved.
              </p>
            </div>
            <div className="project-index-list">
              {secondaryInitiatives.map((initiative, index) => (
                <Link
                  aria-label={`Open ${initiative.name}`}
                  className="project-index-row"
                  href={`/projects/${wall.track.slug}/${initiative.slug}`}
                  key={initiative.id}
                >
                  <span className="mono public-dim text-xs">
                    {String(index + 2).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{initiative.name}</strong>
                    <small>{initiative.headline}</small>
                  </span>
                  <span className="project-index-metric">
                    {initiative.leagueScore}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>

        <section className="public-proof-guide" aria-labelledby="proof-guide-title">
          <div className="public-proof-guide-heading">
            <div className="place-line">Publication standard</div>
            <h2 id="proof-guide-title">Only approved records reach this wall</h2>
          </div>
          <div className="public-proof-guide-grid">
            <article>
              <CheckCircle2 aria-hidden="true" />
              <h3>Milestones</h3>
              <p>Project scope and progress are shown against named targets.</p>
            </article>
            <article>
              <CheckCircle2 aria-hidden="true" />
              <h3>Field updates</h3>
              <p>Only reviewed captions and publication-ready media appear.</p>
            </article>
            <article>
              <CheckCircle2 aria-hidden="true" />
              <h3>Funding records</h3>
              <p>Public releases can include amounts, categories, and transaction proof.</p>
            </article>
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}

function EmptyPublicWall({ tracks }: { tracks: Array<{ id: string; slug: string; name: string }> }) {
  return (
    <main className="public-shell">
      <PublicNav
        ariaLabel="Public wall"
        groups={[
          {
            label: "Programs",
            items: tracks.map((track) => ({
              href: `/?track=${track.slug}`,
              label: track.name,
            })),
          },
          {
            label: "Access",
            items: [
              { href: "/apply", label: "Apply" },
              { href: "/login", label: "Login" },
            ],
          },
        ]}
        homeHref="#top"
      />

      <section
        id="top"
        className="public-hero px-[var(--pad-page)] py-14 md:py-20"
      >
        <div className="relative z-10 max-w-6xl">
          <div className="place-line">Transparency wall</div>
          <h1 className="hero-title mt-7">
            AYRA proof data
            <br />
            is being prepared.
          </h1>
          <p className="public-muted mt-8 max-w-2xl text-xl leading-8">
            The public wall is online, but no approved project rows are available
            for this track yet. Admin treasury and payout readiness remain gated
            separately.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function formatStatus(status: string) {
  return status.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatUsdc(amount: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function summarize(value: string, maxLength = 360) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const boundary = normalized.lastIndexOf(" ", maxLength);
  return `${normalized.slice(0, boundary > maxLength * 0.7 ? boundary : maxLength).trim()}…`;
}
