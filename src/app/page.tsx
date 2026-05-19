import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import { loadPublicAyraState } from "@/lib/ayra/data";
import { getPublicWallProjection } from "@/lib/ayra/domain";

type PageProps = {
  searchParams?: Promise<{ track?: string }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const state = await loadPublicAyraState();
  const wall = getPublicWallProjection(state, params?.track ?? "providencia");

  return (
    <main className="public-shell">
      <nav className="public-nav" aria-label="Public wall">
        <Link className="wordmark" href="#top">
          AYRA <span>{wall.track.name}</span>
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
            This landing surface stays high-level. Choose a project to open its
            dedicated page with approved updates, batch receipts, and public proof.
          </p>
        </div>
      </section>

      <section
        className="grid gap-4 px-[var(--pad-page)] pb-24 md:grid-cols-3"
        aria-label="Projects"
      >
        {wall.initiatives.map((initiative, index) => (
          <Link
            className="initiative-tile"
            href={`/projects/${wall.track.slug}/${initiative.slug}`}
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
                <h2 className="display text-3xl font-medium">{initiative.name}</h2>
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
        ))}
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
