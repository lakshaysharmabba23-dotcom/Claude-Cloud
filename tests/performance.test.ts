import { describe, expect, it } from "vitest";
import { calculateEngagementRate, median, confidenceFromSampleSize } from "@/lib/performance/calculations";
import { aggregatePatternPerformance, describeObservation } from "@/lib/performance/aggregation";

describe("calculateEngagementRate", () => {
  it("computes (likes + comments + reposts) / impressions", () => {
    const rate = calculateEngagementRate({ impressions: 1000, likes: 40, comments: 8, reposts: 2 });
    expect(rate).toBeCloseTo(0.05);
  });

  it("returns null when impressions is missing (never fabricate a rate)", () => {
    expect(calculateEngagementRate({ impressions: null, likes: 10, comments: 0, reposts: 0 })).toBeNull();
  });

  it("returns null when impressions is zero", () => {
    expect(calculateEngagementRate({ impressions: 0, likes: 10, comments: 0, reposts: 0 })).toBeNull();
  });

  it("treats missing likes/comments/reposts as zero, not fabricated", () => {
    const rate = calculateEngagementRate({ impressions: 100, likes: null, comments: null, reposts: null });
    expect(rate).toBe(0);
  });
});

describe("median", () => {
  it("returns null for an empty array", () => {
    expect(median([])).toBeNull();
  });

  it("computes the median of an odd-length array", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("computes the median of an even-length array (average of middle two)", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe("confidenceFromSampleSize", () => {
  it("is low below 8 samples", () => {
    expect(confidenceFromSampleSize(1)).toBe("low");
    expect(confidenceFromSampleSize(7)).toBe("low");
  });

  it("is medium between 8 and 19 samples", () => {
    expect(confidenceFromSampleSize(8)).toBe("medium");
    expect(confidenceFromSampleSize(19)).toBe("medium");
  });

  it("is high at 20+ samples", () => {
    expect(confidenceFromSampleSize(20)).toBe("high");
    expect(confidenceFromSampleSize(500)).toBe("high");
  });
});

describe("aggregatePatternPerformance", () => {
  it("groups observations by pattern/topic/audience and reports sample size", () => {
    const rows = aggregatePatternPerformance([
      { patternId: "p1", topic: "gtm", audience: "founders", impressions: 1000, engagementRate: 0.04, comments: 5 },
      { patternId: "p1", topic: "gtm", audience: "founders", impressions: 2000, engagementRate: 0.06, comments: 10 },
      { patternId: "p2", topic: "gtm", audience: "founders", impressions: 500, engagementRate: 0.02, comments: 1 }
    ]);

    const p1Row = rows.find((r) => r.pattern_id === "p1");
    expect(p1Row?.posts_analyzed).toBe(2);
    expect(p1Row?.engagement_rate_median).toBeCloseTo(0.05);

    const p2Row = rows.find((r) => r.pattern_id === "p2");
    expect(p2Row?.posts_analyzed).toBe(1);
  });

  it("assigns low confidence to small sample sizes (sample-size handling)", () => {
    const rows = aggregatePatternPerformance([
      { patternId: "p1", topic: null, audience: null, impressions: 1000, engagementRate: 0.04, comments: 5 }
    ]);
    expect(rows[0]!.confidence).toBe("low");
    expect(rows[0]!.posts_analyzed).toBe(1);
  });

  it("handles observations with missing metrics without fabricating a median", () => {
    const rows = aggregatePatternPerformance([
      { patternId: "p1", topic: null, audience: null, impressions: null, engagementRate: null, comments: null }
    ]);
    expect(rows[0]!.impressions_median).toBeNull();
    expect(rows[0]!.engagement_rate_median).toBeNull();
  });

  it("never mixes different patterns/topics/audiences into one row", () => {
    const rows = aggregatePatternPerformance([
      { patternId: "p1", topic: "gtm", audience: "founders", impressions: 100, engagementRate: 0.1, comments: 1 },
      { patternId: "p1", topic: "hiring", audience: "founders", impressions: 200, engagementRate: 0.2, comments: 2 }
    ]);
    expect(rows).toHaveLength(2);
  });
});

describe("describeObservation", () => {
  it("phrases the finding as an association, not a causal claim, and discloses sample size", () => {
    const sentence = describeObservation(
      {
        pattern_id: "p1",
        topic: "gtm",
        audience: "founders",
        posts_analyzed: 18,
        impressions_median: 5000,
        engagement_rate_median: 0.042,
        comments_median: 6,
        confidence: "medium"
      },
      "Story -> Lesson"
    );

    expect(sentence).toContain("associated with");
    expect(sentence).not.toMatch(/causes|leads to|results in/i);
    expect(sentence).toContain("18 posts analyzed");
    expect(sentence).toContain("confidence: medium");
  });

  it("is honest about missing data instead of inventing a rate", () => {
    const sentence = describeObservation(
      {
        pattern_id: "p1",
        topic: null,
        audience: null,
        posts_analyzed: 1,
        impressions_median: null,
        engagement_rate_median: null,
        comments_median: null,
        confidence: "low"
      },
      "Story -> Lesson"
    );
    expect(sentence).toContain("not enough data");
  });
});
