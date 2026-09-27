import type { ZodType, ZodTypeDef } from "zod";
import { requireEnv } from "@/lib/env";
import type { AIProvider, CompleteInput, CompleteStructuredInput } from "./provider";
import { completeStructuredWithRetry } from "./structured";

/**
 * Google Gemini (Generative Language API), called directly rather than
 * through OpenRouter. Chosen specifically to get a private rate limit
 * instead of sharing OpenRouter's congested free-tier pool - see
 * src/lib/ai/openrouter.ts's doc comment for the problem this avoids.
 *
 * Get a key at https://aistudio.google.com/apikey (keys look like
 * "AIzaSy..."). `model` defaults to Google's "-latest" alias so this
 * doesn't need updating every time a dated model version rotates out.
 */
export class GoogleAIProvider implements AIProvider {
  readonly name = "google";
  readonly model: string;

  private readonly apiKey: string;
  private readonly baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(model: string, apiKey?: string) {
    this.model = model;
    this.apiKey = requireEnv("GOOGLE_API_KEY", apiKey ?? "");
  }

  private async callRaw(
    system: string | undefined,
    prompt: string,
    maxTokens = 2048,
    temperature = 0.7,
    jsonMode = false
  ): Promise<string> {
    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        ...(jsonMode ? { responseMimeType: "application/json" } : {})
      }
    };
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }

    const res = await fetch(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Google Gemini request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error("Google Gemini returned no content (check for a safety block or empty candidate).");
    return text;
  }

  async complete(input: CompleteInput): Promise<string> {
    return this.callRaw(input.system, input.prompt, input.maxTokens, input.temperature);
  }

  async completeStructured<T>(input: CompleteStructuredInput<T>): Promise<T> {
    return completeStructuredWithRetry<T>({
      schema: input.schema as ZodType<T, ZodTypeDef, unknown>,
      schemaName: input.schemaName,
      system: input.system,
      prompt: input.prompt,
      callRaw: (system, prompt) => this.callRaw(system, prompt, input.maxTokens, input.temperature, true)
    });
  }
}
