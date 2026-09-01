import { PublicNav } from "@/components/ayra/public-nav";
import { LEGAL_NOTICE } from "@/lib/ayra/legal";

export const metadata = {
  title: "Impressum | AYRA Stellar",
  description: "Company and ownership information for AYRA Stellar.",
};

export default function ImpressumPage() {
  return (
    <main className="public-shell flex-1">
      <PublicNav
        ariaLabel="Impressum page"
        groups={[
          {
            label: "Navigation",
            items: [{ href: "/", label: "Back to home" }],
          },
        ]}
        homeHref="/"
      />

      <section className="px-[var(--pad-page)] py-14 md:py-20">
        <div className="max-w-3xl">
          <div className="place-line">Legal · AYRA Stellar</div>
          <h1 className="hero-title mt-7 text-5xl md:text-6xl">Impressum.</h1>

          <div className="mt-10 border-t border-[var(--dark-rule)] pt-8">
            <h2 className="display text-2xl font-medium text-[var(--public-fg)]">
              {LEGAL_NOTICE.organization}
            </h2>

            <address className="public-muted mt-5 not-italic leading-7">
              {LEGAL_NOTICE.address}
            </address>

            <dl className="mt-10 grid gap-x-8 gap-y-6 border-t border-[var(--dark-rule)] pt-8 sm:grid-cols-[10rem_1fr]">
              <dt className="text-xs uppercase tracking-[0.16em] text-[var(--public-dim)]">
                Registergericht
              </dt>
              <dd className="text-[var(--public-fg)]">
                {LEGAL_NOTICE.registryCourt} · {LEGAL_NOTICE.registerNumber}
              </dd>

              <dt className="text-xs uppercase tracking-[0.16em] text-[var(--public-dim)]">
                Geschäftsführer
              </dt>
              <dd className="text-[var(--public-fg)]">
                {LEGAL_NOTICE.managingDirectors.join(", ")}
              </dd>

              <dt className="text-xs uppercase tracking-[0.16em] text-[var(--public-dim)]">
                USt-IdNr.
              </dt>
              <dd className="text-[var(--public-fg)]">{LEGAL_NOTICE.vatId}</dd>

              <dt className="text-xs uppercase tracking-[0.16em] text-[var(--public-dim)]">
                Kontakt
              </dt>
              <dd>
                <a
                  className="text-[var(--public-fg)] underline underline-offset-4 transition hover:text-[var(--public-muted)]"
                  href={`mailto:${LEGAL_NOTICE.email}`}
                >
                  {LEGAL_NOTICE.email}
                </a>
              </dd>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
