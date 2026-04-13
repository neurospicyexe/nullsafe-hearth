"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/phoenix", label: "Overview", exact: true },
  { href: "/phoenix/dreams", label: "Dreams", exact: false },
  { href: "/phoenix/chat", label: "Chat", exact: false },
  // Future: { href: "/phoenix/runs", label: "Runs", exact: false },
  // Future: { href: "/phoenix/seeds", label: "Seeds", exact: false },
] as const;

export default function PhoenixTabs() {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "flex",
        gap: "0.25rem",
        borderBottom: "1px solid #1e293b",
        marginBottom: "1.5rem",
      }}
    >
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              fontWeight: active ? 600 : 400,
              color: active ? "#e2e8f0" : "#64748b",
              borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
              textDecoration: "none",
              marginBottom: "-1px",
              display: "inline-block",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
