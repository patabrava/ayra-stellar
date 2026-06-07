import { Send } from "lucide-react";

import { AdminShell } from "@/app/admin/admin-shell";
import {
  batchTotal,
  buildAdminViewModel,
} from "@/app/admin/admin-view-model";
import { BatchCurrencyFields } from "@/components/ayra/batch-currency-fields";
import {
  BatchInitiativeTarget,
  type BatchInitiativeTargetOption,
} from "@/components/ayra/batch-initiative-target";
import {
  Chip,
  Hash,
  Money,
  StellarTransactionVerificationLink,
} from "@/components/ayra/ui";
import {
  createBatchAction,
  submitBatchAction,
  syncBatchStatusAction,
} from "@/lib/ayra/actions";
import { suggestBatchCode } from "@/lib/ayra/batch-code";
import { formatLocal } from "@/lib/ayra/domain";
import { requireAdminSession } from "@/lib/ayra/session";

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function AdminBatchesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await requireAdminSession("/admin/batches");
  const view = await buildAdminViewModel(session.state);
  const suggestedBatchCode = suggestBatchCode({
    initiativeCode: view.reforest.code,
  });
  const batchTargets: BatchInitiativeTargetOption[] = session.state.initiatives.map(
    (initiative) => {
      const track = session.state.tracks.find((item) => item.id === initiative.trackId);
      const payoutAddress = session.state.payoutAddresses.find(
        (item) =>
          item.initiativeId === initiative.id &&
          (item.status === "verified" || item.status === "locked"),
      );
      const payoutStatus =
        payoutAddress?.status === "verified" || payoutAddress?.status === "locked"
          ? payoutAddress.status
          : null;
      const baseTarget = {
        id: initiative.id,
        name: initiative.name,
        trackName: track?.name ?? "Unassigned track",
        code: initiative.code,
        stewardName: initiative.stewardName ?? "Pending steward",
      };

      if (payoutAddress && payoutStatus) {
        return {
          ...baseTarget,
          payoutAddress: payoutAddress.address,
          payoutStatus,
        };
      }

      return {
        ...baseTarget,
        payoutAddress: null,
        payoutStatus: null,
      };
    },
  );

  return (
    <AdminShell
      activeHref="/admin/batches"
      session={session}
      status={params?.status}
      view={view}
    >
      <section>
        <div className="section-head">
          <div>
            <h1>Payments</h1>
            <p className="section-sub">
              Manual disbursement payments. Line items become immutable once
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
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>SDP</th>
                </tr>
              </thead>
              <tbody>
                {session.state.batches.map((batch) => {
                  const settledTransactionHashes = session.state.batchLineItems
                    .filter(
                      (line) =>
                        line.batchId === batch.id &&
                        line.status === "settled" &&
                        line.transactionHash,
                    )
                    .map((line) => line.transactionHash!);

                  return (
                    <tr key={batch.id}>
                      <td>
                        <div className="row-name">{batch.code}</div>
                        <div className="row-meta">
                          {batch.periodLabel} · {batch.initiativeId}
                        </div>
                      </td>
                      <td>
                        <Money amount={batchTotal(session.state, batch.id)} />
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
                          <div className="grid gap-1">
                            <span className="text-xs uppercase text-ink-muted">SDP payment</span>
                            <Hash
                              pendingLabel="Provider payment reference recorded"
                              value={batch.sdpBatchId}
                            />
                            <span className="mt-2 text-xs uppercase text-ink-muted">
                              Explorer verification
                            </span>
                            {settledTransactionHashes.length > 0 ? (
                              settledTransactionHashes.map((transactionHash) => (
                                <StellarTransactionVerificationLink
                                  key={transactionHash}
                                  transactionHash={transactionHash}
                                />
                              ))
                            ) : (
                              <StellarTransactionVerificationLink />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <form action={createBatchAction} className="panel">
            <div className="panel-head">
              <span className="panel-title">Create one-line payment</span>
              <Chip>Manual v1</Chip>
            </div>
            <div className="panel-body grid gap-4">
              <BatchInitiativeTarget
                defaultInitiativeId={view.reforest.id}
                rateAvailable={Boolean(view.usdCopRate)}
                targets={batchTargets}
              >
                {view.defaultSponsor ? (
                  <input name="sponsorId" type="hidden" value={view.defaultSponsor.id} />
                ) : null}
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="code">Payment reference label</label>
                    <input id="code" name="code" defaultValue={suggestedBatchCode} />
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
                {view.usdCopRate ? (
                  <BatchCurrencyFields
                    defaultAmountUsdc={3600}
                    rateUpdatedAt={view.usdCopRate.updatedAt}
                    usdCopRate={view.usdCopRate.rate}
                  />
                ) : (
                  <div
                    className="border border-rule bg-[var(--ops-surface)] px-4 py-3 text-sm text-ink-muted"
                    role="status"
                  >
                    Daily USD/COP rate unavailable. Payment creation is paused until
                    the market-rate source is reachable.
                  </div>
                )}
                <div className="field">
                  <label htmlFor="receiptFile">Private receipt</label>
                  <input id="receiptFile" name="receiptFile" type="file" />
                </div>
              </BatchInitiativeTarget>
            </div>
          </form>
        </div>

        <div className="panel mt-4 overflow-x-auto">
          <div className="panel-head">
            <span className="panel-title">{view.lineItemBatch.code} · payment line items</span>
            <Chip tone="warn">partial settlement</Chip>
          </div>
          <table className="t min-w-[760px]">
            <thead>
              <tr>
                <th>Category</th>
                <th>USDC</th>
                <th>Local snapshot</th>
                <th>Status</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {session.state.batchLineItems
                .filter((line) => line.batchId === view.lineItemBatch.id)
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
                      <div className="grid gap-1">
                        <span className="text-xs uppercase text-ink-muted">On-chain</span>
                        <Hash
                          pendingLabel="On-chain transaction pending"
                          value={line.transactionHash}
                        />
                        {line.sdpPaymentId ? (
                          <>
                            <span className="mt-2 text-xs uppercase text-ink-muted">
                              SDP payment
                            </span>
                            <Hash
                              pendingLabel="Provider payment reference recorded"
                              value={line.sdpPaymentId}
                            />
                          </>
                        ) : null}
                      </div>
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
              {session.state.reconciliationItems.map((item) => {
                const batch = session.state.batches.find(
                  (entry) => entry.id === item.batchId,
                );
                const line = session.state.batchLineItems.find(
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
    </AdminShell>
  );
}
