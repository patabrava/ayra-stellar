"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheckBig, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Chip } from "@/components/ayra/ui";
import { getApplicationSubmitStatus } from "@/lib/ayra/status";

export function ApplicationSubmitModal({ status }: { status?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const submitStatus = useMemo(() => getApplicationSubmitStatus(status), [status]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const dismiss = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("status");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!submitStatus) return;

    const dialog = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusable = () => {
      if (!dialog) return [];
      return Array.from(
        dialog.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "button:not([disabled])",
            "textarea:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            '[tabindex]:not([tabindex="-1"])',
          ].join(","),
        ),
      ).filter((element) => element.offsetParent !== null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => {
      getFocusable()[0]?.focus();
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [dismiss, submitStatus]);

  if (!submitStatus) return null;

  if (!mounted) return null;

  return createPortal(
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
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
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
    </div>,
    document.body,
  );
}
