import { getAIProvider } from "@/lib/ai";
import { voiceProfileSchema, type VoiceProfile } from "@/lib/types/schemas";

/**
 * Builds a structured voice profile from the user's OWN writing samples.
 *
 * This is the only input the profile is built from - there is no "imitate
 * this public figure" mode anywhere in this codebase. The prompt states
 * that constraint explicitly so a real model provider can't drift into
 * describing a generic "LinkedIn thought leader" voice instead of the
 * specific person's writing in front of it.
 */
export async function analyzeVoice(samples: Array<{ content: string; source?: string }>): Promise<VoiceProfile> {
  if (samples.length === 0) {
    throw new Error("At least one writing sample is required to build a voice profile.");
  }

  const ai = getAIProvider();

  const system = [
    "You analyze a person's own writing samples to build a structured description of THEIR writing voice.",
    "You are not describing a public figure, a brand, or a generic 'LinkedIn voice' - only the specific writing given to you.",
    "Base every field strictly on patterns you can observe across the provided samples."
  ].join(" ");

  const combined = samples
    .map((s, i) => `SAMPLE ${i + 1}${s.source ? ` (${s.source})` : ""}:\n${s.content}`)
    .join("\n\n---\n\n");

  const prompt = [
    `Here are ${samples.length} writing sample(s) from one person:`,
    "",
    combined,
    "",
    "Analyze tone, sentence length, paragraph length, vocabulary, formality, humor level, storytelling level, formatting habits (line breaks, bullets, bold, emoji, numbers/data, questions), typical CTA style, and anything this writer's voice conspicuously avoids.",
    "Return a structured voice profile."
  ].join("\n");

  const profile = await ai.completeStructured<VoiceProfile>({
    system,
    prompt,
    schema: voiceProfileSchema,
    schemaName: "voice_profile",
    temperature: 0.2,
    maxTokens: 1200
  });

  return { ...profile, sample_count: samples.length };
}

/** A short, prompt-ready natural-language summary of a voice profile, used by generation and critique. */
export function summarizeVoiceProfile(profile: VoiceProfile): string {
  const parts = [
    `Tone: ${profile.tone.join(", ")}`,
    `Formality: ${profile.formality}`,
    `Sentence length: avg ${profile.sentence_length.average_words} words (${profile.sentence_length.variance} variance)`,
    `Paragraphs: ${profile.paragraph_length.style}`,
    `Vocabulary: ${profile.vocabulary.complexity}, jargon ${profile.vocabulary.jargon_level}`,
    `Humor: ${profile.humor_level}`,
    `Storytelling: ${profile.storytelling_level}`,
    `Formatting: ${[
      profile.formatting_style.uses_bullets && "bullets",
      profile.formatting_style.uses_line_breaks && "line breaks",
      profile.formatting_style.uses_bold && "bold text",
      profile.formatting_style.uses_emoji && "emoji",
      profile.formatting_style.asks_questions && "rhetorical questions"
    ]
      .filter(Boolean)
      .join(", ") || "plain prose"}`,
    `CTA style: ${profile.formatting_style.cta_style}`,
    profile.things_to_avoid.length ? `Avoid: ${profile.things_to_avoid.join(", ")}` : null
  ].filter(Boolean);

  return parts.join(". ");
}
