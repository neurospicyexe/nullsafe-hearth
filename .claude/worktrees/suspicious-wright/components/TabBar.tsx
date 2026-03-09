"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/",        icon: "🏠", label: "Home" },
  { href: "/us",      icon: "🤝", label: "Us" },
  { href: "/mind",    icon: "🧠", label: "Mind" },
  { href: "/checkin", icon: "📋", label: "Check-in" },
  { href: "/threads", icon: "🧵", label: "Threads" },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tab-bar">
      <div className="tab-bar-inner">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`tab-item${isActive ? " active" : ""}`}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
