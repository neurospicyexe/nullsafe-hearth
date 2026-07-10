import Link from "next/link";
import { fetchBooks } from "@/lib/halseth";
import type { Book } from "@/lib/halseth";
import UploadBox from "./UploadBox";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Cover({ book }: { book: Book }) {
  if (book.cover_key) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- proxied stream, dimensions unknown
      <img
        src={`/api/library/${book.id}/cover`}
        alt={`cover of ${book.title}`}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          borderRadius: "4px", display: "block",
        }}
      />
    );
  }
  // No cover — a quiet spine-label block instead.
  return (
    <div style={{
      width: "100%", height: "100%", borderRadius: "4px",
      background: "linear-gradient(160deg, #16161a, #0c0c0e)",
      border: "1px solid #232328",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0.6rem", textAlign: "center",
    }}>
      <span style={{ color: "#8b8b96", fontSize: "0.78rem", lineHeight: 1.35, fontStyle: "italic" }}>
        {book.title}
      </span>
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
  const pct = book.progress_percent ?? 0;
  return (
    <Link
      href={`/library/${book.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div style={{
        aspectRatio: "2 / 3", position: "relative", marginBottom: "0.45rem",
        boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
      }}>
        <Cover book={book} />
        {book.annotation_count > 0 && (
          <span
            title={`${book.annotation_count} margin note${book.annotation_count === 1 ? "" : "s"}`}
            style={{
              position: "absolute", top: "0.35rem", right: "0.35rem",
              background: "rgba(12,12,12,0.85)", border: "1px solid #2a2a30",
              borderRadius: "999px", padding: "0.05rem 0.45rem",
              fontSize: "0.7rem", color: "#f59e0b",
            }}
          >
            ✎ {book.annotation_count}
          </span>
        )}
        {book.finished_at && (
          <span style={{
            position: "absolute", bottom: "0.35rem", right: "0.35rem",
            background: "rgba(12,12,12,0.85)", border: "1px solid #2a2a30",
            borderRadius: "999px", padding: "0.05rem 0.45rem",
            fontSize: "0.7rem", color: "#4ade80",
          }}>
            finished
          </span>
        )}
      </div>
      {pct > 0 && !book.finished_at && (
        <div style={{ height: "3px", background: "#1a1a1e", borderRadius: "2px", marginBottom: "0.35rem" }}>
          <div style={{
            height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`,
            background: "#f59e0b", borderRadius: "2px",
          }} />
        </div>
      )}
      <p className="handover-spine" style={{ fontSize: "0.86rem", marginBottom: "0.1rem" }}>{book.title}</p>
      <p style={{ fontSize: "0.76rem", color: "#64748b" }}>
        {book.author ?? "unknown author"}
        <span style={{ opacity: 0.6 }}> · {book.file_type} · added {formatDate(book.added_at)}</span>
      </p>
    </Link>
  );
}

// The Library (0099): Raziel's books, the triad's marginalia.
export default async function LibraryPage() {
  const books = await fetchBooks();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">The Library</h1>
        <p className="page-subtitle">your books, their margins — the triad reads along and leaves notes</p>
      </div>

      <UploadBox />

      {books.length === 0 ? (
        <p className="empty">no books yet. drop an epub or pdf above to start the shelf.</p>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "1.1rem",
          marginTop: "1.25rem",
        }}>
          {books.map((b) => <BookCard key={b.id} book={b} />)}
        </div>
      )}
    </>
  );
}
