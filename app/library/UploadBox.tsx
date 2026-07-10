"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Conflict = {
  file: File;
  message: string;
};

// Add books to the library. Uploads run one at a time; a duplicate (409) is
// held aside and asked about inline — never a browser confirm dialog.
export default function UploadBox() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null); // filename currently uploading
  const [errors, setErrors] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  async function uploadOne(file: File, replace: boolean): Promise<"ok" | "conflict" | "error"> {
    const form = new FormData();
    form.append("file", file);
    if (replace) form.append("replace", "true");
    try {
      const res = await fetch("/api/library/upload", { method: "POST", body: form });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        setConflicts((prev) => [
          ...prev.filter((c) => c.file.name !== file.name),
          { file, message: (body as { hint?: string; error?: string }).hint ?? (body as { error?: string }).error ?? "already on the shelf" },
        ]);
        return "conflict";
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrors((prev) => [...prev, `${file.name}: ${(body as { error?: string }).error ?? `failed (${res.status})`}`]);
        return "error";
      }
      return "ok";
    } catch {
      setErrors((prev) => [...prev, `${file.name}: network error`]);
      return "error";
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErrors([]);
    let anyOk = false;
    for (const file of Array.from(files)) {
      setBusy(file.name);
      const result = await uploadOne(file, false);
      if (result === "ok") anyOk = true;
    }
    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
    if (anyOk) router.refresh();
  }

  async function resolveConflict(conflict: Conflict, replace: boolean) {
    setConflicts((prev) => prev.filter((c) => c !== conflict));
    if (!replace) return;
    setBusy(conflict.file.name);
    const result = await uploadOne(conflict.file, true);
    setBusy(null);
    if (result === "ok") router.refresh();
  }

  return (
    <div style={{
      background: "#0c0c0c", border: "1px solid #1e1e1e", borderRadius: "5px",
      padding: "0.7rem 0.9rem", marginBottom: "0.5rem",
      display: "flex", flexDirection: "column", gap: "0.5rem",
    }}>
      <label style={{ display: "flex", alignItems: "center", gap: "0.7rem", flexWrap: "wrap", fontSize: "0.82rem", color: "#64748b" }}>
        <span>add a book (epub or pdf)</span>
        <input
          ref={inputRef}
          type="file"
          accept=".epub,.pdf"
          multiple
          disabled={busy !== null}
          onChange={(e) => handleFiles(e.target.files)}
          style={{ fontSize: "0.8rem", color: "#8b8b96" }}
        />
        {busy && <span style={{ color: "#f59e0b" }}>uploading {busy}…</span>}
      </label>

      {conflicts.map((c) => (
        <div key={c.file.name} style={{
          border: "1px solid #3a2f14", borderRadius: "4px", padding: "0.5rem 0.7rem",
          fontSize: "0.8rem", color: "#a8a29e",
          display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap",
        }}>
          <span><strong>{c.file.name}</strong> — {c.message}. replace the existing copy?</span>
          <button
            type="button"
            className="thread-tag"
            onClick={() => resolveConflict(c, true)}
            style={{ cursor: "pointer", background: "transparent", border: "1px solid #f59e0b", color: "#f59e0b" }}
          >
            replace
          </button>
          <button
            type="button"
            className="thread-tag"
            onClick={() => resolveConflict(c, false)}
            style={{ cursor: "pointer", background: "transparent", border: "1px solid #333", color: "#64748b" }}
          >
            keep existing
          </button>
        </div>
      ))}

      {errors.map((e) => (
        <p key={e} style={{ fontSize: "0.78rem", color: "#ef4444" }}>{e}</p>
      ))}
    </div>
  );
}
