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

  /**
   * Several of NVIDIA's hosted models (the Nemotron family in particular)
   * support an optional "thinking" mode - a long internal reasoning pass
   * before answering, off by default on some models but on by default or
   * recommended-on in NVIDIA's own examples for others. This pipeline makes
   * several sequential AI calls per request and needs a fast, direct
   * answer each time, so thinking mode is explicitly turned off here rather
   * than left to each model's default.
   */
  protected extraRequestBody(): Record<string, unknown> {
    return { chat_template_kwargs: { enable_thinking: false } };
  }
}
