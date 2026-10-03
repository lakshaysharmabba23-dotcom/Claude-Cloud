import { describe, expect, it } from "vitest";
import { rankPatternsForSelection } from "@/lib/generation/select-pattern";
import type { PatternWithStats } from "@/lib/data/repository";

const pat = (id: string, usage: number, perf: Array<[number, number | null]> = []): PatternWithStats =>
  ({
    id,
    name: id,
    category: "hook",
    description: "",
    structure: [],
    strengths: [],
    weaknesses: [],
    usage_count: usage,
    topics: [],
    performance: perf.map(([posts, rate]) => ({
      pattern_id: id,
      topic: null,
      audience: null,
      posts_analyzed: posts,
      impressions_median: null,
      engagement_rate_median: rate,
      comments_median: null,
      confidence: "low"
    }))
  }) as unknown as PatternWithStats;

describe("rankPatternsForSelection", () => {
  it("falls back to most-used when there is no performance data", () => {
    const ranked = rankPatternsForSelection([pat("a", 2), pat("b", 9), pat("c", 5)]);
    expect(ranked.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
  it("puts patterns with enough real results first, best engagement first", () => {
    const ranked = rankPatternsForSelection([
      pat("popular", 50),
      pat("good", 1, [[4, 0.05]]),
      pat("great", 1, [[3, 0.09]])
    ]);
    expect(ranked.map((p) => p.id)).toEqual(["great", "good", "popular"]);
  });
  it("ignores tiny samples", () => {
    const ranked = rankPatternsForSelection([pat("popular", 50), pat("lucky", 1, [[1, 0.5]])]);
    expect(ranked[0]!.id).toBe("popular");
  });
});
