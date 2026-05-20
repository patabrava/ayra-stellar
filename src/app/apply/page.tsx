import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";

import { AyraLogo } from "@/components/ayra/ui";
import { ApplicationSubmitModal } from "@/components/ayra/application-submit-modal";
import { submitApplicationAction } from "@/lib/ayra/actions";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function ApplyPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <main className="ops-shell">
      <ApplicationSubmitModal status={params?.status} />
      <nav className="ops-nav" aria-label="Application">
        <Link className="ops-brand" href="/">
          <AyraLogo />
          <span>/</span>apply
        </Link>
        <span className="ops-pill">Steward and initiative intake</span>
        <Link className="btn ghost ml-auto" href="/">
          <ArrowLeft className="h-4 w-4" /> Wall
        </Link>
      </nav>

      <div className="ops-main max-w-5xl">
        <section className="section-head">
          <div>
            <h1>Apply to manage a track initiative.</h1>
            <p className="section-sub">
              Approval grants scoped portal access only. Funding approval and
              payout execution remain separate admin-controlled steps.
            </p>
          </div>
        </section>

        <div className="grid-2">
          <form action={submitApplicationAction} className="panel">
            <div className="panel-head">
              <span className="panel-title">Application intake</span>
              <span className="chip info">Manual review</span>
            </div>
            <div className="panel-body grid gap-4">
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="applicantName">Applicant name</label>
                  <input
                    id="applicantName"
                    name="applicantName"
                    placeholder="Leidy Mendoza"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="applicantEmail">Email</label>
                  <input
                    className="mono"
                    id="applicantEmail"
                    name="applicantEmail"
                    placeholder="name@example.org"
                    type="email"
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label htmlFor="proposedTrackName">Track</label>
                  <input
                    id="proposedTrackName"
                    name="proposedTrackName"
                    defaultValue="Providencia"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="proposedInitiativeName">Initiative</label>
                  <input
                    id="proposedInitiativeName"
                    name="proposedInitiativeName"
                    placeholder="Mangrove nursery"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="scopeSummary">Scope</label>
                <textarea
                  id="scopeSummary"
                  name="scopeSummary"
                  placeholder="What the initiative does, who operates it, and what public progress can be shown."
                  rows={4}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="operationalNotes">Operational details</label>
                <textarea
                  id="operationalNotes"
                  name="operationalNotes"
                  placeholder="Milestones, contact model, update cadence, payout-address readiness, known risks."
                  rows={4}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="contactSignal">Signal / phone</label>
                <input
                  className="mono"
                  id="contactSignal"
                  name="contactSignal"
                  placeholder="+57 ..."
                  required
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
                <p className="max-w-md text-sm text-ink-muted">
                  Synthetic demo submissions redirect locally unless Supabase
                  environment variables are configured.
                </p>
                <button className="btn primary" type="submit">
                  Submit for review <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>

          <aside className="panel">
            <div className="panel-head">
              <span className="panel-title">What happens next</span>
            </div>
            <div className="panel-body grid gap-4">
              {[
                [
                  "1",
                  "Admin review",
                  "AYRA reviews the proposed track, initiative scope, and operational contact details.",
                ],
                [
                  "2",
                  "Role promotion",
                  "Approved applicants are explicitly promoted into steward, grantee contact, or both.",
                ],
                [
                  "3",
                  "Payout address check",
                  "One Stellar address is manually verified before any batch can be submitted.",
                ],
                [
                  "4",
                  "Curated transparency",
                  "Submitted updates go to moderation. Only approved public records reach the wall.",
                ],
              ].map(([step, title, body]) => (
                <div className="border border-rule bg-white p-4" key={step}>
                  <span className="chip">{step}</span>
                  <h2 className="mt-3 font-medium">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
