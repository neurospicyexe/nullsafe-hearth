import { NextRequest, NextResponse } from "next/server";

function authHeaders(withContentType = false): Record<string, string> {
  const secret = process.env.HALSETH_SECRET;
  return {
    ...(withContentType ? { "Content-Type": "application/json" } : {}),
    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const base = process.env.HALSETH_URL;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const raw = await request.json();
  if (
    typeof raw.status !== "string" ||
    !["open", "in_progress", "done"].includes(raw.status)
  ) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const res = await fetch(`${base}/tasks/${id}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ status: raw.status }),
  });
  if (!res.ok) return NextResponse.json({ error: "Request failed" }, { status: res.status });
  return NextResponse.json(await res.json());
}
