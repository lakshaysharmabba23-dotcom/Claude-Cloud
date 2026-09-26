import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { normalizeDocument } from "@/lib/normalization/normalize";

const payloadSchema = z.object({
  source_url: z.string().url(),
  content: z.string().min(1),
  author: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  source_type: z.enum(["article", "linkedin_post", "blog", "news", "forum", "other"]).optional()
});

/**
 * Normalizes one freshly-collected source post (URL canonicalization,
 * content hashing) so it's ready to be inserted into source_posts and
 * picked up by the extractPatterns task. Split out from researchTopicTask
 * so a single post's normalization can be retried independently of the
 * broader research batch it came from.
 */
export const analyzeSourcePostTask = task({
  id: "analyze-source-post",
  retry: { maxAttempts: 3 },
  run: async (payload: unknown) => {
    const input = payloadSchema.parse(payload);
    const normalized = normalizeDocument(input);
    logger.info("Normalized source post", {
      sourceUrl: normalized.source_url,
      canonicalUrl: normalized.canonical_url,
      contentHash: normalized.content_hash
    });
    return normalized;
  }
});
