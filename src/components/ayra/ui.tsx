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

export function Hash({
  value,
  pendingLabel = "Reference pending",
}: {
  value?: string;
  pendingLabel?: string;
}) {
  if (!value) return <span className="text-ink-muted">-</span>;
  if (isInternalPlaceholderReference(value)) {
    return <span className="text-ink-muted">{pendingLabel}</span>;
  }

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

function isInternalPlaceholderReference(value: string) {
  return /^(mock|demo)-/i.test(value);
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
          {journeyStatus.details?.length ? (
            <ul className="mt-3 grid gap-1 text-xs leading-5 text-ink-muted md:text-sm">
              {journeyStatus.details.map((detail) => (
                <li className="flex gap-2" key={detail}>
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 bg-[var(--ink)]" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          ) : null}
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
  activeHref,
}: {
  scope: string;
  role: string;
  user: string;
  tabs: Array<{ href: string; label: string; count?: string }>;
  activeHref?: string;
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
        {tabs.map((tab, index) => {
          const isActive = activeHref ? tab.href === activeHref : index === 0;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "tab active" : "tab"}
              href={tab.href}
              key={tab.href}
            >
              {tab.label}
              {tab.count ? <span className="chip ml-2">{tab.count}</span> : null}
            </Link>
          );
        })}
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
