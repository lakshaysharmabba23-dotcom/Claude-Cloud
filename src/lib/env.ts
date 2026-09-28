/**
 * Centralized, typed access to environment configuration.
 *
 * DEMO_MODE is the load-bearing flag for the whole project: when true, every
 * provider abstraction (research, AI, embeddings) resolves to its mock
 * implementation and the app runs fully offline against seeded fictional
 * data. This lets the entire pipeline - research, normalization, pattern
 * extraction, voice modeling, retrieval, generation, critique, performance,
 * feedback - be exercised and tested without any paid API key.
 */

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

export const env = {
  demoMode: readBool(process.env.DEMO_MODE, true),

  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  researchProvider: (process.env.RESEARCH_PROVIDER ?? "seo-pipeline") as
    | "seo-pipeline"
    | "serpapi"
    | "firecrawl"
    | "mock",
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? "",
  serpApiKey: process.env.SERPAPI_API_KEY ?? "",
  /** Base URL of the self-hosted SERP+scrape API (no key needed on this app's side). */
  seoPipelineBaseUrl: process.env.SEO_PIPELINE_BASE_URL ?? "",

  aiProvider: (process.env.AI_PROVIDER ?? "google") as
    | "google"
    | "anthropic"
    | "openai"
    | "openrouter"
    | "nvidia"
    | "mock",
  aiModel: process.env.AI_MODEL ?? "claude-opus-5-5",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  googleApiKey: process.env.GOOGLE_API_KEY ?? "",
  /** Google's "-latest" aliases track the current stable model without needing updates as dated versions rotate out. */
  googleAiModel: process.env.GOOGLE_AI_MODEL ?? "gemini-flash-latest",
  nvidiaApiKey: process.env.NVIDIA_API_KEY ?? "",
  /**
   * A small, fast, plain-instruct model - deliberately NOT a reasoning
   * model (e.g. deepseek-* on NVIDIA's catalog), which writes out a long
   * internal "thinking" pass before answering and can take 20-40s+ per
   * call. This pipeline makes 3+ sequential AI calls per request, which
   * blows past Vercel's serverless function timeout with a reasoning
   * model. See https://build.nvidia.com for the full catalog.
   */
  // z-ai/glm-5.3-flash was tried and confirmed too slow in practice (a real
  // run hit the 300s/600s Trigger.dev timeout) - it's a reasoning-style
  // model despite the "flash" name. nemotron-3.5-lightning has an optional
  // "thinking" mode too, but NvidiaProvider explicitly disables it (see
  // src/lib/ai/nvidia.ts) so it should stay fast. Override via
  // NVIDIA_AI_MODEL if you've confirmed a different one works better.
  nvidiaModel: process.env.NVIDIA_AI_MODEL ?? "nvidia/nemotron-3.5-lightning-30b-a3b",
  /**
   * OpenRouter fallback chain: tried in order, first one that responds
   * successfully wins. Free-tier OpenRouter models are frequently rate
   * limited or temporarily pulled, so a single-model setup breaks often -
   * this list exists specifically so the app "instantly switches" to the
   * next model instead of failing the whole request. Override via
   * OPENROUTER_MODELS (comma-separated) - the defaults below are examples;
   * check https://openrouter.ai/models?max_price=0 for the current free
   * lineup, since it changes over time.
   */
  openrouterModels: (
    process.env.OPENROUTER_MODELS ??
    [
      "google/gemma-4-31b-it:free",
      "cohere/north-mini-code:free",
      "nvidia/nemotron-3.5-lightning:free",
      "qwen/qwen3.8-27b:free",
      "google/gemma-4-26b-a4b-it:free",
      "poolside/laguna-s-2.1:free",
      "dots-studio/dots-3-note-preview:free",
      "inclusionai/ling-3.0-flash-fin:free",
      "liquid/lfm-2.5-2.6b:free",
      // Last resort: OpenRouter's own auto-router across whatever free
      // model is currently available - a safety net for when several
      // individual providers above are simultaneously congested.
      "openrouter/free"
    ].join(",")
  )
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),

  embeddingProvider: (process.env.EMBEDDING_PROVIDER ?? "openai") as "openai" | "mock",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 1536)
};

/**
 * Whether a given provider has real credentials configured. Used so that
 * "DEMO_MODE=false but no key set" fails loudly and predictably instead of
 * silently hitting an API with an empty key.
 */
export function requireEnv(name: string, value: string): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env.local, or set DEMO_MODE=true to run with mock providers.`
    );
  }
  return value;
}
