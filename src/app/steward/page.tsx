import Link from "next/link";
import { Download, Send } from "lucide-react";

import {
  Chip,
  Hash,
  Money,
  OpsNav,
  StatusBannerForSurface,
} from "@/components/ayra/ui";
import { UpdateMediaField } from "@/components/ayra/update-media-field";
import { StewardStatusModal } from "@/components/ayra/steward-status-modal";
import {
  submitMilestoneSubmissionAction,
  submitPayoutAddressAction,
  submitUpdateAction,
} from "@/lib/ayra/actions";
import { requireStewardSession } from "@/lib/ayra/session";
import {
  formatLocal,
  getCurrentProofBatch,
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
  const verifiedAddress = addresses.find((item) =>
    ["verified", "locked"].includes(item.status),
  );
  const pendingAddress = addresses.find((item) => item.status === "pending");
  const activeAddress = verifiedAddress ?? pendingAddress ?? null;
  const hasAddressOnFile = Boolean(activeAddress);
  const addressChipTone = verifiedAddress ? "ok" : "warn";
  const addressChipLabel = verifiedAddress
    ? "Verified · locked"
    : pendingAddress
      ? "Pending review"
      : "Needs setup";
  const addressHeading = hasAddressOnFile
    ? "Stellar payout address"
    : "Set up your first Stellar payout address";
  const addressStatLabel = hasAddressOnFile ? "Current address" : "First step";
  const addressStatBody = activeAddress?.address ?? "No payout address on file yet. Use the form below to submit the first one.";
  const addressStatNote = verifiedAddress
    ? `Verified ${verifiedAddress.verifiedAt?.slice(0, 10) ?? "pending"} by AYRA. Locked on first disbursement.`
    : pendingAddress
      ? "Submitted by the steward and waiting for AYRA to verify it before the first disbursement. You can keep working on updates while it is pending."
      : "After approval, this portal asks the steward to submit the first Stellar address they control. AYRA verifies and locks it before payout.";
  const addressFieldLabel = hasAddressOnFile
    ? "Replacement Stellar address"
    : "First Stellar payout address";
  const addressButtonLabel = hasAddressOnFile
    ? "Replace address"
    : "Submit first address";
  const milestones = state.milestones.filter(
    (item) => item.initiativeId === initiative.id,
  );
  const defaultMilestone =
    milestones.find((milestone) => milestone.status === "active") ?? milestones[0];
  const updates = state.updates
    .filter((item) => item.initiativeId === initiative.id)
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
  const milestoneSubmissions = state.milestoneSubmissions
    .filter((item) => item.initiativeId === initiative.id)
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));
  const batches = state.batches.filter((item) => item.initiativeId === initiative.id);
  const currentBatch = getCurrentProofBatch(batches);
  const currentProof = currentBatch ? getProofPack(state, currentBatch.id) : null;
  const currentBatchLineItems = currentBatch
    ? state.batchLineItems.filter((line) => line.batchId === currentBatch.id)
    : [];
  const settledBatches = batches.filter((batch) => batch.status === "settled");
  const totalReceived = state.batchLineItems
    .filter((line) => {
      const batch = state.batches.find((item) => item.id === line.batchId);
      return batch?.initiativeId === initiative.id && line.status === "settled";
    })
    .reduce((sum, line) => sum + line.amountUsdc, 0);
  const inFlightTotal = state.batchLineItems
    .filter((line) => {
      const batch = state.batches.find((item) => item.id === line.batchId);
      return batch?.initiativeId === initiative.id && batch.status === "submitted";
    })
    .reduce((sum, line) => sum + line.amountUsdc, 0);

  return (
    <main className="ops-shell">
      <StewardStatusModal status={params?.status} />
      <OpsNav
        role="GRANTEE"
        scope={`${initiative.name} · Providencia`}
        user={profile.email}
        tabs={[
          { href: "#profile", label: "Profile" },
          { href: "#updates", label: "Updates", count: String(updates.length) },
          {
            href: "#milestones",
            label: "Milestones",
            count: String(milestoneSubmissions.length),
          },
          { href: "#payments", label: "Payments", count: `${totalReceived} USDC` },
        ]}
      />

      <div className="ops-main max-w-6xl">
        <StatusBannerForSurface status={params?.status} surface="steward" />

        <section id="profile" className="mb-10">
          <div className="section-head">
            <div>
              <h1>Steward portal</h1>
              <p className="section-sub">
                Scoped to one initiative. After approval, this is where the
                steward submits the first Stellar payout address. Contact data
                and raw receipt handling stay internal; public media still
                requires admin moderation.
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
              <span className="panel-title">{addressHeading}</span>
              <Chip tone={addressChipTone}>{addressChipLabel}</Chip>
            </div>
            <div className="panel-body">
              <div className="grid-3">
                {[
                  [
                    "Step 1 · You",
                    "Paste address",
                    "Submit the Stellar address you control. This is the first payout address if the initiative has not set one up yet.",
                  ],
                  [
                    "Step 2 · You + Horizon",
                    "Prove ownership",
                    "Send 0.01 XLM from this address to the AYRA verification account.",
                  ],
                  [
                    "Step 3 · Operator",
                    "Out-of-band confirm",
                    "AYRA manually verifies and locks the address before the first disbursement.",
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
                <div className="stat-k">{addressStatLabel}</div>
                <div className="mono mt-2 break-all text-sm">
                  {addressStatBody}
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  {addressStatNote}
                </p>
              </div>
              <form action={submitPayoutAddressAction} className="mt-5 grid gap-3 border border-rule bg-[var(--ops-surface)] p-4">
                <input name="initiativeId" type="hidden" value={initiative.id} />
                <div className="field">
                  <label htmlFor="address">{addressFieldLabel}</label>
                  <input
                    className="mono"
                    id="address"
                    name="address"
                    placeholder="G..."
                    required
                  />
                </div>
                <button className="btn primary justify-self-start" type="submit">
                  {addressButtonLabel} <Send className="h-4 w-4" />
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
                Public progress notes for the project page. Keep private receipts
                and payment evidence out of this composer.
              </p>
            </div>
          </div>

          <div className="grid-2">
            <form action={submitUpdateAction} className="panel">
              <div className="panel-head">
                <span className="panel-title">Public update</span>
              </div>
              <div className="panel-body grid gap-4">
                <div className="field">
                  <label htmlFor="updateMilestoneId">Milestone</label>
                  <select id="updateMilestoneId" name="milestoneId" defaultValue={defaultMilestone?.id}>
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
                <UpdateMediaField />
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

        <section id="milestones" className="mb-10">
          <div className="section-head">
            <div>
              <h2>Private milestone packages</h2>
              <p className="section-sub">
                Evidence packages for admin payment review. These documents stay
                private and never become public project updates.
              </p>
            </div>
          </div>

          <div className="grid-2">
            <form action={submitMilestoneSubmissionAction} className="panel">
              <div className="panel-head">
                <span className="panel-title">Private milestone package</span>
                <Chip tone="warn">Private evidence</Chip>
              </div>
              <div className="panel-body grid gap-4">
                <div className="field">
                  <label htmlFor="evidenceMilestoneId">Milestone</label>
                  <select
                    id="evidenceMilestoneId"
                    name="milestoneId"
                    defaultValue={defaultMilestone?.id}
                  >
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.code} · {milestone.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="milestoneTitle">Package title</label>
                  <input
                    id="milestoneTitle"
                    name="title"
                    placeholder="May planting evidence"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="milestoneSummary">Private summary</label>
                  <textarea
                    id="milestoneSummary"
                    name="summary"
                    rows={4}
                    placeholder="Briefly describe the receipts, crew logs, or other evidence in this package."
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="privateDocumentFile">Private document</label>
                  <input
                    id="privateDocumentFile"
                    name="privateDocumentFile"
                    type="file"
                  />
                </div>
                <div className="flex flex-wrap justify-between gap-3 border-t border-rule pt-4">
                  <p className="max-w-md text-sm text-ink-muted">
                    This supports payment review only. It is not shown on the
                    public project page or proof page.
                  </p>
                  <button className="btn primary" type="submit">
                    Submit evidence <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </form>

            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Evidence history</span>
              </div>
              <div className="divide-y divide-rule">
                {milestoneSubmissions.slice(0, 5).map((submission) => {
                  const milestone = milestones.find(
                    (item) => item.id === submission.milestoneId,
                  );
                  return (
                    <article className="p-4" key={submission.id}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="mono text-xs text-ink-muted">
                          {submission.submittedAt.slice(0, 16).replace("T", " ")} UTC
                        </span>
                        <Chip
                          tone={
                            submission.status === "approved"
                              ? "ok"
                              : submission.status === "rejected"
                                ? "err"
                                : "warn"
                          }
                        >
                          {submission.status}
                        </Chip>
                      </div>
                      <div className="mt-3 row-name">{submission.title}</div>
                      <p className="mt-1 text-xs uppercase text-ink-muted">
                        {milestone?.code ?? "Milestone"} · private package
                      </p>
                      <p className="mt-3 text-sm leading-6 text-ink-muted">
                        {submission.summary}
                      </p>
                    </article>
                  );
                })}
                {milestoneSubmissions.length === 0 ? (
                  <p className="p-4 text-sm leading-6 text-ink-muted">
                    No private milestone evidence has been submitted yet.
                  </p>
                ) : null}
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
                <Money amount={inFlightTotal} />
              </div>
            </div>
            <div className="stat">
              <div className="stat-k">Next expected window</div>
              <div className="stat-v text-2xl">2026-05-30</div>
              <div className="stat-d">to 2026-06-02</div>
            </div>
          </div>

          {currentBatch && currentProof ? (
            <div className="panel overflow-x-auto">
              <div className="panel-head">
                <span className="panel-title">{currentProof.batchCode} · current payment</span>
                <Chip tone={currentBatch.status === "settled" ? "ok" : "warn"}>
                  {currentProof.publicLabel}
                </Chip>
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
                  {currentBatchLineItems.length > 0 ? (
                    currentBatchLineItems.map((line) => (
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
                            <Hash
                              pendingLabel="Settlement reference pending"
                              value={line.sdpPaymentId}
                            />
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="text-ink-muted" colSpan={6}>
                        No line items are visible for this payment yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
              <div className="panel">
                <div className="panel-head">
                  <span className="panel-title">Current payment</span>
                  <Chip tone="info">Not submitted</Chip>
                </div>
                <div className="panel-body">
                  <p className="text-sm leading-6 text-ink-muted">
                  No submitted payout payment exists for this initiative yet. That is
                  expected until AYRA verifies the first Stellar payout address.
                  You can still update milestones now; once the address is locked,
                  the admin console can create the first payment.
                  </p>
                </div>
              </div>
          )}

          <div className="panel mt-4">
            <div className="panel-head">
              <span className="panel-title">Past payments</span>
            </div>
            <div className="panel-body grid gap-3">
              {settledBatches.length > 0 ? (
                settledBatches.map((batch) => (
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
                ))
              ) : (
                <p className="text-sm leading-6 text-ink-muted">
                  No settled payments are visible for this initiative yet. Once the
                  first payment clears, the proof link will appear here.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
