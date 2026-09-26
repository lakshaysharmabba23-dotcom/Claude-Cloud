import { env } from "@/lib/env";
import type { EmbeddingProvider } from "./provider";
import { MockEmbeddingProvider } from "./mock";
import { OpenAIEmbeddingProvider } from "./openai";

let cached: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (cached) return cached;
  if (env.demoMode || env.embeddingProvider === "mock") {
    cached = new MockEmbeddingProvider(env.embeddingDimensions > 1536 ? 256 : 256);
  } else {
    cached = new OpenAIEmbeddingProvider(env.embeddingModel, env.embeddingDimensions);
  }
  return cached;
}

export type { EmbeddingProvider } from "./provider";
export { cosineSimilarity } from "./mock";
