import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

import { StatusBanner } from "@/components/ayra/ui";
import { requestMagicLinkAction } from "@/lib/ayra/actions";
import { safeNextPath } from "@/lib/ayra/session";

type PageProps = {
  searchParams?: Promise<{ next?: string; status?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = safeNextPath(params?.next, "/admin");

  return (
    <main className="ops-shell">
      <nav className="ops-nav" aria-label="Sign in">
        <Link className="ops-brand" href="/">
          AYRA<span>/</span>login
        </Link>
        <span className="ops-pill">Magic-link access</span>
        <Link className="btn ghost ml-auto" href="/">
          <ArrowLeft className="h-4 w-4" /> Wall
        </Link>
      </nav>

      <div className="ops-main max-w-3xl">
        <StatusBanner status={params?.status} />
        <section className="section-head">
          <div>
            <h1>Sign in to AYRA Stellar.</h1>
            <p className="section-sub">
              Operator and steward portals use Supabase magic links. Access is
              resolved from the profile and role records attached to your email.
            </p>
          </div>
        </section>

        <form action={requestMagicLinkAction} className="panel">
          <div className="panel-head">
            <span className="panel-title">Email link</span>
            <span className="chip info">No password</span>
          </div>
          <div className="panel-body grid gap-4">
            <input name="next" type="hidden" value={next} />
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                className="mono"
                id="email"
                name="email"
                placeholder="nicolas@ayra.haus"
                type="email"
                required
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
              <p className="max-w-md text-sm text-ink-muted">
                Seeded admin and steward emails claim their existing scoped
                records after the magic-link callback.
              </p>
              <button className="btn primary" type="submit">
                Send link <Mail className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
