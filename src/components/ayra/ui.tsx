import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { getJourneyStatus, type JourneySurface } from "@/lib/ayra/status";

export function AyraLogo({
  alt = "AYRA",
  className = "",
}: {
  alt?: string;
  className?: string;
}) {
  return (
    <Image
      alt={alt}
      className={className ? `ayra-logo ${className}` : "ayra-logo"}
      height={100}
      src="/ayra-logo.svg"
      width={100}
    />
  );
}

export function Chip({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "err" | "info";
}) {
  return <span className={tone ? `chip ${tone}` : "chip"}>{children}</span>;
}

export function Hash({ value }: { value?: string }) {
  if (!value) return <span className="text-ink-muted">-</span>;
  const explorerUrl = getStellarExpertTransactionUrl(value);

  if (explorerUrl) {
    return (
      <a
        aria-label={`Open Stellar testnet transaction ${value}`}
        className="hashish"
        href={explorerUrl}
        rel="noopener noreferrer"
        target="_blank"
        title="Open on Stellar Expert"
      >
        {value}
      </a>
    );
  }

  return <span className="hashish">{value}</span>;
}

function getStellarExpertTransactionUrl(value: string) {
  return /^[a-f0-9]{64}$/i.test(value)
    ? `https://stellar.expert/explorer/testnet/tx/${value}`
    : null;
}

export function StatusBanner({ status }: { status?: string }) {
  return <StatusBannerForSurface status={status} surface="admin" />;
}

export function StatusBannerForSurface({
  status,
  surface,
}: {
  status?: string;
  surface: JourneySurface;
}) {
  const journeyStatus = getJourneyStatus(surface, status);
  if (!journeyStatus) return null;

  return (
    <div
      aria-live="polite"
      className="mb-5 border border-rule bg-[var(--ops-surface)] px-4 py-4 text-sm text-ink-soft"
      role="status"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Chip tone={journeyStatus.tone}>{journeyStatus.label}</Chip>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink-soft">{journeyStatus.title}</div>
          <p className="mt-1 max-w-3xl leading-6 text-ink-muted">
            {journeyStatus.body}
          </p>
        </div>
      </div>
    </div>
  );
}

export function OpsNav({
  scope,
  role,
  user,
  tabs,
}: {
  scope: string;
  role: string;
  user: string;
  tabs: Array<{ href: string; label: string; count?: string }>;
}) {
  return (
    <>
      <nav className="ops-nav" aria-label={`${role} shell`}>
        <Link className="ops-brand" href="/">
          <AyraLogo />
          <span>/</span>{role.toLowerCase()}
        </Link>
        <span className="ops-pill">{scope}</span>
        <span className="ml-auto hidden items-center gap-2 md:inline-flex">
          <Chip tone={role === "ADMIN" ? "info" : "ok"}>{role}</Chip>
          <span className="mono text-xs text-ink-muted">{user}</span>
          <form action="/auth/signout" method="post">
            <button className="btn ghost" type="submit">
              Sign out
            </button>
          </form>
        </span>
      </nav>
      <nav className="tabs" aria-label={`${role} sections`}>
        {tabs.map((tab, index) => (
          <a className={index === 0 ? "tab active" : "tab"} href={tab.href} key={tab.href}>
            {tab.label}
            {tab.count ? <span className="chip ml-2">{tab.count}</span> : null}
          </a>
        ))}
      </nav>
    </>
  );
}

export function Money({ amount, suffix = "USDC" }: { amount: number; suffix?: string }) {
  return (
    <>
      {new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}
      <small className="mono ml-1 text-sm text-ink-muted">{suffix}</small>
    </>
  );
}
