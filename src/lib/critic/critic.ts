import { runDeterministicChecks } from "./deterministic";
import { runLLMCritic } from "./llm";
import type { CriticResult } from "@/lib/types/schemas";

export interface CritiquePostInput {
  draftContent: string;
  topic: string;
  audience: string;
  objective: string;
  voiceProfileSummary: string;
  selectedPatternName: string;
  sourceTexts: string[];
  /** Texts the draft is allowed to take numbers/facts from (research, user examples, the request). */
  groundingTexts?: string[];
  /** Research items shown to the model critic so it can check claims against them. */
  researchTexts?: string[];
}

/**
 * The critic: runs deterministic checks and an LLM-assisted review in
 * parallel, then merges them. Deterministic results always win on the
 * fields they compute (no_generic_language, no_unsupported_claims,
 * originality, cta_alignment); the LLM supplies relevance, specificity,
 * clarity, voice_match, and structure, which are not mechanically
 * checkable. Issues and strengths from both layers are combined and
 * de-duplicated.
 *
 * There is deliberately no overall "quality score" - see
 * docs/generation.md - only explicit, named checks.
 */
export async function critiquePost(input: CritiquePostInput): Promise<CriticResult> {
  const [deterministic, llmResult] = await Promise.all([
    runDeterministicChecks({
      draftContent: input.draftContent,
      sourceTexts: input.sourceTexts,
      groundingTexts: input.groundingTexts
    }),
    runLLMCritic({
      draftContent: input.draftContent,
      topic: input.topic,
      audience: input.audience,
      objective: input.objective,
      voiceProfileSummary: input.voiceProfileSummary,
      selectedPatternName: input.selectedPatternName,
      researchTexts: input.researchTexts
    })
  ]);

  const checks: CriticResult["checks"] = {
    ...llmResult.checks,
    ...deterministic.checks
  };

  const issues = dedupe([...deterministic.issues, ...llmResult.issues]);
  const strengths = dedupe([...deterministic.strengths, ...llmResult.strengths]);

  return {
    checks,
    issues,
    strengths,
    suggested_revisions: llmResult.suggested_revisions
  };
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}
