import { NextRequest, NextResponse } from "next/server";

// Streams a companion-generated image (0077 take 14) from Halseth's R2-backed
// serve route. Same-origin proxy so the halseth URL stays server-side and the
// <img> src satisfies CSP. The id is the tool-call id (hex); Halseth resolves it
// to the stored R2 key and validates status=success.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]+$/i.test(id)) return new NextResponse("Not found", { status: 404 });

  const base = process.env.HALSETH_URL;
  if (!base) return new NextResponse("HALSETH_URL not set", { status: 500 });

  const res = await fetch(`${base}/mind/tools/image/${id}`, { cache: "no-store" });
  if (!res.ok || !res.body) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
