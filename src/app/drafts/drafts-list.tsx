"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DraftRow = { id: string; topic: string; audience: string; content: string; status: string; created_at: string | null };

const FILTERS = ["all", "critiqued", "approved", "rejected"] as const;

export function DraftsList({ drafts }: { drafts: DraftRow[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? drafts : drafts.filter((d) => d.status === filter || (filter === "critiqued" && d.status === "draft"))),
    [drafts, filter]
  );

  async function copy(draft: DraftRow) {
    try {
      await navigator.clipboard.writeText(draft.content);
    } catch {
      const area = document.createElement("textarea");
      area.value = draft.content;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiedId(draft.id);
    setTimeout(() => setCopiedId((id) => (id === draft.id ? null : id)), 2000);
  }

  if (drafts.length === 0) {
    return (
      <div className="card space-y-3 text-center">
        <h2 className="display text-2xl">No drafts yet</h2>
        <p className="text-sm text-ink-400">Generate a post in the Studio and it will be saved here.</p>
        <div>
          <Link href="/studio" className="btn-primary inline-block">
            Open the Studio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter drafts by status">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={filter === f ? "btn-primary" : "btn-secondary"}
          >
            {f === "all" ? "All" : f === "critiqued" ? "Awaiting review" : f[0]!.toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-xs text-ink-400">
          Showing {visible.length} of {drafts.length}
        </span>
      </div>

      <ul className="space-y-3">
        {visible.map((draft) => (
          <li key={draft.id} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{draft.topic}</div>
                <div className="text-xs text-ink-400">
                  For {draft.audience}
                  {draft.created_at ? ` · ${new Date(draft.created_at).toLocaleString()}` : ""}
                </div>
              </div>
              <span className="badge">{draft.status === "critiqued" || draft.status === "draft" ? "awaiting review" : draft.status}</span>
            </div>
            <p className="whitespace-pre-line break-words text-sm text-ink-200">{draft.content}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-secondary" onClick={() => copy(draft)}>
                {copiedId === draft.id ? "Copied" : "Copy post"}
              </button>
              {draft.status === "approved" && (
                <Link href="/analytics" className="text-xs text-accent-400 hover:underline">
                  Log results in Analytics &rarr;
                </Link>
              )}
            </div>
          </li>
        ))}
        {visible.length === 0 && <li className="text-sm text-ink-400">No drafts with this status.</li>}
      </ul>
    </div>
  );
}
