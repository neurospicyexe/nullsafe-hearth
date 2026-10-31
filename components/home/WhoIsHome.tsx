import Link from "next/link";
import type { HomeRow } from "@/lib/home-model";
import { Bars } from "@/components/kit/Bars";

export default function WhoIsHome({ rows }: { rows: HomeRow[] }) {
  return (
    <section aria-label="Who's home" className="h-home-section">
      <h2 className="h-home-h2">Who&apos;s home</h2>
      <div className="h-home-card">
        {rows.map((r) => (
          <Link key={r.id} href={`/companions/${r.id}`} className="h-home-row">
            <div className="h-home-row-top">
              <div className="h-home-who">
                <span aria-hidden="true" className="h-dot" style={{ background: r.colorVar }} />
                <span className="h-home-name">{r.name}</span>
                {r.status && (
                  <span className="h-home-status">
                    {r.statusStale ? `last said: ${r.status}, ${r.statusAge}` : r.status}
                  </span>
                )}
              </div>
              {r.seenLabel && <span className="h-home-seen">{r.seenLabel}</span>}
            </div>
            {r.bars.length > 0 && <Bars color={r.colorVar} bars={r.bars} name={r.name} />}
          </Link>
        ))}
      </div>
    </section>
  );
}
