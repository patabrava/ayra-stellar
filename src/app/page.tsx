import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AdvisorPanel } from "@/components/ayra/advisor-panel";
import { PartnerLogoRail } from "@/components/ayra/partner-logo-rail";
import { PublicNav } from "@/components/ayra/public-nav";
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

function projectPreview(headline: string) {
  const normalized = headline.replace(/\s+/g, " ").trim();
  if (normalized.length <= 220) return normalized;

  const shortened = normalized.slice(0, 221);
  const lastWord = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastWord > 160 ? lastWord : 220).trim()}…`;
}

function formatStatus(status: "live" | "funding" | "draft") {
  if (status === "live") return "In progress";
  if (status === "funding") return "Preparing to start";
  return "In preparation";
}

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
  const nextMilestone = leadInitiative
    ? state.milestones.find(
        (milestone) =>
          milestone.initiativeId === leadInitiative.id &&
          milestone.status === "active",
      ) ??
      state.milestones.find(
        (milestone) =>
          milestone.initiativeId === leadInitiative.id &&
          milestone.status === "planned",
      )
    : undefined;
  const leadProjectHref = leadInitiative
    ? `/projects/${wall.track.slug}/${leadInitiative.slug}`
    : "#projects";

  return (
    <main className="public-shell">
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
            label: "Explore",
            items: [
              { href: "#projects", label: "Projects" },
              { href: "https://www.ayra.haus", label: "About AYRA" },
            ],
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
        className="public-hero px-[var(--pad-page)] py-8 md:py-20"
      >
        <div className="relative z-10 max-w-6xl">
          <div className="place-line">{wall.track.name} · 2026</div>
          <h1 className="hero-title mt-7">
            {wall.track.name},
            <br />
            lived in.
            <br />
            Funded by AYRA.
          </h1>
          <p className="public-muted mt-8 max-w-2xl text-xl leading-8">
            AYRA builds impact zones in places we care about. First zone:
            Providencia, the Caribbean of Colombia where we are bringing the
            island onto tech rails.
          </p>
          <div className="public-hero-actions">
            <Link className="public-action public-action-primary" href="/apply">
              Apply
            </Link>
          </div>
        </div>
      </section>

      <section className="project-wall" id="projects" aria-label="Projects">
        {leadInitiative ? (
          <div className="lead-project-frame">
            <Link
              aria-label={`Open ${leadInitiative.name}`}
              className="lead-project"
              href={leadProjectHref}
            >
              <div className="lead-project-copy">
                <div className="lead-project-eyebrow">
                  <span>Featured project</span>
                  <span className="project-status">
                    {formatStatus(leadInitiative.status)}
                  </span>
                </div>
                <h2 className="lead-project-title">
                  {leadInitiative.name}
                </h2>
                <p className="lead-project-summary">
                  {projectPreview(leadInitiative.headline)}
                </p>
                <div className="lead-project-facts">
                  <span>
                    <small>Progress</small>
                    <strong>
                      {leadInitiative.targetMetricCurrent.toLocaleString("en-US")} /{" "}
                      {leadInitiative.targetMetricGoal.toLocaleString("en-US")}
                    </strong>
                  </span>
                  <span>
                    <small>Current stage</small>
                    <strong>{formatStatus(leadInitiative.status)}</strong>
                  </span>
                  <span>
                    <small>Next milestone</small>
                    <strong>{nextMilestone?.title ?? "First update"}</strong>
                  </span>
                </div>
                <div className="project-open-link">
                  View project and proof <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </div>
              </div>
              <div className="lead-project-visual">
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
              </div>
            </Link>
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

      <PartnerLogoRail />
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

    </main>
  );
}
