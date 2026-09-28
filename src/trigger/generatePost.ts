import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { runStudioPipeline } from "@/lib/generation/pipeline";
import { createDraft } from "@/lib/data/repository";
import { postLengthSchema } from "@/lib/types/schemas";

const payloadSchema = z.object({
  topic: z.string().min(2),
  audience: z.string().min(2),
  objective: z.string().min(2),
  selectedPatternId: z.string().optional(),
  sourceUrls: z.array(z.string().url()).optional(),
  researchDepth: z.enum(["quick", "standard", "deep"]).optional(),
  postLength: postLengthSchema.optional()
});

/**
 * Runs the full research -> retrieval -> generation -> critique pipeline in
 * the background and stores the result as a new draft awaiting human
 * review. This mirrors POST /api/studio/generate; the API route is used
 * for the interactive Studio UI (where the request completes within one
 * HTTP round trip against mock/fast providers), while this task exists for
 * programmatic/batch generation (e.g. "generate one candidate post per day
 * for review") where retries and background execution matter more.
 */
export const generatePostTask = task({
  id: "generate-post",
  retry: { maxAttempts: 2 },
  run: async (payload: unknown) => {
    const input = payloadSchema.parse(payload);
    logger.info("Running generation pipeline", { topic: input.topic, audience: input.audience });

    const result = await runStudioPipeline(input);

    const draft = await createDraft({
      topic: input.topic,
      audience: input.audience,
      objective: input.objective,
      voice_profile_id: result.voiceProfile.id ?? null,
      selected_pattern_id: result.selectedPatternIds[0] ?? null,
      content: result.generated.content,
      status: "critiqued",
      critique: result.critique,
      generation_metadata: result.generated.generation_metadata
    });

    logger.info("Draft created, awaiting human review", { draftId: draft.id });
    return { draft, ...result };
  }
});
