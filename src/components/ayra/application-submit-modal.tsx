"use client";

import { CircleAlert, CircleCheckBig, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Chip } from "@/components/ayra/ui";
import { getApplicationSubmitStatus } from "@/lib/ayra/status";

export function ApplicationSubmitModal({ status }: { status?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const submitStatus = getApplicationSubmitStatus(status);
  if (!submitStatus) return null;

  const dismiss = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("status");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  return (
    <div
      className="ops-modal-scrim"
      onClick={dismiss}
      role="presentation"
    >
      <div
        aria-describedby="application-submit-body"
        aria-labelledby="application-submit-title"
        aria-modal="true"
        className="ops-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Close application submission message"
          className="ops-modal-close"
          onClick={dismiss}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="ops-modal-icon" data-tone={submitStatus.tone}>
          {submitStatus.tone === "ok" ? (
            <CircleCheckBig className="h-5 w-5" />
          ) : (
            <CircleAlert className="h-5 w-5" />
          )}
        </div>
        <Chip tone={submitStatus.tone}>
          {submitStatus.tone === "ok" ? "Submitted" : "Submission failed"}
        </Chip>
        <h2 className="mt-4 text-2xl font-medium" id="application-submit-title">
          {submitStatus.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-muted" id="application-submit-body">
          {submitStatus.body}
        </p>
        <div className="mt-6 flex justify-end">
          <button autoFocus className="btn primary" onClick={dismiss} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
