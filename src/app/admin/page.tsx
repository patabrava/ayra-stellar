import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";

import { AdminShell } from "@/app/admin/admin-shell";
import { buildAdminViewModel } from "@/app/admin/admin-view-model";
import { Chip, Money } from "@/components/ayra/ui";
import { requireAdminSession } from "@/lib/ayra/session";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireAdminSession("/admin");
  const view = await buildAdminViewModel(session.state);

  return (
    <AdminShell activeHref="/admin" session={session} status={params?.status} view={view}>
      <section>
        <div className="section-head">
          <div>
            <h1>Operator console</h1>
            <p className="section-sub">
              Funding log, proposal queue, payout verification, moderation,
              batch submission, proof packs, and audit-backed activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn ghost" href="/">
              Public wall <ExternalLink className="h-4 w-4" />
            </Link>
            <Link className="btn" href="/admin/export">
              <Download className="h-4 w-4" /> Export CSV
            </Link>
          </div>
        </div>

        <div className="stat-grid mb-5">
          <div className="stat">
            <div className="stat-k">Allocation plan</div>
            <div className="stat-v">
              <Money amount={view.allocated} />
            </div>
            <div className="stat-d">{session.state.initiatives.length} initiatives</div>
          </div>
          <div className="stat">
            <div className="stat-k">Committed to batches</div>
            <div className="stat-v">
              <Money amount={view.committed} />
            </div>
            <div className="stat-d">submitted + settled only</div>
          </div>
          <div className="stat">
            <div className="stat-k">Open operator actions</div>
            <div className="stat-v">
              {view.pendingApplications.length +
                view.pendingUpdates.length +
                view.pendingAddresses.length}
            </div>
            <div className="stat-d">applications, updates, payout checks</div>
          </div>
          <div className="stat">
            <div className="stat-k">Payment rail</div>
            <div className="stat-v text-2xl">{view.paymentRailLabel}</div>
            <div className="stat-d">server boundary only</div>
          </div>
        </div>

        <div className="grid-2">
          <section className="panel">
            <div className="panel-head">
              <span className="panel-title">Initiatives</span>
              <Link className="btn ghost" href="/admin/registry">
                Manage registry
              </Link>
            </div>
            <div className="panel-body grid gap-3">
              {session.state.initiatives.map((initiative) => (
                <Link
                  className="grid gap-3 border border-rule bg-[var(--ops-surface)] p-4 md:grid-cols-[70px_1fr_auto]"
                  href="/admin/registry"
                  key={initiative.id}
                >
                  <div className="viz min-h-16" />
                  <div>
                    <div className="row-name">{initiative.name}</div>
                    <div className="row-meta">
                      {initiative.code} · Steward:{" "}
                      {initiative.stewardName ?? "Pending invite"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Chip tone={initiative.status === "live" ? "ok" : "warn"}>
                        {initiative.status}
                      </Chip>
                      <Chip tone="info">League {initiative.leagueScore}</Chip>
                    </div>
                  </div>
                  <span className="self-center text-sm text-ink-muted">Open</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <span className="panel-title">Pending operator actions</span>
              <Chip tone="warn">
                {view.pendingApplications.length +
                  view.pendingUpdates.length +
                  view.pendingAddresses.length}{" "}
                open
              </Chip>
            </div>
            <table className="t">
              <tbody>
                {view.pendingAddresses.map((address) => (
                  <tr key={address.id}>
                    <td>
                      <Chip tone="warn">Verify addr</Chip>
                    </td>
                    <td>
                      <div className="row-name">
                        {
                          session.state.initiatives.find(
                            (item) => item.id === address.initiativeId,
                          )?.name
                        }{" "}
                        · pending payout address
                      </div>
                      <div className="row-meta">Manual v1 confirmation required</div>
                    </td>
                    <td>
                      <Link className="btn primary" href="/admin/registry">
                        Confirm
                      </Link>
                    </td>
                  </tr>
                ))}
                {view.pendingUpdates.map((update) => (
                  <tr key={update.id}>
                    <td>
                      <Chip tone="warn">Review update</Chip>
                    </td>
                    <td>
                      <div className="row-name">
                        {view.reforest.name} · {update.caption.slice(0, 42)}
                      </div>
                      <div className="row-meta">Shared moderation queue</div>
                    </td>
                    <td>
                      <Link className="btn primary" href="/admin/updates">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
                {view.pendingApplications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <Chip>Application</Chip>
                    </td>
                    <td>
                      <div className="row-name">{application.proposedInitiativeName}</div>
                      <div className="row-meta">{application.applicantEmail}</div>
                    </td>
                    <td>
                      <Link className="btn" href="/admin/applications">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </section>
    </AdminShell>
  );
}
