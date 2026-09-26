import { listPublishedPosts, listPerformance, listPatternPerformance, listPatterns } from "@/lib/data/repository";
import { AnalyticsClient } from "./analytics-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [published, performance, patternPerformance, patterns] = await Promise.all([
    listPublishedPosts(),
    listPerformance(),
    listPatternPerformance(),
    listPatterns()
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="mt-1 text-sm text-ink-400">
          Manually-entered performance, and what it&apos;s <em>associated with</em> - never a causal claim.
          Every row discloses its sample size and confidence.
        </p>
      </div>
      <AnalyticsClient
        published={published}
        performance={performance}
        patternPerformance={patternPerformance}
        patterns={patterns}
      />
    </div>
  );
}
