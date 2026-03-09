"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",           label: "Home",       sym: "◈" },
  { href: "/halseth",    label: "Halseth",    sym: "⌂" },
  { href: "/us",         label: "Us",         sym: "♥" },
  { href: "/companions", label: "Companions", sym: "◉" },
  { href: "/dreams",     label: "Dreams",     sym: "◌" },
  { href: "/tasks",      label: "Tasks",      sym: "☑" },
  { href: "/checkin",    label: "Check-in",   sym: "↑" },
  { href: "/shared",     label: "Shared",     sym: "≡" },
];

export default function Nav() {
  const path = usePathname();

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

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
      </nav>
    </>
  );
}
