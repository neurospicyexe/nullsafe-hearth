// Makes (B62): pure helpers for the shelf and the download proxy. No React, no fetching.
import type { Make, MakeKind } from "./halseth";

/** A make id is 32 hex; an old generated image is img_<callId> (also 32 hex). Nothing else gets upstream. */
export const MAKE_ID_RE = /^(img_)?[0-9a-f]{32}$/;
export const MAKE_WHICH = ["source", "file", "preview"] as const;
export type MakeWhich = (typeof MAKE_WHICH)[number];

export function isMakeId(id: string): boolean {
  return MAKE_ID_RE.test(id);
}
export function isMakeWhich(w: string): w is MakeWhich {
  return (MAKE_WHICH as readonly string[]).includes(w);
}

export const KIND_LABEL: Record<MakeKind, string> = {
  writing: "writing",
  page: "page",
  music_code: "beat",
  drawing: "drawing",
  scad: "3D model",
  music_audio: "song",
  video: "video",
  image: "image",
};

export function makeUrl(id: string, which: MakeWhich, inline = false): string {
  return `/api/makes/${id}/${which}${inline ? "?inline=1" : ""}`;
}

export interface MakeLinks {
  /** The thing to download: the made file, or the source when the source is the make. */
  download: { href: string; label: string } | null;
  /** Shown only when there is both a rendered file and a source (drawing svg, scad). */
  source: { href: string; label: string } | null;
}

export function makeLinks(m: Make): MakeLinks {
  if (m.status !== "ready") return { download: null, source: null };
  const hasFile = !!m.files.file;
  const hasSource = !!m.files.source;
  if (hasFile) {
    return {
      download: { href: makeUrl(m.id, "file"), label: "Download" },
      source: hasSource ? { href: makeUrl(m.id, "source"), label: "Download source" } : null,
    };
  }
  if (hasSource) return { download: { href: makeUrl(m.id, "source"), label: "Download" }, source: null };
  return { download: null, source: null };
}

/** Which image to show inline for a kind, or null. SVG is never shown from source; the PNG stands in. */
export function inlineImage(m: Make): string | null {
  if (m.status !== "ready") return null;
  if (m.kind === "drawing" || m.kind === "image") return m.files.file ? makeUrl(m.id, "file", true) : null;
  if (m.kind === "scad") return m.files.preview ? makeUrl(m.id, "preview", true) : null;
  return null;
}

/** Kinds whose text the shelf page fetches itself (writing). Page and music_code are framed from their own routes. */
export function needsSource(m: Make): boolean {
  return m.status === "ready" && m.kind === "writing";
}

/** Same-origin routes that serve companion-made code with its own strict CSP, framed sandboxed. */
export function playerUrl(kind: "page" | "music_code", id: string): string {
  return `/api/makes/${kind === "page" ? "page" : "player"}?id=${id}`;
}

// These routes are excluded from next.config's global headers and set their own. `sandbox allow-scripts`
// in the CSP keeps the document in an opaque origin even if someone opens the URL directly.
const FRAME_BASE = "default-src 'none'; sandbox allow-scripts; frame-ancestors 'self'";
export const PAGE_CSP = `${FRAME_BASE}; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:`;
export const PLAYER_CSP =
  `${FRAME_BASE}; script-src 'unsafe-inline' blob: https://unpkg.com; style-src 'unsafe-inline'; ` +
  "connect-src https://unpkg.com https://raw.githubusercontent.com https://strudel.b-cdn.net; worker-src blob:; media-src blob:";
export const FRAME_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "private, no-store",
} as const;

/** JSON for a <script> body: JSON.stringify plus the characters that could end the script or the line. */
function scriptSafe(value: string): string {
  const esc: Record<string, string> = {
    "<": "\\u003c", ">": "\\u003e", "&": "\\u0026",
    "\u2028": "\\u2028", "\u2029": "\\u2029",
  };
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => esc[c]);
}

export const STRUDEL_SRC = "https://unpkg.com/@strudel/web@1.1.0";

/**
 * The player shell for a music_code make, served by /api/makes/player into a sandboxed iframe.
 * The pattern is data (a JSON script block, never executed as markup), evaluated only on the play click.
 * Per the @strudel/web README: initStrudel() once, evaluate(code) to play, hush() to stop.
 */
export function strudelShell(code: string): string {
  return `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:12px;font:16px system-ui,sans-serif;background:#24201b;color:#f1e9dc;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  button{min-height:44px;min-width:88px;border-radius:12px;border:1px solid #e9ad48;background:transparent;color:#e9ad48;font:inherit;cursor:pointer}
  #msg{color:#b3a897;font-size:14px}
</style>
<script src="${STRUDEL_SRC}"></script>
<script type="application/json" id="code">${scriptSafe(code)}</script>
<button id="play" type="button">play</button>
<button id="stop" type="button">stop</button>
<span id="msg"></span>
<script>
  var CODE = JSON.parse(document.getElementById("code").textContent);
  var msg = document.getElementById("msg");
  var ready = null;
  function boot() {
    if (!ready) ready = Promise.resolve(initStrudel());
    return ready;
  }
  document.getElementById("play").addEventListener("click", function () {
    msg.textContent = "";
    Promise.resolve().then(boot).then(function () { return evaluate(CODE); }).then(function () { msg.textContent = "playing"; })
      .catch(function (e) { msg.textContent = "could not play: " + (e && e.message ? e.message : e); });
  });
  document.getElementById("stop").addEventListener("click", function () {
    try { hush(); msg.textContent = "stopped"; } catch (e) { msg.textContent = ""; }
  });
</script>
`;
}
