import { OpenAIProvider } from "./openai";

/** OpenRouter (https://openrouter.ai) exposes an OpenAI-compatible API surface. */
export class OpenRouterProvider extends OpenAIProvider {
  readonly name = "openrouter";

  constructor(model: string, apiKey?: string) {
    super(model, apiKey, "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY");
  }
}
