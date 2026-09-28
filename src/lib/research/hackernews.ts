/**
 * "Last 30 days" real discussion source, via Hacker News's free, keyless
 * public search API (Algolia-backed: https://hn.algolia.com/api).
 *
 * Inspired by the idea behind github.com/mvanhorn/last30days-skill (pull
 * real, recent community discussion about a topic) - but that project is an
 * interactive AI-agent instruction file with optional paid API keys, not a
 * callable service, so it can't be "installed" into this app's automated
 * pipeline. This is a native, dependency-free equivalent: real HN stories
 * and their real point/comment counts, filtered to the last N days, added
 * as one more grounded research source alongside the existing web search.
 *
 * Never fabricates: if the API call fails or returns nothing, this returns
 * an empty array rather than inventing a result (same contract as every
 * other research source in this project).
 */
export interface HackerNewsHit {
  title: string;
  url: string;
  author: string | null;
  points: number;
  numComments: number;
  createdAt: string;
  storyText: string | null;
}

export async function fetchRecentHackerNewsDiscussion(
  topic: string,
  options?: { limit?: number; days?: number }
): Promise<HackerNewsHit[]> {
  const limit = options?.limit ?? 3;
  const days = options?.days ?? 30;
  const cutoffUnix = Math.floor((Date.now() - days * 86_400_000) / 1000);

  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=${limit}&numericFilters=created_at_i%3E${cutoffUnix}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const data = (await res.json().catch(() => null)) as {
    hits?: Array<{
      title?: string | null;
      url?: string | null;
      author?: string | null;
      points?: number | null;
      num_comments?: number | null;
      created_at?: string | null;
      story_text?: string | null;
      objectID: string;
    }>;
  } | null;

  return (data?.hits ?? [])
    .filter((hit): hit is typeof hit & { title: string } => Boolean(hit.title))
    .map((hit) => ({
      title: hit.title,
      url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
      author: hit.author ?? null,
      points: hit.points ?? 0,
      numComments: hit.num_comments ?? 0,
      createdAt: hit.created_at ?? new Date().toISOString(),
      storyText: hit.story_text ?? null
    }));
}
