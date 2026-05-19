"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, CircleCheckBig, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Chip } from "@/components/ayra/ui";
import { getLoginStatus } from "@/lib/ayra/status";

export function LoginStatusModal({ status }: { status?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const loginStatus = getLoginStatus(status);
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
    if (!loginStatus) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [dismiss, loginStatus]);

  if (!loginStatus) return null;

  if (!mounted) return null;

  return createPortal(
    <div className="ops-modal-scrim" onClick={dismiss} role="presentation">
      <div
        aria-describedby="login-status-body"
        aria-labelledby="login-status-title"
        aria-modal="true"
        className="ops-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Close sign-in message"
          className="ops-modal-close"
          onClick={dismiss}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="ops-modal-icon" data-tone={loginStatus.tone}>
          {loginStatus.tone === "ok" ? (
            <CircleCheckBig className="h-5 w-5" />
          ) : (
            <CircleAlert className="h-5 w-5" />
          )}
        </div>
        <Chip tone={loginStatus.tone}>
          {loginStatus.tone === "ok" ? "Link sent" : "Sign-in blocked"}
        </Chip>
        <h2 className="mt-4 text-2xl font-medium" id="login-status-title">
          {loginStatus.title}
        </h2>
        <p
          className="mt-3 text-sm leading-6 text-ink-muted"
          id="login-status-body"
        >
          {loginStatus.body}
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
