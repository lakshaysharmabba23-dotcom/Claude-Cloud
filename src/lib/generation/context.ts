import type { ContentPattern, GenerationContext, PostLength, ResearchDocument, VoiceProfile } from "@/lib/types/schemas";

/**
 * Assembles the structured generation context: everything the PostGenerator
 * is allowed to draw on. Building this as an explicit, inspectable object
 * (rather than a single freeform prompt string) is what keeps generation
 * "grounded" rather than an open-ended chat completion - the studio UI
 * shows this exact context to the user alongside the generated post.
 */
export function buildGenerationContext(params: {
  topic: string;
  audience: string;
  objective: string;
  voiceProfile: VoiceProfile;
  selectedPatterns: ContentPattern[];
  research: ResearchDocument[];
  relevantVoiceExamples: string[];
  postLength?: PostLength;
}): GenerationContext {
  if (params.selectedPatterns.length === 0) {
    throw new Error("At least one content pattern must be selected to ground generation.");
  }

  return {
    topic: params.topic,
    audience: params.audience,
    objective: params.objective,
    voice_profile: params.voiceProfile,
    selected_patterns: params.selectedPatterns,
    research: params.research,
    relevant_voice_examples: params.relevantVoiceExamples,
    post_length: params.postLength ?? "medium"
  };
}
