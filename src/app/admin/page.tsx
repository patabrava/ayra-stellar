import Link from "next/link";
import { Check, Download, ExternalLink, Send, ShieldCheck } from "lucide-react";

import {
  Chip,
  Hash,
  Money,
  OpsNav,
  StatusBannerForSurface,
} from "@/components/ayra/ui";
import {
  approveApplicationAction,
  createBatchAction,
  moderateUpdateAction,
  submitBatchAction,
  syncBatchStatusAction,
  verifyPayoutAddressAction,
} from "@/lib/ayra/actions";
import { requireAdminSession } from "@/lib/ayra/session";
import { formatLocal, getProofPack, type AyraState } from "@/lib/ayra/domain";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

function batchTotal(state: AyraState, batchId: string) {
  return state.batchLineItems
    .filter((item) => item.batchId === batchId)
    .reduce((sum, item) => sum + item.amountUsdc, 0);
}

export default async function AdminPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireAdminSession("/admin");
  const state = session.state;
  const admin = session.context.profile;
  const providencia =
    state.tracks.find((item) => item.slug === "providencia") ?? state.tracks[0]!;
  const reforest =
    state.initiatives.find((item) => item.slug === "reforestation") ??
    state.initiatives[0]!;
  const defaultSponsor =
    state.sponsors.find((item) => item.slug === "climate-future") ??
    state.sponsors[0];
  const pendingApplications = state.applications.filter(
    (item) => item.status === "pending",
  );
  const pendingUpdates = state.updates.filter((item) => item.status === "pending");
  const pendingAddresses = state.payoutAddresses.filter(
    (item) => item.status === "pending",
  );
  const allocated = state.batchLineItems.reduce(
    (sum, item) => sum + item.amountUsdc,
    0,
  );
  const committed = state.batches
    .filter((batch) => batch.status === "submitted" || batch.status === "settled")
    .reduce((sum, batch) => sum + batchTotal(state, batch.id), 0);
  const proofBatch =
    state.batches.find((batch) => batch.status === "settled") ?? state.batches[0]!;
  const lineItemBatch =
    state.batches.find((batch) => batch.code === "PV-REFOREST-APR26") ??
    state.batches.find((batch) => batch.status === "submitted") ??
    state.batches[0]!;
  const proof = getProofPack(state, proofBatch.id);
  const paymentRailLabel =
    process.env.AYRA_SDP_MODE === "testnet"
      ? "Stellar testnet"
      : "Provider setup pending";

  return (
    <main className="ops-shell">
      <OpsNav
        role="ADMIN"
        scope={`${providencia.name} · Climate Future`}
        user={admin.email}
        tabs={[
          { href: "#overview", label: "Overview" },
          { href: "#applications", label: "Applications", count: String(pendingApplications.length) },
          { href: "#updates", label: "Updates", count: String(pendingUpdates.length) },
          { href: "#batches", label: "Batches", count: String(state.batches.length) },
          { href: "#proof", label: "Proof packs" },
          { href: "#registry", label: "Registry" },
        ]}
      />

      <div className="ops-main">
        <StatusBannerForSurface status={params?.status} surface="admin" />

        <section id="overview" className="mb-10">
          <div className="section-head">
            <div>
              <h1>Operator console</h1>
              <p className="section-sub">
                Funding log, application queue, payout verification, moderation,
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
                <Money amount={allocated} />
              </div>
              <div className="stat-d">{state.initiatives.length} initiatives</div>
            </div>
            <div className="stat">
              <div className="stat-k">Committed to batches</div>
              <div className="stat-v">
                <Money amount={committed} />
              </div>
              <div className="stat-d">submitted + settled only</div>
            </div>
            <div className="stat">
              <div className="stat-k">Open operator actions</div>
              <div className="stat-v">
                {pendingApplications.length + pendingUpdates.length + pendingAddresses.length}
              </div>
              <div className="stat-d">applications, updates, payout checks</div>
            </div>
            <div className="stat">
              <div className="stat-k">Payment rail</div>
              <div className="stat-v text-2xl">{paymentRailLabel}</div>
              <div className="stat-d">server boundary only</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Initiatives</span>
                <Link className="btn ghost" href="#registry">
                  Manage registry
                </Link>
              </div>
              <div className="panel-body grid gap-3">
                {state.initiatives.map((initiative) => (
                  <a
                    className="grid gap-3 border border-rule bg-[var(--ops-surface)] p-4 md:grid-cols-[70px_1fr_auto]"
                    href="#registry"
                    key={initiative.id}
                  >
                    <div className="viz min-h-16" />
                    <div>
                      <div className="row-name">{initiative.name}</div>
                      <div className="row-meta">
                        {initiative.code} · Steward: {initiative.stewardName ?? "Pending invite"}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Chip tone={initiative.status === "live" ? "ok" : "warn"}>
                          {initiative.status}
                        </Chip>
                        <Chip tone="info">League {initiative.leagueScore}</Chip>
                      </div>
                    </div>
                    <span className="self-center text-sm text-ink-muted">Open</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Pending operator actions</span>
                <Chip tone="warn">
                  {pendingApplications.length + pendingUpdates.length + pendingAddresses.length} open
                </Chip>
              </div>
              <table className="t">
                <tbody>
                  {pendingAddresses.map((address) => (
                    <tr key={address.id}>
                      <td>
                        <Chip tone="warn">Verify addr</Chip>
                      </td>
                      <td>
                        <div className="row-name">
                          {
                            state.initiatives.find(
                              (item) => item.id === address.initiativeId,
                            )?.name
                          }{" "}
                          · pending payout address
                        </div>
                        <div className="row-meta">Manual v1 confirmation required</div>
                      </td>
                      <td>
                        <a className="btn primary" href="#registry">
                          Confirm
                        </a>
                      </td>
                    </tr>
                  ))}
                  {pendingUpdates.map((update) => (
                    <tr key={update.id}>
                      <td>
                        <Chip tone="warn">Review update</Chip>
                      </td>
                      <td>
                        <div className="row-name">
                          {reforest.name} · {update.caption.slice(0, 42)}
                        </div>
                        <div className="row-meta">Shared moderation queue</div>
                      </td>
                      <td>
                        <a className="btn primary" href="#updates">
                          Review
                        </a>
                      </td>
                    </tr>
                  ))}
                  {pendingApplications.map((application) => (
                    <tr key={application.id}>
                      <td>
                        <Chip>Application</Chip>
                      </td>
                      <td>
                        <div className="row-name">{application.proposedInitiativeName}</div>
                        <div className="row-meta">{application.applicantEmail}</div>
                      </td>
                      <td>
                        <a className="btn" href="#applications">
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="applications" className="mb-10">
          <div className="section-head">
            <div>
              <h2>Applications</h2>
              <p className="section-sub">
                Application approval grants portal access only. After approval,
                the steward uses their portal to submit the first Stellar payout
                address. Funding approval and payout batches remain separate.
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
                {pendingApplications.map((application) => (
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
                      <form action={approveApplicationAction}>
                        <input name="applicationId" type="hidden" value={application.id} />
                        <button className="btn primary" type="submit">
                          Approve <Check className="h-4 w-4" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="updates" className="mb-10">
          <div className="section-head">
            <div>
              <h2>Updates publisher</h2>
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
                <Chip tone="warn">{pendingUpdates.length} pending</Chip>
              </div>
              <div className="divide-y divide-rule">
                {pendingUpdates.map((update) => (
                  <article className="p-4" key={update.id}>
                    <div className="row-meta">
                      From Leidy Mendoza · {reforest.name} · {update.submittedAt.slice(0, 16).replace("T", " ")} UTC
                    </div>
                    <p className="mt-3 text-sm leading-6">{update.caption}</p>
                    <form action={moderateUpdateAction} className="mt-4 grid gap-3">
                      <input name="updateId" type="hidden" value={update.id} />
                      <div className="field">
                        <label htmlFor={`caption-${update.id}`}>Public caption</label>
                        <textarea
                          id={`caption-${update.id}`}
                          name="publicCaption"
                          rows={2}
                          defaultValue={update.caption}
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
                        <button
                          className="btn"
                          name="action"
                          type="submit"
                          value="save draft"
                        >
                          Hold
                        </button>
                        <button
                          className="btn danger"
                          name="action"
                          type="submit"
                          value="reject"
                        >
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
                {state.updates
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

        <section id="batches" className="mb-10">
          <div className="section-head">
            <div>
              <h2>Batches</h2>
              <p className="section-sub">
                Manual disbursement batches. Line items become immutable once
                submitted to the SDP boundary.
              </p>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel overflow-x-auto">
              <div className="panel-head">
                <span className="panel-title">Batch registry</span>
              </div>
              <table className="t min-w-[760px]">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>SDP</th>
                  </tr>
                </thead>
                <tbody>
                  {state.batches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <div className="row-name">{batch.code}</div>
                        <div className="row-meta">
                          {batch.periodLabel} · {batch.initiativeId}
                        </div>
                      </td>
                      <td>
                        <Money amount={batchTotal(state, batch.id)} />
                      </td>
                      <td>
                        <Chip tone={batch.status === "settled" ? "ok" : "info"}>
                          {batch.status}
                        </Chip>
                      </td>
                      <td>
                        {batch.status === "ready" ? (
                          <form action={submitBatchAction}>
                            <input name="batchId" type="hidden" value={batch.id} />
                            <button className="btn primary" type="submit">
                              Submit <Send className="h-4 w-4" />
                            </button>
                          </form>
                        ) : batch.status === "submitted" ? (
                          <form action={syncBatchStatusAction}>
                            <input name="batchId" type="hidden" value={batch.id} />
                            <button className="btn" type="submit">
                              Sync status
                            </button>
                          </form>
                        ) : (
                          <Hash value={batch.sdpBatchId} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form action={createBatchAction} className="panel">
              <div className="panel-head">
                <span className="panel-title">Create one-line batch</span>
                <Chip>Manual v1</Chip>
              </div>
              <div className="panel-body grid gap-4">
                <input name="initiativeId" type="hidden" value={reforest.id} />
                {defaultSponsor ? (
                  <input name="sponsorId" type="hidden" value={defaultSponsor.id} />
                ) : null}
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="code">Batch reference</label>
                    <input id="code" name="code" defaultValue="PV-REFOREST-MAY26" />
                  </div>
                  <div className="field">
                    <label htmlFor="periodLabel">Period</label>
                    <input id="periodLabel" name="periodLabel" defaultValue="May 2026" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="category">Category</label>
                  <input id="category" name="category" defaultValue="Crew wages" />
                </div>
                <div className="grid-3">
                  <div className="field">
                    <label htmlFor="amountUsdc">USDC</label>
                    <input id="amountUsdc" name="amountUsdc" defaultValue="3600" />
                  </div>
                  <div className="field">
                    <label htmlFor="localAmount">COP</label>
                    <input id="localAmount" name="localAmount" defaultValue="14040000" />
                  </div>
                  <div className="field">
                    <label htmlFor="localCurrency">Currency</label>
                    <select id="localCurrency" name="localCurrency" defaultValue="COP">
                      <option>COP</option>
                      <option>USD</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="receiptFile">Private receipt</label>
                  <input id="receiptFile" name="receiptFile" type="file" />
                </div>
                <button className="btn primary justify-self-start" type="submit">
                  Create ready batch
                </button>
              </div>
            </form>
          </div>

          <div className="panel mt-4 overflow-x-auto">
            <div className="panel-head">
              <span className="panel-title">{lineItemBatch.code} · line items</span>
              <Chip tone="warn">partial settlement</Chip>
            </div>
            <table className="t min-w-[760px]">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>USDC</th>
                  <th>Local snapshot</th>
                  <th>Status</th>
                  <th>Hash</th>
                </tr>
              </thead>
              <tbody>
                {state.batchLineItems
                  .filter((line) => line.batchId === lineItemBatch.id)
                  .map((line) => (
                    <tr key={line.id}>
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
                        <Hash
                          pendingLabel="Settlement reference pending"
                          value={line.transactionHash ?? line.sdpPaymentId}
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="panel mt-4 overflow-x-auto">
            <div className="panel-head">
              <span className="panel-title">Reconciliation</span>
              <Chip>Admin-only receipts</Chip>
            </div>
            <table className="t min-w-[760px]">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Line item</th>
                  <th>Status</th>
                  <th>Private receipt</th>
                </tr>
              </thead>
              <tbody>
                {state.reconciliationItems.map((item) => {
                  const batch = state.batches.find((entry) => entry.id === item.batchId);
                  const line = state.batchLineItems.find(
                    (entry) => entry.id === item.lineItemId,
                  );
                  return (
                    <tr key={item.id}>
                      <td>{batch?.code}</td>
                      <td>{line?.category}</td>
                      <td>
                        <Chip tone={item.status === "reconciled" ? "ok" : "warn"}>
                          {item.status}
                        </Chip>
                      </td>
                      <td>
                        <Chip tone={item.privateReceiptPath ? "ok" : "warn"}>
                          {item.privateReceiptPath ? "attached" : "missing"}
                        </Chip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section id="proof" className="mb-10">
          <div className="section-head">
            <div>
              <h2>Proof packs</h2>
              <p className="section-sub">
                Simple public proof pages generated from canonical batch records.
              </p>
            </div>
          </div>
          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">Composer</span>
              </div>
              <div className="panel-body grid gap-4">
                <div className="field">
                  <label>Batch</label>
                  <input readOnly value={proof.batchCode} />
                </div>
                <div className="field">
                  <label>Sponsor</label>
                  <input readOnly value={proof.sponsorName ?? "General fund"} />
                </div>
                <Link
                  className="btn primary justify-self-start"
                  href={`/proof/${proof.batchId}`}
                >
                  Generate preview <ShieldCheck className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">
                  {proof.sponsorName} · {proof.periodLabel}
                </span>
                <Chip tone="ok">{proof.publicLabel}</Chip>
              </div>
              <div className="panel-body">
                <div className="stat-grid">
                  <div className="stat">
                    <div className="stat-k">Backed</div>
                    <div className="stat-v">
                      <Money
                        amount={proof.receipts.reduce(
                          (sum, item) => sum + item.amountUsdc,
                          0,
                        )}
                      />
                    </div>
                  </div>
                  <div className="stat">
                    <div className="stat-k">Settled on-chain</div>
                    <div className="stat-v">100%</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-ink-muted">
                  Page 1 summarizes batch totals. Page 2 lists category-level
                  receipts. Private receipt files remain admin-only.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="registry">
          <div className="section-head">
            <div>
              <h2>Registry</h2>
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
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {state.payoutAddresses.map((address) => {
                    const initiative = state.initiatives.find(
                      (item) => item.id === address.initiativeId,
                    );
                    return (
                      <tr key={address.id}>
                        <td>{initiative?.name}</td>
                        <td>
                          <Hash value={`${address.address.slice(0, 10)}...${address.address.slice(-6)}`} />
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
                  {state.auditLogs.map((entry) => (
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
      </div>
    </main>
  );
}
