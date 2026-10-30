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

  // Soma and inbox both null means Halseth is down (either alone can be a missing endpoint).
  if (!soma && !inbox) {
    return <p className="h-home-quiet h-home-down">Can&apos;t reach Halseth right now.</p>;
  }

  const rows = buildWhoIsHome(soma, now);
  const left = buildLeftForYou(inbox, now);
  const book = currentBook(books);

  return (
    <div className="h-home">
      <WhoIsHome rows={rows} />
      <LeftForYou items={left.items} />
      {book && <ReadingLine book={book} />}
      <section className="h-home-section">
        <Link href="/phoenix/chat" className="h-home-talk">Talk to them</Link>
      </section>
    </div>
  );
}
