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
        <div className="eyebrow mb-3">Content Intelligence</div>
        <h1 className="display text-4xl sm:text-5xl">Analytics</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-200">
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
