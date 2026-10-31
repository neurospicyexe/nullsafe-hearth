"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { TABS, activeTab, badgeText, focusRefreshDue, latestOnly, type TabLabel } from "@/lib/shell";

const icon = (children: ReactNode, round = false) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinejoin="round"
    strokeLinecap={round ? "round" : undefined}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ICONS: Record<TabLabel, ReactNode> = {
  Home: icon(<path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z" />),
  "Needs you": icon(
    <>
      <path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15z" />
      <path d="M10 21h4" />
    </>,
    true,
  ),
  Together: icon(
    <>
      <circle cx="9" cy="9" r="3.5" />
      <circle cx="16" cy="10" r="3" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M15 14.8c3 0 6 1.7 6 5.2" />
    </>,
    true,
  ),
  Archive: icon(<path d="M4 4h16v6H4zM4 14h16v6H4z" />),
};

export default function TabBar() {
  const pathname = usePathname() ?? "/";
  const current = activeTab(pathname);
  const [waiting, setWaiting] = useState<number | null>(null);

  // Only the latest request sets the count, so a slow earlier response can't overwrite a newer one.
  const seq = useRef(latestOnly());
  const lastFetch = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const n = seq.current.start();
    lastFetch.current = Date.now();
    let next: number | null = null;
    try {
      const res = await fetch("/api/needs/count", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { total?: unknown };
        next = typeof data.total === "number" ? data.total : null;
      }
    } catch {
      next = null;
    }
    if (seq.current.isLatest(n)) setWaiting(next);
  }, []);

  // On mount, on every route change, and when /needs resolves something. A window focus refreshes
  // at most once per 30 seconds (app-switching shouldn't cost four COUNTs each time). No polling.
  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);
  useEffect(() => {
    const now = () => { void refresh(); };
    const onFocus = () => { if (focusRefreshDue(lastFetch.current, Date.now())) void refresh(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("hearth:needs-changed", now);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("hearth:needs-changed", now);
    };
  }, [refresh]);

  return (
    <nav className="h-tabbar" aria-label="Main">
      {TABS.map((tab) => {
        const active = tab.label === current;
        const badge = tab.label === "Needs you" ? badgeText(waiting) : null;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`h-tab${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            aria-label={badge ? `${tab.label}, ${waiting} waiting` : undefined}
          >
            <span className="h-tab-icon">
              {ICONS[tab.label]}
              {badge && <span className="h-tab-badge" aria-hidden="true">{badge}</span>}
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
