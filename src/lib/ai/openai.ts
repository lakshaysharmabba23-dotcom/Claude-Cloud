import type { ZodType } from "zod";
import { requireEnv } from "@/lib/env";
import type { AIProvider, CompleteInput, CompleteStructuredInput } from "./provider";
import { completeStructuredWithRetry } from "./structured";

/**
 * Works for both OpenAI and OpenRouter, which share the same chat-completions
 * request/response shape. `baseUrl` and the key/header are the only
 * differences (see OpenRouterProvider below).
 */
export class OpenAIProvider implements AIProvider {
  readonly name: string = "openai";
  readonly model: string;

  protected readonly apiKey: string;
  protected readonly baseUrl: string;

  constructor(model: string, apiKey?: string, baseUrl = "https://api.openai.com/v1", envVarName = "OPENAI_API_KEY") {
    this.model = model;
    this.apiKey = requireEnv(envVarName, apiKey ?? "");
    this.baseUrl = baseUrl;
  }

  protected async callRaw(system: string | undefined, prompt: string, maxTokens = 2048, temperature = 0.7) {
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
        model: this.model,
        messages,
        max_tokens: maxTokens,
        temperature
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${this.name} request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message.content ?? "";
  }

  async complete(input: CompleteInput): Promise<string> {
    return this.callRaw(input.system, input.prompt, input.maxTokens, input.temperature);
  }

  async completeStructured<T>(input: CompleteStructuredInput<T>): Promise<T> {
    return completeStructuredWithRetry<T>({
      schema: input.schema as ZodType<T>,
      schemaName: input.schemaName,
      system: input.system,
      prompt: input.prompt,
      callRaw: (system, prompt) => this.callRaw(system, prompt, input.maxTokens, input.temperature)
    });
  }
}
