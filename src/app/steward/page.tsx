import Link from "next/link";
import { Download, Send } from "lucide-react";

import { Chip, Hash, Money, OpsNav, StatusBanner } from "@/components/ayra/ui";
import { submitPayoutAddressAction, submitUpdateAction } from "@/lib/ayra/actions";
import { requireStewardSession } from "@/lib/ayra/session";
import {
  formatLocal,
  getProofPack,
} from "@/lib/ayra/domain";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function StewardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireStewardSession("/steward");
  const state = session.state;
  const profile = session.context.profile;
  const initiative =
    state.initiatives.find(
      (item) =>
        item.slug === "reforestation" &&
        session.context.scopedInitiativeIds.includes(item.id),
    ) ??
    state.initiatives.find((item) =>
      session.context.scopedInitiativeIds.includes(item.id),
    ) ??
    state.initiatives[0]!;
  const steward = state.stewardProfiles.find(
    (item) => item.initiativeId === initiative.id,
  );
  const grantee = state.grantees.find((item) => item.initiativeId === initiative.id);
  const addresses = state.payoutAddresses.filter(
    (item) => item.initiativeId === initiative.id,
  );
  const address =
    addresses.find((item) =>
      ["pending", "verified", "locked"].includes(item.status),
    ) ?? addresses[0];
  const milestones = state.milestones.filter(
    (item) => item.initiativeId === initiative.id,
  );
  const defaultMilestone =
    milestones.find((milestone) => milestone.status === "active") ?? milestones[0];
  const updates = state.updates
    .filter((item) => item.initiativeId === initiative.id)
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
  const batches = state.batches.filter((item) => item.initiativeId === initiative.id);
  const currentBatch =
    batches.find((batch) => batch.status === "submitted") ?? batches[0]!;
  const currentProof = getProofPack(state, currentBatch.id);
  const totalReceived = state.batchLineItems
    .filter((line) => {
      const batch = state.batches.find((item) => item.id === line.batchId);
      return batch?.initiativeId === initiative.id && line.status === "settled";
    })
    .reduce((sum, line) => sum + line.amountUsdc, 0);

  return (
    <main className="ops-shell">
      <OpsNav
        role="GRANTEE"
        scope={`${initiative.name} · Providencia`}
        user={profile.email}
        tabs={[
          { href: "#profile", label: "Profile" },
          { href: "#updates", label: "Updates", count: String(updates.length) },
          { href: "#payments", label: "Payments", count: `${totalReceived} USDC` },
        ]}
      />

      <div className="ops-main max-w-6xl">
        <StatusBanner status={params?.status} />

        <section id="profile" className="mb-10">
          <div className="section-head">
            <div>
              <h1>Steward portal</h1>
              <p className="section-sub">
                Scoped to one initiative. Contact data and raw receipt handling
                stay internal; public media still requires admin moderation.
              </p>
            </div>
            <Link className="btn ghost" href="/">
              View wall
            </Link>
          </div>

          <div className="panel mb-4">
            <div className="panel-head">
              <span className="panel-title">Your organisation</span>
              <Chip tone="ok">Scoped access</Chip>
            </div>
            <div className="panel-body grid-2">
              <div>
                <div className="stat-k">Organisation</div>
                <div className="mt-1 text-lg font-medium">
                  {steward?.organisationName ?? grantee?.name ?? initiative.name}
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  Public contact: {steward?.publicContactName ?? profile.displayName}
                </p>
              </div>
              <div>
                <div className="stat-k">Private contact</div>
                <div className="mono mt-1">{profile.email}</div>
                <p className="mt-2 text-sm text-ink-muted">
                  Used by AYRA operators. Not rendered on the public wall.
                </p>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Stellar payout address</span>
              <Chip tone="ok">Verified · locked</Chip>
            </div>
            <div className="panel-body">
              <div className="grid-3">
                {[
                  ["Step 1 · You", "Paste address", "Submit the Stellar address you control."],
                  [
                    "Step 2 · You + Horizon",
                    "Prove ownership",
                    "Send 0.01 XLM from this address to the AYRA verification account.",
                  ],
                  [
                    "Step 3 · Operator",
                    "Out-of-band confirm",
                    "AYRA manually verifies and locks the address at first disbursement.",
                  ],
                ].map(([step, title, body]) => (
                  <div className="border border-rule bg-[var(--ops-surface)] p-4" key={step}>
                    <span className="chip ok">{step}</span>
                    <h2 className="mt-3 font-medium">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 border border-rule bg-surface-3 p-4">
                <div className="stat-k">Current address</div>
                <div className="mono mt-2 break-all text-sm">
                  {address?.address ?? "Pending operator verification"}
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  Verified {address?.verifiedAt?.slice(0, 10) ?? "pending"} by AYRA. Locked on
                  first disbursement.
                </p>
              </div>
              <form action={submitPayoutAddressAction} className="mt-5 grid gap-3 border border-rule bg-[var(--ops-surface)] p-4">
                <input name="initiativeId" type="hidden" value={initiative.id} />
                <div className="field">
                  <label htmlFor="address">Replacement Stellar address</label>
                  <input
                    className="mono"
                    id="address"
                    name="address"
                    placeholder="G..."
                    required
                  />
                </div>
                <button className="btn primary justify-self-start" type="submit">
                  Submit address <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </section>

        <section id="updates" className="mb-10">
          <div className="section-head">
            <div>
              <h2>Updates</h2>
              <p className="section-sub">
                Photos, short clips, and captions. Nothing auto-publishes; every
                submission enters the shared moderation queue.
              </p>
            </div>
          </div>

          <div className="grid-2">
            <form action={submitUpdateAction} className="panel">
              <div className="panel-head">
                <span className="panel-title">New submission</span>
              </div>
              <div className="panel-body grid gap-4">
                <div className="field">
                  <label htmlFor="milestoneId">Milestone</label>
                  <select id="milestoneId" name="milestoneId" defaultValue={defaultMilestone?.id}>
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.code} · {milestone.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="caption">Caption</label>
                  <textarea
                    id="caption"
                    name="caption"
                    rows={4}
                    placeholder="A short note in Spanish or English. AYRA may lightly edit before publishing."
                    required
                  />
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="mediaUrl">Media URL</label>
                    <input
                      id="mediaUrl"
                      name="mediaUrl"
                      placeholder="/window.svg"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="mediaAlt">Alt text</label>
                    <input
                      id="mediaAlt"
                      name="mediaAlt"
                      placeholder="Field crew planting seedlings"
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="mediaFile">Upload public media</label>
                  <input
                    id="mediaFile"
                    name="mediaFile"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,video/mp4"
                  />
                </div>
                <div className="flex flex-wrap justify-between gap-3 border-t border-rule pt-4">
                  <p className="max-w-md text-sm text-ink-muted">
                    Avoid full recipient names and private documents in public
                    media. Raw receipts belong in admin reconciliation.
                  </p>
                  <button className="btn primary" type="submit">
                    Submit for review <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </form>

            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Your submissions</span>
              </div>
              <div className="divide-y divide-rule">
                {updates.slice(0, 5).map((update) => (
                  <article className="p-4" key={update.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="mono text-xs text-ink-muted">
                        {update.submittedAt.slice(0, 16).replace("T", " ")} UTC
                      </span>
                      <Chip
                        tone={
                          update.status === "approved"
                            ? "ok"
                            : update.status === "rejected"
                              ? "err"
                              : "warn"
                        }
                      >
                        {update.status}
                      </Chip>
                    </div>
                    <p className="mt-3 text-sm leading-6">{update.caption}</p>
                    {update.sanitizedFeedback ? (
                      <p className="mt-3 border-l-2 border-[var(--err)] pl-3 text-sm text-ink-muted">
                        {update.sanitizedFeedback}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="payments">
          <div className="section-head">
            <div>
              <h2>Payments</h2>
              <p className="section-sub">
                Read-only history of line items disbursed to {grantee?.name ?? initiative.name}. The
                verified link opens the same public proof surface.
              </p>
            </div>
            <Link className="btn ghost" href="/steward/export">
              <Download className="h-4 w-4" /> Download CSV
            </Link>
          </div>

          <div className="stat-grid mb-4">
            <div className="stat">
              <div className="stat-k">Lifetime received</div>
              <div className="stat-v">
                <Money amount={totalReceived} />
              </div>
            </div>
            <div className="stat">
              <div className="stat-k">In flight</div>
              <div className="stat-v">
                <Money amount={8460} />
              </div>
            </div>
            <div className="stat">
              <div className="stat-k">Next expected window</div>
              <div className="stat-v text-2xl">2026-05-30</div>
              <div className="stat-d">to 2026-06-02</div>
            </div>
          </div>

          <div className="panel overflow-x-auto">
            <div className="panel-head">
              <span className="panel-title">{currentProof.batchCode} · current batch</span>
              <Chip tone="warn">Submitted</Chip>
            </div>
            <table className="t min-w-[720px]">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Local</th>
                  <th>Status</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {state.batchLineItems
                  .filter((line) => line.batchId === currentBatch.id)
                  .map((line) => (
                    <tr key={line.id}>
                      <td className="mono">2026-04-30</td>
                      <td>{line.category}</td>
                      <td>
                        <Money amount={line.amountUsdc} />
                      </td>
                      <td className="mono">
                        {formatLocal(line.localAmount, line.localCurrency)}
                      </td>
                      <td>
                        <Chip tone={line.status === "settled" ? "ok" : "info"}>
                          {line.status}
                        </Chip>
                      </td>
                      <td>
                        {line.transactionHash ? (
                          <Link className="btn" href={`/proof/${currentBatch.id}`}>
                            Verified
                          </Link>
                        ) : (
                          <Hash value={line.sdpPaymentId} />
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="panel mt-4">
            <div className="panel-head">
              <span className="panel-title">Past batches</span>
            </div>
            <div className="panel-body grid gap-3">
              {batches
                .filter((batch) => batch.status === "settled")
                .map((batch) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-[var(--ops-surface)] p-3"
                    key={batch.id}
                  >
                    <div>
                      <div className="row-name">{batch.code}</div>
                      <div className="row-meta">{batch.periodLabel}</div>
                    </div>
                    <Chip tone="ok">Cleared</Chip>
                    <Link className="btn ghost" href={`/proof/${batch.id}`}>
                      Proof
                    </Link>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
