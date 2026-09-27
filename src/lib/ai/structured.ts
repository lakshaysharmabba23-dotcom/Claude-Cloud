import type { ZodType, ZodTypeDef } from "zod";

/**
 * Shared "ask for JSON, validate, retry once with the validation error fed
 * back to the model" logic used by every real AIProvider implementation.
 * Keeping it here means OpenAIProvider/AnthropicProvider/OpenRouterProvider
 * only need to supply a `callRaw` function.
 */
export async function completeStructuredWithRetry<T>(params: {
  schema: ZodType<T, ZodTypeDef, any>;
  schemaName: string;
  system?: string;
  prompt: string;
  callRaw: (system: string | undefined, prompt: string) => Promise<string>;
}): Promise<T> {
  const jsonInstruction = `Respond with ONLY a single JSON object matching this description: "${params.schemaName}". No markdown fences, no commentary, no leading or trailing text - just the raw JSON object.`;

  const firstPrompt = `${params.prompt}\n\n${jsonInstruction}`;
  const firstRaw = await params.callRaw(params.system, firstPrompt);
  const firstParsed = tryParseAndValidate(firstRaw, params.schema);
  if (firstParsed.success) return firstParsed.data;

  const retryPrompt = `${firstPrompt}\n\nYour previous response failed validation with this error:\n${firstParsed.error}\n\nYour previous response was:\n${firstRaw}\n\nFix it and respond again with ONLY the corrected JSON object.`;
  const retryRaw = await params.callRaw(params.system, retryPrompt);
  const retryParsed = tryParseAndValidate(retryRaw, params.schema);
  if (retryParsed.success) return retryParsed.data;

  throw new Error(
    `AI structured output for "${params.schemaName}" failed validation twice. Last error: ${retryParsed.error}`
  );
}

function tryParseAndValidate<T>(
  raw: string,
  schema: ZodType<T, ZodTypeDef, any>
): { success: true; data: T } | { success: false; error: string } {
  const jsonText = extractJsonObject(raw);
  if (jsonText === null) {
    return { success: false, error: "No JSON object found in model output." };
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(jsonText);
  } catch (err) {
    return { success: false, error: `JSON.parse failed: ${(err as Error).message}` };
  }

  const result = schema.safeParse(candidate);
  if (!result.success) {
    return { success: false, error: result.error.toString() };
  }

  return { success: true, data: result.data };
}

/**
 * Reasoning-style models (increasingly common among free-tier OpenRouter
 * models) often emit their chain-of-thought wrapped in tags like
 * <think>...</think> before the actual answer, regardless of being told to
 * respond with "ONLY JSON, no commentary." Strip those blocks first so the
 * brace-matching below searches the real answer, not the reasoning text
 * (which frequently contains its own unrelated/unbalanced braces).
 */
function stripReasoningBlocks(text: string): string {
  return text.replace(/<(think|thinking|reasoning)>[\s\S]*?<\/\1>/gi, "").trim();
}

/** Extracts the first top-level JSON object from a string, tolerating stray text or markdown fences around it. */
function extractJsonObject(rawText: string): string | null {
  const text = stripReasoningBlocks(rawText);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? text;

  const start = source.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const char = source.charAt(i);
    if (char === "{") depth++;
    if (char === "}") depth--;
    if (depth === 0) {
      return source.slice(start, i + 1);
    }
  }
  return null;
}
