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

/**
 * House copywriting rules. These apply on top of the pattern/voice/model-post
 * guidance and exist to stop "AI slop": the creator posts this project was
 * built from are all short, plain and concrete, so the output must be too.
 */
export const COPYWRITING_PROMPT = [
  "COPYWRITING RULES (follow strictly):",
  "1. Write like a smart person texting a friend who works in the same field. Spoken English, not essay English.",
  "2. Use simple, everyday words. A 12-year-old should follow every sentence. If a plain word exists, use it (use, not utilize; help, not facilitate; start, not initiate).",
  "3. Match the line length to the idea. If one short line is enough for the reader to get it, use one line. If it needs more to make sense, use two or three lines (or a short paragraph) to explain it properly. Do not chop a real explanation into one-liners just for style, and do not pad a simple point. Mix it up like a real person would: a short punchy line, then a few lines of explanation, then short again. Keep every sentence plain and easy to read.",
  "4. The first line is the hook. It must make someone stop scrolling: a specific number, a blunt claim, or a small story. No warm-up, no 'In today's world'.",
  "5. Be concrete. Prefer a real number, a real example or a real moment over a general statement. If you do not have a real fact, say less instead of making one up.",
  "6. Say what happened and what you learned. Show, do not preach. No lectures, no motivational tone.",
  "7. Never use these words or styles: leverage, unlock, delve, game-changer, revolutionize, seamless, cutting-edge, robust, ecosystem, landscape, journey, synergy, empower, elevate, streamline, paradigm, holistic, 'it's not just X, it's Y', 'Here's the thing', 'Let that sink in', rhetorical triplets for rhythm, em dashes, emojis, hashtags.",
  "8. No jargon unless the audience uses that exact word daily. If you must use a term, make the meaning obvious from the sentence.",
  "9. Do not summarize at the end and do not repeat the hook. End with one specific, easy question a real reader could answer in a sentence.",
  "10. Do NOT put source markers like [R1], [R2, R3], [V1] or [M1] inside the post text. The post must read as finished copy a person could publish as-is. Put the markers only in the evidence_used list. If you mention a fact, work the source into the sentence in plain words only when it helps (for example 'a Hacker News thread this week said...').",
  "11. Before answering, reread the post and cut every word that does not earn its place. If a line sounds like a LinkedIn guru or a press release, rewrite it plainly."
].join("\n");

const MARKER_GROUP = /\s*\[\s*(?:[RVM]\d+)(?:\s*[,;]\s*[RVM]\d+)*\s*\]/g;

/** Removes internal source markers ([R1], [R2, R3], [V1], [M1]) from post copy and returns them separately. */
export function stripSourceMarkers(text: string): { content: string; markers: string[] } {
  const markers: string[] = [];
  const content = text
    .replace(MARKER_GROUP, (m) => {
      markers.push(...(m.match(/[RVM]\d+/g) ?? []));
      return "";
    })
    .replace(/[ \t]+([.,;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return { content, markers };
}

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
      COPYWRITING_PROMPT,
      "",
      "You write an original LinkedIn post grounded in the given research and one selected content pattern.",
      "You must SYNTHESIZE, not copy: do not lift sentences verbatim from the research block.",
      "Only reference facts/examples present in the research block - never invent a statistic, study, or example.",
      "Match the target voice profile as closely as possible.",
      "Model the structure and craft of the high-engagement creator posts provided: a hook that lands in the first line, line breaks that fit the idea (a one-liner where one line is enough, a few lines where it needs explaining), concrete numbers or specifics, plain words, and a closing line that invites a reply. Learn their rhythm and structure - never reuse their sentences or facts.",
      "List the research items you drew on (e.g. ['R1']) in evidence_used only - never inside the post content."
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

    // Safety net: models sometimes leave internal markers like [R2, R3] in the
    // copy anyway. Pull them out into evidence_used and clean the text.
    const { content, markers } = stripSourceMarkers(result.content);
    const evidence_used = Array.from(new Set([...(result.evidence_used ?? []), ...markers]));

    return {
      ...result,
      content,
      evidence_used,
      generation_metadata: {
        model: ai.model,
        provider: ai.name,
        research_sources: context.research.map((d) => d.source_url),
        voice_profile_id: context.voice_profile.id ?? null
      }
    };
  }
}
