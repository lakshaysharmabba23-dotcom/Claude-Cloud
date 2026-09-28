import { NextResponse } from "next/server";
import { listCreators, listPatterns, getDefaultVoiceProfile } from "@/lib/data/repository";

/**
 * Diagnostic: calls the exact same repository functions the Dashboard/
 * Pattern Library/Voice Lab pages call, and reports raw counts + a few
 * names - so a "the UI still shows old data" report can be split into
 * "the database itself still has old rows" vs "the page is stuck on a
 * cached render" without guessing. Same SEED_ADMIN_TOKEN gate.
 */
export async function GET(request: Request) {
  const configuredToken = process.env.SEED_ADMIN_TOKEN;
  if (!configuredToken) {
    return NextResponse.json({ error: "SEED_ADMIN_TOKEN is not set." }, { status: 403 });
  }
  if (new URL(request.url).searchParams.get("token") !== configuredToken) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 401 });
  }

  try {
    const [creators, patterns, voiceProfile] = await Promise.all([
      listCreators(),
      listPatterns(),
      getDefaultVoiceProfile()
    ]);

    return NextResponse.json({
      creatorCount: creators.length,
      creatorNames: creators.map((c) => c.name),
      patternCount: patterns.length,
      patternNames: patterns.map((p) => p.name),
      voiceProfileName: voiceProfile?.name ?? null,
      voiceProfileId: voiceProfile?.id ?? null
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
