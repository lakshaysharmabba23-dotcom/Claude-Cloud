import { NextResponse } from "next/server";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { seedRealPatterns } from "@/lib/data/seed-supabase";

/**
 * One-time convenience endpoint: pushes the REAL, evidence-based GTM
 * pattern library (src/lib/data/real-gtm-patterns.ts) into this
 * deployment's Supabase project. Additive alongside /api/admin/seed's
 * fictional dataset - this only touches creators/content_patterns/
 * source_posts/post_patterns, never voice_profiles or drafts.
 *
 * Guarded by the same SEED_ADMIN_TOKEN as /api/admin/seed:
 *   /api/admin/seed-real-patterns?token=<SEED_ADMIN_TOKEN>
 * Safe to call more than once: every table upserts on primary key.
 */
export async function GET(request: Request) {
  const configuredToken = process.env.SEED_ADMIN_TOKEN;
  if (!configuredToken) {
    return NextResponse.json(
      { error: "SEED_ADMIN_TOKEN is not set on this deployment. Set it in Vercel env vars, then redeploy." },
      { status: 403 }
    );
  }

  const providedToken = new URL(request.url).searchParams.get("token");
  if (providedToken !== configuredToken) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase isn't configured on this deployment (missing URL/service role key)." },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Could not create a Supabase service client." }, { status: 500 });
  }

  try {
    const results = await seedRealPatterns(supabase);
    const failed = results.filter((r) => r.error);
    return NextResponse.json({
      ok: failed.length === 0,
      results,
      note: "Loaded the real, evidence-based GTM pattern library (10 creators, real posts, 8 patterns) alongside the existing fictional demo dataset."
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
