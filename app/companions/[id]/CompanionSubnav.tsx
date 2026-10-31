"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CompanionId } from "@/lib/halseth";
import { subnavFor } from "@/lib/companion-page";
import { COMPANION_COLOR } from "@/lib/shell";

/** Over every sub-route (not the overview): back to the companion, plus the current door's siblings. */
export default function CompanionSubnav({ id }: { id: CompanionId }) {
  const nav = subnavFor(id, usePathname() ?? "");
  if (!nav) return null;
  return (
    <nav
      className="h-subnav"
      aria-label={`${nav.back.label} pages`}
      style={{ "--c": COMPANION_COLOR[id] } as React.CSSProperties}
    >
      <Link href={nav.back.href} className="h-subnav-back">
        <span aria-hidden="true">‹</span> {nav.back.label}
      </Link>
      {nav.links.length > 0 && (
        <ul className="h-subnav-links">
          {nav.links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="h-subnav-link" aria-current={l.current ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
