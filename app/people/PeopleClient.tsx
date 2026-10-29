"use client";

import Link from "next/link";
import { useState } from "react";
import type { GraphPerson, PersonKind } from "@/lib/halseth";

const KINDS: { id: PersonKind; label: string }[] = [
  { id: "headmate", label: "Headmate" },
  { id: "person", label: "Person" },
  { id: "pet", label: "Pet" },
  { id: "other", label: "Other" },
];

export default function PeopleClient({ initial }: { initial: GraphPerson[] }) {
  const [people, setPeople] = useState(initial);
  const [label, setLabel] = useState("");
  const [spellings, setSpellings] = useState("");
  const [kind, setKind] = useState<PersonKind>("person");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function post(body: unknown) {
    const res = await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, out: await res.json().catch(() => ({})) };
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !label.trim()) return;
    setBusy(true);
    setMsg(null);
    const match_names = spellings.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const { ok, out } = await post({ action: "add", label: label.trim(), match_names, kind, note: note.trim() || null });
      if (!ok) { setMsg(out?.error ?? "Couldn't add."); return; }
      setPeople((p) => [...p, { ...out.person, mentions: 0 }].sort((a, b) => a.label.localeCompare(b.label)));
      setLabel(""); setSpellings(""); setNote(""); setKind("person");
      setMsg(`Added ${out.person.label}. Links appear after the next rebuild.`);
    } catch {
      setMsg("Couldn't reach Halseth.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: GraphPerson) {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const { ok } = await post({ action: "archive", id: p.id });
      if (ok) {
        setPeople((all) => all.filter((x) => x.id !== p.id));
        setMsg(`Removed ${p.label}. Their links drop at the next rebuild.`);
      } else setMsg("Couldn't remove.");
    } catch {
      setMsg("Couldn't reach Halseth.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="people">
      <form className="people-form" onSubmit={add}>
        <label>
          <span>Name</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Blue" required minLength={3} />
        </label>
        <label>
          <span>Other spellings (comma separated)</span>
          <input value={spellings} onChange={(e) => setSpellings(e.target.value)} placeholder="Magpie M., Mags" />
        </label>
        <label>
          <span>Who</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as PersonKind)}>
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </label>
        <label>
          <span>Note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Who they are to you" />
        </label>
        <button type="submit" disabled={busy || label.trim().length < 3}>Add</button>
      </form>
      {msg && <p className="people-msg" role="status">{msg}</p>}

      {people.length === 0 ? (
        <p className="people-empty">Nobody yet. Add someone and the map starts linking to them.</p>
      ) : (
        <ul className="people-list">
          {people.map((p) => (
            <li key={p.id} className="people-row">
              <div className="people-main">
                <Link href={`/map?center=graph_people:${p.id}`} className="people-name">{p.label}</Link>
                <span className="people-kind">{p.kind}</span>
                <span className="people-count">{p.mentions} {p.mentions === 1 ? "link" : "links"}</span>
              </div>
              {(p.match_names.length > 0 || p.note) && (
                <div className="people-sub">
                  {p.match_names.length > 0 && <span>also: {p.match_names.join(", ")}</span>}
                  {p.note && <span>{p.note}</span>}
                </div>
              )}
              <button type="button" className="people-remove" onClick={() => remove(p)} disabled={busy} aria-label={`Remove ${p.label}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
