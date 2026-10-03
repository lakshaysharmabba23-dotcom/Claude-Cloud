import { z } from "zod";
import { requireEnv } from "@/lib/env";
import { getAIProvider } from "@/lib/ai";
import { safeFetchText } from "@/lib/security/url";
import { extractTextFromHtml } from "./html-extract";
import type { ExtractedStructuredData, ResearchProvider, ScrapedPage, SearchResult } from "./provider";

/**
 * SerpAPI-backed research provider (https://serpapi.com).
 *
 * SerpAPI only returns SEARCH RESULTS (Google's organic results, snippets,
 * titles, links) - it does not fetch or clean a page's own content, and it
 * has no built-in "extract facts" feature the way Firecrawl does. So this
 * provider:
 *   - search(): calls SerpAPI's Google Search endpoint directly.
 *   - scrape(): fetches the public URL itself (plain fetch, no auth/session
 *     ever attached) and runs it through a small dependency-free HTML->text
 *     extractor (see html-extract.ts).
 *   - extractStructured(): has no vendor feature to call, so it asks the
 *     configured AIProvider to pull out facts from the already-scraped
 *     text - same "don't invent, only summarize what's there" prompt
 *     discipline as every other AI call in this codebase.
 */
export class SerpApiProvider implements ResearchProvider {
  readonly name = "serpapi";

  private readonly apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = requireEnv("SERPAPI_API_KEY", apiKey ?? "");
  }

  async search(query: string, options?: { limit?: number }): Promise<SearchResult[]> {
    const limit = options?.limit ?? 8;
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", query);
    url.searchParams.set("num", String(limit));
    url.searchParams.set("api_key", this.apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`SerpAPI search failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      organic_results?: Array<{ link?: string; title?: string; snippet?: string }>;
    };

    return (data.organic_results ?? [])
      .filter((r): r is { link: string; title?: string; snippet?: string } => Boolean(r.link))
      .slice(0, limit)
      .map((r) => ({ url: r.link, title: r.title ?? null, snippet: r.snippet ?? null }));
  }

  async scrape(url: string): Promise<ScrapedPage> {
    const { text: html } = await safeFetchText(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ContentIntelligenceAgent/1.0)" }
    });
    const { title, text } = extractTextFromHtml(html);

    if (!text) {
      throw new Error(`No extractable text content at ${url}`);
    }

    return {
      url,
      title,
      author: null,
      publishedAt: null,
      content: text,
      sourceType: "article",
      metadata: { extractedVia: "serpapi+fetch" }
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
