import type { ZodType, ZodTypeDef } from "zod";
import { requireEnv } from "@/lib/env";
import type { AIProvider, CompleteInput, CompleteStructuredInput } from "./provider";
import { completeStructuredWithRetry } from "./structured";
import { runWithFallback } from "./fallback";

/**
 * OpenRouter (https://openrouter.ai), configured with a LIST of models
 * tried in order rather than one fixed model.
 *
 * Why: free-tier OpenRouter models get rate-limited or temporarily
 * unavailable often. Rather than the whole app failing when model #1 hits
 * a limit, every call here tries model #1 first and falls through to #2,
 * #3, etc. on ANY failure (network error, non-2xx response, or the
 * response failing schema validation twice) - see runWithFallback in
 * fallback.ts, which is the same generic logic tests/ai-fallback.test.ts
 * exercises without needing real network calls.
 */
export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter";
  readonly model: string; // the primary (first) model, shown in generation_metadata

  private readonly models: string[];
  private readonly apiKey: string;
  private readonly baseUrl = "https://openrouter.ai/api/v1";

  constructor(models: string[], apiKey?: string) {
    if (models.length === 0) {
      throw new Error("OpenRouterProvider requires at least one model (set OPENROUTER_MODELS).");
    }
    this.models = models;
    this.model = models[0]!;
    this.apiKey = requireEnv("OPENROUTER_API_KEY", apiKey ?? "");
  }

  private async callRawWithModel(
    model: string,
    system: string | undefined,
    prompt: string,
    maxTokens = 2048,
    temperature = 0.7,
    jsonMode = false
  ): Promise<string> {
    const messages = [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: prompt }
    ];

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        // Reasoning-style models (common among free-tier ones) can spend
        // most/all of max_tokens "thinking" and never reach a visible
        // answer, or emit <think>...</think> the JSON parser has to strip.
        // `exclude: true` asks OpenRouter to hide reasoning tokens from the
        // response for models that support it; ignored harmlessly by ones
        // that don't.
        reasoning: { exclude: true },
        // Forces strict JSON output on models/providers that support
        // OpenAI-style structured outputs - more reliable than prompt
        // instructions alone. Only set for completeStructured() callers;
        // a provider that doesn't understand the field ignores it, and one
        // that rejects it outright just fails over to the next model like
        // any other error.
        ...(jsonMode ? { response_format: { type: "json_object" } } : {})
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenRouter model "${model}" failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0]?.message.content;
    if (!content) throw new Error(`OpenRouter model "${model}" returned no content.`);
    return content;
  }

  async complete(input: CompleteInput): Promise<string> {
    return runWithFallback(this.models, (model) =>
      this.callRawWithModel(model, input.system, input.prompt, input.maxTokens, input.temperature)
    );
  }

  async completeStructured<T>(input: CompleteStructuredInput<T>): Promise<T> {
    return runWithFallback(this.models, (model) =>
      completeStructuredWithRetry<T>({
        schema: input.schema as ZodType<T, ZodTypeDef, unknown>,
        schemaName: input.schemaName,
        system: input.system,
        prompt: input.prompt,
        callRaw: (system, prompt) =>
          this.callRawWithModel(model, system, prompt, input.maxTokens, input.temperature, true)
      })
    );
  }
}
