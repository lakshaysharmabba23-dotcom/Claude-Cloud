import { z } from "zod";

/**
 * Canonical Zod schemas for every structured object that moves through the
 * pipeline. These are the single source of truth for validation - API
 * routes, Trigger.dev tasks, and tests all import from here rather than
 * redefining shapes inline.
 */

// -----------------------------------------------------------------------------
// Research layer
// -----------------------------------------------------------------------------

export const researchDocumentSchema = z.object({
  title: z.string().min(1).nullable(),
  author: z.string().nullable(),
  source_url: z.string().url(),
  source_type: z.enum(["article", "linkedin_post", "blog", "news", "forum", "other"]),
  published_at: z.string().nullable(),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).default({})
});
export type ResearchDocument = z.infer<typeof researchDocumentSchema>;

export const researchRequestSchema = z.object({
  topic: z.string().min(2),
  audience: z.string().min(2),
  sourceUrls: z.array(z.string().url()).optional(),
  creatorIds: z.array(z.string()).optional(),
  maxResults: z.number().int().positive().max(25).default(8)
});
export type ResearchRequest = z.infer<typeof researchRequestSchema>;

// -----------------------------------------------------------------------------
// Pattern extraction layer
// -----------------------------------------------------------------------------

export const hookTypeSchema = z.enum([
  "contrarian",
  "question",
  "bold_claim",
  "personal_story",
  "statistic",
  "curiosity_gap",
  "how_to",
  "listicle",
  "warning",
  "other"
]);

export const evidenceTypeSchema = z.enum([
  "personal_experience",
  "data_or_statistic",
  "case_study",
  "quote_or_citation",
  "analogy",
  "none"
]);

export const ctaTypeSchema = z.enum([
  "question",
  "invite_comment",
  "invite_share",
  "soft_pitch",
  "follow_for_more",
  "none"
]);

export const patternExtractionSchema = z.object({
  hook: z.object({
    type: hookTypeSchema,
    evidence: z.string().min(1)
  }),
  opening_mechanism: z.string().min(1),
  core_claim: z.string().min(1),
  structure: z.array(z.string().min(1)).min(1),
  storytelling_mechanism: z.string().nullable(),
  evidence: z.array(evidenceTypeSchema).min(1),
  formatting_style: z.object({
    uses_line_breaks: z.boolean(),
    uses_bullets: z.boolean(),
    uses_bold: z.boolean(),
    uses_emoji: z.boolean(),
    approx_length: z.enum(["short", "medium", "long"])
  }),
  cta: z.object({
    type: ctaTypeSchema,
    evidence: z.string().nullable()
  }),
  audience: z.string().min(1),
  topic: z.string().min(1),
  pattern: z.object({
    name: z.string().min(1),
    category: z.enum(["hook", "structure", "storytelling", "evidence", "cta", "formatting"]),
    description: z.string().min(1)
  }),
  confidence: z.number().min(0).max(1)
});
export type PatternExtraction = z.infer<typeof patternExtractionSchema>;

export const contentPatternSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  category: z.enum(["hook", "structure", "storytelling", "evidence", "cta", "formatting"]),
  description: z.string().min(1),
  structure: z.array(z.string()).default([]),
  example: z.string().nullable().optional(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([])
});
export type ContentPattern = z.infer<typeof contentPatternSchema>;

// -----------------------------------------------------------------------------
// Voice model layer
// -----------------------------------------------------------------------------

export const voiceProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  tone: z.array(z.string()).min(1),
  sentence_length: z.object({
    average_words: z.number().positive(),
    variance: z.enum(["low", "medium", "high"])
  }),
  paragraph_length: z.object({
    average_sentences: z.number().positive(),
    style: z.enum(["single_line", "short", "medium", "long"])
  }),
  vocabulary: z.object({
    complexity: z.enum(["simple", "moderate", "advanced"]),
    jargon_level: z.enum(["none", "light", "heavy"]),
    signature_words: z.array(z.string()).default([])
  }),
  formality: z.enum(["casual", "conversational", "professional", "formal"]),
  humor_level: z.enum(["none", "light", "moderate", "frequent"]),
  storytelling_level: z.enum(["none", "occasional", "frequent", "core_technique"]),
  formatting_style: z.object({
    uses_line_breaks: z.boolean(),
    uses_bullets: z.boolean(),
    uses_bold: z.boolean(),
    uses_emoji: z.boolean(),
    uses_numbers_and_data: z.boolean(),
    asks_questions: z.boolean(),
    cta_style: z.string()
  }),
  things_to_avoid: z.array(z.string()).default([]),
  sample_count: z.number().int().nonnegative().default(0)
});
export type VoiceProfile = z.infer<typeof voiceProfileSchema>;

export const voiceExampleInputSchema = z.object({
  content: z.string().min(20, "Writing sample must be at least 20 characters."),
  source: z.string().optional()
});
export type VoiceExampleInput = z.infer<typeof voiceExampleInputSchema>;

// -----------------------------------------------------------------------------
// Generation layer
// -----------------------------------------------------------------------------

export const postLengthSchema = z.enum(["short", "medium", "long"]).default("medium");
export type PostLength = z.infer<typeof postLengthSchema>;

export const generationContextSchema = z.object({
  topic: z.string().min(2),
  audience: z.string().min(2),
  objective: z.string().min(2),
  voice_profile: voiceProfileSchema,
  selected_patterns: z.array(contentPatternSchema).min(1),
  research: z.array(researchDocumentSchema),
  relevant_voice_examples: z.array(z.string()).default([]),
  post_length: postLengthSchema
});
export type GenerationContext = z.infer<typeof generationContextSchema>;

export const generatedPostSchema = z.object({
  content: z.string().min(1),
  selected_pattern: z.string(),
  evidence_used: z.array(z.string()).default([]),
  cta_type: ctaTypeSchema,
  generation_metadata: z.object({
    model: z.string(),
    provider: z.string(),
    research_sources: z.array(z.string().url()),
    voice_profile_id: z.string().nullable()
  })
});
export type GeneratedPost = z.infer<typeof generatedPostSchema>;

// -----------------------------------------------------------------------------
// Critic layer
// -----------------------------------------------------------------------------

export const criticChecksSchema = z.object({
  relevance: z.boolean(),
  specificity: z.boolean(),
  clarity: z.boolean(),
  evidence: z.boolean(),
  voice_match: z.boolean(),
  originality: z.boolean(),
  structure: z.boolean(),
  cta_alignment: z.boolean(),
  no_unsupported_claims: z.boolean(),
  no_generic_language: z.boolean()
});
export type CriticChecks = z.infer<typeof criticChecksSchema>;

export const criticResultSchema = z.object({
  issues: z.array(z.string()),
  strengths: z.array(z.string()),
  checks: criticChecksSchema,
  suggested_revisions: z.array(z.string())
});
export type CriticResult = z.infer<typeof criticResultSchema>;

// -----------------------------------------------------------------------------
// Performance layer
// -----------------------------------------------------------------------------

export const performanceSnapshotInputSchema = z.object({
  published_post_id: z.string(),
  impressions: z.number().int().nonnegative().nullable(),
  likes: z.number().int().nonnegative().nullable(),
  comments: z.number().int().nonnegative().nullable(),
  reposts: z.number().int().nonnegative().nullable(),
  profile_views: z.number().int().nonnegative().nullable(),
  clicks: z.number().int().nonnegative().nullable()
});
export type PerformanceSnapshotInput = z.infer<typeof performanceSnapshotInputSchema>;

export const patternPerformanceSchema = z.object({
  pattern_id: z.string(),
  topic: z.string().nullable(),
  audience: z.string().nullable(),
  posts_analyzed: z.number().int().nonnegative(),
  impressions_median: z.number().nullable(),
  engagement_rate_median: z.number().nullable(),
  comments_median: z.number().nullable(),
  confidence: z.enum(["low", "medium", "high"])
});
export type PatternPerformanceRow = z.infer<typeof patternPerformanceSchema>;

// -----------------------------------------------------------------------------
// Draft / review layer
// -----------------------------------------------------------------------------

export const draftStatusSchema = z.enum(["draft", "critiqued", "approved", "rejected"]);
export type DraftStatus = z.infer<typeof draftStatusSchema>;

export const draftSchema = z.object({
  id: z.string().optional(),
  topic: z.string().min(1),
  audience: z.string().min(1),
  objective: z.string().min(1),
  voice_profile_id: z.string().nullable(),
  selected_pattern_id: z.string().nullable(),
  content: z.string().min(1),
  status: draftStatusSchema.default("draft"),
  critique: criticResultSchema.nullable().optional(),
  generation_metadata: z.record(z.unknown()).default({})
});
export type Draft = z.infer<typeof draftSchema>;
