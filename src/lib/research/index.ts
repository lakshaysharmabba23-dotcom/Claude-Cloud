import { env } from "@/lib/env";
import type { ResearchProvider } from "./provider";
import { MockResearchProvider } from "./mock";
import { FirecrawlProvider } from "./firecrawl";
import { SerpApiProvider } from "./serpapi";
import { SeoPipelineProvider } from "./seoPipeline";
import { normalizeDocument, dedupeDocuments, type NormalizedDocument } from "@/lib/normalization/normalize";
import type { ResearchRequest } from "@/lib/types/schemas";

let cached: ResearchProvider | null = null;

export function getResearchProvider(): ResearchProvider {
  if (cached) return cached;

  if (env.demoMode || env.researchProvider === "mock") {
    cached = new MockResearchProvider();
    return cached;
  }

  switch (env.researchProvider) {
    case "seo-pipeline":
      cached = new SeoPipelineProvider(env.seoPipelineBaseUrl);
      break;
    case "serpapi":
      cached = new SerpApiProvider(env.serpApiKey);
      break;
    case "firecrawl":
      cached = new FirecrawlProvider(env.firecrawlApiKey);
      break;
    default:
      cached = new MockResearchProvider();
  }
  return cached;
}

export interface ResearchedDocument extends NormalizedDocument {
  extractedFacts: string[];
}

/**
 * The full research step of the pipeline:
 *   1. search() for candidate URLs (or use explicitly supplied source URLs)
 *   2. scrape() each URL for clean content
 *   3. normalize + dedupe (see src/lib/normalization)
 *   4. extractStructured() facts relevant to the topic, via the AI provider
 *
 * Every returned document keeps its real source_url end to end. If a scrape
 * fails for one URL, that URL is skipped rather than the whole request
 * failing - a partial, honest result beats a fabricated complete one.
 */
export async function researchTopic(request: ResearchRequest): Promise<ResearchedDocument[]> {
  const provider = getResearchProvider();

  const candidateUrls = new Set<string>(request.sourceUrls ?? []);
  if (candidateUrls.size === 0) {
    const searchResults = await provider.search(`${request.topic} ${request.audience}`, {
      limit: request.maxResults
    });
    for (const result of searchResults) candidateUrls.add(result.url);
  }

  const scraped = await Promise.allSettled([...candidateUrls].map((url) => provider.scrape(url)));

  const normalized: NormalizedDocument[] = [];
  const pageByCanonicalUrl = new Map<string, Awaited<ReturnType<ResearchProvider["scrape"]>>>();

  for (const result of scraped) {
    if (result.status !== "fulfilled") continue;
    const page = result.value;
    const doc = normalizeDocument({
      title: page.title,
      author: page.author,
      source_url: page.url,
      source_type: page.sourceType,
      published_at: page.publishedAt,
      content: page.content,
      metadata: page.metadata
    });
    normalized.push(doc);
    pageByCanonicalUrl.set(doc.canonical_url, page);
  }

  const deduped = dedupeDocuments(normalized);

  const withFacts = await Promise.all(
    deduped.map(async (doc) => {
      const page = pageByCanonicalUrl.get(doc.canonical_url);
      let extractedFacts: string[] = [];
      if (page) {
        try {
          const structured = await provider.extractStructured(page, request.topic);
          extractedFacts = structured.facts;
        } catch {
          // Extraction is best-effort: never fabricate facts if it fails.
          extractedFacts = [];
        }
      }
      return { ...doc, extractedFacts };
    })
  );

  return withFacts;
}

export type { ResearchProvider, ScrapedPage, SearchResult, ExtractedStructuredData } from "./provider";
