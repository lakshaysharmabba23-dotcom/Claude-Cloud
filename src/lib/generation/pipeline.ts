import { researchTopic } from "@/lib/research";
import { rankPatternsForSelection } from "./select-pattern";
import { buildGenerationContext } from "./context";
import { PostGenerator } from "./generator";
import { critiquePost } from "@/lib/critic/critic";
import { summarizeVoiceProfile } from "@/lib/voice/analyze";
import { listPatterns, listVoiceExamples, getDefaultVoiceProfile, listSourcePosts } from "@/lib/data/repository";
import type { GeneratedPost, ResearchDocument, VoiceProfile, CriticResult, PostLength } from "@/lib/types/schemas";

export interface StudioRequest {
  topic: string;
  audience: string;
  objective: string;
  selectedPatternId?: string;
  sourceUrls?: string[];
  researchDepth?: "quick" | "standard" | "deep";
  postLength?: PostLength;
}

export interface StudioResult {
  generated: GeneratedPost;
  critique: CriticResult;
  research: ResearchDocument[];
  voiceProfile: VoiceProfile;
  selectedPatternIds: string[];
  relevantVoiceExamples: string[];
}

/**
 * Each research document costs one AI call (fact extraction), on top of one
 * call for generation and one for critique - so total AI calls per
 * "Generate" click is roughly (maxResults + 2). Kept low by default
 * because Google's Gemini free tier caps out at 5 requests/minute/model
 * (see docs/generation.md); a real paid provider tier can afford deeper
 * research - raise these if AI_PROVIDER isn't rate-limited that tightly.
 */
const DEPTH_TO_MAX_RESULTS: Record<NonNullable<StudioRequest["researchDepth"]>, number> = {
  quick: 1,
  standard: 2,
  deep: 3
};

/**
 * The full "topic research -> retrieval -> generation -> critique" pipeline
 * that backs the Post Studio. This is intentionally a plain orchestration
 * function (not a single giant model prompt) so each stage - research,
 * pattern retrieval, voice retrieval, generation, critique - is its own
 * independently testable and independently swappable layer, per the
 * project's layered architecture (see docs/architecture.md).
 */
export async function runStudioPipeline(request: StudioRequest): Promise<StudioResult> {
  const voiceProfile = await getDefaultVoiceProfile();
  if (!voiceProfile) {
    throw new Error("No voice profile exists yet. Build one in the Voice Lab before generating a post.");
  }

  // 1. Topic research (grounding facts, always carrying real source URLs).
  const researched = await researchTopic({
    topic: request.topic,
    audience: request.audience,
    sourceUrls: request.sourceUrls,
    maxResults: DEPTH_TO_MAX_RESULTS[request.researchDepth ?? "standard"]
  });

  const research: ResearchDocument[] = researched.map((doc) => ({
    title: doc.title,
    author: doc.author,
    source_url: doc.source_url,
    source_type: doc.source_type,
    published_at: doc.published_at,
    content: doc.extractedFacts.length ? `${doc.content}\n\nKey facts:\n- ${doc.extractedFacts.join("\n- ")}` : doc.content,
    metadata: doc.metadata
  }));

  // 2. Retrieve relevant patterns: an explicit selection wins; otherwise
  // retrieve semantically-similar patterns to the topic (falling back to
  // the plain SQL filter of "top used patterns" if nothing is close).
  const allPatterns = await listPatterns();
  let selectedPatterns = request.selectedPatternId
    ? allPatterns.filter((p) => p.id === request.selectedPatternId)
    : [];

  if (selectedPatterns.length === 0) {
    // Automatic choice: patterns with enough of the user's own recorded
    // results are ranked by engagement; otherwise most-used by creators first.
    selectedPatterns = rankPatternsForSelection(allPatterns).slice(0, 1);
  }

  if (selectedPatterns.length === 0) {
    throw new Error("No content patterns are available. Build the pattern library first.");
  }

  // 3. Voice examples: the most recent few. (Embedding similarity was removed:
  // examples were never embedded, so it always returned nothing and just cost a call.)
  const voiceExamples = await listVoiceExamples(voiceProfile.id ?? "");
  const relevantVoiceExamples = voiceExamples.slice(0, 3).map((e) => e.content);

  // 3b. Model posts: the real top-engagement posts from the tracked creators.
  // The generator studies their hooks, rhythm and structure (never copies).
  const modelPosts = (await listSourcePosts())
    .map((p) => {
      const e = (p.engagement_data ?? {}) as { likes?: number; comments?: number };
      return { author: p.author ?? "creator", content: p.content, likes: e.likes ?? 0, comments: e.comments ?? 0 };
    })
    .filter((p) => p.content && p.content.length > 200)
    .sort((a, b) => b.likes + b.comments * 3 - (a.likes + a.comments * 3))
    .slice(0, 3);

  // 4. Build the structured generation context and generate.
  const context = buildGenerationContext({
    topic: request.topic,
    audience: request.audience,
    objective: request.objective,
    voiceProfile,
    selectedPatterns,
    research,
    relevantVoiceExamples,
    modelPosts,
    postLength: request.postLength
  });

  const generator = new PostGenerator();
  const generated = await generator.generate(context);

  // 5. Critique against explicit criteria.
  const critique = await critiquePost({
    draftContent: generated.content,
    topic: request.topic,
    audience: request.audience,
    objective: request.objective,
    voiceProfileSummary: summarizeVoiceProfile(voiceProfile),
    selectedPatternName: selectedPatterns[0]?.name ?? "unspecified",
    sourceTexts: [...research.map((r) => r.content), ...modelPosts.map((m) => m.content)]
  });

  return {
    generated,
    critique,
    research,
    voiceProfile,
    selectedPatternIds: selectedPatterns.map((p) => p.id!).filter(Boolean),
    relevantVoiceExamples
  };
}
