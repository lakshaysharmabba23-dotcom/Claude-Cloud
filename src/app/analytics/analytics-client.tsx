"use client";

import { useMemo, useState } from "react";
import type { PatternPerformanceRow } from "@/lib/types/schemas";
import type { PatternWithStats } from "@/lib/data/repository";
import type { PerformanceRecord, PublishedPostRecord } from "@/lib/data/memory-store";

interface Props {
  published: PublishedPostRecord[];
  performance: PerformanceRecord[];
  patternPerformance: PatternPerformanceRow[];
  patterns: PatternWithStats[];
}

const METRIC_FIELDS = ["impressions", "likes", "comments", "reposts", "profile_views", "clicks"] as const;

export function AnalyticsClient({ published, performance: initialPerformance, patternPerformance, patterns }: Props) {
  const [performance, setPerformance] = useState(initialPerformance);
  const [selectedPost, setSelectedPost] = useState(published[0]?.id ?? "");
  const [form, setForm] = useState<Record<(typeof METRIC_FIELDS)[number], string>>({
    impressions: "",
    likes: "",
    comments: "",
    reposts: "",
    profile_views: "",
    clicks: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const patternById = useMemo(() => new Map(patterns.map((p) => [p.id, p])), [patterns]);

  async function submitSnapshot() {
    if (!selectedPost) {
      setError("Select a published post first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        published_post_id: selectedPost,
        impressions: form.impressions ? Number(form.impressions) : null,
        likes: form.likes ? Number(form.likes) : null,
        comments: form.comments ? Number(form.comments) : null,
        reposts: form.reposts ? Number(form.reposts) : null,
        profile_views: form.profile_views ? Number(form.profile_views) : null,
        clicks: form.clicks ? Number(form.clicks) : null
      };
      const res = await fetch("/api/performance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.join(", ") ?? data.error ?? "Failed to save.");
      setPerformance((prev) => [...prev, data.snapshot]);
      setForm({ impressions: "", likes: "", comments: "", reposts: "", profile_views: "", clicks: "" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const byPattern = groupBy(patternPerformance, (r) => r.pattern_id);
  const byTopic = groupBy(patternPerformance, (r) => r.topic ?? "(unspecified)");
  const hookRows = patternPerformance.filter((r) => patternById.get(r.pattern_id)?.category === "hook");
  const ctaRows = patternPerformance.filter((r) => patternById.get(r.pattern_id)?.category === "cta");

  const sortedByDate = [...performance].sort(
    (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
  );

  return (
    <div className="space-y-8">
      <section className="card space-y-4">
        <h2 className="font-medium">Log a performance snapshot (manual entry)</h2>
        <p className="text-xs text-ink-400">
          Enter numbers exactly as shown in LinkedIn&apos;s own post analytics. Nothing here is fetched or
          estimated automatically.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="label">Published post</label>
            <select className="input" value={selectedPost} onChange={(e) => setSelectedPost(e.target.value)}>
              {published.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.content.slice(0, 80)}...
                </option>
              ))}
            </select>
          </div>
          {METRIC_FIELDS.map((field) => (
            <div key={field}>
              <label className="label capitalize">{field.replace("_", " ")}</label>
              <input
                type="number"
                min={0}
                className="input"
                value={form[field]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={submitSnapshot} disabled={saving}>
          {saving ? "Saving..." : "Save snapshot"}
        </button>
        {error && <p className="text-sm text-bad">{error}</p>}
      </section>

      <section className="card">
        <h2 className="mb-3 font-medium">Performance over time</h2>
        <TableShell headers={["Captured", "Impressions", "Likes", "Comments", "Reposts", "Engagement rate"]}>
          {sortedByDate.map((row) => (
            <tr key={row.id} className="border-t border-ink-700">
              <Td>{new Date(row.captured_at).toLocaleDateString()}</Td>
              <Td>{row.impressions ?? "-"}</Td>
              <Td>{row.likes ?? "-"}</Td>
              <Td>{row.comments ?? "-"}</Td>
              <Td>{row.reposts ?? "-"}</Td>
              <Td>{row.engagement_rate !== null ? `${(row.engagement_rate * 100).toFixed(2)}%` : "-"}</Td>
            </tr>
          ))}
        </TableShell>
      </section>

      <section className="card">
        <h2 className="mb-1 font-medium">Performance by pattern</h2>
        <p className="mb-3 text-xs text-ink-400">
          Associations only - not causal claims. Every row shows sample size and confidence.
        </p>
        <TableShell headers={["Pattern", "Topic", "Posts analyzed", "Median engagement rate", "Confidence"]}>
          {[...byPattern.entries()].map(([patternId, rows]) =>
            rows.map((row, i) => (
              <tr key={`${patternId}-${i}`} className="border-t border-ink-700">
                <Td>{patternById.get(patternId)?.name ?? patternId}</Td>
                <Td>{row.topic ?? "all topics"}</Td>
                <Td>{row.posts_analyzed}</Td>
                <Td>
                  {row.engagement_rate_median !== null ? `${(row.engagement_rate_median * 100).toFixed(1)}%` : "not enough data"}
                </Td>
                <ConfidenceTd confidence={row.confidence} />
              </tr>
            ))
          )}
        </TableShell>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-medium">Performance by topic</h2>
          <TableShell headers={["Topic", "Posts analyzed", "Median engagement rate", "Confidence"]}>
            {[...byTopic.entries()].map(([topic, rows]) => {
              const totalPosts = rows.reduce((sum, r) => sum + r.posts_analyzed, 0);
              const best = rows.sort((a, b) => b.posts_analyzed - a.posts_analyzed)[0];
              return (
                <tr key={topic} className="border-t border-ink-700">
                  <Td>{topic}</Td>
                  <Td>{totalPosts}</Td>
                  <Td>
                    {best?.engagement_rate_median !== null && best?.engagement_rate_median !== undefined
                      ? `${(best.engagement_rate_median * 100).toFixed(1)}%`
                      : "not enough data"}
                  </Td>
                  <ConfidenceTd confidence={best?.confidence ?? "low"} />
                </tr>
              );
            })}
          </TableShell>
        </section>

        <section className="card">
          <h2 className="mb-3 font-medium">Performance by hook type</h2>
          <TableShell headers={["Hook pattern", "Posts analyzed", "Median engagement rate", "Confidence"]}>
            {hookRows.map((row, i) => (
              <tr key={i} className="border-t border-ink-700">
                <Td>{patternById.get(row.pattern_id)?.name ?? row.pattern_id}</Td>
                <Td>{row.posts_analyzed}</Td>
                <Td>
                  {row.engagement_rate_median !== null ? `${(row.engagement_rate_median * 100).toFixed(1)}%` : "not enough data"}
                </Td>
                <ConfidenceTd confidence={row.confidence} />
              </tr>
            ))}
            {hookRows.length === 0 && (
              <tr>
                <Td colSpan={4}>No hook-category performance data yet.</Td>
              </tr>
            )}
          </TableShell>
        </section>
      </div>

      <section className="card">
        <h2 className="mb-3 font-medium">Performance by CTA type</h2>
        <TableShell headers={["CTA pattern", "Posts analyzed", "Median engagement rate", "Confidence"]}>
          {ctaRows.map((row, i) => (
            <tr key={i} className="border-t border-ink-700">
              <Td>{patternById.get(row.pattern_id)?.name ?? row.pattern_id}</Td>
              <Td>{row.posts_analyzed}</Td>
              <Td>
                {row.engagement_rate_median !== null ? `${(row.engagement_rate_median * 100).toFixed(1)}%` : "not enough data"}
              </Td>
              <ConfidenceTd confidence={row.confidence} />
            </tr>
          ))}
          {ctaRows.length === 0 && (
            <tr>
              <Td colSpan={4}>No CTA-category performance data yet.</Td>
            </tr>
          )}
        </TableShell>
      </section>
    </div>
  );
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

function TableShell({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-ink-400">
            {headers.map((h) => (
              <th key={h} className="pb-2 pr-4 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <td className="py-2 pr-4" colSpan={colSpan}>
      {children}
    </td>
  );
}

function ConfidenceTd({ confidence }: { confidence: "low" | "medium" | "high" }) {
  const color = confidence === "high" ? "text-good" : confidence === "medium" ? "text-warn" : "text-ink-400";
  return (
    <td className={`py-2 pr-4 ${color}`}>
      <span className="badge capitalize">{confidence}</span>
    </td>
  );
}
