import { redirect } from "next/navigation";

// The prehension constellation (take 5) was replaced by the memory map; Nav moved to /map and this
// page sat unlinked (BUGS H-4, 2026-10-29). Kept as a redirect so old bookmarks and the home-screen
// history still land somewhere real.
export default function GraphPage() {
  redirect("/map");
}
