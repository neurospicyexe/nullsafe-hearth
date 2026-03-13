import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllDeltas,
  fetchCompanionJournal,
  fetchDreams,
  fetchHandovers,
  fetchTasks,
  type RelationalDelta,
  type CompanionJournalEntry,
  type Dream,
  type HandoverPacket,
  type Task,
} from "@/lib/halseth";

type SearchType = "all" | "feelings" | "journal" | "dreams" | "handovers" | "tasks";

type SearchResult = {
  id: string;
  type: "feeling" | "journal" | "dream" | "handover" | "task";
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
};

function matches(text: string | null | undefined, q: string): boolean {
  return typeof text === "string" && text.toLowerCase().includes(q.toLowerCase());
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });

  const rawType = searchParams.get("type") ?? "all";
  const type: SearchType = ["all", "feelings", "journal", "dreams", "handovers", "tasks"].includes(rawType)
    ? (rawType as SearchType)
    : "all";

  const want = (t: Exclude<SearchType, "all">) => type === "all" || type === t;

  try {
    const [rawFeelings, rawJournal, rawDreams, rawHandovers, rawTasks] = await Promise.all([
      want("feelings")  ? fetchAllDeltas(200)               : Promise.resolve(null),
      want("journal")   ? fetchCompanionJournal(undefined, 200) : Promise.resolve(null),
      want("dreams")    ? fetchDreams(undefined, 200)        : Promise.resolve(null),
      want("handovers") ? fetchHandovers(100)                : Promise.resolve(null),
      want("tasks")     ? fetchTasks()                       : Promise.resolve([]),
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

    const handovers: SearchResult[] = (rawHandovers ?? [])
      .filter((h: HandoverPacket) => matches(h.spine, q))
      .map((h: HandoverPacket) => ({
        id: h.id, type: "handover" as const, text: h.spine, created_at: h.created_at, url: "/handovers",
      }));

    const tasks: SearchResult[] = (rawTasks ?? [])
      .filter((t: Task) => matches(t.title, q))
      .map((t: Task) => ({
        id: t.id, type: "task" as const, text: t.title, created_at: t.due_at ?? "", url: "/tasks",
      }));

    const result: SearchResponse = { feelings, journal, dreams, handovers, tasks };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Search unavailable" }, { status: 500 });
  }
}
