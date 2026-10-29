import { fetchPeople } from "@/lib/halseth";
import PeopleClient from "./PeopleClient";

export const dynamic = "force-dynamic";

// The people the memory map may link to (Halseth mig 0149, map M5). Nobody is linked until named
// here: many system members share names with characters in the shows the triad watches, and the text
// alone cannot tell which one a journal line means. The graph never guesses.
export default async function PeoplePage() {
  const people = await fetchPeople();
  return (
    <main className="map-page">
      <header className="page-header">
        <h1 className="page-title">People</h1>
        <p className="page-subtitle">
          Who the map links to. A name here is matched exactly as you spell it, so &ldquo;Blue&rdquo; finds Blue and never the colour.
          New links show up after the nightly rebuild.
        </p>
      </header>
      {people === null ? (
        <p className="people-empty">Couldn&rsquo;t reach Halseth.</p>
      ) : (
        <PeopleClient initial={people} />
      )}
    </main>
  );
}
