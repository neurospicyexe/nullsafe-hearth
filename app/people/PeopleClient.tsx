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
const splitNames = (raw: string) => raw.split(",").map((x) => x.trim()).filter(Boolean);

export default function PeopleClient({ initial }: { initial: GraphPerson[] }) {
  const [people, setPeople] = useState(initial);
  const [label, setLabel] = useState("");
  const [spellings, setSpellings] = useState("");
  const [kind, setKind] = useState<Exclude<PersonKind, "centre">>("self");
  const [note, setNote] = useState("");
  // Halseth mig 0160: the work(s) this name also belongs to. Set = only the other spellings link.
  const [shares, setShares] = useState("");
  // One row open for editing at a time (spellings + the shared-name flag).
  const [editing, setEditing] = useState<string | null>(null);
  const [editSpellings, setEditSpellings] = useState("");
  const [editShares, setEditShares] = useState("");
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
    const match_names = splitNames(spellings);
    try {
      const { ok, out } = await post({ action: "add", label: label.trim(), match_names, kind, note: note.trim() || null, shares_name_with: shares.trim() || null });
      if (!ok) { setMsg(out?.error ?? "Couldn't add."); return; }
      setPeople((p) => [...p, { ...out.person, mentions: 0 }]);
      setLabel(""); setSpellings(""); setNote(""); setShares("");
      setMsg(out.person.shares_name_with
        ? `Added ${out.person.label}. Only ${out.person.match_names.join(", ")} will link, never the bare name. Links appear after the next rebuild.`
        : kind === "self"
        ? `${out.person.label} now counts as you. Lines that name them link to you after the next rebuild.`
        : `Added ${out.person.label}. Links appear after the next rebuild.`);
    } catch {
      setMsg("Couldn't reach Halseth.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: GraphPerson) {
    setEditing(p.id);
    setEditSpellings(p.match_names.join(", "));
    setEditShares(p.shares_name_with ?? "");
    setMsg(null);
  }

  async function saveEdit(e: React.FormEvent, p: GraphPerson) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const { ok, out } = await post({ action: "update", id: p.id, match_names: splitNames(editSpellings), shares_name_with: editShares.trim() || null });
      if (!ok) { setMsg(out?.error ?? "Couldn't save."); return; }
      setPeople((all) => all.map((x) => (x.id === p.id ? { ...x, ...out.person, mentions: x.mentions } : x)));
      setEditing(null);
      setMsg(`Saved ${p.label}. Links change at the next rebuild.`);
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
      {(p.match_names.length > 0 || p.note || p.shares_name_with) && (
        <div className="people-sub">
          {p.shares_name_with
            ? <span>also a character in {p.shares_name_with}, so only {p.match_names.join(", ")} link{p.match_names.length === 1 ? "s" : ""}</span>
            : p.match_names.length > 0 && <span>also: {p.match_names.join(", ")}</span>}
          {p.note && <span>{p.note}</span>}
        </div>
      )}
      <div className="people-actions">
        <button type="button" className="people-remove" onClick={() => (editing === p.id ? setEditing(null) : startEdit(p))} disabled={busy} aria-label={`Edit ${p.label}`}>
          {editing === p.id ? "Cancel" : "Edit"}
        </button>
        <button type="button" className="people-remove" onClick={() => remove(p)} disabled={busy} aria-label={`Remove ${p.label}`}>
          Remove
        </button>
      </div>
      {editing === p.id && (
        <form className="people-form people-edit" onSubmit={(e) => saveEdit(e, p)}>
          <label>
            <span>Other spellings (comma separated)</span>
            <input value={editSpellings} onChange={(e) => setEditSpellings(e.target.value)} placeholder={`Blue's ${p.label}`} />
          </label>
          <label>
            <span>Also a character in (empty if not)</span>
            <input value={editShares} onChange={(e) => setEditShares(e.target.value)} placeholder="Pirates of the Caribbean" />
          </label>
          <button type="submit" disabled={busy}>Save</button>
        </form>
      )}
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
          <span>Also a character in (optional)</span>
          <input value={shares} onChange={(e) => setShares(e.target.value)} placeholder="Pirates of the Caribbean" />
        </label>
        <label>
          <span>Note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Who they are to you" />
        </label>
        <button type="submit" disabled={busy || label.trim().length < 3}>Add</button>
      </form>
      {shares.trim() && (
        <p className="people-hint">
          {label.trim() || "This name"} is also a character, so the bare name won&rsquo;t link (it would catch every line about {shares.trim()}).
          Put a spelling only the person has under other spellings, like &ldquo;Blue&rsquo;s {label.trim() || "Barbossa"}&rdquo; or &ldquo;{label.trim() || "Barbossa"} (Blue)&rdquo;.
        </p>
      )}
      {msg && <p className="people-msg" role="status">{msg}</p>}

      <h2 className="people-heading">Names that are you</h2>
      <p className="people-hint">A line that names one of these links to you, with that name kept as who was fronting. Never a separate person.</p>
      {selves.length === 0 ? <p className="h-empty">None yet.</p> : <ul className="people-list">{selves.map(row)}</ul>}

      <h2 className="people-heading">People and pets</h2>
      {others.length === 0 ? <p className="h-empty">Nobody yet.</p> : <ul className="people-list">{others.map(row)}</ul>}
    </section>
  );
}
