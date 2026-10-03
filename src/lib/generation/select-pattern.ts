import type { PatternWithStats } from "@/lib/data/repository";

/** Fewer recorded posts than this is noise, so it should not steer pattern choice. */
export const MIN_POSTS_FOR_PERFORMANCE = 3;

/**
 * Orders patterns for automatic selection.
 *  1. Patterns with enough of YOUR recorded results come first, best average
 *     engagement rate first (weighted by how many posts each row covers).
 *  2. Everything else follows, ordered by how often creators used the pattern.
 * With no recorded performance this is identical to the old behaviour
 * (most-used first), so nothing changes until feedback exists.
 */
export function rankPatternsForSelection(patterns: PatternWithStats[]): PatternWithStats[] {
  const scored = patterns.map((pattern) => {
    let weighted = 0;
    let posts = 0;
    for (const row of pattern.performance ?? []) {
      const n = row.posts_analyzed ?? 0;
      if (n > 0 && row.engagement_rate_median != null) {
        weighted += row.engagement_rate_median * n;
        posts += n;
      }
    }
    return { pattern, score: posts >= MIN_POSTS_FOR_PERFORMANCE ? weighted / posts : null };
  });

  return scored
    .sort((a, b) => {
      if (a.score !== null && b.score !== null) return b.score - a.score;
      if (a.score !== null) return -1;
      if (b.score !== null) return 1;
      return b.pattern.usage_count - a.pattern.usage_count;
    })
    .map((s) => s.pattern);
}
