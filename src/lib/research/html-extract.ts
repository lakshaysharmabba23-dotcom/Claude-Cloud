/**
 * Minimal, dependency-free HTML -> plain text extraction. Used by
 * SerpApiProvider (and could be reused by any future provider) to turn a
 * fetched public page's raw HTML into clean text, since SerpAPI itself
 * only returns search results, not page content.
 *
 * This is intentionally simple (regex-based, no headless browser, no HTML
 * parser dependency) - good enough for article/post-style pages, not a
 * general-purpose scraper. It only ever touches the HTML of a public URL
 * the caller passed in; it does nothing with cookies/auth.
 */
export interface ExtractedHtml {
  title: string | null;
  text: string;
}

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " "
};

function decodeEntities(input: string): string {
  return input.replace(/&(#?\w+);/g, (match, entity: string) => ENTITY_MAP[entity] ?? match);
}

export function extractTextFromHtml(html: string): ExtractedHtml {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1] ? decodeEntities(titleMatch[1]).trim() || null : null;

  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Block-level tags become paragraph breaks so text doesn't run together.
    .replace(/<\/(p|div|br|li|h[1-6]|section|article)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const text = decodeEntities(withoutNoise)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

  return { title, text };
}
