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

  researchProvider: (process.env.RESEARCH_PROVIDER ?? "firecrawl") as "firecrawl" | "mock",
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? "",

  aiProvider: (process.env.AI_PROVIDER ?? "anthropic") as
    | "anthropic"
    | "openai"
    | "openrouter"
    | "mock",
  aiModel: process.env.AI_MODEL ?? "claude-opus-5-5",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",

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
