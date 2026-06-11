"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SearchOverlay = dynamic(() => import("./SearchOverlay"), { ssr: false });

const NAV_GROUPS = [
  {
    group: null,
    items: [
      { href: "/",        label: "Home",    sym: "◈" },
      { href: "/halseth", label: "Halseth", sym: "⌂" },
    ],
  },
  {
    group: "Now",
    items: [
      { href: "/today",    label: "Today",    sym: "◑" },
      { href: "/checkin",  label: "Check-in", sym: "↑" },
      { href: "/soma",     label: "Soma",     sym: "◉" },
      { href: "/wellness", label: "Wellness", sym: "♡" },
    ],
  },
  {
    group: "Triad",
    items: [
      { href: "/us",         label: "Us",         sym: "♥" },
      { href: "/home",       label: "The Home",   sym: "⌂" },
      { href: "/orient",     label: "Orient",     sym: "⊕" },
      { href: "/feelings",   label: "Feelings",   sym: "◎" },
      { href: "/basins",     label: "Basins",     sym: "≋" },
      { href: "/club",       label: "Club",       sym: "♫" },
      { href: "/autonomous", label: "Autonomous", sym: "⟳" },
      { href: "/phoenix",    label: "Phoenix",    sym: "⌬" },
    ],
  },
  {
    group: "Memory",
    items: [
      { href: "/handovers", label: "Handovers", sym: "↹" },
      { href: "/sessions",  label: "Sessions",  sym: "⊙" },
      { href: "/dreams",    label: "Dreams",    sym: "◌" },
      { href: "/memory",    label: "Memory",    sym: "◫" },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/shared", label: "Shared", sym: "≡" },
      { href: "/tasks",  label: "Tasks",  sym: "☑" },
      { href: "/house",  label: "House",  sym: "⊡" },
    ],
  },
];

// Mobile bottom nav — core items only, rest reachable via search
const MOBILE_NAV = [
  { href: "/",       label: "Home",     sym: "◈" },
  { href: "/today",  label: "Today",    sym: "◑" },
  { href: "/us",     label: "Us",       sym: "♥" },
  { href: "/checkin", label: "Check-in", sym: "↑" },
  { href: "/tasks",  label: "Tasks",    sym: "☑" },
];

export default function Nav() {
  const path = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Login page gets no nav — after all hooks so rules-of-hooks is satisfied
  if (path === "/login") return null;

  return (
    <>
      {/* Sidebar — desktop */}
      <nav className="nav-sidebar" aria-label="Main navigation">
        <div className="nav-wordmark">Hearth</div>
        <div className="nav-links">
          {NAV_GROUPS.map(({ group, items }) => (
            <div key={group ?? "__top"} className="nav-group">
              {group && <span className="nav-group-label">{group}</span>}
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isActive(item.href) ? "active" : ""}`}
                >
                  <span className="nav-sym" aria-hidden="true">{item.sym}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
        <button
          className="nav-search-btn"
          onClick={() => setSearchOpen(true)}
          title="Search (⌘K)"
          aria-label="Search"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l2.5 2.5"/></svg>
          <span className="nav-label">Search</span>
        </button>
      </nav>

      {/* Bottom bar — mobile, core items only */}
      <nav className="nav-bottom" aria-label="Mobile navigation">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-bottom-item ${isActive(item.href) ? "active" : ""}`}
            title={item.label}
          >
            <span className="nav-sym" aria-hidden="true">{item.sym}</span>
            <span className="nav-bottom-label">{item.label}</span>
          </Link>
        ))}
        <button
          className="nav-bottom-item nav-search-btn"
          onClick={() => setSearchOpen(true)}
          title="Search"
          aria-label="Search"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="4"/><path d="M11 11l2.5 2.5"/></svg>
          <span className="nav-bottom-label">Search</span>
        </button>
      </nav>

      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </>
  );
}
