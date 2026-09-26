import { logger, task } from "@trigger.dev/sdk/v3";
import { researchTopic as runResearch } from "@/lib/research";
import { researchRequestSchema } from "@/lib/types/schemas";

/**
 * Long-running research job: search -> scrape (N pages) -> normalize ->
 * dedupe -> fact extraction. Wrapped as a Trigger.dev task (rather than run
 * inline in an API route) because a "deep" research request can involve
 * 10+ sequential network fetches, which is exactly the kind of work that
 * benefits from durable retries and background execution instead of
 * blocking an HTTP request.
 */
export const researchTopicTask = task({
  id: "research-topic",
  retry: { maxAttempts: 3 },
  run: async (payload: unknown) => {
    const input = researchRequestSchema.parse(payload);
    logger.info("Starting topic research", { topic: input.topic, audience: input.audience });

    const documents = await runResearch(input);

    logger.info("Topic research complete", {
      topic: input.topic,
      documentsFound: documents.length,
      sourceUrls: documents.map((d) => d.source_url)
    });

    return { documents };
  }
});
