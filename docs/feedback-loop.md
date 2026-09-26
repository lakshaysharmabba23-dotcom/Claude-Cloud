# Performance & the feedback loop

## Performance is always manually entered

There is no code path anywhere that fetches, scrapes, or estimates LinkedIn engagement metrics. `POST /api/performance` (backing the form on `/analytics`) is the only way a `post_performance` row is created, and every field is exactly what a human typed in after checking LinkedIn's own analytics for a post. Multiple snapshots per post are expected and supported - performance is measured over time, not once.

## Engagement rate math

`src/lib/performance/calculations.ts`:

```
engagement_rate = (likes + comments + reposts) / impressions
```

- Missing or zero `impressions` -> `null`, never a fabricated `0%` or a divide-by-zero.
- Missing `likes`/`comments`/`reposts` are treated as `0` (an entered-but-blank field, not "unmeasurable" like impressions).
- `median()` of an empty array is `null` - the same "don't invent a number from no data" rule, used everywhere a distribution needs summarizing.

## Aggregation: `aggregatePatternPerformance()`

`src/lib/performance/aggregation.ts` groups performance observations by `(pattern, topic, audience)` and computes, per group: `posts_analyzed` (the group size - always shown), `impressions_median`, `engagement_rate_median`, `comments_median`, and a `confidence` derived purely from sample size (`confidenceFromSampleSize`: <8 -> low, 8-19 -> medium, 20+ -> high). This recomputation runs on demand right after a new snapshot is saved (`recomputePatternPerformance()`, called from the performance API route) and also on a nightly Trigger.dev schedule as a safety net.

**This is descriptive, not inferential statistics.** The confidence label communicates "how much data backs this," not a p-value or a causal claim - and the code enforces that framing structurally:

- `describeObservation()` renders a fixed sentence template - *"X is **associated with** a median engagement rate of Y%, **based on N posts analyzed** (confidence: Z)"* - there's no code path that produces a causal phrasing ("causes", "leads to", "results in"); this is asserted directly in `tests/performance.test.ts`.
- The Analytics UI (`/analytics`) never shows a median rate without its `posts_analyzed` count and confidence badge sitting right next to it in the same table cell/row - there's no summary view that drops the sample size.

## What the Analytics page shows

`src/app/analytics/analytics-client.tsx`, all derived from the same `pattern_performance` rows (no separate storage or separate logic per breakdown):

- **Performance over time** - raw snapshots, chronological.
- **Performance by pattern** - the core aggregation, grouped by pattern (+ topic).
- **Performance by topic** - the same rows regrouped by topic.
- **Performance by hook type** / **by CTA type** - the same rows filtered to patterns whose `category` is `hook` or `cta` respectively (hook/CTA type is an attribute of the pattern, not a separate dimension to track).

## Closing the loop

The Studio's pattern selector (`/studio`) and the Pattern Library (`/patterns`) both surface `pattern_performance` inline next to each pattern - so a pattern with a strong observed association (high sample size, high median engagement) is visible at the moment you're choosing what to generate next, not buried in a separate report. This is the actual "feed insights back into future recommendations" loop: it's a visibility mechanism (show the data where the decision is made), not an automated "always pick the top pattern" black box - the human still chooses.
