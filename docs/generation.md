# Generation & critique

## The generation context

`buildGenerationContext()` (`src/lib/generation/context.ts`) assembles one explicit, inspectable object before any model call happens:

```ts
{ topic, audience, objective, voice_profile, selected_patterns, research, relevant_voice_examples }
```

It throws if `selected_patterns` is empty - generation is not allowed to proceed ungrounded. This object (validated by `generationContextSchema`) is what the Studio UI shows you alongside the result, so "what was this grounded in" is never a mystery.

## `PostGenerator`

`src/lib/generation/generator.ts` takes that context and makes exactly one structured model call. Its system prompt carries three explicit constraints:

1. **Synthesize, don't copy** - "do not lift sentences verbatim from the research block."
2. **Only use provided facts** - "never invent a statistic, study, or example" beyond what's in the research block.
3. **Match the target voice** - via the same `summarizeVoiceProfile()` description the critic later checks against.

The model is told which research items it drew on (`[R1]`, `[R2]`, ...) and reports them in `evidence_used` only. These markers never appear inside the post text (the prompt forbids it and `stripSourceMarkers` removes any that slip through). Output is validated against `generatedPostSchema` - never freeform text trusted as-is. The critic additionally flags any number in the draft that is not in the research, the user's own examples, or the request.

## `runStudioPipeline()`: the full orchestration

`src/lib/generation/pipeline.ts` is the one function that walks every stage for a single generation request:

1. Load the (one) voice profile - fail clearly if none exists yet, rather than generating in an undefined voice.
2. **Topic research** via `researchTopic()` (real source URLs, dedup'd).
3. **Pattern selection** - an explicitly chosen pattern wins outright; otherwise fall back to a plain filter (highest usage count) rather than reaching for a vector search that isn't needed here.
4. **Voice example retrieval** - semantic similarity to the topic (`retrieveSimilar()`), falling back to the most recent examples if nothing ranks (e.g. no embeddings available in the demo store).
5. Build the context, call `PostGenerator`, then **critique** the result.

This is why generation is "a pipeline," not "a prompt": each of these is independently callable, independently testable (see `tests/generation.test.ts`), and independently swappable.

## The critic: deterministic + LLM-assisted, never a bare score

`src/lib/critic/critic.ts` runs two layers in parallel and merges them:

- **Deterministic** (`deterministic.ts`, no model call): checks for cliche/generic phrasing against a known-phrase list; flags absolute claims (`"always"`, `"never"`, `"guaranteed"`, ...) that lack a nearby evidence marker (a stat, "in my experience", "for example", ...); flags verbatim copying via longest-shared-word-sequence against the source research texts; checks for a recognizable CTA (a question mark, "comment below", "let me know", ...).
- **LLM-assisted** (`llm.ts`): judges the criteria that genuinely need reading comprehension - relevance, specificity, clarity, voice match, structure - against the same named criteria, never an unexplained 1-10 score.

**Deterministic results always win** on the fields they compute; the LLM supplies the rest. Issues and strengths from both layers are combined and de-duplicated. The output shape:

```ts
{
  issues: string[],
  strengths: string[],
  checks: { relevance, specificity, clarity, evidence, voice_match, originality, structure, cta_alignment, no_unsupported_claims, no_generic_language }, // all boolean
  suggested_revisions: string[]
}
```

There is deliberately no `score` field anywhere in this schema (see `tests/schemas.test.ts`'s explicit assertion) - every judgment is a named, individually-inspectable boolean plus the reasoning behind it.

## Human review - the only path to "published"

The Studio (`/studio`) shows the generated content in an editable textarea alongside the critique, research sources, and voice examples used. Four actions, each a distinct API call:

- **Save edit** (`PATCH /api/drafts/[id]`) - the only way a draft's content changes after generation.
- **Regenerate** - re-runs the whole pipeline.
- **Reject** (`POST /api/drafts/[id]/reject`) - marks the draft rejected; nothing further happens to it.
- **Approve** (`POST /api/drafts/[id]/approve`) - the *only* code path anywhere in this app that writes a `published_posts` row, and it refuses to run unless the draft's status is already `approved` (set by this same call, after saving any pending edit). There is no scheduler, webhook, or background job that can reach this path without a human clicking Approve.
