"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchOverlay from "./SearchOverlay";

const NAV = [
  { href: "/",          label: "Home",      sym: "◈" },
  { href: "/halseth",   label: "Halseth",   sym: "⌂" },
  { href: "/us",        label: "Us",        sym: "♥" },
  { href: "/handovers", label: "Handovers", sym: "↹" },
  { href: "/dreams",    label: "Dreams",    sym: "◌" },
  { href: "/tasks",     label: "Tasks",     sym: "☑" },
  { href: "/checkin",   label: "Check-in",  sym: "↑" },
  { href: "/shared",    label: "Shared",    sym: "≡" },
];

export default function Nav() {
  const path = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

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
      <nav className="nav-sidebar">
        <div className="nav-wordmark">Hearth</div>
        <div className="nav-links">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(item.href) ? "active" : ""}`}
            >
              <span className="nav-sym">{item.sym}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>
        <button
          className="nav-search-btn"
          onClick={() => setSearchOpen(true)}
          title="Search (⌘K)"
          aria-label="Search"
        >
          <span className="nav-sym">⌕</span>
          <span className="nav-label">Search</span>
        </button>
      </nav>

      {/* Bottom bar — mobile */}
      <nav className="nav-bottom">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-bottom-item ${isActive(item.href) ? "active" : ""}`}
            title={item.label}
          >
            <span className="nav-sym">{item.sym}</span>
            <span className="nav-bottom-label">{item.label}</span>
          </Link>
        ))}
        <button
          className="nav-bottom-item nav-search-btn"
          onClick={() => setSearchOpen(true)}
          title="Search"
          aria-label="Search"
        >
          <span className="nav-sym">⌕</span>
          <span className="nav-bottom-label">Search</span>
        </button>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
