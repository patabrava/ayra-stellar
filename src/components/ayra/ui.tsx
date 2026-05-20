import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { signOutAction } from "@/lib/ayra/actions";

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
  return <span className="hashish">{value}</span>;
}

export function StatusBanner({ status }: { status?: string }) {
  if (!status) return null;
  return (
    <div className="mb-5 border border-rule bg-white px-4 py-3 text-sm text-ink-soft">
      <span className="mono text-xs uppercase tracking-[0.06em] text-ink-muted">
        Server action
      </span>{" "}
      {status.replaceAll("-", " ")}
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
          <form action={signOutAction}>
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
