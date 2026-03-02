"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/us", label: "Us", icon: "♡" },
  { href: "/mind", label: "Mind", icon: "◎" },
  { href: "/checkin", label: "Check-in", icon: "↑" },
  { href: "/threads", label: "Threads", icon: "∿" },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tab-bar">
      <div className="tab-bar-inner">
        {TABS.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`tab-item${active ? " active" : ""}`}
            >
              <span className="tab-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
