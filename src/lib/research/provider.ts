import type { ResearchDocument } from "@/lib/types/schemas";

/**
 * Provider-agnostic research interface. Every research source (Firecrawl
 * today, something else tomorrow) implements this contract so the rest of
 * the pipeline never depends on a specific vendor's API shape.
 *
 * Contract that every implementation MUST uphold:
 *   - Every returned document carries a real source_url.
 *   - Nothing is fabricated: if a provider can't find results, return [].
 *   - Only public, non-authenticated content is fetched.
 */
export interface ResearchProvider {
  readonly name: string;

  /** Find candidate URLs for a topic. */
  search(query: string, options?: { limit?: number }): Promise<SearchResult[]>;

  /** Fetch and lightly clean a single URL's content. */
  scrape(url: string): Promise<ScrapedPage>;

  /** Extract a structured summary (facts, key points) from already-scraped content. */
  extractStructured(page: ScrapedPage, focus: string): Promise<ExtractedStructuredData>;
}

export interface SearchResult {
  url: string;
  title: string | null;
  snippet: string | null;
}

export interface ScrapedPage {
  url: string;
  title: string | null;
  author: string | null;
  publishedAt: string | null;
  content: string;
  sourceType: ResearchDocument["source_type"];
  metadata: Record<string, unknown>;
}

export interface ExtractedStructuredData {
  facts: string[];
  summary: string;
}
