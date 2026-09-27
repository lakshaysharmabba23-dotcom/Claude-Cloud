import { NextResponse } from "next/server";

/**
 * Diagnostic-only endpoint: reports whether each expected env var is
 * visible to the running server, and its length - NEVER the actual value.
 * Exists because "I added it in the Vercel UI" and "the running server can
 * see it" are two different claims, and the gap between them (wrong
 * environment target, a var scoped to Preview but not Production, a
 * redeploy that predates the var being saved, etc.) is otherwise very hard
 * to debug from screenshots alone.
 *
 * Guarded by the same SEED_ADMIN_TOKEN as /api/admin/seed.
 */
export async function GET(request: Request) {
  const configuredToken = process.env.SEED_ADMIN_TOKEN;
  if (!configuredToken) {
    return NextResponse.json({ error: "SEED_ADMIN_TOKEN is not set on this deployment." }, { status: 403 });
  }
  const providedToken = new URL(request.url).searchParams.get("token");
  if (providedToken !== configuredToken) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 401 });
  }

  const keys = [
    "DEMO_MODE",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "RESEARCH_PROVIDER",
    "SEO_PIPELINE_BASE_URL",
    "SERPAPI_API_KEY",
    "AI_PROVIDER",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODELS",
    "GOOGLE_API_KEY",
    "GOOGLE_AI_MODEL",
    "NVIDIA_API_KEY",
    "NVIDIA_AI_MODEL",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "AI_MODEL",
    "EMBEDDING_PROVIDER",
    "SEED_ADMIN_TOKEN"
  ] as const;

  const report = Object.fromEntries(
    keys.map((key) => {
      const value = process.env[key];
      return [
        key,
        {
          present: value !== undefined && value !== "",
          length: value?.length ?? 0,
          // Harmless for non-secrets (RESEARCH_PROVIDER etc.) and helps
          // catch "value is literally the word 'undefined'" or stray
          // quotes/whitespace mistakes without ever exposing a real key.
          preview:
            value && !key.includes("KEY") && !key.includes("TOKEN") && !key.includes("ROLE")
              ? value
              : value
              ? `${value.slice(0, 3)}***(${value.length} chars)`
              : null
        }
      ];
    })
  );

  return NextResponse.json({ report });
}
