import { logger, task, schedules } from "@trigger.dev/sdk/v3";
import { recomputePatternPerformance } from "@/lib/data/repository";

/**
 * Recomputes the pattern_performance feedback-loop table from all recorded
 * published posts + manually-entered performance snapshots. This is what
 * closes the loop described in docs/feedback-loop.md: it never runs
 * automatically off of fabricated or scraped metrics, only off of what a
 * human has entered via the Analytics page (see /api/performance).
 *
 * Exposed both as an on-demand task (triggered right after a new
 * performance snapshot is saved - see /api/performance/route.ts) and as a
 * scheduled task, so the aggregation stays fresh even if a snapshot is
 * added through a path other than the UI (e.g. bulk import).
 */
export const analyzePerformanceTask = task({
  id: "analyze-performance",
  retry: { maxAttempts: 2 },
  run: async () => {
    logger.info("Recomputing pattern performance aggregation");
    const rows = await recomputePatternPerformance();
    logger.info("Pattern performance aggregation complete", { rowCount: rows.length });
    return { rows };
  }
});

/** Nightly safety-net recompute, in addition to the on-demand trigger. */
export const nightlyPerformanceRecompute = schedules.task({
  id: "nightly-performance-recompute",
  cron: "0 4 * * *",
  run: async () => {
    logger.info("Nightly pattern performance recompute starting");
    const rows = await recomputePatternPerformance();
    logger.info("Nightly pattern performance recompute complete", { rowCount: rows.length });
    return { rows };
  }
});
