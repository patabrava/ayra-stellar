import { AdminShell } from "@/app/admin/admin-shell";
import { buildAdminViewModel } from "@/app/admin/admin-view-model";
import { Chip, Hash } from "@/components/ayra/ui";
import { ApplicationMediaField } from "@/components/ayra/application-media-field";
import { replaceInitiativeMediaAction, verifyPayoutAddressAction } from "@/lib/ayra/actions";
import { requireAdminSession } from "@/lib/ayra/session";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function AdminRegistryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireAdminSession("/admin/registry");
  const view = await buildAdminViewModel(session.state);

  return (
    <AdminShell
      activeHref="/admin/registry"
      session={session}
      status={params?.status}
      view={view}
    >
      <section>
        <div className="section-head">
          <div>
            <h1>Registry</h1>
            <p className="section-sub">
              Initiatives, grantees, payout addresses, and sponsor attribution.
            </p>
          </div>
        </div>
        <div className="grid-2">
          <div className="panel overflow-x-auto">
            <div className="panel-head">
              <span className="panel-title">Payout addresses</span>
            </div>
            <table className="t min-w-[820px]">
              <thead>
                <tr>
                  <th>Initiative</th>
                  <th>Address</th>
                  <th>Memo</th>
                  <th>Network</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {session.state.payoutAddresses.map((address) => {
                  const initiative = session.state.initiatives.find(
                    (item) => item.id === address.initiativeId,
                  );
                  return (
                    <tr key={address.id}>
                      <td>{initiative?.name}</td>
                      <td>
                        <Hash
                          value={`${address.address.slice(0, 10)}...${address.address.slice(-6)}`}
                        />
                      </td>
                      <td className="mono text-xs">{address.walletAddressMemo ?? "—"}</td>
                      <td>
                        <Chip tone={address.stellarNetwork === "pubnet" ? "ok" : "info"}>
                          {address.stellarNetwork}
                        </Chip>
                      </td>
                      <td>
                        <Chip tone={address.status === "pending" ? "warn" : "ok"}>
                          {address.status}
                        </Chip>
                      </td>
                      <td>
                        {address.status === "pending" ? (
                          <form action={verifyPayoutAddressAction}>
                            <input name="payoutAddressId" type="hidden" value={address.id} />
                            <input
                              name="verificationNote"
                              type="hidden"
                              value="Manual v1 operator verification"
                            />
                            <button className="btn primary" type="submit">
                              Verify
                            </button>
                          </form>
                        ) : (
                          <span className="text-sm text-ink-muted">No action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="panel overflow-x-auto">
            <div className="panel-head">
              <span className="panel-title">Audit feed</span>
            </div>
            <table className="t min-w-[620px]">
              <tbody>
                {session.state.auditLogs.map((entry) => (
                  <tr key={entry.id}>
                    <td className="mono text-xs">{entry.createdAt.slice(0, 16)}</td>
                    <td>{entry.action}</td>
                    <td className="text-ink-muted">{entry.entityType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel mt-6">
          <div className="panel-head"><span className="panel-title">Public project photography</span></div>
          <div className="panel-body grid gap-6">
            {session.state.initiatives.map((initiative) => {
              const media = (session.state.initiativeMedia ?? []).filter((item) => item.initiativeId === initiative.id);
              return <form action={replaceInitiativeMediaAction} className="border border-rule p-4" key={initiative.id}>
                <input name="initiativeId" type="hidden" value={initiative.id} />
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="font-medium">{initiative.name}</h2><p className="text-sm text-ink-muted">{media.length ? `${media.length} public photo${media.length === 1 ? "" : "s"}` : "Main image required before homepage featuring"}</p></div>
                  <Chip tone={media.some((item) => item.role === "main") ? "ok" : "warn"}>{media.some((item) => item.role === "main") ? "Ready" : "Image required"}</Chip>
                </div>
                <ApplicationMediaField requireRights={false} />
                <button className="btn primary mt-4" type="submit">{media.length ? "Replace public media" : "Add project media"}</button>
              </form>;
            })}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
