import Link from "next/link";
import { fetchBook } from "@/lib/halseth";
import ReaderShell from "./ReaderShell";

export const dynamic = "force-dynamic";

// One book, opened. The reader itself is client-only (epubjs needs window);
// this server component fetches the book + marginalia and hands them down.
export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await fetchBook(id);

  if (!detail?.book) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">The Library</h1>
        </div>
        <p className="empty">couldn&apos;t open that book — it may have been removed, or Halseth is unreachable.</p>
        <p><Link href="/library" style={{ color: "#f59e0b" }}>← back to the library</Link></p>
      </>
    );
  }

  const { book, progress, annotations } = detail;

  return (
    <>
      <div className="page-header">
        <p style={{ marginBottom: "0.4rem" }}>
          <Link href="/library" style={{ color: "#64748b", fontSize: "0.82rem", textDecoration: "none" }}>
            ← the library
          </Link>
        </p>
        <h1 className="page-title">{book.title}</h1>
        <p className="page-subtitle">
          {book.author ?? "unknown author"}
          {book.finished_at ? " · finished" : ""}
        </p>
      </div>

      <ReaderShell
        bookId={book.id}
        fileType={book.file_type}
        initialProgress={progress}
        initialAnnotations={annotations}
      />
    </>
  );
}
