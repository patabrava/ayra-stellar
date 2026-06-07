"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BatchStatusAutoRefreshProps = {
  enabled: boolean;
  intervalMs?: number;
};

export function BatchStatusAutoRefresh({
  enabled,
  intervalMs = 15000,
}: BatchStatusAutoRefreshProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusModalActive = searchParams.has("status");

  useEffect(() => {
    if (!enabled || statusModalActive) return;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };

    const interval = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [enabled, intervalMs, router, statusModalActive]);

  return null;
}
