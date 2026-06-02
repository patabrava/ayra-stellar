"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheckBig, Info, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Chip } from "@/components/ayra/ui";
import { getJourneyStatus, type JourneySurface } from "@/lib/ayra/status";

function subscribeToClientMount(onStoreChange: () => void) {
  queueMicrotask(onStoreChange);
  return () => {};
}

function getClientMountSnapshot() {
  return true;
}

function getServerMountSnapshot() {
  return false;
}

export function StewardStatusModal({ status }: { status?: string }) {
  return <JourneyStatusModal status={status} surface="steward" />;
}

export function JourneyStatusModal({
  status,
  surface,
}: {
  status?: string;
  surface: JourneySurface;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const journeyStatus = useMemo(
    () => getJourneyStatus(surface, status),
    [surface, status],
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    subscribeToClientMount,
    getClientMountSnapshot,
    getServerMountSnapshot,
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
    if (!journeyStatus || !mounted) return;

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

      if (event.key !== "Tab") return;

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
  }, [dismiss, journeyStatus, mounted]);

  if (!journeyStatus) return null;

  const Icon =
    journeyStatus.tone === "ok"
      ? CircleCheckBig
      : journeyStatus.tone === "info"
        ? Info
        : CircleAlert;
  const modalTone = journeyStatus.tone;
  const bodyId = `${surface}-status-body`;
  const titleId = `${surface}-status-title`;
  const modal = (
    <div className="ops-modal-scrim" onClick={dismiss} role="presentation">
      <div
        aria-describedby={bodyId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="ops-modal"
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label={`Close ${surface} action message`}
          className="ops-modal-close"
          onClick={dismiss}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="ops-modal-icon" data-tone={modalTone}>
          <Icon className="h-5 w-5" />
        </div>
        <Chip tone={journeyStatus.tone}>{journeyStatus.label}</Chip>
        <h2 className="mt-4 text-2xl font-medium" id={titleId}>
          {journeyStatus.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-muted" id={bodyId}>
          {journeyStatus.body}
        </p>
        {journeyStatus.details?.length ? (
          <ul className="mt-3 grid gap-1 text-sm leading-5 text-ink-muted">
            {journeyStatus.details.map((detail) => (
              <li className="flex gap-2" key={detail}>
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 bg-[var(--ink)]" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex justify-end">
          <button autoFocus className="btn primary" onClick={dismiss} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return modal;

  return createPortal(modal, document.body);
}
