import { getAIProvider } from "@/lib/ai";
import { patternExtractionSchema, type PatternExtraction } from "@/lib/types/schemas";

/**
 * Structured, evidence-based pattern extraction for a single source post.
 *
 * The prompt explicitly forbids inventing characteristics not present in
 * the text, and every field the model returns is validated against
 * `patternExtractionSchema` (see src/lib/types/schemas.ts) before it's used
 * anywhere else in the app. If the model's output doesn't validate twice in
 * a row, this throws rather than silently accepting malformed data (see
 * src/lib/ai/structured.ts).
 */
export async function extractPatternFromPost(post: {
  content: string;
  author?: string | null;
  sourceUrl: string;
}): Promise<PatternExtraction> {
  const ai = getAIProvider();

  const system = [
    "You are a content analyst extracting REUSABLE WRITING PATTERNS from a single social media post.",
    "You must only describe characteristics that are actually present in the text.",
    "Do not invent a hook, structure, storytelling mechanism, evidence type, or CTA that is not evidenced by the text.",
    "If something is genuinely absent (e.g. no CTA), say so using the 'none' option rather than guessing.",
    "Every claim you make must be traceable to specific text in the post - you provide brief evidence strings for hook and cta."
  ].join(" ");

  const prompt = [
    `Analyze this post and extract its structural pattern.`,
    "",
    `POST (source: ${post.sourceUrl}):`,
    "---",
    post.content,
    "---",
    "",
    "Identify: hook type, opening mechanism, core claim, argument/narrative structure (as an ordered list of stage names), storytelling mechanism (or null), evidence types used, formatting style, CTA type, likely audience, likely topic, a reusable pattern name/category/description this post demonstrates, and your confidence (0-1) in this extraction."
  ].join("\n");

  return ai.completeStructured<PatternExtraction>({
    system,
    prompt,
    schema: patternExtractionSchema,
    schemaName: "pattern_extraction",
    temperature: 0.2,
    maxTokens: 1200
  });
}

/**
 * Batch helper: extract patterns for many posts, tolerating individual
 * failures so one bad post doesn't abort a whole batch job (see the
 * `extractPatterns` Trigger.dev task).
 */
export async function extractPatternsForPosts(
  posts: Array<{ id: string; content: string; author?: string | null; sourceUrl: string }>
): Promise<Array<{ postId: string; extraction: PatternExtraction } | { postId: string; error: string }>> {
  const results = await Promise.allSettled(
    posts.map(async (post) => ({ postId: post.id, extraction: await extractPatternFromPost(post) }))
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    return { postId: posts[i]?.id ?? "unknown", error: (result.reason as Error).message };
  });
}
