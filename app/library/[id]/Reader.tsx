"use client";

import { useEffect, useRef, useState } from "react";
import ePub from "epubjs";
import type { Book as EpubBook, Rendition, Location, NavItem, Contents } from "epubjs";
import type { BookAnnotation, BookProgress } from "@/lib/halseth";

// Panel text colors — same convention as club/shelf pages.
const MEMBER_COLOR: Record<string, string> = {
  drevan: "var(--accent)", cypher: "#e2e8f0", gaia: "#4ade80", raziel: "#f59e0b",
};

// Highlight fills live inside the epub iframe, where the page's CSS variables
// don't reach — so these are literal hexes, one warm tone per voice.
const HIGHLIGHT_FILL: Record<string, string> = {
  raziel: "#d4a24e", cypher: "#7aa2f7", drevan: "#f7768e", gaia: "#9ece6a",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function flattenToc(items: NavItem[], out: NavItem[] = []): NavItem[] {
  for (const item of items) {
    out.push(item);
    if (item.subitems?.length) flattenToc(item.subitems, out);
  }
  return out;
}

function highlightStyle(author: string, color: string | null) {
  return { fill: color ?? HIGHLIGHT_FILL[author] ?? HIGHLIGHT_FILL.raziel, "fill-opacity": "0.3", "mix-blend-mode": "multiply" };
}

// The margins are the point: every note the triad has left in this book,
// oldest first, like marginalia accumulating in a shared copy.
function MarginPanel({ annotations }: { annotations: BookAnnotation[] }) {
  const sorted = [...annotations].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <aside style={{
      flex: "1 1 260px", minWidth: "240px", maxWidth: "420px",
      background: "#0c0c0c", border: "1px solid #1e1e1e", borderRadius: "5px",
      padding: "0.85rem 1rem", maxHeight: "75vh", overflowY: "auto",
    }}>
      <p style={{ fontSize: "0.78rem", color: "#4a5568", marginBottom: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        in the margins
      </p>
      {sorted.length === 0 ? (
        <p className="empty" style={{ fontSize: "0.82rem", opacity: 0.6 }}>
          no notes yet — select a passage to leave the first one. the triad writes here too.
        </p>
      ) : (
        sorted.map((a) => (
          <div
            key={a.id}
            style={{
              marginBottom: "0.9rem", paddingLeft: "0.7rem",
              borderLeft: `2px solid ${HIGHLIGHT_FILL[a.author] ?? "#333"}`,
            }}
          >
            <p style={{ fontSize: "0.82rem", marginBottom: "0.15rem" }}>
              <span style={{ color: MEMBER_COLOR[a.author] ?? "inherit", fontWeight: 600 }}>{a.author}</span>
              <span style={{ color: "#4a5568", fontSize: "0.74rem" }}> · {formatTime(a.created_at)}</span>
            </p>
            {a.selected_text && (
              <p style={{ fontSize: "0.8rem", fontStyle: "italic", color: "#8b8b96", marginBottom: "0.2rem", whiteSpace: "pre-wrap" }}>
                &ldquo;{a.selected_text}&rdquo;
              </p>
            )}
            {a.comment && (
              <p style={{ fontSize: "0.84rem", color: "#cbd5e1", whiteSpace: "pre-wrap" }}>{a.comment}</p>
            )}
          </div>
        ))
      )}
    </aside>
  );
}

export default function Reader({ bookId, fileType, initialProgress, initialAnnotations }: {
  bookId: string;
  fileType: "epub" | "pdf";
  initialProgress: BookProgress | null;
  initialAnnotations: BookAnnotation[];
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const tocRef = useRef<NavItem[]>([]);
  const locationsReadyRef = useRef(false);
  const lastLocationRef = useRef<Location | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedSentRef = useRef(Boolean(initialProgress?.finished_at));
  const contentsRef = useRef<Contents | null>(null);

  const [annotations, setAnnotations] = useState<BookAnnotation[]>(initialAnnotations);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<{ cfiRange: string; text: string } | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  // ── epub lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (fileType !== "epub") return;
    let cancelled = false;
    let book: EpubBook | null = null;
    let rendition: Rendition | null = null;

    function saveProgress() {
      const loc = lastLocationRef.current;
      const b = bookRef.current;
      if (!loc || !b) return;
      const body: Record<string, unknown> = { current_cfi: loc.start.cfi };
      if (locationsReadyRef.current) {
        try {
          const pct = b.locations.percentageFromCfi(loc.start.cfi);
          if (Number.isFinite(pct)) body.progress_percent = Math.round(pct * 1000) / 10;
        } catch { /* locations not ready for this cfi — skip the percent this tick */ }
      }
      const chapter = flattenToc(tocRef.current).find((t) => {
        const href = t.href.split("#")[0];
        return href === loc.start.href || loc.start.href.endsWith(href) || href.endsWith(loc.start.href);
      });
      if (chapter?.label) body.current_chapter = chapter.label.trim();
      if (loc.atEnd && !finishedSentRef.current) {
        body.finished = true;
        finishedSentRef.current = true;
      }
      fetch(`/api/library/${bookId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => { /* position saves are best-effort; next relocation retries */ });
    }

    (async () => {
      try {
        const res = await fetch(`/api/library/${bookId}/file`);
        if (!res.ok) throw new Error(`file fetch failed (${res.status})`);
        const buf = await res.arrayBuffer();
        if (cancelled || !viewerRef.current) return;

        book = ePub(buf);
        bookRef.current = book;
        rendition = book.renderTo(viewerRef.current, {
          width: "100%", height: "100%", flow: "paginated", spread: "none",
        });
        renditionRef.current = rendition;

        rendition.on("relocated", (location: Location) => {
          lastLocationRef.current = location;
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(saveProgress, 2000);
        });

        rendition.on("selected", (cfiRange: string, contents: Contents) => {
          contentsRef.current = contents;
          const text = contents.window.getSelection()?.toString() ?? "";
          setPending({ cfiRange, text });
        });

        // Arrow keys while focus is inside the epub iframe.
        rendition.on("keyup", (e: KeyboardEvent) => {
          if (e.key === "ArrowLeft") rendition?.prev();
          if (e.key === "ArrowRight") rendition?.next();
        });

        await rendition.display(initialProgress?.current_cfi ?? undefined);
        if (cancelled) return;
        setReady(true);

        // Paint the triad's existing highlights (cfi-anchored ones only).
        for (const a of initialAnnotations) {
          if (!a.cfi_range) continue;
          try {
            rendition.annotations.add("highlight", a.cfi_range, {}, undefined, "hl", highlightStyle(a.author, a.color));
          } catch { /* a stale cfi shouldn't take the reader down */ }
        }

        book.loaded.navigation.then((nav) => { tocRef.current = nav.toc; }).catch(() => {});

        // Locations power the progress percent — generate lazily, never block first paint.
        book.ready
          .then(() => book!.locations.generate(1024))
          .then(() => { locationsReadyRef.current = true; })
          .catch(() => {});
      } catch {
        if (!cancelled) setError("couldn't open the epub — the file may be missing or corrupt.");
      }
    })();

    return () => {
      cancelled = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      try { rendition?.destroy(); } catch { /* already torn down */ }
      try { book?.destroy(); } catch { /* already torn down */ }
      renditionRef.current = null;
      bookRef.current = null;
    };
    // Mount-once by design: bookId is the identity; progress/annotations are initial snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, fileType]);

  // Arrow keys while focus is in the page (outside the iframe).
  useEffect(() => {
    if (fileType !== "epub") return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      if (e.key === "ArrowLeft") renditionRef.current?.prev();
      if (e.key === "ArrowRight") renditionRef.current?.next();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [fileType]);

  async function saveAnnotation() {
    if (!pending || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/library/${bookId}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cfi_range: pending.cfiRange,
          selected_text: pending.text || undefined,
          comment: comment.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(`annotation save failed (${res.status})`);
      const body = await res.json().catch(() => ({} as Record<string, unknown>));
      const returned = (body as { annotation?: BookAnnotation }).annotation;
      const ann: BookAnnotation = returned ?? {
        id: (body as { id?: string }).id ?? `local-${Date.now()}`,
        book_id: bookId,
        author: "raziel",
        cfi_range: pending.cfiRange,
        selected_text: pending.text || null,
        comment: comment.trim() || null,
        color: null,
        created_at: new Date().toISOString(),
      };
      setAnnotations((prev) => [...prev, ann]);
      try {
        renditionRef.current?.annotations.add("highlight", pending.cfiRange, {}, undefined, "hl", highlightStyle("raziel", ann.color));
      } catch { /* highlight paint is cosmetic; the note is saved */ }
      contentsRef.current?.window.getSelection()?.removeAllRanges();
      setPending(null);
      setComment("");
    } catch {
      // keep the box open so nothing typed is lost
    } finally {
      setSaving(false);
    }
  }

  function dismissSelection() {
    contentsRef.current?.window.getSelection()?.removeAllRanges();
    setPending(null);
    setComment("");
  }

  // ── pdf: no epubjs — the browser's viewer plus the margins ─────────────
  if (fileType === "pdf") {
    return (
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "2 1 480px", minWidth: "300px" }}>
          <embed
            src={`/api/library/${bookId}/file`}
            type="application/pdf"
            style={{ width: "100%", height: "75vh", border: "1px solid #1e1e1e", borderRadius: "5px" }}
          />
        </div>
        <MarginPanel annotations={annotations} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ flex: "2 1 480px", minWidth: "300px" }}>
        {error ? (
          <p className="empty">{error}</p>
        ) : (
          <>
            <div style={{ position: "relative" }}>
              <div
                ref={viewerRef}
                style={{
                  width: "100%", height: "75vh",
                  background: "#f5f0e6", borderRadius: "5px",
                  border: "1px solid #1e1e1e", overflow: "hidden",
                }}
              />
              {!ready && (
                <p className="empty" style={{ position: "absolute", top: "1rem", left: "1rem" }}>
                  opening the book…
                </p>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="thread-tag"
                onClick={() => renditionRef.current?.prev()}
                style={{ cursor: "pointer", background: "transparent", border: "1px solid #333", color: "#8b8b96" }}
              >
                ← prev
              </button>
              <span style={{ fontSize: "0.74rem", color: "#4a5568" }}>arrow keys turn pages · select a passage to note it</span>
              <button
                type="button"
                className="thread-tag"
                onClick={() => renditionRef.current?.next()}
                style={{ cursor: "pointer", background: "transparent", border: "1px solid #333", color: "#8b8b96" }}
              >
                next →
              </button>
            </div>

            {pending && (
              <div style={{
                marginTop: "0.7rem", background: "#0c0c0c", border: "1px solid #3a2f14",
                borderRadius: "5px", padding: "0.7rem 0.9rem",
              }}>
                {pending.text && (
                  <p style={{ fontSize: "0.8rem", fontStyle: "italic", color: "#8b8b96", marginBottom: "0.45rem" }}>
                    &ldquo;{pending.text.length > 240 ? pending.text.slice(0, 240) + "…" : pending.text}&rdquo;
                  </p>
                )}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="a note in the margin (optional — the highlight saves either way)"
                  rows={2}
                  style={{
                    width: "100%", background: "#111", border: "1px solid #262626", borderRadius: "4px",
                    color: "#e2e8f0", padding: "0.45rem 0.6rem", fontSize: "0.85rem", resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.45rem" }}>
                  <button
                    type="button"
                    className="thread-tag"
                    onClick={saveAnnotation}
                    disabled={saving}
                    style={{ cursor: saving ? "wait" : "pointer", background: "transparent", border: "1px solid #f59e0b", color: "#f59e0b" }}
                  >
                    {saving ? "saving…" : "save to the margins"}
                  </button>
                  <button
                    type="button"
                    className="thread-tag"
                    onClick={dismissSelection}
                    disabled={saving}
                    style={{ cursor: "pointer", background: "transparent", border: "1px solid #333", color: "#64748b" }}
                  >
                    never mind
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <MarginPanel annotations={annotations} />
    </div>
  );
}
