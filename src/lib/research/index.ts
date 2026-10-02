import { env } from "@/lib/env";
import type { ResearchProvider } from "./provider";
import { MockResearchProvider } from "./mock";
import { FirecrawlProvider } from "./firecrawl";
import { SerpApiProvider } from "./serpapi";
import { SeoPipelineProvider } from "./seoPipeline";
import { normalizeDocument, dedupeDocuments, type NormalizedDocument } from "@/lib/normalization/normalize";
import type { ResearchRequest } from "@/lib/types/schemas";
import { fetchRecentHackerNewsDiscussion } from "./hackernews";

let cached: ResearchProvider | null = null;

const BLOCK_PAGE =
  /prove your humanity|verify you are (a )?human|are you a robot|enable javascript and cookies|access denied|captcha|just a moment\.\.\./i;

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
    // Skip bot-check / login walls (e.g. Reddit's "Prove your humanity") and
    // near-empty pages - they aren't real research.
    if (page.content.trim().length < 200 || BLOCK_PAGE.test(page.content.slice(0, 1500))) continue;
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

  // "Last 30 days" real discussion: Hacker News's free public search API,
  // filtered to recent posts, added as extra grounding alongside the web
  // search results above. Skipped in DEMO_MODE (keeps it fully offline) and
  // never lets a failed/empty lookup break the rest of research.
  if (!env.demoMode) {
    try {
      const hnHits = await fetchRecentHackerNewsDiscussion(request.topic, { limit: 3, days: 30 });
      for (const hit of hnHits) {
        const content = [hit.title, hit.storyText, `${hit.points} points, ${hit.numComments} comments on Hacker News.`]
          .filter(Boolean)
          .join("\n\n");
        normalized.push(
          normalizeDocument({
            title: hit.title,
            author: hit.author,
            source_url: hit.url,
            source_type: "forum",
            published_at: hit.createdAt,
            content,
            metadata: { source: "hackernews", points: hit.points, comments: hit.numComments }
          })
        );
      }
    } catch {
      // Best-effort supplementary source - never fail the whole research step over it.
    }
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
