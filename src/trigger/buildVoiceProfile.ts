import { logger, task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { analyzeVoice } from "@/lib/voice/analyze";
import { saveVoiceProfile, addVoiceExamples } from "@/lib/data/repository";

const payloadSchema = z.object({
  voiceProfileId: z.string().optional(),
  samples: z.array(z.object({ content: z.string().min(20), source: z.string().optional() })).min(1)
});

/**
 * Builds/updates a structured voice profile from newly-added writing
 * samples and persists both the profile and the raw examples. Run as a
 * background task so adding a large batch of samples (e.g. an uploaded
 * archive of past posts) doesn't block the Voice Lab UI on one long model
 * call.
 */
export const buildVoiceProfileTask = task({
  id: "build-voice-profile",
  retry: { maxAttempts: 2 },
  run: async (payload: unknown) => {
    const input = payloadSchema.parse(payload);
    logger.info("Building voice profile", { sampleCount: input.samples.length });

    const profile = await analyzeVoice(input.samples);
    const saved = await saveVoiceProfile({ ...profile, id: input.voiceProfileId ?? profile.id });
    const examples = await addVoiceExamples(saved.id ?? "", input.samples);

    logger.info("Voice profile updated", { voiceProfileId: saved.id, exampleCount: examples.length });
    return { profile: saved };
  }
});
