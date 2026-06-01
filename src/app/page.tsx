import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AyraLogo } from "@/components/ayra/ui";
import { AdvisorPanel } from "@/components/ayra/advisor-panel";
import { SiteFooter } from "@/components/ayra/site-footer";
import { loadPublicAyraState } from "@/lib/ayra/data";
import { getPublicWallProjection } from "@/lib/ayra/domain";

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
  const wall = getPublicWallProjection(state, params?.track ?? "providencia");
  const leadInitiative =
    wall.initiatives.find((initiative) => initiative.slug === "reforestation") ??
    wall.initiatives[0];
  const leadIndex = wall.initiatives.findIndex(
    (initiative) => initiative.id === leadInitiative?.id,
  );
  const leadImage =
    leadInitiative
      ? projectImageBySlug[
          leadInitiative.slug as keyof typeof projectImageBySlug
        ] ?? projectImages[Math.max(leadIndex, 0) % projectImages.length]
      : projectImages[0];
  const secondaryInitiatives = wall.initiatives.filter(
    (initiative) => initiative.id !== leadInitiative?.id,
  );

  return (
    <main className="public-shell">
      <nav className="public-nav" aria-label="Public wall">
        <Link className="wordmark" href="#top">
          <AyraLogo alt="" />
          <span>AYRA</span>
        </Link>
        <div className="public-nav-actions flex flex-wrap justify-end gap-2">
          {state.tracks.map((track) => (
            <Link
              aria-current={track.slug === wall.track.slug ? "page" : undefined}
              className={
                track.slug === wall.track.slug
                  ? "public-anchor active"
                  : "public-anchor"
              }
              href={`/?track=${track.slug}`}
              key={track.id}
            >
              {track.name}
            </Link>
          ))}
          <Link className="public-anchor" href="/apply">
            Apply
          </Link>
          <Link className="public-anchor" href="/login">
            Login
          </Link>
        </div>
      </nav>

      <AdvisorPanel trackSlug={wall.track.slug} />

      <section
        id="top"
        className="public-hero px-[var(--pad-page)] py-14 md:py-20"
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
        </div>
      </section>

      <section className="project-wall" aria-label="Projects">
        {leadInitiative ? (
          <div className="lead-project-frame">
            <Link
              aria-label={`Open ${leadInitiative.name}`}
              className="lead-project"
              href={`/projects/${wall.track.slug}/${leadInitiative.slug}`}
            >
              <div className="lead-project-copy">
                <div className="place-line">Field anchor</div>
                <h2 className="display mt-5 text-5xl font-medium md:text-7xl">
                  {leadInitiative.name}
                </h2>
                <p className="public-muted mt-5 max-w-xl text-lg leading-8">
                  {leadInitiative.description}
                </p>
                <div className="lead-project-facts">
                  <span>
                    {leadInitiative.targetMetricCurrent.toLocaleString("en-US")} /{" "}
                    {leadInitiative.targetMetricGoal.toLocaleString("en-US")}
                  </span>
                  <span>{leadInitiative.targetMetricLabel}</span>
                  <span>{leadInitiative.leagueScore} score</span>
                </div>
                <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--public-fg)]">
                  Open project <ArrowRight className="h-4 w-4" />
                </div>
              </div>
              <div className="lead-project-visual">
                <Image
                  alt={leadImage.alt}
                  className="project-visual-image"
                  height={1152}
                  priority
                  sizes="(min-width: 1024px) 46vw, 100vw"
                  src={leadImage.src}
                  width={928}
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
                batch receipts, and project-level proof when records are approved.
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

      <SiteFooter />
    </main>
  );
}
