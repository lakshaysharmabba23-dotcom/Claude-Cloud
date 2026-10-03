import { getAIProvider } from "@/lib/ai";
import { summarizeVoiceProfile } from "@/lib/voice/analyze";
import { generatedPostSchema, type GeneratedPost, type GenerationContext } from "@/lib/types/schemas";

/**
 * PostGenerator: synthesizes an original post from a structured
 * GenerationContext (topic, audience, objective, voice profile, selected
 * patterns, research, relevant voice examples).
 *
 * Explicit non-goals, enforced via the prompt:
 *   - Never copy source research content verbatim (the critic's originality
 *     check independently verifies this - see src/lib/critic/deterministic.ts).
 *   - Never present a research fact more strongly than its source supports.
 *   - Only draw on the research/facts actually included in the context -
 *     never invent a statistic or example that wasn't provided.
 */
const LENGTH_SPEC: Record<GenerationContext["post_length"], { instruction: string; maxTokens: number }> = {
  short: { instruction: "Target length: SHORT - roughly 60-100 words, 3-5 short lines. Get to the point fast.", maxTokens: 500 },
  medium: { instruction: "Target length: MEDIUM - roughly 120-200 words, the typical LinkedIn post length.", maxTokens: 1000 },
  long: {
    instruction: "Target length: LONG - roughly 250-400 words, with room for a fuller story or more detailed breakdown.",
    maxTokens: 1800
  }
};

export class PostGenerator {
  async generate(context: GenerationContext): Promise<GeneratedPost> {
    const ai = getAIProvider();
    const lengthSpec = LENGTH_SPEC[context.post_length];

    const patternDescriptions = context.selected_patterns
      .map((p) => `- ${p.name} (${p.category}): ${p.description}\n  Typical structure: ${p.structure.join(" -> ")}`)
      .join("\n");

    const researchBlock = context.research.length
      ? context.research
          .map((doc, i) => `[R${i + 1}] ${doc.title ?? doc.source_url} (${doc.source_url})\n${doc.content.slice(0, 600)}`)
          .join("\n\n")
      : "No external research was provided - rely only on general, non-fabricated framing and invite the reader's own experience rather than citing invented facts.";

    const voiceExamplesBlock = context.relevant_voice_examples.length
      ? context.relevant_voice_examples.map((ex, i) => `[V${i + 1}] ${ex}`).join("\n\n")
      : "No prior voice examples were retrieved.";

    const modelPostsBlock = context.model_posts.length
      ? context.model_posts
          .map(
            (m, i) =>
              `[M${i + 1}] ${m.author} (${m.likes} likes, ${m.comments} comments)\n${m.content.slice(0, 1400)}`
          )
          .join("\n\n---\n\n")
      : "";

    const system = [
      "You write an original LinkedIn post grounded in the given research and one selected content pattern.",
      "You must SYNTHESIZE, not copy: do not lift sentences verbatim from the research block.",
      "Only reference facts/examples present in the research block - never invent a statistic, study, or example.",
      "Match the target voice profile as closely as possible.",
      "Model the structure and craft of the high-engagement creator posts provided: a hook that lands in the first line, one idea per short line with white space, concrete numbers or specifics, plain words, and a closing line that invites a reply. Learn their rhythm and structure - never reuse their sentences or facts.",
      "If you use a fact from the research, cite it inline as e.g. [R1] so evidence_used can reference it."
    ].join(" ");

    const prompt = [
      `Topic: ${context.topic}`,
      `Audience: ${context.audience}`,
      `Objective: ${context.objective}`,
      lengthSpec.instruction,
      "",
      `Target voice: ${summarizeVoiceProfile(context.voice_profile)}`,
      "",
      "Selected pattern(s) to follow:",
      patternDescriptions,
      "",
      "Research available to ground this post:",
      researchBlock,
      "",
      ...(modelPostsBlock
        ? [
            "Top-performing posts by real GTM creators (study WHY they work - hook, line breaks, specificity, ending - then write something new; do not copy wording or claim their facts):",
            modelPostsBlock,
            ""
          ]
        : []),
      "Reference voice examples (match this writer's style, do not copy content):",
      voiceExamplesBlock,
      "",
      "Write one LinkedIn post. Return the post content, which pattern name you followed, the evidence markers you used (e.g. ['R1']), and the CTA type you used."
    ].join("\n");

    // The model only writes the post itself; generation_metadata is filled
    // in below from what we actually used, so it isn't asked for it.
    const result = await ai.completeStructured<Omit<GeneratedPost, "generation_metadata">>({
      system,
      prompt,
      schema: generatedPostSchema.omit({ generation_metadata: true }),
      schemaName: "generated_post",
      temperature: 0.8,
      maxTokens: lengthSpec.maxTokens
    });

    return {
      ...result,
      generation_metadata: {
        model: ai.model,
        provider: ai.name,
        research_sources: context.research.map((d) => d.source_url),
        voice_profile_id: context.voice_profile.id ?? null
      }
    };
  }
}
