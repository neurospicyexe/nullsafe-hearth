export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { fetchToolImages } from "@/lib/halseth";
import { ageLabel } from "@/lib/home-model";
import { COMPANION_NAME, imagePrompt, parseCompanionId } from "@/lib/companion-page";

// Images this companion generated, through the same proxy and prompt cleanup as /gallery.
export default async function CompanionMadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseCompanionId(rawId);
  if (!id) notFound();

  const images = await fetchToolImages(id, 40);
  const now = new Date();

  return (
    <div className="h-companion">
      <h1 className="h-companion-title">What {COMPANION_NAME[id]} made</h1>
      {images.length === 0 ? (
        <p className="h-companion-quiet">Nothing made yet.</p>
      ) : (
        <ul className="h-made-grid">
          {images.map((call) => {
            const prompt = imagePrompt(call.args_summary);
            const age = ageLabel(call.created_at, now);
            return (
              <li key={call.id}>
                <figure className="h-made-item">
                  {/* eslint-disable-next-line @next/next/no-img-element -- R2-served generated art, no Next loader */}
                  <img src={`/api/mind/tools/image/${call.id}`} alt={prompt} loading="lazy" className="h-made-img" />
                  <figcaption className="h-made-caption">
                    <q>{prompt}</q>
                    {age && <span className="h-companion-age"> {age}</span>}
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
