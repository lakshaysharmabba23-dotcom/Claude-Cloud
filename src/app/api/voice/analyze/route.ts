import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeVoice } from "@/lib/voice/analyze";
import { getDefaultVoiceProfile, saveVoiceProfile, addVoiceExamples, listVoiceExamples } from "@/lib/data/repository";

/** See src/app/api/studio/generate/route.ts for why this is needed. */
export const maxDuration = 60;

const requestSchema = z.object({
  samples: z
    .array(z.object({ content: z.string().min(20), source: z.string().optional() }))
    .min(1, "At least one writing sample is required.")
});

/**
 * Builds/updates the single voice profile from the user's own writing
 * samples. This never references or imitates a public figure - the prompt
 * in src/lib/voice/analyze.ts is scoped strictly to the samples given here.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const existing = await getDefaultVoiceProfile();
    const existingExamples = existing ? await listVoiceExamples(existing.id ?? "") : [];

    const allSamplesForAnalysis = [
      ...existingExamples.map((e) => ({ content: e.content, source: e.source ?? undefined })),
      ...parsed.data.samples
    ];

    const profile = await analyzeVoice(allSamplesForAnalysis);
    const saved = await saveVoiceProfile({ ...profile, id: existing?.id ?? profile.id });
    const inserted = await addVoiceExamples(saved.id ?? "", parsed.data.samples);

    return NextResponse.json({ profile: saved, addedExamples: inserted });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
