"use client";

import { useState } from "react";
import type { PatternWithStats } from "@/lib/data/repository";
import type { CriticResult, GeneratedPost, ResearchDocument } from "@/lib/types/schemas";

interface StudioResponse {
  draft: { id: string; status: string };
  generated: GeneratedPost;
  critique: CriticResult;
  research: ResearchDocument[];
  relevantVoiceExamples: string[];
  selectedPatternIds: string[];
}

/**
 * A platform-level error (a serverless function timeout, a proxy error page)
 * returns plain text/HTML instead of JSON, and res.json() throws a confusing
 * "Unexpected token... is not valid JSON" in that case. Read as text first so
 * that failure surfaces as a readable message instead.
 */
async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: res.ok ? "Unexpected non-JSON response." : text.slice(0, 300) || `Request failed (${res.status}).` };
  }
}

const CHECK_LABELS: Record<keyof CriticResult["checks"], string> = {
  relevance: "Relevance",
  specificity: "Specificity",
  clarity: "Clarity",
  evidence: "Evidence",
  voice_match: "Voice match",
  originality: "Originality",
  structure: "Structure",
  cta_alignment: "CTA alignment",
  no_unsupported_claims: "No unsupported claims",
  no_generic_language: "No generic language"
};

const MAX_ASYNC_WAIT_MS = 4 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function StudioClient({ patterns, demoMode }: { patterns: PatternWithStats[]; demoMode: boolean }) {
  const [topic, setTopic] = useState("GTM engineering");
  const [audience, setAudience] = useState("B2B SaaS founders");
  const [objective, setObjective] = useState("Generate discussion");
  const [patternId, setPatternId] = useState("");
  const [researchDepth, setResearchDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [postLength, setPostLength] = useState<"short" | "medium" | "long">("medium");

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StudioResponse | null>(null);
  const [content, setContent] = useState("");
  const [draftStatus, setDraftStatus] = useState<string>("critiqued");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  function applyResult(data: StudioResponse) {
    setResult(data);
    setContent(data.generated.content);
    setDraftStatus(data.draft.status);
  }

  const requestBody = {
    topic,
    audience,
    objective,
    selectedPatternId: patternId || undefined,
    researchDepth,
    postLength
  };

  /** DEMO_MODE only: mock providers respond in milliseconds, so a single request round trip is safe. */
  async function generateSync() {
    const res = await fetch("/api/studio/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) throw new Error(data.error?.formErrors?.join(", ") ?? data.error ?? "Generation failed.");
    applyResult(data);
  }

  /**
   * Real providers (a live web search, a page scrape, several sequential AI
   * calls) can take well over a minute - too long for a normal HTTP request
   * against Vercel's serverless function timeout. Runs the pipeline as a
   * Trigger.dev background job instead and polls for the result, which has
   * no such time limit.
   */
  async function generateViaBackgroundJob() {
    setProgress("Starting background generation job...");
    const startRes = await fetch("/api/studio/generate-async", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    const startData = await parseJsonResponse(startRes);
    if (!startRes.ok) {
      throw new Error(startData.error?.formErrors?.join(", ") ?? startData.error ?? "Could not start generation.");
    }
    const runId = startData.runId as string;

    const deadline = Date.now() + MAX_ASYNC_WAIT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const statusRes = await fetch(`/api/studio/generate-async/${runId}`);
      const statusData = await parseJsonResponse(statusRes);
      if (!statusRes.ok || statusData.error) {
        throw new Error(statusData.error ?? "Generation failed.");
      }
      setProgress(`Status: ${statusData.status}`);
      if (statusData.status === "COMPLETED") {
        applyResult(statusData.output);
        return;
      }
    }
    throw new Error(
      `Generation is taking longer than expected (run ${runId}). Check the Trigger.dev dashboard, or try again.`
    );
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setActionMessage(null);
    setProgress(null);
    try {
      if (demoMode) {
        await generateSync();
      } else {
        await generateViaBackgroundJob();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  async function saveEdit() {
    if (!result) return;
    await fetch(`/api/drafts/${result.draft.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content })
    });
    setActionMessage("Edit saved.");
  }

  async function approve() {
    if (!result) return;
    await saveEdit();
    const res = await fetch(`/api/drafts/${result.draft.id}/approve`, { method: "POST" });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      setActionMessage(`Could not approve: ${data.error}`);
      return;
    }
    setDraftStatus("approved");
    setActionMessage("Approved and recorded as published. Add performance data from LinkedIn analytics on the Analytics page when available.");
  }

  async function reject() {
    if (!result) return;
    await fetch(`/api/drafts/${result.draft.id}/reject`, { method: "POST" });
    setDraftStatus("rejected");
    setActionMessage("Draft rejected.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr_1fr]">
      <section className="card h-fit space-y-4">
        <h2 className="font-medium">Generation inputs</h2>
        <div>
          <label className="label">Topic</label>
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div>
          <label className="label">Audience</label>
          <input className="input" value={audience} onChange={(e) => setAudience(e.target.value)} />
        </div>
        <div>
          <label className="label">Objective</label>
          <input className="input" value={objective} onChange={(e) => setObjective(e.target.value)} />
        </div>
        <div>
          <label className="label">Pattern (optional - auto-selected if empty)</label>
          <select className="input" value={patternId} onChange={(e) => setPatternId(e.target.value)}>
            <option value="">Auto-select most-used pattern</option>
            {patterns.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.category})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Research depth</label>
          <select
            className="input"
            value={researchDepth}
            onChange={(e) => setResearchDepth(e.target.value as typeof researchDepth)}
          >
            <option value="quick">Quick (3 sources)</option>
            <option value="standard">Standard (6 sources)</option>
            <option value="deep">Deep (10 sources)</option>
          </select>
        </div>
        <div>
          <label className="label">Post length</label>
          <select
            className="input"
            value={postLength}
            onChange={(e) => setPostLength(e.target.value as typeof postLength)}
          >
            <option value="short">Short (~60-100 words)</option>
            <option value="medium">Medium (~120-200 words)</option>
            <option value="long">Long (~250-400 words)</option>
          </select>
        </div>
        <button className="btn-primary w-full" onClick={generate} disabled={loading}>
          {loading ? progress ?? "Researching + generating..." : "Generate"}
        </button>
        {loading && !demoMode && (
          <p className="text-xs text-ink-400">
            Running as a background job - this can take a minute or two with real providers.
          </p>
        )}
        {error && <p className="text-sm text-bad">{error}</p>}
      </section>

      {result && (
        <div className="space-y-6">
          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Generated post</h2>
              <span className="badge">{draftStatus}</span>
            </div>
            <textarea
              className="input min-h-[220px] font-normal"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={saveEdit}>
                Save edit
              </button>
              <button className="btn-secondary" onClick={generate}>
                Regenerate
              </button>
              <button className="btn-primary" onClick={approve}>
                Approve &amp; record as published
              </button>
              <button className="btn-ghost text-bad" onClick={reject}>
                Reject
              </button>
            </div>
            {actionMessage && <p className="text-sm text-ink-200">{actionMessage}</p>}
            <p className="text-xs text-ink-400">
              CTA type: {result.generated.cta_type} - pattern followed: {result.generated.selected_pattern}
            </p>
          </section>

          <section className="card">
            <h2 className="mb-3 font-medium">Critique</h2>
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(result.critique.checks) as Array<keyof CriticResult["checks"]>).map((key) => (
                <div
                  key={key}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    result.critique.checks[key] ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
                  }`}
                >
                  {result.critique.checks[key] ? "✓" : "✗"} {CHECK_LABELS[key]}
                </div>
              ))}
            </div>
            {result.critique.issues.length > 0 && (
              <div className="mb-3">
                <div className="label">Issues</div>
                <ul className="list-inside list-disc text-sm text-ink-200">
                  {result.critique.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.critique.strengths.length > 0 && (
              <div className="mb-3">
                <div className="label">Strengths</div>
                <ul className="list-inside list-disc text-sm text-ink-200">
                  {result.critique.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.critique.suggested_revisions.length > 0 && (
              <div>
                <div className="label">Suggested revisions</div>
                <ul className="list-inside list-disc text-sm text-ink-200">
                  {result.critique.suggested_revisions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <section className="card">
            <h2 className="mb-3 font-medium">Research sources</h2>
            <ul className="space-y-2 text-sm">
              {result.research.map((doc, i) => (
                <li key={i} className="rounded-lg bg-ink-800 px-3 py-2">
                  <a href={doc.source_url} target="_blank" rel="noreferrer" className="text-accent-400 hover:underline">
                    {doc.title ?? doc.source_url}
                  </a>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-400">{doc.content}</p>
                </li>
              ))}
              {result.research.length === 0 && (
                <p className="text-ink-400">No research sources were used for this generation.</p>
              )}
            </ul>
          </section>

          <section className="card">
            <h2 className="mb-3 font-medium">Voice examples used</h2>
            <ul className="space-y-2 text-sm text-ink-400">
              {result.relevantVoiceExamples.map((ex, i) => (
                <li key={i} className="rounded-lg bg-ink-800 px-3 py-2 line-clamp-2">
                  {ex}
                </li>
              ))}
              {result.relevantVoiceExamples.length === 0 && <p>No voice examples were retrieved.</p>}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
