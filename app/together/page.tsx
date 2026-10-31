import DoorList from "@/components/kit/DoorList";
import { HUBS } from "@/lib/shell";
import { fetchBooks, fetchClubCurrent, fetchCreature, fetchCreatures, fetchNewestImage } from "@/lib/halseth";
import { currentBook } from "@/lib/home-model";
import { clubHint, galleryHint, readingHint, solHint, togetherDoors } from "@/lib/together-model";

export const metadata = { title: "Together | Hearth" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const now = new Date();
  const [club, books, creatures, image] = await Promise.all([
    fetchClubCurrent().catch(() => null),
    fetchBooks().catch(() => []),
    fetchCreatures().catch(() => []),
    fetchNewestImage().catch(() => null),
  ]);
  const sol = (creatures ?? []).find((c) => c.name.toLowerCase() === "sol");
  const solDetail = sol ? await fetchCreature(sol.id).catch(() => null) : null;

  const hints = {
    "/club": clubHint(club ?? null),
    "/creatures": solHint(solDetail, now),
    "/library": readingHint(currentBook(books ?? [])),
    "/gallery": galleryHint(image ?? null, now),
  };

  return (
    <>
      <h1 className="h-page-title">Together</h1>
      <DoorList doors={togetherDoors(HUBS.together, hints)} />
    </>
  );
}
