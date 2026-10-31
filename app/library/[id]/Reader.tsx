"use client";

import { useEffect, useRef, useState } from "react";
import ePub from "epubjs";
import type { Book as EpubBook, Rendition, Location, NavItem, Contents } from "epubjs";
import type { BookAnnotation, BookProgress } from "@/lib/halseth";

// Panel colours come from the kit tokens via an is-<author> class (globals.css .h-reader-*);
// an unknown author gets the plain ink colour.
const KNOWN_AUTHORS = new Set(["raziel", "drevan", "cypher", "gaia"]);
function authorClass(author: string) {
  return KNOWN_AUTHORS.has(author) ? ` is-${author}` : "";
}

// Highlight fills live inside the epub iframe, where the page's CSS variables
// don't reach, so these are literal hexes, one warm tone per voice. They are epubjs DATA (highlightStyle
// only), not page chrome; the margin panel uses the kit tokens instead.
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
// On a phone or portrait iPad (<1024px) the panel is a sheet over the page, opened from the controls
// strip; at >=1024px it is a fixed side column. Either way it never changes the epub viewer's box.
function MarginPanel({ annotations, open, onClose }: {
  annotations: BookAnnotation[];
  open: boolean;
  onClose: () => void;
}) {
  const sorted = [...annotations].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <aside className={`h-reader-margins${open ? " is-open" : ""}`} aria-label="margin notes">
      <div className="h-reader-margins-head">
        <p className="h-reader-margins-label">in the margins</p>
        <button type="button" className="h-reader-btn h-reader-margins-close" onClick={onClose}>
          close
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="h-reader-note-quote">
          no notes yet: select a passage to leave the first one. the triad writes here too.
        </p>
      ) : (
        sorted.map((a) => (
          <div key={a.id} className={`h-reader-note${authorClass(a.author)}`}>
            <p className="h-reader-note-who">
              <span className={`h-reader-who${authorClass(a.author)}`}>{a.author}</span>
              <span className="h-reader-note-at"> · {formatTime(a.created_at)}</span>
            </p>
            {a.selected_text && (
              <p className="h-reader-note-quote">&ldquo;{a.selected_text}&rdquo;</p>
            )}
            {a.comment && <p className="h-reader-note-body">{a.comment}</p>}
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
  const [marginsOpen, setMarginsOpen] = useState(false);

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

  // The viewer now fills the viewport (flex, 100dvh minus the bar and controls) instead of a fixed 75vh.
  // epubjs already re-measures on window resize/orientationchange; this catches a container change with no
  // window event (e.g. a desktop scrollbar or the dvh settling). Only after first display; epubjs skips a
  // resize when the size is unchanged, so a double fire with its own listener is a no-op.
  useEffect(() => {
    if (fileType !== "epub" || !ready) return;
    const el = viewerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      // No-arg resize re-measures the container (the "100%" sizing stays in force); epubjs's .d.ts
      // marks width/height required, but passing numbers would pin the rendition to fixed pixels.
      const r = renditionRef.current as unknown as { resize: (w?: number, h?: number) => void } | null;
      try { r?.resize(); } catch { /* torn down mid-resize; epubjs remeasures next event */ }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fileType, ready]);

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
      // Halseth returns only {id, book_id, author}, so `returned ?? local` showed a blank note
      // ("raziel ·", no quote, no comment) until reload. Server fields win; the rest is local.
      const ann: BookAnnotation = {
        id: `local-${Date.now()}`,
        book_id: bookId,
        author: "raziel",
        cfi_range: pending.cfiRange,
        selected_text: pending.text || null,
        comment: comment.trim() || null,
        color: null,
        created_at: new Date().toISOString(),
        ...(typeof (body as { id?: unknown }).id === "string" ? { id: (body as { id: string }).id } : {}),
        ...(returned ?? {}),
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

  const noteCount = annotations.length;
  const marginsToggle = (
    <button
      type="button"
      className="h-reader-btn h-reader-margins-toggle"
      aria-expanded={marginsOpen}
      onClick={() => setMarginsOpen((o) => !o)}
    >
      margins{noteCount > 0 ? ` (${noteCount})` : ""}
    </button>
  );

  // ── pdf: no epubjs, the browser's viewer plus the margins ──────────────
  if (fileType === "pdf") {
    return (
      <div className="h-reader-layout">
        <div className="h-reader-main">
          <div className="h-reader-stage">
            <embed
              src={`/api/library/${bookId}/file`}
              type="application/pdf"
              className="h-reader-pdf"
            />
          </div>
          <div className="h-reader-controls">
            <span className="h-reader-hint">the browser&apos;s viewer turns the pages</span>
            {marginsToggle}
          </div>
        </div>
        <MarginPanel annotations={annotations} open={marginsOpen} onClose={() => setMarginsOpen(false)} />
      </div>
    );
  }

  return (
    <div className="h-reader-layout">
      <div className="h-reader-main">
        {error ? (
          <p className="h-reader-quiet">{error}</p>
        ) : (
          <>
            <div className="h-reader-stage">
              <div ref={viewerRef} className="h-reader-page" />
              {!ready && <p className="h-reader-opening">opening the book…</p>}

              {pending && (
                <div className="h-reader-note-box">
                  {pending.text && (
                    <p className="h-reader-quote">
                      &ldquo;{pending.text.length > 240 ? pending.text.slice(0, 240) + "…" : pending.text}&rdquo;
                    </p>
                  )}
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="a note in the margin (optional: the highlight saves either way)"
                    rows={2}
                    className="h-reader-input"
                  />
                  <div className="h-reader-actions">
                    <button
                      type="button"
                      className="h-reader-btn is-lamp"
                      onClick={saveAnnotation}
                      disabled={saving}
                    >
                      {saving ? "saving…" : "save to the margins"}
                    </button>
                    <button
                      type="button"
                      className="h-reader-btn"
                      onClick={dismissSelection}
                      disabled={saving}
                    >
                      never mind
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-reader-controls">
              <button
                type="button"
                className="h-reader-btn"
                onClick={() => renditionRef.current?.prev()}
              >
                ← prev
              </button>
              <span className="h-reader-hint">arrow keys turn pages · select a passage to note it</span>
              {marginsToggle}
              <button
                type="button"
                className="h-reader-btn"
                onClick={() => renditionRef.current?.next()}
              >
                next →
              </button>
            </div>
          </>
        )}
      </div>

      <MarginPanel annotations={annotations} open={marginsOpen} onClose={() => setMarginsOpen(false)} />
    </div>
  );
}
