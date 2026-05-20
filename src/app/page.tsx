import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import { AyraLogo } from "@/components/ayra/ui";
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

  return (
    <main className="public-shell">
      <nav className="public-nav" aria-label="Public wall">
        <Link className="wordmark" href="#top">
          <AyraLogo alt="" />
          <span>AYRA</span>
        </Link>
        <div className="flex flex-wrap justify-end gap-2">
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
          <Link className="public-anchor" href="/admin">
            Operator
          </Link>
        </div>
      </nav>

      <section id="top" className="px-[var(--pad-page)] py-20 md:py-32">
        <div className="max-w-6xl">
          <div className="place-line">{wall.track.name} · 2026</div>
          <h1 className="hero-title mt-7">
            {wall.track.name},
            <br />
            lived in.
            <br />
            Funded by AYRA.
          </h1>
          <p className="mt-8 max-w-2xl text-xl leading-8 text-white/55">
            AYRA builds impact zones in places we care about. First zone:
            Providencia, the Caribbean of Colombia where we are bringing the
            island onto tech rails.
          </p>
        </div>
      </section>

      <section
        className="grid gap-4 px-[var(--pad-page)] pb-24 md:grid-cols-3"
        aria-label="Projects"
      >
        {wall.initiatives.map((initiative, index) => {
          const image =
            projectImageBySlug[
              initiative.slug as keyof typeof projectImageBySlug
            ] ?? projectImages[index % projectImages.length];

          return (
            <Link
              className="initiative-tile"
              href={`/projects/${wall.track.slug}/${initiative.slug}`}
              key={initiative.id}
              aria-label={`Open ${initiative.name}`}
            >
              <div className="project-visual">
                <Image
                  alt={image.alt}
                  className="project-visual-image"
                  height={1152}
                  priority={index === 0}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  src={image.src}
                  width={928}
                />
                <span className="mono absolute left-4 top-4 z-10 text-xs text-white/85">
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
                  Open project <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--dark-rule)] px-[var(--pad-page)] py-8 text-sm text-white/38">
        <span>AYRA Stellar · public transparency wall</span>
        <span className="inline-flex items-center gap-2">
          <Leaf className="h-4 w-4 text-[var(--accent)]" />
          Project pages hold receipts and proof
        </span>
      </footer>
    </main>
  );
}
