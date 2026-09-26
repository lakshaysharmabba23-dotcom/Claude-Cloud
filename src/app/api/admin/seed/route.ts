import { NextResponse } from "next/server";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { seedSupabase } from "@/lib/data/seed-supabase";

/**
 * One-time convenience endpoint: seeds the fictional dataset directly into
 * whatever real Supabase project this deployment is configured with. Meant
 * to be hit ONCE, from a browser, right after running the schema migration -
 * it exists specifically so nobody has to copy/paste hundreds of lines of
 * SQL into the Supabase SQL Editor (a genuinely unreliable thing to do for
 * a large paste in some browsers/devices).
 *
 * Guarded by SEED_ADMIN_TOKEN so a random visitor can't call it - set that
 * env var to any random string, then visit:
 *   /api/admin/seed?token=<that string>
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
    const results = await seedSupabase(supabase);
    const failed = results.filter((r) => r.error);
    return NextResponse.json({
      ok: failed.length === 0,
      results,
      note: "Run the schema migration (supabase/migrations/0001_init.sql) first if any table errors with 'relation does not exist'."
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
