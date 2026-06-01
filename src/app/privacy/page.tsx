import Link from "next/link";

import { AyraLogo } from "@/components/ayra/ui";
import { SiteFooter } from "@/components/ayra/site-footer";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/ayra/contact";

export const metadata = {
  title: "Privacy | AYRA Stellar",
  description: "Privacy overview for the AYRA Stellar public transparency site.",
};

const privacyPoints = [
  {
    title: "What we collect",
    body:
      "We only use the information needed to run the public transparency wall, applications, project pages, and operator workflows: names, email addresses, submission content, and basic site interaction data.",
  },
  {
    title: "How we use it",
    body:
      "Data is used to review applications, manage portal access, publish approved public records, and keep private operator-only material out of the public surfaces.",
  },
  {
    title: "What we do not publish",
    body:
      "Private receipts, raw contact details, failed payment details, and internal reconciliation notes stay off the public wall and project pages.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className="public-shell">
      <nav className="public-nav" aria-label="Privacy page">
        <Link className="wordmark" href="/">
          <AyraLogo alt="" />
          <span>AYRA</span>
        </Link>
        <Link className="public-anchor" href="/">
          Back to home
        </Link>
      </nav>

      <section className="px-[var(--pad-page)] py-14 md:py-20">
        <div className="max-w-3xl">
          <div className="place-line">Privacy · AYRA Stellar</div>
          <h1 className="hero-title mt-7 max-w-2xl text-5xl md:text-6xl">
            Privacy that matches the public wall.
          </h1>
          <p className="public-muted mt-8 text-lg leading-8">
            AYRA keeps the public transparency layer narrow. Public content is
            meant to show approved initiatives and proof, not internal operator
            data or private receipt files.
          </p>
        </div>
      </section>

      <section className="grid gap-4 px-[var(--pad-page)] pb-16 md:grid-cols-3">
        {privacyPoints.map((point) => (
          <article
            className="initiative-tile min-h-0 p-5"
            key={point.title}
          >
            <h2 className="display text-2xl font-medium">{point.title}</h2>
            <p className="public-muted mt-4 text-sm leading-6">{point.body}</p>
          </article>
        ))}
      </section>

      <section className="px-[var(--pad-page)] pb-16">
        <div className="max-w-3xl rounded-none border border-[var(--dark-rule)] bg-[var(--public-panel)] p-6">
          <div className="display text-2xl font-medium text-[var(--public-fg)]">
            Contact
          </div>
          <p className="public-muted mt-4 text-sm leading-6">
            Questions about this site or its privacy handling can be sent to{" "}
            <a
              className="text-[var(--public-fg)] underline underline-offset-4"
              href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
            >
              {PUBLIC_CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
