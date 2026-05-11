"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const COMPANION_META: Record<string, { display: string; color: string; sym: string }> = {
  drevan: { display: "Drevan", color: "#6366f1", sym: "◈" },
  cypher: { display: "Cypher", color: "#e2e8f0", sym: "⟡" },
  gaia:   { display: "Gaia",   color: "#4ade80", sym: "✦" },
};

const BASE_TABS = [
  { href: "",           label: "Overview"  },
  { href: "/journal",   label: "Journal"   },
  { href: "/letters",   label: "Letters"   },
  { href: "/deltas",    label: "Deltas"    },
  { href: "/feelings",  label: "Feelings"  },
  { href: "/notes",     label: "Notes"     },
  { href: "/loops",     label: "Loops"     },
  { href: "/growth",    label: "Growth"    },
  { href: "/autonomy",  label: "Autonomy"  },
];

const EXTRA_TABS: Record<string, { href: string; label: string }[]> = {
  cypher: [{ href: "/audit",   label: "Audit"   }],
  gaia:   [{ href: "/witness", label: "Witness" }],
};

export default function CompanionTabStrip({ companionId }: { companionId: string }) {
  const path = usePathname();
  const meta = COMPANION_META[companionId];
  const tabs = [...BASE_TABS, ...(EXTRA_TABS[companionId] ?? [])];
  const base = `/companions/${companionId}`;

  return (
    <div className="companion-tab-strip">
      {meta && (
        <div className="companion-tab-identity">
          <span className="companion-tab-sym" style={{ color: meta.color }}>{meta.sym}</span>
          <span className="companion-tab-name" style={{ color: meta.color }}>{meta.display}</span>
        </div>
      )}
      <div className="companion-tabs" role="tablist">
        {tabs.map((tab) => {
          const href = `${base}${tab.href}`;
          const isActive = tab.href === "" ? path === base : path.startsWith(href);
          return (
            <Link
              key={tab.href}
              href={href}
              className={`companion-tab${isActive ? " active" : ""}`}
              role="tab"
              aria-selected={isActive}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
