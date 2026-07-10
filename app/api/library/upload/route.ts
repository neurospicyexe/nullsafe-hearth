import { NextRequest, NextResponse } from "next/server";

// Raziel adds a book to the shared library (0099). Passthrough multipart —
// we forward the FormData untouched so the worker sees file + metadata as sent.
// 409 (duplicate title+author) passes through so the client can offer "replace".
function halseth() {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  return { base, secret };
}

export async function POST(request: NextRequest) {
  const { base, secret } = halseth();
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const form = await request.formData().catch(() => null);
  if (!form || !(form.get("file") instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  try {
    // Book files can be tens of MB — a 10s window would abort mid-upload.
    const res = await fetch(`${base}/mind/books`, {
      method: "POST",
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}
