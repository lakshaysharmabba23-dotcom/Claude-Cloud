import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { critiquePost as runCritique } from "@/lib/critic/critic";
import { updateDraft } from "@/lib/data/repository";

const payloadSchema = z.object({
  draftId: z.string(),
  draftContent: z.string().min(1),
  topic: z.string(),
  audience: z.string(),
  objective: z.string(),
  voiceProfileSummary: z.string(),
  selectedPatternName: z.string(),
  sourceTexts: z.array(z.string()).default([])
});

/**
 * Re-runs the critic on a draft (e.g. after a human edit, to check the
 * edited version still passes the explicit checks) and stores the result.
 * Kept as its own task so critique can be retried/re-run independently of
 * generation.
 */
export const critiquePostTask = task({
  id: "critique-post",
  retry: { maxAttempts: 2 },
  run: async (payload: unknown) => {
    const input = payloadSchema.parse(payload);
    logger.info("Critiquing draft", { draftId: input.draftId });

    const critique = await runCritique(input);
    await updateDraft(input.draftId, { status: "critiqued", critique });

    const failedChecks = Object.entries(critique.checks).filter(([, passed]) => !passed);
    logger.info("Critique complete", {
      draftId: input.draftId,
      failedChecks: failedChecks.map(([name]) => name)
    });

    return { critique };
  }
});
