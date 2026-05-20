import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

import { AyraLogo, Chip } from "@/components/ayra/ui";
import { LoginStatusModal } from "@/components/ayra/login-status-modal";
import {
  requestGoogleLoginAction,
  requestMagicLinkAction,
} from "@/lib/ayra/actions";
import { safeNextPath } from "@/lib/ayra/session";

type PageProps = {
  searchParams?: Promise<{ next?: string; status?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = safeNextPath(params?.next, "/login");

  return (
    <main className="ops-shell login-stage">
      <LoginStatusModal status={params?.status} />
      <nav className="ops-nav" aria-label="Sign in">
        <Link className="ops-brand" href="/">
          <AyraLogo />
          <span>/</span>login
        </Link>
        <Link className="btn ghost ml-auto" href="/">
          <ArrowLeft className="h-4 w-4" /> Wall
        </Link>
      </nav>

      <div className="login-modal-wrap">
        <section
          aria-describedby="login-modal-description"
          aria-labelledby="login-modal-title"
          className="login-modal-card"
        >
          <div className="login-modal-copy">
            <Chip tone="info">Supabase Auth</Chip>
            <h1 id="login-modal-title">Sign in to AYRA Stellar.</h1>
            <p id="login-modal-description">
              Choose Google for a browser-based OAuth session, or use the
              existing magic-link path. Both routes return through AYRA&apos;s
              role-aware callback before opening admin or steward access.
            </p>
            <div className="login-assurance">
              <ShieldCheck className="h-4 w-4" />
              <span>
                Access is granted by live profile and role records, not by
                the sign-in method alone.
              </span>
            </div>
          </div>

          <div className="login-modal-actions">
            <form action={requestGoogleLoginAction}>
              <input name="next" type="hidden" value={next} />
              <button className="btn google-login-btn" type="submit">
                <span className="google-mark" aria-hidden="true">
                  G
                </span>
                Continue with Google
              </button>
            </form>

            <div className="login-divider">
              <span>or request a magic link</span>
            </div>

            <form action={requestMagicLinkAction} className="login-email-form">
              <input name="next" type="hidden" value={next} />
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  className="mono"
                  id="email"
                  name="email"
                  placeholder="caposk817@gmail.com"
                  type="email"
                  required
                />
              </div>
              <p className="text-sm leading-6 text-ink-muted">
                Use the email connected to your application or operator role.
                AYRA will open the portal your account is allowed to use.
              </p>
              <button className="btn primary" type="submit">
                Send magic link <Mail className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
