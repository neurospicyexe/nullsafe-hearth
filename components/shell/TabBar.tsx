"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { TABS, activeTab, badgeText, type TabLabel } from "@/lib/shell";

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

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/needs/count", { cache: "no-store" });
      if (!res.ok) { setWaiting(null); return; }
      const data = (await res.json()) as { total?: unknown };
      setWaiting(typeof data.total === "number" ? data.total : null);
    } catch {
      setWaiting(null);
    }
  }, []);

  // On mount, on every route change, on tab focus, and when /needs resolves something. No polling.
  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);
  useEffect(() => {
    const go = () => { void refresh(); };
    window.addEventListener("focus", go);
    window.addEventListener("hearth:needs-changed", go);
    return () => {
      window.removeEventListener("focus", go);
      window.removeEventListener("hearth:needs-changed", go);
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
