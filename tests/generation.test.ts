import { describe, expect, it } from "vitest";
import { buildGenerationContext } from "@/lib/generation/context";
import { PostGenerator } from "@/lib/generation/generator";
import { extractPatternFromPost } from "@/lib/patterns/extract";
import { analyzeVoice } from "@/lib/voice/analyze";
import { generationContextSchema } from "@/lib/types/schemas";
import type { ContentPattern, VoiceProfile } from "@/lib/types/schemas";

const VOICE: VoiceProfile = {
  id: "voice-1",
  name: "Test Voice",
  tone: ["direct"],
  sentence_length: { average_words: 14, variance: "medium" },
  paragraph_length: { average_sentences: 2, style: "short" },
  vocabulary: { complexity: "moderate", jargon_level: "light", signature_words: [] },
  formality: "conversational",
  humor_level: "light",
  storytelling_level: "occasional",
  formatting_style: {
    uses_line_breaks: true,
    uses_bullets: true,
    uses_bold: false,
    uses_emoji: false,
    uses_numbers_and_data: true,
    asks_questions: true,
    cta_style: "ends with a question"
  },
  things_to_avoid: [],
  sample_count: 3
};

const PATTERN: ContentPattern = {
  id: "pattern-1",
  name: "Contrarian Claim -> Evidence",
  category: "hook",
  description: "Challenges conventional wisdom then backs it with evidence.",
  structure: ["claim", "evidence", "takeaway"],
  example: null,
  strengths: [],
  weaknesses: []
};

describe("buildGenerationContext (draft generation inputs)", () => {
  it("throws when no pattern is selected - generation must be grounded", () => {
    expect(() =>
      buildGenerationContext({
        topic: "GTM engineering",
        audience: "founders",
        objective: "discussion",
        voiceProfile: VOICE,
        selectedPatterns: [],
        research: [],
        relevantVoiceExamples: []
      })
    ).toThrow();
  });

  it("builds a schema-valid context given valid inputs", () => {
    const context = buildGenerationContext({
      topic: "GTM engineering",
      audience: "founders",
      objective: "discussion",
      voiceProfile: VOICE,
      selectedPatterns: [PATTERN],
      research: [],
      relevantVoiceExamples: ["a past example"]
    });
    expect(generationContextSchema.safeParse(context).success).toBe(true);
  });
});

describe("PostGenerator (mock provider)", () => {
  it("generates a schema-valid post grounded in the given context", async () => {
    const context = buildGenerationContext({
      topic: "GTM engineering",
      audience: "B2B SaaS founders",
      objective: "Generate discussion",
      voiceProfile: VOICE,
      selectedPatterns: [PATTERN],
      research: [
        {
          title: "Demo research",
          author: "Demo Author",
          source_url: "https://demo-research.fictional/gtm-1",
          source_type: "article",
          published_at: null,
          content: "[FICTIONAL] demo content about GTM engineering.",
          metadata: {}
        }
      ],
      relevantVoiceExamples: []
    });

    const generator = new PostGenerator();
    const generated = await generator.generate(context);

    expect(generated.content.length).toBeGreaterThan(0);
    expect(generated.generation_metadata.research_sources).toEqual(["https://demo-research.fictional/gtm-1"]);
    expect(generated.generation_metadata.provider).toBe("mock");
  });
});

describe("extractPatternFromPost (mock provider, evidence-based extraction)", () => {
  it("returns a schema-valid, evidence-based extraction", async () => {
    const extraction = await extractPatternFromPost({
      content: "Why does onboarding always break at month three?\n\n1. Ownership gaps\n2. No review cadence",
      author: "Demo Author",
      sourceUrl: "https://demo.fictional/post-1"
    });

    expect(extraction.hook.type).toBe("question");
    expect(extraction.structure.length).toBeGreaterThan(0);
    expect(extraction.confidence).toBeGreaterThanOrEqual(0);
    expect(extraction.confidence).toBeLessThanOrEqual(1);
  });
});

describe("analyzeVoice (mock provider, built only from provided samples)", () => {
  it("throws with zero samples rather than fabricating a profile", async () => {
    await expect(analyzeVoice([])).rejects.toThrow();
  });

  it("returns a schema-valid profile derived from the given samples", async () => {
    const profile = await analyzeVoice([
      { content: "Most people over-think this. In my experience, simple wins. What's your take?" }
    ]);
    expect(profile.sample_count).toBe(1);
    expect(profile.formatting_style.asks_questions).toBe(true);
  });
});
