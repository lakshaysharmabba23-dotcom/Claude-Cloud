import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { extractPatternsForPosts } from "@/lib/patterns/extract";

const payloadSchema = z.object({
  posts: z
    .array(
      z.object({
        id: z.string(),
        content: z.string(),
        author: z.string().nullable().optional(),
        sourceUrl: z.string().url()
      })
    )
    .min(1)
});

/**
 * Batch pattern extraction over normalized source posts. Each post's
 * extraction is independent and tolerant of individual failures (see
 * extractPatternsForPosts) - this task logs a structured success/failure
 * count rather than failing the whole batch if a handful of posts don't
 * validate.
 */
export const extractPatternsTask = task({
  id: "extract-patterns",
  retry: { maxAttempts: 2 },
  run: async (payload: unknown) => {
    const input = payloadSchema.parse(payload);
    logger.info("Extracting patterns", { postCount: input.posts.length });

    const results = await extractPatternsForPosts(input.posts);
    const succeeded = results.filter((r) => "extraction" in r);
    const failed = results.filter((r) => "error" in r);

    logger.info("Pattern extraction batch complete", {
      succeeded: succeeded.length,
      failed: failed.length
    });
    if (failed.length) {
      logger.warn("Some posts failed pattern extraction", { failed });
    }

    return { results };
  }
});
