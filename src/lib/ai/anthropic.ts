import type { ZodType } from "zod";
import { requireEnv } from "@/lib/env";
import type { AIProvider, CompleteInput, CompleteStructuredInput } from "./provider";
import { completeStructuredWithRetry } from "./structured";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;

  private readonly apiKey: string;

  constructor(model: string, apiKey?: string) {
    this.model = model;
    this.apiKey = requireEnv("ANTHROPIC_API_KEY", apiKey ?? "");
  }

  private async callRaw(system: string | undefined, prompt: string, maxTokens = 2048, temperature = 0.7) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Anthropic request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return data.content.find((block) => block.type === "text")?.text ?? "";
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
