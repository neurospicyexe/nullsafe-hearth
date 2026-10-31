// VoteButton under one real write queue (the provider is mocked to hand every button the same
// queue, as one WriteQueueProvider does). There is no DOM in this suite, so a tiny hook harness
// stands in for React: it keeps each button's state between calls, re-renders on setState, and
// lets the test press a button by its text. Effects are not run; the grace watcher is a nicety.
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { createWriteQueue } from "@/lib/write-queue";

type Inst = { slots: unknown[]; props: Props; out: ReactElement | null; rendering: boolean; dirty: boolean };
type Props = { roundId: string; recommendationId: string; voted: boolean };

let cur: Inst | null = null;
let idx = 0;

vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  return {
    ...real,
    useState: (init: unknown) => {
      const inst = cur!;
      const i = idx++;
      if (!(i in inst.slots)) inst.slots[i] = typeof init === "function" ? (init as () => unknown)() : init;
      const set = (v: unknown) => {
        const next = typeof v === "function" ? (v as (p: unknown) => unknown)(inst.slots[i]) : v;
        if (Object.is(next, inst.slots[i])) return;
        inst.slots[i] = next;
        render(inst);
      };
      return [inst.slots[i], set];
    },
    useRef: (init: unknown) => {
      const inst = cur!;
      const i = idx++;
      if (!(i in inst.slots)) inst.slots[i] = { current: init };
      return inst.slots[i];
    },
    useEffect: () => {},
  };
});

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

type Sent = { url: string; init: RequestInit };
let sent: Sent[] = [];
let timers: (() => void)[] = [];
let respondStatus = 200;
let queue: ReturnType<typeof createWriteQueue>;
vi.mock("@/components/shell/WriteQueueProvider", () => ({ useWriteQueue: () => queue }));

import VoteButton from "./VoteButton";

function render(inst: Inst): void {
  if (inst.rendering) {
    inst.dirty = true; // setState during render: render again once this pass ends
    return;
  }
  inst.rendering = true;
  try {
    do {
      inst.dirty = false;
      const prev = cur;
      cur = inst;
      idx = 0;
      inst.out = VoteButton(inst.props) as ReactElement;
      cur = prev;
    } while (inst.dirty);
  } finally {
    inst.rendering = false;
  }
}

function mount(props: Props): Inst {
  const inst: Inst = { slots: [], props, out: null, rendering: false, dirty: false };
  render(inst);
  return inst;
}

function walk(node: ReactNode, visit: (el: ReactElement<Record<string, unknown>>) => void): void {
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit));
  if (typeof node === "object" && "props" in node) {
    const el = node as ReactElement<Record<string, unknown>>;
    visit(el);
    walk(el.props.children as ReactNode, visit);
  }
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
}

const text = (inst: Inst) => textOf(inst.out);
const buttons = (inst: Inst) => {
  const out: string[] = [];
  walk(inst.out, (el) => { if (el.type === "button") out.push(textOf(el.props.children as ReactNode)); });
  return out;
};
function press(inst: Inst, label: string): void {
  let hit: (() => void) | null = null;
  walk(inst.out, (el) => {
    if (el.type === "button" && textOf(el.props.children as ReactNode) === label) hit = el.props.onClick as () => void;
  });
  if (!hit) throw new Error(`no "${label}" button in: ${text(inst)}`);
  (hit as () => void)();
}
const settle = () => new Promise((r) => setTimeout(r, 0));
async function endGrace(): Promise<void> {
  const due = timers;
  timers = [];
  due.forEach((fn) => fn());
  await settle();
  await settle();
}

beforeEach(() => {
  sent = [];
  timers = [];
  respondStatus = 200;
  refresh.mockClear();
  queue = createWriteQueue({
    fetch: (async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      const body = respondStatus === 200 ? { ok: true } : { error: "no round is accepting votes" };
      return { ok: respondStatus < 400, status: respondStatus, redirected: false, json: async () => body } as Response;
    }) as typeof fetch,
    storage: null,
    setTimeout: (fn) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
  });
});

describe("VoteButton", () => {
  it("voted: says Your vote and offers Remove vote", () => {
    const b = mount({ roundId: "r1", recommendationId: "a", voted: true });
    expect(text(b)).toContain("Your vote");
    expect(buttons(b)).toEqual(["Remove vote"]);
  });

  it("not voted: offers Vote for this", () => {
    const b = mount({ roundId: "r1", recommendationId: "a", voted: false });
    expect(buttons(b)).toEqual(["Vote for this"]);
    expect(text(b)).not.toContain("Your vote");
  });

  it("a tap confirms at once with undo, then sends and refreshes", async () => {
    const b = mount({ roundId: "r1", recommendationId: "a", voted: false });
    press(b, "Vote for this");
    expect(text(b)).toContain("Voted");
    expect(buttons(b)).toEqual(["undo"]);
    expect(sent).toHaveLength(0);
    await endGrace();
    expect(sent).toHaveLength(1);
    expect(sent[0].init.method).toBe("POST");
    expect(JSON.parse(String(sent[0].init.body))).toEqual({ recommendation_id: "a" });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(text(b)).toContain("Your vote");
    expect(buttons(b)).toEqual(["Remove vote"]);
  });

  it("undo restores the prior look and sends nothing", async () => {
    const b = mount({ roundId: "r1", recommendationId: "a", voted: true });
    press(b, "Remove vote");
    expect(text(b)).toContain("Vote removed");
    press(b, "undo");
    await settle();
    expect(text(b)).toContain("Your vote");
    expect(buttons(b)).toEqual(["Remove vote"]);
    await endGrace();
    expect(sent).toHaveLength(0);
  });

  it("Remove vote sends DELETE with an empty body", async () => {
    const b = mount({ roundId: "r1", recommendationId: "a", voted: true });
    press(b, "Remove vote");
    await endGrace();
    expect(sent).toHaveLength(1);
    expect(sent[0].init.method).toBe("DELETE");
    expect(JSON.parse(String(sent[0].init.body))).toEqual({});
    expect(text(b)).toContain("Vote for this");
  });

  it("changing the pick inside the grace window reverts A and sends only B", async () => {
    const a = mount({ roundId: "r1", recommendationId: "a", voted: false });
    const b = mount({ roundId: "r1", recommendationId: "b", voted: false });
    press(a, "Vote for this");
    press(b, "Vote for this");
    await settle();
    expect(buttons(a)).toEqual(["Vote for this"]);
    expect(text(b)).toContain("Voted");
    await endGrace();
    expect(sent).toHaveLength(1);
    expect(JSON.parse(String(sent[0].init.body))).toEqual({ recommendation_id: "b" });
  });

  it("a dropped 409 says voting has closed and offers no control", async () => {
    respondStatus = 409;
    const b = mount({ roundId: "r1", recommendationId: "a", voted: false });
    press(b, "Vote for this");
    await endGrace();
    expect(text(b)).toContain("Voting has closed.");
    expect(buttons(b)).toEqual([]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("any other failure says it didn't save and keeps the control", async () => {
    respondStatus = 503;
    const b = mount({ roundId: "r1", recommendationId: "a", voted: false });
    press(b, "Vote for this");
    await endGrace();
    expect(text(b)).toContain("Didn't save.");
    expect(buttons(b)).toEqual(["Vote for this"]);
  });

  it("fresh page data replaces the local look", async () => {
    const b = mount({ roundId: "r1", recommendationId: "a", voted: true });
    press(b, "Remove vote");
    await endGrace();
    expect(text(b)).toContain("Vote for this");
    b.props = { ...b.props, voted: false };
    render(b);
    expect(buttons(b)).toEqual(["Vote for this"]);
    b.props = { ...b.props, voted: true }; // someone cast it elsewhere
    render(b);
    expect(buttons(b)).toEqual(["Remove vote"]);
  });
});
