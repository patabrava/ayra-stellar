"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Chip, Hash } from "@/components/ayra/ui";
import type { PayoutAddressStatus } from "@/lib/ayra/domain";

type VerifiedPayoutTarget = {
  payoutAddress: string;
  payoutStatus: Extract<PayoutAddressStatus, "verified" | "locked">;
};

type MissingPayoutTarget = {
  payoutAddress: null;
  payoutStatus: null;
};

export type BatchInitiativeTargetOption = {
  id: string;
  name: string;
  trackName: string;
  code: string;
  stewardName: string;
} & (VerifiedPayoutTarget | MissingPayoutTarget);

export type ApprovedMilestoneSubmissionOption = {
  id: string;
  initiativeId: string;
  milestoneCode: string;
  milestoneTitle: string;
  title: string;
  submittedAt: string;
};

type BatchInitiativeTargetProps = {
  approvedMilestoneSubmissions?: ApprovedMilestoneSubmissionOption[];
  children?: ReactNode;
  defaultInitiativeId: string;
  rateAvailable?: boolean;
  targets: BatchInitiativeTargetOption[];
};

export function BatchInitiativeTarget({
  approvedMilestoneSubmissions = [],
  children,
  defaultInitiativeId,
  rateAvailable = true,
  targets,
}: BatchInitiativeTargetProps) {
  const [initiativeId, setInitiativeId] = useState(defaultInitiativeId);
  const [paymentKind, setPaymentKind] = useState<"normal" | "advance">("normal");
  const target = useMemo(
    () => targets.find((item) => item.id === initiativeId) ?? targets[0],
    [initiativeId, targets],
  );
  const availableSubmissions = useMemo(
    () =>
      approvedMilestoneSubmissions.filter(
        (submission) => submission.initiativeId === target?.id,
      ),
    [approvedMilestoneSubmissions, target?.id],
  );

  if (!target) {
    return (
      <div className="border border-rule bg-[var(--ops-surface)] px-4 py-3 text-sm text-ink-muted">
        No initiatives are available for payment creation.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="field">
        <label htmlFor="batch-initiative-id">Target initiative</label>
        <select
          id="batch-initiative-id"
          name="initiativeId"
          onChange={(event) => setInitiativeId(event.currentTarget.value)}
          value={target.id}
        >
          {targets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.code} ·{" "}
              {item.payoutAddress
                ? "Active verified payout address"
                : "No verified payout address"}
            </option>
          ))}
        </select>
      </div>

      <div
        className="border border-rule bg-[var(--ops-surface)] p-4"
        data-active-target={target.id}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="row-name">{target.name}</div>
            <div className="row-meta">
              {target.trackName} · {target.code} · Steward: {target.stewardName}
            </div>
          </div>
          <Chip tone={target.payoutAddress ? "ok" : "warn"}>
            {target.payoutAddress ? target.payoutStatus : "payout required"}
          </Chip>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-[0.18em] text-ink-muted">
            {target.payoutAddress
              ? "Active verified payout destination"
              : "Payout destination status"}
          </div>
          {target.payoutAddress ? (
            <div className="mt-2">
              <Hash value={target.payoutAddress} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">
              No verified payout address. Creation and submission will stay
              blocked until AYRA verifies a steward-submitted destination.
            </p>
          )}
        </div>
      </div>

      <div className="field">
        <label htmlFor="payment-kind">Payment type</label>
        <select
          id="payment-kind"
          name="paymentKind"
          onChange={(event) =>
            setPaymentKind(
              event.currentTarget.value === "advance" ? "advance" : "normal",
            )
          }
          value={paymentKind}
        >
          <option value="normal">Normal · link approved milestone evidence</option>
          <option value="advance">Advance · admin-approved exception</option>
        </select>
      </div>

      {paymentKind === "normal" ? (
        <div className="field">
          <label htmlFor="milestone-submission-id">Approved milestone package</label>
          <select
            id="milestone-submission-id"
            name="milestoneSubmissionId"
            required={paymentKind === "normal"}
          >
            {availableSubmissions.length > 0 ? (
              availableSubmissions.map((submission) => (
                <option key={submission.id} value={submission.id}>
                  {submission.milestoneCode} · {submission.title} ·{" "}
                  {submission.submittedAt.slice(0, 10)}
                </option>
              ))
            ) : (
              <option value="">
                No approved unused milestone packages for this initiative
              </option>
            )}
          </select>
          {availableSubmissions.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted" role="status">
              Normal payments are blocked until this initiative has an approved
              private milestone package that has not backed another payment.
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">
              Normal payments use exactly one approved private package. Public
              updates do not satisfy this evidence requirement.
            </p>
          )}
        </div>
      ) : (
        <div
          className="border border-rule bg-[var(--ops-surface)] px-4 py-3 text-sm text-ink-muted"
          role="status"
        >
          Advance payments bypass milestone evidence and remain an admin-approved
          exception.
        </div>
      )}

      {children}

      <button
        className="btn primary justify-self-start"
        disabled={!rateAvailable || !target.payoutAddress}
        type="submit"
      >
        Create ready payment
      </button>
    </div>
  );
}
