import type { ReactNode } from "react";

import { OpsNav, StatusBannerForSurface } from "@/components/ayra/ui";
import { JourneyStatusModal } from "@/components/ayra/steward-status-modal";
import type { AdminViewModel } from "@/app/admin/admin-view-model";
import type { AyraSession } from "@/lib/ayra/session";

export function AdminShell({
  activeHref,
  children,
  session,
  status,
  view,
}: {
  activeHref: string;
  children: ReactNode;
  session: AyraSession;
  status?: string;
  view: AdminViewModel;
}) {
  return (
    <main className="ops-shell">
      <JourneyStatusModal status={status} surface="admin" />
      <OpsNav
        activeHref={activeHref}
        role="ADMIN"
        scope={`${view.providencia.name} · Climate Future`}
        user={session.context.profile.email}
        tabs={[
          { href: "/admin", label: "Overview" },
          {
            href: "/admin/applications",
            label: "Applications",
            count: String(view.pendingApplications.length),
          },
          {
            href: "/admin/updates",
            label: "Updates",
            count: String(view.pendingUpdates.length),
          },
          {
            href: "/admin/batches",
            label: "Payments",
            count: String(session.state.batches.length),
          },
          { href: "/admin/proof", label: "Proof packs" },
          { href: "/admin/registry", label: "Registry" },
        ]}
      />
      <div className="ops-main">
        <StatusBannerForSurface status={status} surface="admin" />
        {children}
      </div>
    </main>
  );
}
