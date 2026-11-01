import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const m = vi.hoisted(() => ({ fetchInbox: vi.fn(), fetchLettersOut: vi.fn(), fetchNotes: vi.fn() }));
vi.mock("@/lib/halseth", () => m);
vi.mock("../client", () => ({ LetterFormClient: () => null }));

import Page from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  m.fetchInbox.mockResolvedValue({ items: [], unread_count: 0 });
  m.fetchLettersOut.mockResolvedValue([
    { id: "n1", created_at: "2026-10-31 10:00:00", author: "raziel", content: "hello you", note_type: "letter:gaia" },
  ]);
});

describe("companion letters page", () => {
  it("reads the filtered outgoing notes and no hex amber", async () => {
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ id: "gaia" }) }));
    expect(m.fetchLettersOut).toHaveBeenCalledWith(100, "gaia");
    expect(m.fetchNotes).not.toHaveBeenCalled();
    expect(html).toContain("hello you");
    expect(html).not.toContain("#f59e0b");
  });
});
