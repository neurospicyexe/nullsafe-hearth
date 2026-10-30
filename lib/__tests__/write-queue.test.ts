import { describe, it, expect, vi } from "vitest";
import { createWriteQueue, STORAGE_KEY, type QueueDeps, type QueuedWrite } from "../write-queue";

function harness(opts: { storage?: "null" | "throws" | Record<string, string>; status?: number; reject?: boolean } = {}) {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const store: Record<string, string> = typeof opts.storage === "object" ? opts.storage : {};
  const fetchMock = vi.fn(async (_url: unknown, _init?: unknown) => {
    if (opts.reject) throw new Error("offline");
    const status = opts.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => ({ ok: true }) } as unknown as Response;
  });
  const storage =
    opts.storage === "null"
      ? null
      : opts.storage === "throws"
        ? ({
            getItem: () => { throw new Error("denied"); },
            setItem: () => { throw new Error("denied"); },
            removeItem: () => { throw new Error("denied"); },
          } as unknown as QueueDeps["storage"])
        : {
            getItem: (k: string) => (k in store ? store[k] : null),
            setItem: (k: string, v: string) => { store[k] = v; },
            removeItem: (k: string) => { delete store[k]; },
          };
  const deps: QueueDeps = {
    fetch: fetchMock as unknown as typeof fetch,
    storage,
    setTimeout: (fn, ms) => { const id = nextId++; timers.set(id, { at: now + ms, fn }); return id; },
    clearTimeout: (h) => { timers.delete(h as number); },
  };
  const advance = async (ms: number) => {
    now += ms;
    for (const [id, t] of [...timers]) {
      if (t.at <= now) { timers.delete(id); t.fn(); }
    }
    await Promise.resolve();
  };
  return { deps, fetchMock, store, advance, queue: createWriteQueue(deps) };
}

const spoons = (n: number): QueuedWrite => ({ key: "spoons", url: "/api/spoons", method: "POST", body: { spoons: n } });

describe("write-queue", () => {
  it("sends after grace", async () => {
    const h = harness();
    const p = h.queue.submit(spoons(4));
    await h.advance(4999);
    expect(h.fetchMock).not.toHaveBeenCalled();
    await h.advance(1);
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    const r = await p.done;
    expect(r).toMatchObject({ ok: true, status: 200 });
    expect(h.store[STORAGE_KEY]).toBeUndefined();
  });

  it("undo inside window sends nothing", async () => {
    const h = harness();
    const p = h.queue.submit(spoons(4));
    expect(JSON.parse(h.store[STORAGE_KEY])).toHaveLength(1);
    await h.advance(2000);
    p.undo();
    await h.advance(10000);
    expect(h.fetchMock).not.toHaveBeenCalled();
    expect(await p.done).toBe("undone");
    expect(h.store[STORAGE_KEY]).toBeUndefined();
  });

  it("replaces pending write with same key", async () => {
    const h = harness();
    const a = h.queue.submit(spoons(4));
    const b = h.queue.submit(spoons(7));
    expect(await a.done).toBe("undone");
    await h.advance(5000);
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse((h.fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ spoons: 7 });
    expect(await b.done).toMatchObject({ ok: true });
  });

  it("flushes on hide with keepalive and does not double-send", async () => {
    const h = harness();
    const p = h.queue.submit(spoons(4));
    await h.advance(1000);
    h.queue.flush();
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    expect((h.fetchMock.mock.calls[0][1] as RequestInit).keepalive).toBe(true);
    await h.advance(10000);
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    expect(await p.done).toMatchObject({ ok: true });
  });

  it("undo after send is a no-op", async () => {
    const h = harness();
    const p = h.queue.submit(spoons(4));
    await h.advance(5000);
    p.undo();
    expect(await p.done).toMatchObject({ ok: true });
  });

  it("restores unsent writes; a 502 stays failed and stored", async () => {
    const w = spoons(5);
    const h = harness({ storage: { [STORAGE_KEY]: JSON.stringify([w]) }, status: 502 });
    await h.queue.restore();
    expect(h.fetchMock).toHaveBeenCalledTimes(1);
    expect(h.queue.failed()).toEqual([w]);
    expect(JSON.parse(h.store[STORAGE_KEY])).toEqual([w]);
  });

  it("restore clears storage on success", async () => {
    const h = harness({ storage: { [STORAGE_KEY]: JSON.stringify([spoons(5)]) } });
    await h.queue.restore();
    expect(h.queue.failed()).toEqual([]);
    expect(h.store[STORAGE_KEY]).toBeUndefined();
  });

  it("network error resolves status 0 and keeps the write for retry", async () => {
    const h = harness({ reject: true });
    const p = h.queue.submit(spoons(4));
    await h.advance(5000);
    expect(await p.done).toEqual({ ok: false, status: 0, json: null });
    expect(h.queue.failed()).toHaveLength(1);
    expect(h.store[STORAGE_KEY]).toBeDefined();
  });

  it("storage null still works", async () => {
    const h = harness({ storage: "null" });
    const p = h.queue.submit(spoons(4));
    await h.advance(5000);
    expect(await p.done).toMatchObject({ ok: true });
    await expect(h.queue.restore()).resolves.toBeUndefined();
  });

  it("throwing storage behaves like null", async () => {
    const h = harness({ storage: "throws" });
    const p = h.queue.submit(spoons(4));
    await h.advance(5000);
    expect(await p.done).toMatchObject({ ok: true });
    await expect(h.queue.restore()).resolves.toBeUndefined();
  });
});
