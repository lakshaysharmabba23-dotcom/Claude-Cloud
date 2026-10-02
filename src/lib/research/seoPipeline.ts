import { getAIProvider } from "@/lib/ai";
import { z } from "zod";
import type { ExtractedStructuredData, ResearchProvider, ScrapedPage, SearchResult } from "./provider";

/**
 * Research provider for a self-hosted "SEO Pipeline" REST API (SERP search
 * + scraping, backed by Jina on the server side). No API key is required
 * on this app's side - the server the endpoints live on holds its own
 * JINA_API_KEY.
 *
 * Endpoints used (see the API's own docs):
 *   GET  /api/serp?q=<query>          -> { results: [{ title, url, description }] }
 *   GET  /api/scrape?url=<url>        -> { content (markdown), title, url }
 *   GET  /health
 *
 * Like SerpApiProvider, this API has no native "extract facts" feature, so
 * extractStructured() asks the configured AIProvider to summarize/extract
 * from the already-scraped markdown.
 */
export class SeoPipelineProvider implements ResearchProvider {
  readonly name = "seo-pipeline";

  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    if (!baseUrl) {
      throw new Error("SeoPipelineProvider requires a base URL (set SEO_PIPELINE_BASE_URL).");
    }
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async search(query: string, options?: { limit?: number }): Promise<SearchResult[]> {
    const limit = options?.limit ?? 8;
    const url = `${this.baseUrl}/api/serp?q=${encodeURIComponent(query)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`SEO pipeline /api/serp failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; description?: string }>;
    };

    return (data.results ?? [])
      .filter((r): r is { title?: string; url: string; description?: string } => Boolean(r.url))
      .slice(0, limit)
      .map((r) => ({ url: r.url, title: r.title ?? null, snippet: r.description ?? null }));
  }

  async scrape(url: string): Promise<ScrapedPage> {
    const endpoint = `${this.baseUrl}/api/scrape?url=${encodeURIComponent(url)}`;
    const res = await fetch(endpoint);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`SEO pipeline /api/scrape failed for ${url} (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { content?: string; title?: string; url?: string };
    if (!data.content) {
      throw new Error(`SEO pipeline returned no content for ${url}`);
    }

    return {
      url: data.url ?? url,
      title: data.title ?? null,
      author: null,
      publishedAt: null,
      // Cap very long pages - only the first few thousand chars are used anyway.
      content: data.content.slice(0, 60000),
      sourceType: "article",
      metadata: { extractedVia: "seo-pipeline (jina)" }
    };
  }

  async extractStructured(page: ScrapedPage, focus: string): Promise<ExtractedStructuredData> {
    const ai = getAIProvider();
    const schema = z.object({ facts: z.array(z.string()), summary: z.string() });

    return ai.completeStructured<ExtractedStructuredData>({
      system:
        "Extract only factual, verifiable statements that are actually present in the given text. " +
        "Do not infer, generalize, or add anything not stated. If nothing relevant is present, return an empty facts list.",
      prompt: `FOCUS: ${focus}\n\nTEXT:\n${page.content.slice(0, 4000)}`,
      schema,
      schemaName: "research_facts",
      temperature: 0.1,
      maxTokens: 600
    });
  }
}
