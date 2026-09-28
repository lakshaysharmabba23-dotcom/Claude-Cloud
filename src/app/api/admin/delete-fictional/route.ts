import { NextResponse } from "next/server";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { deleteFictionalSeedData } from "@/lib/data/seed-supabase";

/**
 * Deletes the fictional DEMO_MODE seed dataset from a real Supabase
 * project, so the Dashboard/Patterns/Analytics pages only show real data
 * (the real pattern library + real voice profile seeded by the other
 * admin/seed-real-* routes). Same SEED_ADMIN_TOKEN gate:
 *   /api/admin/delete-fictional?token=<SEED_ADMIN_TOKEN>
 * Run the seed-real-patterns and seed-real-voice routes FIRST, since this
 * app requires at least one voice profile and pattern to generate posts.
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
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase isn't configured on this deployment." }, { status: 400 });
  }
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Could not create a Supabase service client." }, { status: 500 });
  }

  try {
    const results = await deleteFictionalSeedData(supabase);
    return NextResponse.json({ ok: results.every((r) => !r.error), results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
