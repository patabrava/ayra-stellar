"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { AyraLogo } from "@/components/ayra/ui";

export type PublicNavItem = {
  current?: boolean;
  href: string;
  label: string;
  title?: string;
};

export type PublicNavGroup = {
  label: string;
  items: PublicNavItem[];
};

export function PublicNav({
  ariaLabel,
  groups,
  homeHref,
}: {
  ariaLabel: string;
  groups: PublicNavGroup[];
  homeHref: string;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    requestAnimationFrame(() => {
      navRef.current?.querySelector<HTMLElement>(".public-nav-actions a")?.focus();
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <nav
      aria-label={ariaLabel}
      className="public-nav"
      data-menu-open={open ? "true" : "false"}
      ref={navRef}
    >
      <Link className="wordmark" href={homeHref} onClick={() => setOpen(false)}>
        <AyraLogo alt="" />
        <span>AYRA</span>
      </Link>

      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label="Toggle navigation menu"
        className="public-menu-toggle"
        onClick={() => setOpen((current) => !current)}
        ref={toggleRef}
        type="button"
      >
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      <div className="public-nav-actions" id={menuId}>
        {groups.map((group) => (
          <div className="public-nav-group" key={group.label}>
            <div className="public-menu-group-label">{group.label}</div>
            {group.items.map((item) => (
              <Link
                aria-current={item.current ? "page" : undefined}
                className={item.current ? "public-anchor active" : "public-anchor"}
                href={item.href}
                key={`${group.label}-${item.href}`}
                onClick={() => setOpen(false)}
                title={item.title}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
