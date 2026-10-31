"use client";

import { useCallback, useState } from "react";
import type { NeedsItem } from "@/lib/halseth";
import { countLine } from "@/lib/needs";
import NeedsRow from "./NeedsRow";

/** The inbox: one count line, then every item, each resolving in place. Handled rows dim and stay. */
export default function NeedsList({ items, nowMs }: { items: NeedsItem[]; nowMs: number }) {
  const [settled, setSettled] = useState<ReadonlySet<string>>(() => new Set());
  const onSettled = useCallback((key: string) => {
    setSettled((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, []);

  if (items.length === 0) return <p className="h-needs-quiet">Nothing needs you right now.</p>;

  const count = countLine(items.length - settled.size);
  return (
    <>
      {count && (
        <p className="h-needs-count" role="status">
          {count}
        </p>
      )}
      <ul className="h-needs-list">
        {items.map((it) => (
          <NeedsRow key={it.key} item={it} nowMs={nowMs} onSettled={onSettled} />
        ))}
      </ul>
    </>
  );
}
