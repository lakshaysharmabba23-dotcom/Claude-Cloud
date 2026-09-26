# Research system

## The `ResearchProvider` interface

```ts
interface ResearchProvider {
  name: string;
  search(query: string, options?: { limit?: number }): Promise<SearchResult[]>;
  scrape(url: string): Promise<ScrapedPage>;
  extractStructured(page: ScrapedPage, focus: string): Promise<ExtractedStructuredData>;
}
```

(`src/lib/research/provider.ts`). Three methods, deliberately small: find candidate URLs, fetch+clean one page, and extract a structured summary from it. Any research source - a search API, a specific site's own API, a future provider - implements this same contract, so `src/lib/research/index.ts`'s `researchTopic()` orchestration never changes when the provider does.

**Contract every implementation must uphold:** every returned document carries a real `source_url`; nothing is fabricated (empty results beat invented ones); only public, non-authenticated content is fetched.

## Implementations

- **`FirecrawlProvider`** (`firecrawl.ts`) - calls the Firecrawl API (`/search`, `/scrape`). Firecrawl only fetches publicly accessible pages, which keeps this provider aligned with the "no authenticated/private scraping" rule without any extra guardrail code - it's structurally true because we never pass Firecrawl any session/auth material.
- **`MockResearchProvider`** (`mock.ts`) - deterministic (seeded PRNG keyed on the query/URL), returns content that's unmistakably `[FICTIONAL]` and attributed to invented outlets. Used whenever `DEMO_MODE=true` or `RESEARCH_PROVIDER=mock`.

Adding a second real provider (say, a different search API) means writing one new class against this interface and adding one case to `getResearchProvider()` in `index.ts` - no other file changes.

## Orchestration: `researchTopic()`

`src/lib/research/index.ts`:

1. **search()** for candidate URLs (or use explicitly-supplied `sourceUrls`, skipping search entirely).
2. **scrape()** each URL. Uses `Promise.allSettled` - one failed scrape drops that URL rather than failing the whole request. A partial, honest result beats a fabricated complete one.
3. **normalize + dedupe** (see below).
4. **extractStructured()** facts relevant to the requested topic, per document. Best-effort: an extraction failure yields an empty facts list, never invented facts.

## Normalization

Every research result - regardless of provider - is converted into one shape before touching anything downstream:

```ts
{ title, author, source_url, source_type, published_at, content, metadata }
```

`src/lib/normalization/normalize.ts`'s `normalizeDocument()` does this conversion; nothing downstream (pattern extraction, generation, the UI) ever branches on which provider produced a document.

## Deduplication

Two distinct duplicate shapes are handled by `dedupeDocuments()`:

1. **Same canonical URL, seen twice** (e.g. with/without a trailing slash, different tracking params) - the longer/more complete content wins.
2. **Same content at two different URLs** (a cross-post or syndication) - detected via a normalized content hash (`src/lib/normalization/hash.ts`: lowercase, collapse whitespace, strip punctuation, then SHA-256). The first-seen URL is kept as canonical; the duplicate is dropped.

URL canonicalization (`src/lib/normalization/url.ts`) lowercases the host, strips `www.`, strips a trailing slash, and removes known tracking query params (`utm_*`, `ref`, `fbclid`, `gclid`, etc.) while keeping and sorting any remaining params - so `https://WWW.Example.com/post/?utm_source=li&id=42` and `https://example.com/post?id=42` compare equal.

Both the URL canonicalization and the dedup logic are pure functions with no I/O, which is why they're directly unit-tested (`tests/normalization.test.ts`) rather than only exercised indirectly through the pipeline.

## Where retrieval fits

Topic research for a specific generation request (`runStudioPipeline` in `src/lib/generation/pipeline.ts`) calls `researchTopic()` for grounding facts, then separately retrieves relevant *patterns* and *voice examples* via `src/lib/embeddings/retrieval.ts`. That retrieval step deliberately does **not** use vector search where a plain SQL-style filter is sufficient: an explicitly-selected pattern always wins outright; only when nothing is selected does the pipeline fall back to ranking. In the demo store, that fallback is a plain filter (highest observed usage count) rather than a vector search, because patterns in the demo store aren't pre-embedded - a concrete instance of "don't reach for vector search when a normal filter will do."
