# LinkedIn Content Intelligence Agent

A research-grounded **content intelligence pipeline** for LinkedIn writing - not a "type a topic, get a post" generator.

It researches real (or, in demo mode, clearly fictional) public content, extracts *why* posts work as reusable patterns, builds a structured model of your own writing voice, and only then generates a post - grounded in retrieved research, a named pattern, and your voice. Every generated post is critiqued against explicit checks, reviewed by a human before anything is recorded as published, and its real performance (entered manually) feeds back into which patterns/topics get recommended next.

```
research -> normalize -> extract patterns -> pattern library -> voice model
   -> topic research -> retrieval -> generate -> critique -> human review
   -> publish record -> performance -> pattern analysis -> feedback loop
```

## Why this is not "an AI post generator"

A typical AI post generator is one prompt: topic in, post out. That's a demo, not a system. This project treats each step above as its own layer with its own data model, its own tests, and its own UI surface:

| If it were a generator... | What this does instead |
|---|---|
| Prompt engineering, hidden from you | A visible **pattern library** (`/patterns`) of hooks, structures, storytelling mechanisms, evidence types, CTAs, and formatting - each discovered via evidence-based extraction over real posts, not hand-waved |
| "Sounds like AI" output | A **voice model** (`/voice`) built only from *your* own writing samples, with an explicit, inspectable profile (tone, sentence length, formality, formatting habits, etc.) |
| One shot, no citations | Every generation is grounded in **topic research** with real source URLs, and the studio shows you exactly which research, pattern, and voice examples were used |
| "Looks good to me" | A **critic** that runs deterministic checks (originality, generic-language, unsupported-claims, CTA presence) *and* an LLM-assisted review against explicit named criteria - never a single opaque quality score |
| Auto-publish | **Human review is mandatory** - approve, reject, edit, or regenerate. Nothing is ever posted automatically |
| No feedback loop | Manually-entered performance data is aggregated **per pattern/topic/audience**, always with sample size and a low/medium/high confidence label, phrased as "associated with" - never a causal claim |

See `docs/architecture.md` for the full layer-by-layer breakdown.

## Quickstart (fully offline, no API keys)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. `DEMO_MODE=true` is the default (see `.env.example`), so:

- Research uses `MockResearchProvider` - deterministic, clearly-labeled `[FICTIONAL]` documents, no network calls.
- Pattern extraction, voice analysis, generation, and critique use `MockAIProvider` - a heuristic, content-aware mock (not hardcoded text) standing in for a real LLM.
- Retrieval uses `MockEmbeddingProvider` - a real (if simple) bag-of-words embedding, so semantic ranking genuinely works offline.
- Data reads/writes an in-memory store seeded from `src/lib/data/seed-data.ts` (20 creators, 100 source posts, 15 patterns, 20 voice examples, 20 published posts, and performance snapshots for each) - see "Mock mode" in `docs/architecture.md`.

Walk the pipeline in the UI: `/dashboard` -> `/patterns` -> `/voice` -> `/studio` (generate, review, approve) -> `/analytics`.

## Running against real services

Copy `.env.example` to `.env.local`, set `DEMO_MODE=false`, and fill in:

- **Supabase**: create a project, enable the `vector` extension, run `supabase/migrations/0001_init.sql`.
- **Research**: a Firecrawl API key (`FIRECRAWL_API_KEY`).
- **AI**: an Anthropic, OpenAI, or OpenRouter key (`AI_PROVIDER` + matching key).
- **Embeddings**: an OpenAI key for `text-embedding-3-small` (or point `EMBEDDING_PROVIDER` elsewhere).
- **Trigger.dev**: `TRIGGER_PROJECT_ID` / `TRIGGER_SECRET_KEY` for the background tasks in `src/trigger/`.

Every provider is behind an interface (`ResearchProvider`, `AIProvider`, `EmbeddingProvider`) specifically so a new vendor can be added without touching pipeline logic - see `docs/research-system.md`.

## Commands

```bash
npm run dev         # start the app
npm run build        # production build (see note below)
npm test              # run the Vitest suite
npm run typecheck  # tsc --noEmit
npm run seed          # (re)generate seed fixtures - see scripts/seed
```

> **Build note:** `npm run build` sets `NODE_ENV=production` explicitly before invoking `next build`. Some sandboxed/CI shells export `NODE_ENV=development` in a way `next build`'s internal override doesn't fully win against, which causes a Next.js static-generation worker to mix a production runtime with a development React bundle and crash prerendering `/404`, `/500`, and `/_not-found` with `Cannot read properties of null (reading 'useContext')`. Setting it explicitly in the script sidesteps that.

## Project structure

```
src/
  app/                    Next.js App Router pages + API routes
    dashboard/ patterns/ voice/ studio/ analytics/
    api/studio/generate  api/drafts/[id]  api/voice/analyze  api/performance
  lib/
    types/schemas.ts       Zod schemas - the single source of truth for every structured object
    normalization/         URL canonicalization, content hashing, dedup
    research/              ResearchProvider interface + Firecrawl + mock + orchestration
    ai/                    AIProvider interface + Anthropic/OpenAI/OpenRouter + mock
    embeddings/            EmbeddingProvider interface + mock/OpenAI + retrieval ranking
    patterns/              Evidence-based pattern extraction
    voice/                 Voice profile analysis
    generation/            Context builder, PostGenerator, full studio pipeline
    critic/                Deterministic checks + LLM-assisted review, merged
    performance/           Engagement-rate math, median, confidence, pattern aggregation
    data/                  Repository layer (Supabase or in-memory demo store) + seed data
  trigger/                 Trigger.dev background tasks
supabase/migrations/       Full Postgres + pgvector schema, RPC search functions
tests/                     Vitest suite (61 tests)
docs/                      Deep-dive docs per layer (linked below)
```

## Documentation

- [`docs/architecture.md`](docs/architecture.md) - full pipeline, data model, layering rules
- [`docs/research-system.md`](docs/research-system.md) - research provider abstraction, normalization, dedup
- [`docs/pattern-library.md`](docs/pattern-library.md) - extraction schema, pattern library UI
- [`docs/voice-model.md`](docs/voice-model.md) - voice profile schema, analysis approach
- [`docs/generation.md`](docs/generation.md) - generation context, PostGenerator, critic
- [`docs/feedback-loop.md`](docs/feedback-loop.md) - performance tracking, pattern-performance aggregation, confidence

## Limitations

- **Demo-mode retrieval and generation quality is heuristic, not a real model.** `MockAIProvider` and `MockEmbeddingProvider` are designed to exercise every layer of the pipeline honestly (they reason over the actual input text, they don't hardcode output) - but they are not a substitute for a real LLM's writing or judgment quality. Point the app at a real provider for representative output.
- **The in-memory demo store resets on process restart.** It exists so the whole app runs with zero external services; for persistence, configure Supabase.
- **Pattern extraction confidence is self-reported by the model**, not independently validated against a labeled dataset.
- **The critic's deterministic checks are heuristic** (keyword/n-gram based), not a full plagiarism or fact-checking system.
- **No LinkedIn scraping or automated publishing exists anywhere in this codebase**, by design - see the "Security / safety" section of `docs/architecture.md`.

## Future improvements

- Real pgvector-backed retrieval end-to-end (the SQL functions exist in the migration; the in-memory demo path uses the same ranking logic in `src/lib/embeddings/retrieval.ts` but without a live index).
- A/B-style draft comparison in the Studio (generate two candidates, critique both, compare).
- A labeled evaluation set for pattern-extraction confidence calibration.
- Multi-user voice profiles and pattern libraries (currently single-tenant by design, to keep the demo focused).
