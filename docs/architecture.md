# Architecture

## The pipeline

```
 RESEARCH            search/scrape public sources for a topic+audience
    |
 NORMALIZATION       canonical URL, content hash, dedup -> one shape
    |
 PATTERN EXTRACTION  evidence-based structured extraction per post
    |
 PATTERN LIBRARY     aggregated, browsable, filterable patterns
    |
 VOICE MODEL         structured profile built from the user's own writing
    |
 TOPIC RESEARCH      research + retrieval prepared for one generation request
    |
 RETRIEVAL           relevant patterns + voice examples + research, ranked
    |
 DRAFT GENERATION    PostGenerator synthesizes from the context above
    |
 CRITIQUE            deterministic + LLM-assisted checks, explicit criteria
    |
 HUMAN REVIEW        approve / reject / edit / regenerate - never automatic
    |
 PUBLISH RECORD      written only after a human approves
    |
 PERFORMANCE         manually-entered metrics, multiple snapshots per post
    |
 PATTERN ANALYSIS    median engagement/impressions per pattern+topic+audience
    |
 FEEDBACK LOOP       surfaced back into the Studio's pattern selection
```

Each stage is its own module under `src/lib/`, with its own types, its own tests, and no stage's logic lives inside another stage's prompt. `src/lib/generation/pipeline.ts` is the one place that *orchestrates* stages end to end for the Studio - it calls into research, retrieval, generation, and critique as separate function calls, not one giant prompt.

## Layering rule

**No layer imports "downward" past its own concern.** Concretely:

- `research/` doesn't know about patterns, voice, or generation.
- `patterns/` (extraction) doesn't know about voice or generation.
- `voice/` doesn't know about patterns or generation.
- `generation/` is the first layer allowed to depend on research, patterns, and voice together, because grounding generation in all three is its whole job.
- `critic/` depends only on the draft text + the context that produced it - not on how generation internally worked.
- `performance/` and its aggregation know nothing about generation at all; they operate purely on recorded metrics.

This is enforced by convention (module boundaries + no circular imports), verified in practice by `npm run typecheck` and the test suite exercising each layer independently.

## Provider abstractions

Three pluggable interfaces keep the pipeline vendor-agnostic:

| Interface | File | Real implementation(s) | Mock |
|---|---|---|---|
| `ResearchProvider` | `src/lib/research/provider.ts` | SerpAPI (default), Firecrawl | `MockResearchProvider` |
| `AIProvider` | `src/lib/ai/provider.ts` | OpenRouter (default, multi-model fallback), Anthropic, OpenAI | `MockAIProvider` |
| `EmbeddingProvider` | `src/lib/embeddings/provider.ts` | OpenAI embeddings | `MockEmbeddingProvider` |

Each has exactly one factory (`getResearchProvider()`, `getAIProvider()`, `getEmbeddingProvider()`) that resolves the mock when `DEMO_MODE=true`. Nothing else in the app imports a concrete provider class directly.

**OpenRouter fallback chain:** free-tier OpenRouter models get rate-limited or pulled often, so `OpenRouterProvider` is configured with an ordered list of models (`OPENROUTER_MODELS`), not one fixed model. Every call tries model #1 first and falls through to #2, #3, ... on any failure - network error, non-2xx response, or the response failing schema validation twice. The actual "try each, stop at first success" logic lives in one pure, unit-tested function (`src/lib/ai/fallback.ts`'s `runWithFallback`) shared by anything that ever needs a fallback chain, not duplicated inline.

## Data access

`src/lib/data/repository.ts` is the **only** module allowed to import the Supabase client or the in-memory store directly. Every other module - API routes, Trigger.dev tasks, server components - calls through it. Each function checks `isSupabaseConfigured()` and reads/writes Postgres when a real project is configured, or the in-memory demo store (`src/lib/data/memory-store.ts`, seeded from `src/lib/data/seed-data.ts`) otherwise. This is what makes "runs fully without paid APIs or a hosted database" a property of one file, not scattered `if (demoMode)` checks everywhere.

## Data model

See `supabase/migrations/0001_init.sql` for the full DDL. Summary:

- **creators** - public authors researched (name, profile URL, niche).
- **source_posts** - normalized, deduplicated public posts collected via research.
- **content_patterns** - the pattern library (hook/structure/storytelling/evidence/cta/formatting).
- **post_patterns** - evidence-based link between a source post and the pattern(s) it demonstrates, with confidence + evidence.
- **voice_profiles** / **voice_examples** - the user's structured voice model and the samples it was built from.
- **content_research** - normalized research documents gathered for a specific generation request.
- **drafts** - generated posts moving through `draft -> critiqued -> approved|rejected`.
- **published_posts** - written only after a human approves a draft.
- **post_performance** - manually-entered metrics, one row per snapshot, many snapshots per post.
- **pattern_performance** - the feedback-loop aggregation: median engagement/impressions per pattern+topic+audience, with `posts_analyzed` and `confidence`.

pgvector (`vector` extension) backs semantic search on `source_posts`, `voice_examples`, `content_research`, and `content_patterns`, via the `match_*` SQL functions at the bottom of the migration. Plain SQL filters (category, topic, audience, status) are used everywhere a vector search isn't actually needed - see `docs/research-system.md`.

## Mock mode

`DEMO_MODE=true` (the default) is not a stub of one function - it's a full, parallel implementation path for every provider and for storage, so the entire 14-stage pipeline can be exercised, tested, and demoed with zero external dependencies:

- `MockResearchProvider` deterministically generates clearly `[FICTIONAL]`-labeled documents (fictional outlet names, fictional authors) - it can never be mistaken for real research.
- `MockAIProvider` is a heuristic engine, not a hardcoded string: it inspects the actual prompt/draft text (word count, question marks, cliche phrases, absolute-claim markers, etc.) and returns schema-valid, content-aware output. It's explicitly not a substitute for a real model's writing quality - see the README's Limitations section.
- `MockEmbeddingProvider` is a real (if simple) bag-of-words hashing embedding - cosine similarity between it and another text is meaningful, not random, which is what lets retrieval be demoed honestly offline.
- The in-memory store (`memory-store.ts`) is seeded once per process from `seed-data.ts` and mutated as you use the app; it is explicitly not a database (state resets on restart) - see the README.

## Security / safety

- No API keys are hardcoded anywhere; all come from environment variables (see `.env.example`).
- Nothing in this codebase scrapes authenticated or private content - `FirecrawlProvider` and `MockResearchProvider` both only ever touch public URLs.
- There is no LinkedIn scraping and no automated publishing path anywhere in the codebase - `published_posts` rows are written from exactly one code path (`POST /api/drafts/[id]/approve`), which requires the draft to already be human-approved.
- Sources are never fabricated: every `ResearchDocument` carries a real `source_url`; if a scrape fails, that document is dropped, not invented.
- Performance metrics are never fabricated or estimated: `post_performance` rows only ever come from `POST /api/performance`, filled in by a human.
