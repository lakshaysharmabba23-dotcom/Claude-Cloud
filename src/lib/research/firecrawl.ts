import { requireEnv } from "@/lib/env";
import type { ExtractedStructuredData, ResearchProvider, ScrapedPage, SearchResult } from "./provider";

/**
 * Firecrawl-backed research provider (https://firecrawl.dev).
 *
 * Firecrawl only fetches publicly accessible pages, which keeps this
 * provider aligned with the project's rule against scraping authenticated
 * or private content: we never pass Firecrawl any session/auth material.
 */
export class FirecrawlProvider implements ResearchProvider {
  readonly name = "firecrawl";

  private readonly apiKey: string;
  private readonly baseUrl = "https://api.firecrawl.dev/v1";

  constructor(apiKey?: string) {
    this.apiKey = requireEnv("FIRECRAWL_API_KEY", apiKey ?? "");
  }

  private async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Firecrawl request to ${path} failed (${res.status}): ${text}`);
    }

    return (await res.json()) as T;
  }

  async search(query: string, options?: { limit?: number }): Promise<SearchResult[]> {
    const data = await this.request<{
      data: Array<{ url: string; title?: string; description?: string }>;
    }>("/search", { query, limit: options?.limit ?? 8 });

    return (data.data ?? []).map((item) => ({
      url: item.url,
      title: item.title ?? null,
      snippet: item.description ?? null
    }));
  }

  async scrape(url: string): Promise<ScrapedPage> {
    const data = await this.request<{
      data: {
        markdown?: string;
        metadata?: {
          title?: string;
          author?: string;
          publishedTime?: string;
          sourceURL?: string;
          [key: string]: unknown;
        };
      };
    }>("/scrape", { url, formats: ["markdown"] });

    const metadata = data.data?.metadata ?? {};
    const content = data.data?.markdown ?? "";

    if (!content.trim()) {
      throw new Error(`Firecrawl returned no content for ${url}`);
    }

    return {
      url,
      title: metadata.title ?? null,
      author: metadata.author ?? null,
      publishedAt: metadata.publishedTime ?? null,
      content,
      sourceType: "article",
      metadata
    };
  }

  /**
   * Structured extraction is done via the AI provider (see
   * src/lib/ai/provider.ts), not Firecrawl itself - Firecrawl's job ends at
   * "give me clean page content", and the AI layer turns that into facts.
   * This method exists on the interface for providers (like a future one)
   * that support native structured extraction; Firecrawl callers in this
   * project route through src/lib/research/index.ts's extractFacts helper
   * instead, which calls the AI provider explicitly.
   */
  async extractStructured(page: ScrapedPage, focus: string): Promise<ExtractedStructuredData> {
    const data = await this.request<{
      data: { extract?: { facts?: string[]; summary?: string } };
    }>("/scrape", {
      url: page.url,
      formats: ["extract"],
      extract: {
        prompt: `Extract factual, verifiable statements relevant to: ${focus}. Do not infer or add anything not stated on the page.`
      }
    });

    return {
      facts: data.data?.extract?.facts ?? [],
      summary: data.data?.extract?.summary ?? ""
    };
  }
}
