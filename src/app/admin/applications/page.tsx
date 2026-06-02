import { Check } from "lucide-react";

import { AdminShell } from "@/app/admin/admin-shell";
import { buildAdminViewModel } from "@/app/admin/admin-view-model";
import { Chip } from "@/components/ayra/ui";
import {
  approveApplicationAction,
  rejectApplicationAction,
} from "@/lib/ayra/actions";
import { requireAdminSession } from "@/lib/ayra/session";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function AdminApplicationsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireAdminSession("/admin/applications");
  const view = await buildAdminViewModel(session.state);

  return (
    <AdminShell
      activeHref="/admin/applications"
      session={session}
      status={params?.status}
      view={view}
    >
      <section>
        <div className="section-head">
          <div>
            <h1>Applications</h1>
            <p className="section-sub">
              Application approval grants portal access only. Rejection keeps
              the proposal out of the active registry.
            </p>
          </div>
        </div>
        <div className="panel overflow-x-auto">
          <table className="t min-w-[760px]">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Proposal</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {view.pendingApplications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <div className="row-name">{application.applicantName}</div>
                    <div className="row-meta">{application.applicantEmail}</div>
                  </td>
                  <td>
                    <div className="row-name">{application.proposedInitiativeName}</div>
                    <div className="row-meta">{application.scopeSummary}</div>
                  </td>
                  <td>
                    <Chip tone="warn">{application.status}</Chip>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <form action={approveApplicationAction}>
                        <input name="applicationId" type="hidden" value={application.id} />
                        <button className="btn primary" type="submit">
                          Approve <Check className="h-4 w-4" />
                        </button>
                      </form>
                      <form action={rejectApplicationAction}>
                        <input name="applicationId" type="hidden" value={application.id} />
                        <button className="btn danger" type="submit">
                          Reject
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
