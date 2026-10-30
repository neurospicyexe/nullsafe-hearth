export const dynamic = "force-dynamic";

import Link from "next/link";
import { fetchInbox } from "@/lib/halseth";
import { agentIdentity, ageLabel } from "@/lib/home-model";

export const metadata = { title: "Letters | Hearth" };

export default async function LettersPage() {
  const inbox = await fetchInbox(100);
  const now = new Date();
  const items = inbox ? [...inbox.items].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0)) : [];

  return (
    <>
      <h1 className="h-page-title">Letters</h1>
      {inbox === null ? (
        <p className="h-home-quiet">Halseth is not answering right now.</p>
      ) : items.length === 0 ? (
        <p className="h-home-quiet">Nothing left for you yet.</p>
      ) : (
        <div className="h-letters">
          {items.map((it) => {
            const { who, colorVar } = agentIdentity(it.agent);
            const when = ageLabel(it.created_at, now);
            return (
              <Link key={it.id} href={`/letters/${it.id}`} className={`h-letter-row${it.read ? " is-read" : ""}`}>
                <span aria-hidden="true" className="h-dot h-letter-dot" style={{ background: colorVar ?? "var(--h-muted)" }} />
                <span className="h-home-item-body">
                  <span className="h-home-item-head">
                    <b style={{ color: colorVar ?? undefined }}>{who}</b>{" "}
                    <span className="h-home-item-meta">
                      {when}
                      {it.read ? " · read" : " · new"}
                    </span>
                  </span>
                  <span className="h-home-item-preview">{it.preview}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
