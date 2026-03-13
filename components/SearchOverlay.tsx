'use client';

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ChipValue = "all" | "feelings" | "journal" | "dreams" | "handovers" | "tasks";

type SearchResult = {
  id: string;
  type: "feeling" | "journal" | "dream" | "handover" | "task";
  text: string;
  created_at: string;
  url: string;
  agent?: string;
};

type SearchResponse = {
  feelings: SearchResult[];
  journal: SearchResult[];
  dreams: SearchResult[];
  handovers: SearchResult[];
  tasks: SearchResult[];
};

const CHIPS: { label: string; value: ChipValue }[] = [
  { label: "All", value: "all" },
  { label: "Feelings", value: "feelings" },
  { label: "Journal", value: "journal" },
  { label: "Dreams", value: "dreams" },
  { label: "Handovers", value: "handovers" },
  { label: "Tasks", value: "tasks" },
];

const GROUP_LABELS: Record<keyof SearchResponse, string> = {
  feelings: "FEELINGS",
  journal: "JOURNAL",
  dreams: "DREAMS",
  handovers: "HANDOVERS",
  tasks: "TASKS",
};

const GROUP_ORDER: (keyof SearchResponse)[] = ["feelings", "journal", "dreams", "handovers", "tasks"];

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [activeChip, setActiveChip] = useState<ChipValue>("all");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state and autofocus when open changes
  useEffect(() => {
    setQ("");
    setResults(null);
    setLoading(false);
    setActiveChip("all");
    setError(null);
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Esc key handler
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    if (!q.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&type=${activeChip}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: SearchResponse) => {
          setResults(data);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setResults(null);
          setError("Search unavailable");
          setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, activeChip, open]);

  if (!open) return null;

  const hasResults =
    results !== null &&
    GROUP_ORDER.some((key) => results[key].length > 0);

  const showEmpty = q.trim() !== "" && !loading && error === null && results !== null && !hasResults;

  return (
    <div
      className="search-backdrop"
      onClick={onClose}
    >
      <div
        className="search-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="search-chips">
          {CHIPS.map((chip) => (
            <button
              key={chip.value}
              className={`search-chip${activeChip === chip.value ? " active" : ""}`}
              onClick={() => setActiveChip(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="search-results">
          {loading && (
            <div className="search-loading">searching…</div>
          )}

          {!loading && error !== null && (
            <div className="search-empty">{error}</div>
          )}

          {!loading && error === null && results !== null && GROUP_ORDER.map((key) => {
            const group = results[key];
            if (group.length === 0) return null;
            return (
              <div key={key} className="search-result-group">
                <div className="search-result-group-label">{GROUP_LABELS[key]}</div>
                {group.map((result) => (
                  <div
                    key={result.id}
                    className="search-result-row"
                    onClick={() => {
                      router.push(result.url);
                      onClose();
                    }}
                  >
                    <span className="search-result-text">{result.text}</span>
                    <span className="search-result-meta">{formatDate(result.created_at)}</span>
                  </div>
                ))}
              </div>
            );
          })}

          {showEmpty && (
            <div className="search-empty">No results</div>
          )}
        </div>
      </div>
    </div>
  );
}
