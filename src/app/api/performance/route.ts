import { NextResponse } from "next/server";
import { performanceSnapshotInputSchema } from "@/lib/types/schemas";
import { addPerformanceSnapshot, recomputePatternPerformance } from "@/lib/data/repository";

/**
 * Manual performance entry. Metrics are never fetched automatically or
 * fabricated - every field here is what a human typed in after checking
 * LinkedIn's own analytics.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = performanceSnapshotInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const snapshot = await addPerformanceSnapshot(parsed.data);
    // Recompute the feedback-loop aggregation immediately so /analytics
    // reflects this new data point without a separate background step.
    await recomputePatternPerformance();
    return NextResponse.json({ snapshot });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
