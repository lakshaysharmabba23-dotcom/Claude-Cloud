"use client";

import { useState } from "react";
import type { VoiceProfile } from "@/lib/types/schemas";
import type { VoiceExampleRecord } from "@/lib/data/memory-store";

export function VoiceLab({
  initialProfile,
  initialExamples
}: {
  initialProfile: VoiceProfile | null;
  initialExamples: VoiceExampleRecord[];
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [examples, setExamples] = useState(initialExamples);
  const [draftSample, setDraftSample] = useState("");
  const [pendingSamples, setPendingSamples] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openExample, setOpenExample] = useState<VoiceExampleRecord | null>(null);

  function addSampleToQueue() {
    if (draftSample.trim().length < 20) {
      setError("Each writing sample should be at least 20 characters.");
      return;
    }
    setPendingSamples((prev) => [...prev, draftSample.trim()]);
    setDraftSample("");
    setError(null);
  }

  async function analyze() {
    if (pendingSamples.length === 0) {
      setError("Add at least one writing sample before analyzing.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/voice/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ samples: pendingSamples.map((content) => ({ content, source: "voice-lab-ui" })) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.formErrors?.join(", ") ?? data.error ?? "Failed to analyze voice.");
      setProfile(data.profile);
      setExamples((prev) => [...data.addedExamples, ...prev]);
      setPendingSamples([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4">
        <h2 className="font-medium">Add writing samples</h2>
        <textarea
          className="input min-h-[140px]"
          placeholder="Paste a LinkedIn post, email, or any writing sample that represents your voice..."
          value={draftSample}
          onChange={(e) => setDraftSample(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={addSampleToQueue}>
            Add sample ({pendingSamples.length} queued)
          </button>
          <button className="btn-primary" onClick={analyze} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze voice"}
          </button>
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}

        {pendingSamples.length > 0 && (
          <ul className="space-y-2 text-sm text-ink-400">
            {pendingSamples.map((s, i) => (
              <li key={i} className="rounded-lg bg-ink-800 px-3 py-2 line-clamp-2">
                {s}
              </li>
            ))}
          </ul>
        )}

        <div>
          <h3 className="label mt-4">Stored examples ({examples.length})</h3>
          <ul className="max-h-60 space-y-2 overflow-y-auto text-xs text-ink-400">
            {examples.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setOpenExample(e)}
                  className="line-clamp-3 w-full rounded-lg bg-ink-800 px-3 py-2 text-left transition-colors hover:bg-ink-700"
                >
                  {e.content}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {openExample && (
        <div
          className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-black/60 p-6 backdrop-blur-sm"
          onClick={() => setOpenExample(null)}
        >
          <div
            className="card mt-12 w-full max-w-2xl whitespace-pre-wrap text-sm text-ink-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium">Writing sample</h3>
              <button type="button" onClick={() => setOpenExample(null)} className="btn-ghost px-2 py-1 text-xs">
                Close
              </button>
            </div>
            {openExample.content}
            {openExample.source && <p className="mt-4 text-xs text-ink-400">Source: {openExample.source}</p>}
          </div>
        </div>
      )}

      <section className="card">
        <h2 className="mb-3 font-medium">Voice profile</h2>
        {!profile ? (
          <p className="text-sm text-ink-400">No profile yet - add samples and analyze to build one.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Tone" value={profile.tone.join(", ")} />
            <Field label="Formality" value={profile.formality} />
            <Field
              label="Sentence length"
              value={`~${profile.sentence_length.average_words} words (${profile.sentence_length.variance} variance)`}
            />
            <Field label="Paragraphs" value={profile.paragraph_length.style} />
            <Field label="Vocabulary" value={`${profile.vocabulary.complexity}, jargon: ${profile.vocabulary.jargon_level}`} />
            <Field label="Humor" value={profile.humor_level} />
            <Field label="Storytelling" value={profile.storytelling_level} />
            <Field label="CTA style" value={profile.formatting_style.cta_style} />
            <Field
              label="Formatting"
              value={
                [
                  profile.formatting_style.uses_bullets && "bullets",
                  profile.formatting_style.uses_line_breaks && "line breaks",
                  profile.formatting_style.uses_bold && "bold",
                  profile.formatting_style.uses_emoji && "emoji",
                  profile.formatting_style.asks_questions && "questions"
                ]
                  .filter(Boolean)
                  .join(", ") || "plain prose"
              }
            />
            <Field label="Samples analyzed" value={String(profile.sample_count)} />
            {profile.things_to_avoid.length > 0 && (
              <div className="col-span-2">
                <div className="label">Things to avoid</div>
                <div className="flex flex-wrap gap-1">
                  {profile.things_to_avoid.map((t) => (
                    <span key={t} className="badge">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </dl>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-ink-200">{value}</div>
    </div>
  );
}
