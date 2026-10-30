import Link from "next/link";
import { fetchSomaStates, fetchBooks, fetchInbox } from "@/lib/halseth";
import { buildWhoIsHome, buildLeftForYou, currentBook } from "@/lib/home-model";
import WhoIsHome from "@/components/home/WhoIsHome";
import LeftForYou from "@/components/home/LeftForYou";
import ReadingLine from "@/components/home/ReadingLine";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [soma, inbox, books] = await Promise.all([
    fetchSomaStates(),
    fetchInbox(3),
    fetchBooks().catch(() => []),
  ]);
  const now = new Date();

  // /soma null means Halseth is down or that endpoint failed: say so, still show the bare rows.
  const down = !soma;

  const rows = buildWhoIsHome(soma, now);
  const left = buildLeftForYou(inbox, now);
  const book = currentBook(books);

  return (
    <div className="h-home">
      {down && <p className="h-home-quiet h-home-down">Can&apos;t reach Halseth right now.</p>}
      <WhoIsHome rows={rows} />
      {inbox && <LeftForYou items={left.items} />}
      {book && <ReadingLine book={book} />}
      <section className="h-home-section">
        <Link href="/phoenix/chat" className="h-home-talk">Talk to them</Link>
      </section>
    </div>
  );
}
