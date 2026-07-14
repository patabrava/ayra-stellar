import { AdminShell } from "@/app/admin/admin-shell";
import { buildAdminViewModel } from "@/app/admin/admin-view-model";
import { Chip, Hash } from "@/components/ayra/ui";
import { verifyPayoutAddressAction } from "@/lib/ayra/actions";
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
            <table className="t min-w-[720px]">
              <thead>
                <tr>
                  <th>Initiative</th>
                  <th>Address</th>
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
      </section>
    </AdminShell>
  );
}
