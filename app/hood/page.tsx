import DoorList from "@/components/kit/DoorList";
import { HOOD_SECTIONS } from "@/lib/shell";

export const metadata = { title: "Under the hood | Hearth" };

export default function Page() {
  return (
    <>
      <h1 className="h-page-title">Under the hood</h1>
      {HOOD_SECTIONS.map((s) => (
        <section key={s.title} className="h-section">
          <h2 className="h-section-title">{s.title}</h2>
          <DoorList doors={s.doors} />
        </section>
      ))}
    </>
  );
}
