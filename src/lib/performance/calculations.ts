/**
 * Performance math. Every number here is computed from manually-entered
 * metrics - nothing here ever invents a metric that wasn't entered.
 */

export interface RawMetrics {
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  reposts: number | null;
  profile_views?: number | null;
  clicks?: number | null;
}

/**
 * Engagement rate = (likes + comments + reposts) / impressions.
 * Returns null when impressions is missing or zero, rather than dividing by
 * zero or fabricating a number - an unmeasurable rate is reported as
 * unmeasurable, not as 0%.
 */
export function calculateEngagementRate(metrics: RawMetrics): number | null {
  if (!metrics.impressions || metrics.impressions <= 0) return null;
  const engagements = (metrics.likes ?? 0) + (metrics.comments ?? 0) + (metrics.reposts ?? 0);
  return round(engagements / metrics.impressions, 4);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Median of a numeric array; null for an empty array (never fabricate a value from no data). */
export function median(values: number[]): number | null {
  const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  const mid = Math.floor(clean.length / 2);
  if (clean.length % 2 === 0) return round(((clean[mid - 1] ?? 0) + (clean[mid] ?? 0)) / 2, 4);
  return round(clean[mid] ?? 0, 4);
}

/**
 * Confidence in an observed pattern/topic correlation, based purely on
 * sample size. This is intentionally conservative and purely descriptive of
 * "how much data backs this" - it is not a statistical significance test,
 * and callers must still phrase findings as "associated with", never
 * "causes".
 */
export function confidenceFromSampleSize(sampleSize: number): "low" | "medium" | "high" {
  if (sampleSize >= 20) return "high";
  if (sampleSize >= 8) return "medium";
  return "low";
}
