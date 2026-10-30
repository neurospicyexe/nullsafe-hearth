"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { shellHidden } from "@/lib/shell";
import Header from "./Header";
import TabBar from "./TabBar";
import SpoonsStrip from "./SpoonsStrip";

const SearchOverlay = dynamic(() => import("../SearchOverlay"), { ssr: false });

/**
 * Header, page, spoons strip (one-tap check-in), tab bar.
 * The reader and login render bare, with no chrome.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const hidden = shellHidden(pathname);

  useEffect(() => {
    if (hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hidden]);

  if (hidden) return <main className="app-main">{children}</main>;

  return (
    <div className="h-shell">
      <Header onSearch={() => setSearchOpen(true)} />
      <main className="app-main h-main">{children}</main>
      <SpoonsStrip />
      <TabBar />
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </div>
  );
}
