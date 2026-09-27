import { OpenAIProvider } from "./openai";

/**
 * NVIDIA's own hosted inference API (https://integrate.api.nvidia.com/v1) -
 * OpenAI-compatible chat completions, so this is just OpenAIProvider pointed
 * at a different base URL and API key. Own dedicated quota (not a shared
 * free pool like OpenRouter's free models, and no 5-req/min cap like
 * Gemini's free tier) - get a key at https://build.nvidia.com.
 */
export class NvidiaProvider extends OpenAIProvider {
  readonly name = "nvidia";

  constructor(model: string, apiKey?: string) {
    super(model, apiKey, "https://integrate.api.nvidia.com/v1", "NVIDIA_API_KEY");
  }
}
