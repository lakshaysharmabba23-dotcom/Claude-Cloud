import { confidenceFromSampleSize, median } from "./calculations";
import type { PatternPerformanceRow } from "@/lib/types/schemas";

/**
 * Feedback-loop aggregation: for each (pattern, topic, audience) combination
 * observed across published posts, compute the median impressions,
 * engagement rate, and comments, plus a sample-size-derived confidence.
 *
 * This never claims causation. The UI layer is responsible for phrasing
 * output as "associated with" / "observed in N posts", not "causes" - see
 * docs/feedback-loop.md.
 */

export interface PerformanceObservation {
  patternId: string;
  topic: string | null;
  audience: string | null;
  impressions: number | null;
  engagementRate: number | null;
  comments: number | null;
}

export function aggregatePatternPerformance(
  observations: PerformanceObservation[]
): PatternPerformanceRow[] {
  const groups = new Map<string, PerformanceObservation[]>();

  for (const obs of observations) {
    const key = `${obs.patternId}::${obs.topic ?? ""}::${obs.audience ?? ""}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(obs);
    else groups.set(key, [obs]);
  }

  const rows: PatternPerformanceRow[] = [];
  for (const bucket of groups.values()) {
    const sampleSize = bucket.length;
    const first = bucket[0];
    if (!first) continue;
    rows.push({
      pattern_id: first.patternId,
      topic: first.topic,
      audience: first.audience,
      posts_analyzed: sampleSize,
      impressions_median: median(bucket.map((o) => o.impressions).filter((v): v is number => v !== null)),
      engagement_rate_median: median(
        bucket.map((o) => o.engagementRate).filter((v): v is number => v !== null)
      ),
      comments_median: median(bucket.map((o) => o.comments).filter((v): v is number => v !== null)),
      confidence: confidenceFromSampleSize(sampleSize)
    });
  }

  return rows.sort((a, b) => (b.posts_analyzed ?? 0) - (a.posts_analyzed ?? 0));
}

/**
 * Formats a pattern-performance row into the disclosure-first sentence
 * shape required by the spec, e.g.:
 *   "Story -> Lesson: posts analyzed 18, median engagement rate 4.2%, confidence: medium"
 * Never says "causes" or "leads to".
 */
export function describeObservation(row: PatternPerformanceRow, patternName: string): string {
  const rate =
    row.engagement_rate_median !== null ? `${(row.engagement_rate_median * 100).toFixed(1)}%` : "not enough data";
  return `${patternName} is associated with a median engagement rate of ${rate}, based on ${row.posts_analyzed} post${row.posts_analyzed === 1 ? "" : "s"} analyzed (confidence: ${row.confidence}).`;
}
