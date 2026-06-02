import Link from "next/link";

import { AdminShell } from "@/app/admin/admin-shell";
import { buildAdminViewModel } from "@/app/admin/admin-view-model";
import { Chip } from "@/components/ayra/ui";
import { moderateUpdateAction } from "@/lib/ayra/actions";
import { requireAdminSession } from "@/lib/ayra/session";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function AdminUpdatesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireAdminSession("/admin/updates");
  const view = await buildAdminViewModel(session.state);

  return (
    <AdminShell
      activeHref="/admin/updates"
      session={session}
      status={params?.status}
      view={view}
    >
      <section>
        <div className="section-head">
          <div>
            <h1>Updates publisher</h1>
            <p className="section-sub">
              One moderation queue for steward and grantee-contact submissions.
              Only approved records are public.
            </p>
          </div>
        </div>
        <div className="grid-2">
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Pending submissions</span>
              <Chip tone="warn">{view.pendingUpdates.length} pending</Chip>
            </div>
            <div className="divide-y divide-rule">
              {view.pendingUpdates.map((update) => (
                <article className="p-4" key={update.id}>
                  <div className="row-meta">
                    From Leidy Mendoza · {view.reforest.name} ·{" "}
                    {update.submittedAt.slice(0, 16).replace("T", " ")} UTC
                  </div>
                  <p className="mt-3 text-sm leading-6">{update.caption}</p>
                  <form action={moderateUpdateAction} className="mt-4 grid gap-3">
                    <input name="updateId" type="hidden" value={update.id} />
                    <div className="field">
                      <label htmlFor={`caption-${update.id}`}>Public caption</label>
                      <textarea
                        defaultValue={update.caption}
                        id={`caption-${update.id}`}
                        name="publicCaption"
                        rows={2}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn primary"
                        name="action"
                        type="submit"
                        value="edit-and-approve"
                      >
                        Approve
                      </button>
                      <button className="btn" name="action" type="submit" value="save draft">
                        Hold
                      </button>
                      <button className="btn danger" name="action" type="submit" value="reject">
                        Reject
                      </button>
                    </div>
                  </form>
                </article>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Recently published</span>
              <Link className="btn ghost" href="/#initiative">
                View on wall
              </Link>
            </div>
            <div className="divide-y divide-rule">
              {session.state.updates
                .filter((update) => update.status === "approved")
                .map((update) => (
                  <article className="p-4" key={update.id}>
                    <div className="row-meta">
                      {update.publishedAt?.slice(0, 10)} · public
                    </div>
                    <p className="mt-3 text-sm leading-6">
                      {update.publicCaption ?? update.caption}
                    </p>
                  </article>
                ))}
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
