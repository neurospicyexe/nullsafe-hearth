"use client";

import Link from "next/link";
import { useState } from "react";
import type { GraphPerson, PersonKind } from "@/lib/halseth";

// One centre (Halseth mig 0150). Raziel (also Crash) is a single node; a system name is Raziel
// fronting, listed as "this is me too", and its mentions link to the centre with the front kept.
// People outside the system and pets are nodes of their own.
const KINDS: { id: Exclude<PersonKind, "centre">; label: string }[] = [
  { id: "self", label: "This is me too (a system name)" },
  { id: "person", label: "Someone else" },
  { id: "pet", label: "A pet" },
  { id: "other", label: "Other" },
];

const links = (n: number) => `${n} ${n === 1 ? "link" : "links"}`;

export default function PeopleClient({ initial }: { initial: GraphPerson[] }) {
  const [people, setPeople] = useState(initial);
  const [label, setLabel] = useState("");
  const [spellings, setSpellings] = useState("");
  const [kind, setKind] = useState<Exclude<PersonKind, "centre">>("self");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const centre = people.find((p) => p.kind === "centre");
  const selves = people.filter((p) => p.kind === "self");
  const others = people.filter((p) => p.kind !== "centre" && p.kind !== "self");

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
      setPeople((p) => [...p, { ...out.person, mentions: 0 }]);
      setLabel(""); setSpellings(""); setNote("");
      setMsg(kind === "self"
        ? `${out.person.label} now counts as you. Lines that name them link to you after the next rebuild.`
        : `Added ${out.person.label}. Links appear after the next rebuild.`);
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
        setMsg(`Removed ${p.label}. Those links drop at the next rebuild.`);
      } else setMsg("Couldn't remove.");
    } catch {
      setMsg("Couldn't reach Halseth.");
    } finally {
      setBusy(false);
    }
  }

  const row = (p: GraphPerson) => (
    <li key={p.id} className="people-row">
      <div className="people-main">
        <span className="people-name">{p.label}</span>
        {p.kind !== "self" && <span className="people-kind">{p.kind}</span>}
        <span className="people-count">{links(p.mentions)}</span>
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
  );

  return (
    <section className="people">
      {centre && (
        <Link href={`/map?center=graph_people:${centre.id}`} className="people-centre">
          <span className="people-centre-name">You</span>
          <span className="people-centre-sub">
            {[centre.label, ...centre.match_names, ...selves.map((s) => s.label)].join(" · ")}
          </span>
          <span className="people-count">{links(centre.mentions)} · tap to see what each of us holds</span>
        </Link>
      )}

      <form className="people-form" onSubmit={add}>
        <label>
          <span>Name</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Magpie" required minLength={3} />
        </label>
        <label>
          <span>Other spellings (comma separated)</span>
          <input value={spellings} onChange={(e) => setSpellings(e.target.value)} placeholder="Magpie M." />
        </label>
        <label>
          <span>Who</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as Exclude<PersonKind, "centre">)}>
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

      <h2 className="people-heading">Names that are you</h2>
      <p className="people-hint">A line that names one of these links to you, with that name kept as who was fronting. Never a separate person.</p>
      {selves.length === 0 ? <p className="people-empty">None yet.</p> : <ul className="people-list">{selves.map(row)}</ul>}

      <h2 className="people-heading">People and pets</h2>
      {others.length === 0 ? <p className="people-empty">Nobody yet.</p> : <ul className="people-list">{others.map(row)}</ul>}
    </section>
  );
}
