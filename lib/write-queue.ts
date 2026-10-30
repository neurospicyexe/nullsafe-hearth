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
  resolve: (r: WriteResult | "undone") => void;
};

export function createWriteQueue(deps: QueueDeps, graceMs = 5000) {
  const waiting = new Map<string, Entry>(); // keyed: a newer submit replaces an older waiting write
  const inflight = new Set<Entry>();
  const failedWrites = new Map<string, QueuedWrite>();

  function persist(): void {
    const { storage } = deps;
    if (!storage) return;
    try {
      const all = [
        ...failedWrites.values(),
        ...[...inflight].map((e) => e.write),
        ...[...waiting.values()].map((e) => e.write),
      ];
      if (all.length === 0) storage.removeItem(STORAGE_KEY);
      else storage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // storage unavailable or full: behave like null storage
    }
  }

  async function send(entry: Entry, keepalive: boolean): Promise<void> {
    if (entry.state === "sent") return;
    entry.state = "sent";
    deps.clearTimeout(entry.handle);
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
      const res = await deps.fetch(write.url, init);
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
    if (result.ok) failedWrites.delete(write.key);
    else failedWrites.set(write.key, write);
    persist();
    entry.resolve(result);
  }

  function enqueue(write: QueuedWrite, immediate: boolean): Pending {
    const prev = waiting.get(write.key);
    if (prev) {
      deps.clearTimeout(prev.handle);
      waiting.delete(write.key);
      prev.resolve("undone");
    }
    failedWrites.delete(write.key); // superseded by the newer intent
    let resolve!: Entry["resolve"];
    const done = new Promise<WriteResult | "undone">((r) => { resolve = r; });
    const entry: Entry = { write, handle: null, state: "waiting", resolve };
    if (immediate) {
      void send(entry, false);
    } else {
      waiting.set(write.key, entry);
      entry.handle = deps.setTimeout(() => { void send(entry, false); }, graceMs);
      persist();
    }
    return {
      done,
      undo() {
        if (entry.state !== "waiting") return;
        entry.state = "sent"; // settled; blocks any later send
        deps.clearTimeout(entry.handle);
        if (waiting.get(write.key) === entry) waiting.delete(write.key);
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
        if (Array.isArray(parsed)) stored = parsed.filter((w) => w && typeof w.key === "string" && typeof w.url === "string");
      } catch {
        return;
      }
      const live = new Set([...waiting.keys(), ...[...inflight].map((e) => e.write.key)]);
      const sends = stored.filter((w) => !live.has(w.key)).map((w) => enqueue(w, true).done);
      await Promise.all(sends);
    },
    failed(): QueuedWrite[] {
      return [...failedWrites.values()];
    },
  };
}
