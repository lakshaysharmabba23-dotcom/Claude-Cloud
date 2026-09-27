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

  aiProvider: (process.env.AI_PROVIDER ?? "openrouter") as
    | "anthropic"
    | "openai"
    | "openrouter"
    | "mock",
  aiModel: process.env.AI_MODEL ?? "claude-opus-5-5",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
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
      "qwen/qwen3.8-27b:free",
      "google/gemma-4-26b-a4b-it:free",
      "liquid/lfm-2.5-2.6b:free",
      // Last on purpose: a large reasoning-style model, more prone to
      // spending its output budget "thinking" instead of returning clean
      // JSON even with reasoning.exclude set - see src/lib/ai/openrouter.ts.
      "nvidia/nemotron-3-super-120b-a12b:free"
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
