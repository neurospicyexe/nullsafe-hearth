import Link from "next/link";
import { fetchSomaStates, fetchBooks, fetchInbox, fetchThinking, fetchNeeds } from "@/lib/halseth";
import { thinkingLines } from "@/lib/thinking";
import { buildWhoIsHome, buildLeftForYou, currentBook, needsStrip } from "@/lib/home-model";
import CheckinCard from "@/components/home/CheckinCard";
import NeedsStrip from "@/components/home/NeedsStrip";
import WhoIsHome from "@/components/home/WhoIsHome";
import LeftForYou from "@/components/home/LeftForYou";
import ReadingLine from "@/components/home/ReadingLine";
import ThinkingStrip from "@/components/home/ThinkingStrip";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [soma, inbox, books, thinking, needs] = await Promise.all([
    fetchSomaStates(),
    fetchInbox(3),
    fetchBooks().catch(() => []),
    fetchThinking(8).catch(() => null),
    fetchNeeds(2).catch(() => null),
  ]);
  const now = new Date();

  // /soma null means Halseth is down or that endpoint failed: say so, still show the bare rows.
  const down = !soma;

  const rows = buildWhoIsHome(soma, now);
  const left = buildLeftForYou(inbox, now);
  const book = currentBook(books);
  const think = thinkingLines(thinking, 5);
  const strip = needsStrip(needs, now);

  return (
    <div className="h-home">
      {down && <p className="h-home-quiet h-home-down">Can&apos;t reach Halseth right now.</p>}
      {/* 3a: the check-in first, then who is home, then what needs Raziel. */}
      <CheckinCard />
      <WhoIsHome rows={rows} />
      <NeedsStrip model={strip} />
      {/* B62: their own thinking sits right under Who is home, above anything about Raziel. */}
      <ThinkingStrip lines={think} now={now} />
      {inbox && <LeftForYou items={left.items} />}
      {book && <ReadingLine book={book} />}
      <section className="h-home-section">
        <Link href="/phoenix/chat" className="h-home-talk">Talk to them</Link>
      </section>
    </div>
  );
}
