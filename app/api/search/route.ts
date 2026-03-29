import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllDeltas,
  fetchCompanionJournal,
  fetchDreams,
  fetchHandovers,
  fetchTasks,
  fetchWounds,
  fetchAllCompanionNotes,
  fetchMindHandoffs,
  fetchInterCompanionNotes,
  type RelationalDelta,
  type CompanionJournalEntry,
  type Dream,
  type HandoverPacket,
  type Task,
  type LivingWound,
  type CompanionNote,
  type MindHandoff,
  type InterCompanionNote,
} from "@/lib/halseth";

type SearchType = "all" | "feelings" | "journal" | "dreams" | "handovers" | "tasks" | "notes" | "wounds";

type SearchResult = {
  id: string;
  type: "feeling" | "journal" | "dream" | "handover" | "task" | "note" | "wound";
  text: string;
  created_at: string;
  url: string;
  agent?: string;
};

type SearchResponse = {
  feelings: SearchResult[];
  journal: SearchResult[];
  dreams: SearchResult[];
  handovers: SearchResult[];
  tasks: SearchResult[];
  notes: SearchResult[];
  wounds: SearchResult[];
};

function matches(text: string | null | undefined, q: string): boolean {
  return typeof text === "string" && text.toLowerCase().includes(q.toLowerCase());
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });
  if (q.length > 100) return NextResponse.json({ error: "q too long" }, { status: 400 });

  const rawType = searchParams.get("type") ?? "all";
  const type: SearchType = ["all", "feelings", "journal", "dreams", "handovers", "tasks", "notes", "wounds"].includes(rawType)
    ? (rawType as SearchType)
    : "all";

  const want = (t: Exclude<SearchType, "all">) => type === "all" || type === t;

  try {
    const [rawFeelings, rawJournal, rawDreams, rawHandovers, rawMindHandoffs, rawTasks, rawWounds, rawNotes, rawInterNotes] = await Promise.all([
      want("feelings")  ? fetchAllDeltas(50)               : Promise.resolve(null),
      want("journal")   ? fetchCompanionJournal(undefined, 50) : Promise.resolve(null),
      want("dreams")    ? fetchDreams(undefined, 50)        : Promise.resolve(null),
      want("handovers") ? fetchHandovers(50)                : Promise.resolve(null),
      want("handovers") ? fetchMindHandoffs(50)             : Promise.resolve(null),
      want("tasks")     ? fetchTasks()                      : Promise.resolve([]),
      want("wounds")    ? fetchWounds()                     : Promise.resolve(null),
      want("notes")     ? fetchAllCompanionNotes(50)        : Promise.resolve(null),
      want("notes")     ? fetchInterCompanionNotes(50)      : Promise.resolve(null),
    ]);

    const feelings: SearchResult[] = (rawFeelings ?? [])
      .filter((d: RelationalDelta) => matches(d.delta_text, q))
      .map((d: RelationalDelta) => ({
        id: d.id, type: "feeling" as const, text: d.delta_text ?? "", created_at: d.created_at, url: "/feelings",
      }));

    const journal: SearchResult[] = (rawJournal ?? [])
      .filter((e: CompanionJournalEntry) => matches(e.note_text, q))
      .map((e: CompanionJournalEntry) => ({
        id: e.id, type: "journal" as const, text: e.note_text, created_at: e.created_at,
        url: `/companions/${e.agent}`, agent: e.agent,
      }));

    const dreams: SearchResult[] = (rawDreams ?? [])
      .filter((d: Dream) => matches(d.content, q))
      .map((d: Dream) => ({
        id: d.id, type: "dream" as const, text: d.content, created_at: d.generated_at, url: "/dreams",
      }));

    const handovers: SearchResult[] = [
      ...(rawHandovers ?? [])
        .filter((h: HandoverPacket) => matches(h.spine, q) || matches(h.last_real_thing, q))
        .map((h: HandoverPacket) => ({
          id: h.id, type: "handover" as const, text: h.spine, created_at: h.created_at, url: "/handovers",
        })),
      ...(rawMindHandoffs ?? [])
        .filter((h: MindHandoff) => matches(h.title, q) || matches(h.summary, q) || matches(h.next_steps, q))
        .map((h: MindHandoff) => ({
          id: h.id, type: "handover" as const,
          text: [h.title, h.summary].filter(Boolean).join(" — "),
          created_at: h.created_at, url: "/handovers", agent: h.agent_id,
        })),
    ];

    const tasks: SearchResult[] = (rawTasks ?? [])
      .filter((t: Task) => matches(t.title, q))
      .map((t: Task) => ({
        id: t.id, type: "task" as const, text: t.title, created_at: t.due_at ?? "", url: "/tasks",
      }));
      
    const wounds: SearchResult[] = (rawWounds ?? [])
      .filter((w: LivingWound) => matches(w.name, q) || matches(w.description, q))
      .map((w: LivingWound) => ({
        id: w.id, type: "wound" as const, text: w.name ?? "", created_at: w.created_at, url: "/us",
      }));
      
    const notes: SearchResult[] = [
      ...(rawNotes ?? [])
        .filter((n: CompanionNote) => matches(n.note_text, q))
        .map((n: CompanionNote) => ({
          id: n.id, type: "note" as const, text: n.note_text, created_at: n.created_at, url: `/companions/${n.agent}`, agent: n.agent,
        })),
      ...(rawInterNotes ?? [])
        .filter((n: InterCompanionNote) => matches(n.note_text, q))
        .map((n: InterCompanionNote) => ({
          id: n.id, type: "note" as const, text: n.note_text, created_at: n.created_at,
          url: "/us", agent: n.from_id,
        })),
    ];

    const result: SearchResponse = { feelings, journal, dreams, handovers, tasks, wounds, notes };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Search unavailable" }, { status: 500 });
  }
}
