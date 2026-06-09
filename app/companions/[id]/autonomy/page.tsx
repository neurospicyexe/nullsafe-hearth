export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  fetchAutonomyRuns,
  fetchAutonomySeeds,
} from "@/lib/halseth";
import type {
  AutonomyRun,
} from "@/lib/halseth";
import { COMPANION_CONFIG, fmtTime } from "../sections";
import SeedsClient from "./SeedsClient";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

export default async function AutonomyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  const [runsRes, seedsRes] = await Promise.allSettled([
    fetchAutonomyRuns(id, 20),
    fetchAutonomySeeds(id),
  ]);

  const runs   = (runsRes.status   === "fulfilled" ? runsRes.value   : null) ?? [];
  const allSeeds = (seedsRes.status === "fulfilled" ? seedsRes.value : null) ?? [];

  const sortedRuns = [...runs].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  const availableSeeds = [...allSeeds]
    .filter((s) => s.used_at === null)
    .sort((a, b) => b.priority - a.priority);

  const usedSeeds = [...allSeeds]
    .filter((s) => s.used_at !== null)
    .sort((a, b) => {
      const aTime = a.used_at ? new Date(a.used_at).getTime() : 0;
      const bTime = b.used_at ? new Date(b.used_at).getTime() : 0;
      return bTime - aTime;
    });

  return (
    <div data-companion={id}>
      {/* Back link */}
      <div style={{ padding: "1rem 1.5rem 0" }}>
        <Link href={`/companions/${id}`} className="home-section-link" style={{ fontSize: "0.85rem" }}>
          ← back
        </Link>
      </div>

      {/* Page title */}
      <div
        className="companion-header"
        style={{ background: config.gradient, border: `1px solid ${config.color}33` }}
      >
        <div className={`companion-avatar companion-avatar--lg ${id}`} style={{ borderColor: config.color }}>
          {config.sym}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="companion-header-name" style={{ color: config.color }}>Autonomy</h1>
          <p className="companion-header-tagline">{config.display}</p>
        </div>
      </div>

      {/* ── Section 1: Recent Runs ── */}
      <section className="page-section">
        <h2 className="section-title">Recent Runs</h2>
        {sortedRuns.length === 0 ? (
          <p className="empty">No runs recorded yet</p>
        ) : (
          <div className="section-list">
            {sortedRuns.map((run) => {
              const statusColor =
                run.status === "running"   ? "#eab308" :
                run.status === "completed" ? "#22c55e" :
                run.status === "failed"    ? "#ef4444" : "#6b7280";

              const runTypeBadgeColor =
                run.run_type === "exploration" ? "#818cf8" :
                run.run_type === "reflection"  ? "#14b8a6" :
                run.run_type === "synthesis"   ? "#f97316" : "#6b7280";

              return (
                <div
                  key={run.id}
                  className="section-row"
                  style={{
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "0.4rem",
                    borderLeft: `3px solid ${statusColor}`,
                  }}
                >
                  {/* Type + status row */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      className="badge"
                      style={{
                        background: `${runTypeBadgeColor}22`,
                        color: runTypeBadgeColor,
                        border: `1px solid ${runTypeBadgeColor}44`,
                      }}
                    >
                      {run.run_type}
                    </span>

                    <span
                      className="badge"
                      style={{
                        background: `${statusColor}22`,
                        color: statusColor,
                        border: `1px solid ${statusColor}44`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      {run.status === "running" && (
                        <span className="live-dot" style={{ background: statusColor }} />
                      )}
                      {run.status}
                    </span>
                  </div>

                  {/* Timestamps */}
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <span className="section-row-meta" style={{ fontSize: "0.78rem" }}>
                      started: {run.started_at ? fmtTime(run.started_at) : "—"}
                    </span>
                    <span className="section-row-meta" style={{ fontSize: "0.78rem" }}>
                      completed: {run.completed_at ? fmtTime(run.completed_at) : "—"}
                    </span>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <span className="section-row-meta" style={{ fontSize: "0.78rem" }}>
                      tokens: {run.tokens_used}
                    </span>
                    <span className="section-row-meta" style={{ fontSize: "0.78rem" }}>
                      artifacts: {run.artifacts_created}
                    </span>
                  </div>

                  {/* Error */}
                  {run.error_message && (
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#ef4444" }}>
                      {run.error_message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 2: Seeds ── */}
      <section className="page-section">
        <h2 className="section-title">Seeds</h2>
        <SeedsClient
          companionId={id}
          companionColor={config.color}
          availableSeeds={availableSeeds}
          usedSeeds={usedSeeds}
        />
      </section>
    </div>
  );
}
