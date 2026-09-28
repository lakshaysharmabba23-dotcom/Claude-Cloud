import { NextResponse } from "next/server";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { seedRealVoiceProfile } from "@/lib/data/seed-supabase";

/**
 * Replaces the fictional demo voice profile with one derived from a real,
 * proven pattern (see src/lib/data/real-voice-profile.ts). Same
 * SEED_ADMIN_TOKEN gate as the other admin/seed routes:
 *   /api/admin/seed-real-voice?token=<SEED_ADMIN_TOKEN>
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
    const results = await seedRealVoiceProfile(supabase);
    return NextResponse.json({ ok: results.every((r) => !r.error), results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
