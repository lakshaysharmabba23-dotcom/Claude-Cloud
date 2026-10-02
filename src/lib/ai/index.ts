import { env } from "@/lib/env";
import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";
import { OpenRouterProvider } from "./openrouter";
import { GoogleAIProvider } from "./google";
import { NvidiaProvider } from "./nvidia";
import { ModalProvider } from "./modal";
import { ProviderChain } from "./chain";

let cached: AIProvider | null = null;

/** Resolves the configured AI provider. DEMO_MODE always wins and returns the mock. */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  if (env.demoMode || env.aiProvider === "mock") {
    cached = new MockAIProvider();
    return cached;
  }

  switch (env.aiProvider) {
    case "google":
      cached = new GoogleAIProvider(env.googleAiModel, env.googleApiKey);
      break;
    case "anthropic":
      cached = new AnthropicProvider(env.aiModel, env.anthropicApiKey);
      break;
    case "openai":
      cached = new OpenAIProvider(env.aiModel, env.openaiApiKey);
      break;
    case "openrouter":
      cached = new OpenRouterProvider(env.openrouterModels, env.openrouterApiKey);
      break;
    case "modal": {
      const modal = new ModalProvider({
        model: env.modalModel,
        baseUrl: env.modalBaseUrl,
        tokenId: env.modalTokenId,
        tokenSecret: env.modalTokenSecret,
        reasoningEffort: env.modalReasoningEffort
      });
      // If an NVIDIA key is also set, use it as a backup when Modal fails.
      cached = env.nvidiaApiKey
        ? new ProviderChain([modal, new NvidiaProvider(env.nvidiaModel, env.nvidiaApiKey)])
        : modal;
      break;
    }
    case "nvidia":
      cached = new NvidiaProvider(env.nvidiaModel, env.nvidiaApiKey);
      break;
    default:
      cached = new MockAIProvider();
  }
  return cached;
}

export type { AIProvider } from "./provider";
