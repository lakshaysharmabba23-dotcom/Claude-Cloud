# Pattern extraction & library

## What a "pattern" is here

Not a vibe - a structured, evidence-based classification of one post along twelve axes (`src/lib/types/schemas.ts`'s `patternExtractionSchema`):

```json
{
  "hook": { "type": "contrarian", "evidence": "..." },
  "opening_mechanism": "personal anecdote",
  "core_claim": "...",
  "structure": ["claim", "personal_observation", "example", "lesson"],
  "storytelling_mechanism": "first-person narrative",
  "evidence": ["personal_experience"],
  "formatting_style": { "uses_line_breaks": true, "uses_bullets": false, "...": "..." },
  "cta": { "type": "question", "evidence": "..." },
  "audience": "...",
  "topic": "...",
  "pattern": { "name": "Story -> Lesson", "category": "storytelling", "description": "..." },
  "confidence": 0.62
}
```

Every enum field (hook type, evidence type, CTA type, pattern category) is a closed set - the model can't invent a category that doesn't exist in the schema, and Zod rejects the response if it tries (see `tests/schemas.test.ts`). `hook.evidence` and `cta.evidence` require the model to point at *why* it classified something a certain way, not just assert it.

## Extraction is evidence-based, not vibes-based

`src/lib/patterns/extract.ts`'s system prompt is explicit: *"You must only describe characteristics that are actually present in the text... Do not invent a hook, structure, storytelling mechanism, evidence type, or CTA that is not evidenced by the text."* Structurally, this is reinforced by:

- A closed schema (above) - there's no free-text field where "trust me" reasoning can hide except the `description` fields, and those are always paired with a category from the closed set.
- `confidence` (0-1) is a required field, carried through to `post_patterns.confidence` in the database, and shown in the pattern library UI - a low-confidence extraction is visibly marked as such, never silently treated the same as a high-confidence one.
- `extractPatternsForPosts()` processes a batch with `Promise.allSettled` - one post's extraction failing doesn't corrupt or block the rest of the batch, and failures are surfaced (via Trigger.dev logs) rather than swallowed into a fabricated result.

## The 15 seed patterns

`src/lib/data/seed-data.ts`'s `SEED_PATTERNS` spans all six categories - hooks (Contrarian Claim, Direct Question, Statistic Cold Open), structures (Story -> Lesson, Problem/Reframe/Solution, Numbered Framework, Before/After Contrast), storytelling (Personal Failure Narrative, Customer Vignette), evidence (Data-Point Anchor, First-Person Case Study, Analogy Bridge), CTAs (Open Question, Soft Framework Recap), and formatting (Short-Line Formatting). Each carries a name, description, structure (ordered stages), an illustrative example marked `[FICTIONAL EXAMPLE]`, and known strengths/weaknesses - written by hand for the seed set so the library has real editorial content to show on day one, with `post_patterns` links generated procedurally against the 100 seed source posts.

## The library UI (`/patterns`)

`src/app/patterns/pattern-explorer.tsx` is a client-side filter/search over patterns fetched server-side (`listPatterns()` in `src/lib/data/repository.ts`), which joins each pattern to:

- **usage_count** - how many source posts were classified under it (`post_patterns` count).
- **topics** - which topics it's been observed in, derived from `pattern_performance` rows rather than duplicated storage.
- **performance** - the same `pattern_performance` rows (median engagement rate, sample size, confidence) shown inline, so "this pattern looks good" is never separated from "...based on how much data."

Filtering by category is a plain equality filter; free-text search matches name/description client-side. No embedding/vector search is used here - the library is small and filterable by exact attributes, so a vector index would add complexity without adding value (see `docs/research-system.md`'s note on when *not* to reach for vector search).
