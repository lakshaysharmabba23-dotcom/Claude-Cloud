"use client";

import { useMemo, useState } from "react";
import type { PatternWithStats } from "@/lib/data/repository";

const CATEGORIES = ["hook", "structure", "storytelling", "evidence", "cta", "formatting"] as const;

export function PatternExplorer({ patterns }: { patterns: PatternWithStats[] }) {
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return patterns.filter((p) => {
      if (category && p.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [patterns, category, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategory(null)}
          className={`badge ${category === null ? "border-accent-500 bg-accent-500/20 text-accent-400" : ""}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`badge capitalize ${category === c ? "border-accent-500 bg-accent-500/20 text-accent-400" : ""}`}
          >
            {c}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patterns..."
          className="input ml-auto max-w-xs"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((pattern) => (
          <button
            key={pattern.id}
            onClick={() => setExpanded(expanded === pattern.id ? null : pattern.id ?? null)}
            className="card text-left transition-colors hover:border-accent-500/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="badge mb-2 capitalize">{pattern.category}</span>
                <h3 className="font-medium">{pattern.name}</h3>
              </div>
              <span className="whitespace-nowrap text-xs text-ink-400">{pattern.usage_count} posts</span>
            </div>
            <p className="mt-2 text-sm text-ink-400">{pattern.description}</p>

            {expanded === pattern.id && (
              <div className="mt-4 space-y-3 border-t border-ink-700 pt-3 text-sm">
                <div>
                  <div className="label">Structure</div>
                  <div className="flex flex-wrap gap-1">
                    {pattern.structure.map((stage, i) => (
                      <span key={i} className="badge">
                        {i + 1}. {stage}
                      </span>
                    ))}
                  </div>
                </div>
                {pattern.example && (
                  <div>
                    <div className="label">Example</div>
                    <p className="text-ink-200">{pattern.example}</p>
                  </div>
                )}
                {pattern.strengths.length > 0 && (
                  <div>
                    <div className="label">Strengths</div>
                    <ul className="list-inside list-disc text-ink-200">
                      {pattern.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pattern.weaknesses.length > 0 && (
                  <div>
                    <div className="label">Weaknesses</div>
                    <ul className="list-inside list-disc text-ink-200">
                      {pattern.weaknesses.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pattern.topics.length > 0 && (
                  <div>
                    <div className="label">Observed topics</div>
                    <div className="flex flex-wrap gap-1">
                      {pattern.topics.map((t) => (
                        <span key={t} className="badge">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {pattern.performance.length > 0 ? (
                  <div>
                    <div className="label">Performance (feedback loop)</div>
                    {pattern.performance.map((row, i) => (
                      <p key={i} className="text-ink-200">
                        {row.topic ?? "all topics"}: median engagement rate{" "}
                        {row.engagement_rate_median !== null
                          ? `${(row.engagement_rate_median * 100).toFixed(1)}%`
                          : "not enough data"}{" "}
                        - associated with {row.posts_analyzed} post{row.posts_analyzed === 1 ? "" : "s"} analyzed
                        (confidence: {row.confidence})
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-400">No performance data recorded for this pattern yet.</p>
                )}
              </div>
            )}
          </button>
        ))}
        {filtered.length === 0 && <p className="text-sm text-ink-400">No patterns match this filter.</p>}
      </div>
    </div>
  );
}
