// Write queue: optimistic UI writes with an undo grace window and guaranteed delivery.
// Pure module: no React, no window access; everything is injected via QueueDeps.

export type QueuedWrite = { key: string; url: string; method: "POST" | "PATCH" | "DELETE"; body?: unknown };
export type WriteResult = { ok: boolean; status: number; json: unknown };
export type QueueDeps = {
  fetch: typeof fetch;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null; // null when unavailable
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (h: unknown) => void;
};
export type Pending = { undo(): void; done: Promise<WriteResult | "undone"> };

export const STORAGE_KEY = "hearth:write-queue:v1";

type Entry = {
  write: QueuedWrite;
  handle: unknown;
  state: "waiting" | "sent";
  seq: number;
  resolve: (r: WriteResult | "undone") => void;
};

export function createWriteQueue(deps: QueueDeps, graceMs = 5000) {
  // Called unbound: native fetch/setTimeout throw "Illegal invocation" when `this` is deps.
  const { fetch: doFetch, setTimeout: doSetTimeout, clearTimeout: doClearTimeout } = deps;
  let seqCounter = 0;
  const latestSeq = new Map<string, number>(); // newest write intent per key; older sends never record failures
  const waiting = new Map<string, Entry>(); // keyed: a newer submit replaces an older waiting write
  const inflight = new Set<Entry>();
  const failedWrites = new Map<string, QueuedWrite>();

  function persist(): void {
    const { storage } = deps;
    if (!storage) return;
    try {
      // One stored write per key, newest intent wins.
      const byKey = new Map<string, QueuedWrite>();
      for (const w of failedWrites.values()) byKey.set(w.key, w);
      const live = [...inflight, ...waiting.values()].sort((a, b) => a.seq - b.seq);
      for (const e of live) byKey.set(e.write.key, e.write);
      const all = [...byKey.values()];
      if (all.length === 0) storage.removeItem(STORAGE_KEY);
      else storage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // storage unavailable or full: behave like null storage
    }
  }

  async function send(entry: Entry, keepalive: boolean): Promise<void> {
    if (entry.state === "sent") return;
    entry.state = "sent";
    doClearTimeout(entry.handle);
    if (waiting.get(entry.write.key) === entry) waiting.delete(entry.write.key);
    inflight.add(entry);
    const { write } = entry;
    let result: WriteResult;
    try {
      const init: RequestInit = { method: write.method };
      if (write.body !== undefined) {
        init.headers = { "Content-Type": "application/json" };
        init.body = JSON.stringify(write.body);
      }
      if (keepalive) init.keepalive = true;
      const res = await doFetch(write.url, init);
      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      result = { ok: res.ok, status: res.status, json };
    } catch {
      result = { ok: false, status: 0, json: null };
    }
    inflight.delete(entry);
    if (latestSeq.get(write.key) === entry.seq) {
      if (result.ok) failedWrites.delete(write.key);
      else failedWrites.set(write.key, write);
    }
    persist();
    entry.resolve(result);
  }

  function enqueue(write: QueuedWrite, immediate: boolean): Pending {
    const prev = waiting.get(write.key);
    if (prev) {
      doClearTimeout(prev.handle);
      waiting.delete(write.key);
      prev.state = "sent";
      prev.resolve("undone");
    }
    failedWrites.delete(write.key); // superseded by the newer intent
    let resolve!: Entry["resolve"];
    const done = new Promise<WriteResult | "undone">((r) => { resolve = r; });
    const seq = ++seqCounter;
    latestSeq.set(write.key, seq);
    const entry: Entry = { write, handle: null, state: "waiting", seq, resolve };
    if (immediate) {
      void send(entry, false);
    } else {
      waiting.set(write.key, entry);
      entry.handle = doSetTimeout(() => { void send(entry, false); }, graceMs);
      persist();
    }
    return {
      done,
      undo() {
        if (entry.state !== "waiting") return;
        entry.state = "sent"; // settled; blocks any later send
        doClearTimeout(entry.handle);
        if (waiting.get(write.key) === entry) waiting.delete(write.key);
        // Undoing the newest intent hands "latest" back to an older in-flight send, if any.
        if (latestSeq.get(write.key) === seq) {
          const older = [...inflight].filter((e) => e.write.key === write.key).map((e) => e.seq);
          if (older.length) latestSeq.set(write.key, Math.max(...older));
        }
        persist();
        resolve("undone");
      },
    };
  }

  return {
    submit(w: QueuedWrite): Pending {
      return enqueue(w, false);
    },
    flush(): void {
      for (const entry of [...waiting.values()]) void send(entry, true);
    },
    async restore(): Promise<void> {
      const { storage } = deps;
      if (!storage) return;
      let stored: QueuedWrite[] = [];
      try {
        const raw = storage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          stored = parsed.filter(
            (w) =>
              w &&
              typeof w.key === "string" &&
              typeof w.url === "string" &&
              w.url.startsWith("/") &&
              (w.method === "POST" || w.method === "PATCH" || w.method === "DELETE"),
          );
        }
      } catch {
        return;
      }
      const live = new Set([...waiting.keys(), ...[...inflight].map((e) => e.write.key)]);
      const lastByKey = new Map<string, QueuedWrite>();
      for (const w of stored) lastByKey.set(w.key, w); // duplicate keys: keep the last
      const sends = [...lastByKey.values()].filter((w) => !live.has(w.key)).map((w) => enqueue(w, true).done);
      await Promise.all(sends);
    },
    failed(): QueuedWrite[] {
      return [...failedWrites.values()];
    },
  };
}
