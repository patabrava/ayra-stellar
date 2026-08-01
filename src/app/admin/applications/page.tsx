import { Check } from "lucide-react";
import Image from "next/image";

import { AdminShell } from "@/app/admin/admin-shell";
import { buildAdminViewModel } from "@/app/admin/admin-view-model";
import { Chip } from "@/components/ayra/ui";
import {
  approveApplicationAction,
  curateApplicationMediaAction,
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
  const applicationMedia = session.state.applicationMedia ?? [];
  const previewEntries = session.supabase
    ? await Promise.all(applicationMedia.map(async (media) => {
        const { data } = await session.supabase!.storage.from("ayra-private-application-media").createSignedUrl(media.storagePath, 900);
        return [media.id, data?.signedUrl] as const;
      }))
    : [];
  const previews = new Map(previewEntries);

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
                <th>Proposal and photography</th>
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
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {applicationMedia.filter((media) => media.applicationId === application.id).sort((a, b) => a.sortOrder - b.sortOrder).map((media) => (
                        <article className="border border-rule p-3" key={media.id}>
                          {previews.get(media.id) ? (
                            <div className={media.role === "main" ? "relative aspect-video overflow-hidden" : "relative aspect-[4/3] overflow-hidden"}>
                              <Image alt={media.alt} className="object-cover" fill sizes="320px" src={previews.get(media.id)!} style={{ objectPosition: media.focalPosition }} unoptimized />
                            </div>
                          ) : <div className="grid aspect-video place-items-center bg-black/5 text-xs text-ink-muted">Private preview</div>}
                          <div className="mt-2 flex items-center justify-between gap-2"><Chip tone={media.role === "main" ? "ok" : "info"}>{media.role}</Chip><span className="text-xs text-ink-muted">{media.width} × {media.height}</span></div>
                          <p className="mt-2 text-sm">{media.alt}</p>
                          {media.credit ? <p className="text-xs text-ink-muted">Credit: {media.credit}</p> : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {media.role === "gallery" ? (
                              <>
                                <form action={curateApplicationMediaAction}><input name="applicationId" type="hidden" value={application.id} /><input name="mediaId" type="hidden" value={media.id} /><input name="action" type="hidden" value="toggle" /><button className="btn ghost" type="submit">{media.selectedForPublic ? "Exclude" : "Include"}</button></form>
                                <form action={curateApplicationMediaAction}><input name="applicationId" type="hidden" value={application.id} /><input name="mediaId" type="hidden" value={media.id} /><input name="action" type="hidden" value="main" /><button className="btn ghost" type="submit">Use as main</button></form>
                                <form action={curateApplicationMediaAction}><input name="applicationId" type="hidden" value={application.id} /><input name="mediaId" type="hidden" value={media.id} /><input name="action" type="hidden" value="earlier" /><button className="btn ghost" type="submit">Earlier</button></form>
                                <form action={curateApplicationMediaAction}><input name="applicationId" type="hidden" value={application.id} /><input name="mediaId" type="hidden" value={media.id} /><input name="action" type="hidden" value="later" /><button className="btn ghost" type="submit">Later</button></form>
                              </>
                            ) : null}
                            <form action={curateApplicationMediaAction} className="flex gap-2"><input name="applicationId" type="hidden" value={application.id} /><input name="mediaId" type="hidden" value={media.id} /><input name="action" type="hidden" value="focal" /><select aria-label={`Focal position for ${media.originalName}`} defaultValue={media.focalPosition} name="focalPosition"><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select><button className="btn ghost" type="submit">Set focus</button></form>
                          </div>
                          {!media.selectedForPublic ? <p className="mt-2 text-xs text-ink-muted">Excluded from publication</p> : null}
                        </article>
                      ))}
                    </div>
                    {!applicationMedia.some((media) => media.applicationId === application.id && media.role === "main" && media.selectedForPublic) ? <p className="mt-3 text-sm text-[var(--danger)]">Main image required before approval.</p> : null}
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
