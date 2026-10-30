"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { shellHidden } from "@/lib/shell";
import Header from "./Header";
import TabBar from "./TabBar";
import SpoonsStrip from "./SpoonsStrip";
import { useWriteQueue } from "./WriteQueueProvider";
import { unsavedLine } from "@/lib/write-queue";
import GreetingTitle from "../home/GreetingTitle";

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
  const queue = useWriteQueue();
  const [unsaved, setUnsaved] = useState(0);

  // Writes kept for retry (offline, server down). Refreshed on every queue change: sends, restore, discard.
  useEffect(() => {
    const read = () => setUnsaved(queue.failed().length);
    read();
    return queue.subscribe(read);
  }, [queue]);

  useEffect(() => {
    if (hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
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
      <Header onSearch={() => setSearchOpen(true)}>{pathname === "/" ? <GreetingTitle /> : undefined}</Header>
      <main className="app-main h-main">{children}</main>
      <SpoonsStrip notice={unsavedLine(unsaved)} />
      <TabBar />
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </div>
  );
}
