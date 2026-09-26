import { describe, expect, it } from "vitest";
import {
  patternExtractionSchema,
  voiceProfileSchema,
  criticResultSchema,
  generationContextSchema,
  draftSchema
} from "@/lib/types/schemas";

const VALID_PATTERN_EXTRACTION = {
  hook: { type: "contrarian", evidence: "Opens by challenging a common belief in the first sentence." },
  opening_mechanism: "direct assertion",
  core_claim: "Most teams under-invest in X.",
  structure: ["claim", "evidence", "takeaway"],
  storytelling_mechanism: null,
  evidence: ["personal_experience"],
  formatting_style: {
    uses_line_breaks: true,
    uses_bullets: false,
    uses_bold: false,
    uses_emoji: false,
    approx_length: "medium"
  },
  cta: { type: "question", evidence: "Ends with a direct question." },
  audience: "B2B SaaS operators",
  topic: "GTM engineering",
  pattern: { name: "Contrarian Claim", category: "hook", description: "Challenges a common belief." },
  confidence: 0.8
};

describe("patternExtractionSchema", () => {
  it("accepts a well-formed extraction", () => {
    expect(patternExtractionSchema.safeParse(VALID_PATTERN_EXTRACTION).success).toBe(true);
  });

  it("rejects an unknown hook type (must not invent characteristics)", () => {
    const result = patternExtractionSchema.safeParse({
      ...VALID_PATTERN_EXTRACTION,
      hook: { type: "made_up_hook_type", evidence: "x" }
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside [0, 1]", () => {
    const result = patternExtractionSchema.safeParse({ ...VALID_PATTERN_EXTRACTION, confidence: 1.5 });
    expect(result.success).toBe(false);
  });

  it("requires at least one structure stage", () => {
    const result = patternExtractionSchema.safeParse({ ...VALID_PATTERN_EXTRACTION, structure: [] });
    expect(result.success).toBe(false);
  });
});

const VALID_VOICE_PROFILE = {
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
  things_to_avoid: ["jargon"],
  sample_count: 5
};

describe("voiceProfileSchema", () => {
  it("accepts a well-formed voice profile", () => {
    expect(voiceProfileSchema.safeParse(VALID_VOICE_PROFILE).success).toBe(true);
  });

  it("rejects an invalid formality value", () => {
    const result = voiceProfileSchema.safeParse({ ...VALID_VOICE_PROFILE, formality: "chill" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing formatting_style", () => {
    const { formatting_style: _drop, ...rest } = VALID_VOICE_PROFILE;
    expect(voiceProfileSchema.safeParse(rest).success).toBe(false);
  });

  it("defaults sample_count and signature_words when omitted", () => {
    const { sample_count: _sc, ...withoutSampleCount } = VALID_VOICE_PROFILE;
    const result = voiceProfileSchema.safeParse(withoutSampleCount);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sample_count).toBe(0);
  });
});

describe("criticResultSchema", () => {
  it("accepts a well-formed critic result with explicit checks (no bare score)", () => {
    const result = criticResultSchema.safeParse({
      issues: ["No CTA present."],
      strengths: ["Clear structure."],
      checks: {
        relevance: true,
        specificity: false,
        clarity: true,
        evidence: true,
        voice_match: true,
        originality: true,
        structure: true,
        cta_alignment: false,
        no_unsupported_claims: true,
        no_generic_language: true
      },
      suggested_revisions: ["Add a specific example."]
    });
    expect(result.success).toBe(true);
  });

  it("rejects a critic result missing a required check field", () => {
    const result = criticResultSchema.safeParse({
      issues: [],
      strengths: [],
      checks: { relevance: true },
      suggested_revisions: []
    });
    expect(result.success).toBe(false);
  });
});

describe("generationContextSchema", () => {
  it("requires at least one selected pattern (generation must be grounded)", () => {
    const result = generationContextSchema.safeParse({
      topic: "GTM engineering",
      audience: "founders",
      objective: "discussion",
      voice_profile: VALID_VOICE_PROFILE,
      selected_patterns: [],
      research: [],
      relevant_voice_examples: []
    });
    expect(result.success).toBe(false);
  });
});

describe("draftSchema", () => {
  it("defaults status to draft", () => {
    const result = draftSchema.safeParse({
      topic: "t",
      audience: "a",
      objective: "o",
      voice_profile_id: null,
      selected_pattern_id: null,
      content: "content"
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("draft");
  });
});
