"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { TABS, activeTab, type TabLabel } from "@/lib/shell";

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
  return (
    <nav className="h-tabbar" aria-label="Main">
      {TABS.map((tab) => {
        const active = tab.label === current;
        return (
          <Link key={tab.href} href={tab.href} className={`h-tab${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
            {ICONS[tab.label]}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
