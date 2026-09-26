import { NextResponse } from "next/server";
import { z } from "zod";
import { runStudioPipeline } from "@/lib/generation/pipeline";
import { createDraft } from "@/lib/data/repository";

const requestSchema = z.object({
  topic: z.string().min(2),
  audience: z.string().min(2),
  objective: z.string().min(2),
  selectedPatternId: z.string().optional(),
  sourceUrls: z.array(z.string().url()).optional(),
  researchDepth: z.enum(["quick", "standard", "deep"]).optional()
});

/**
 * Runs the full topic research -> retrieval -> generation -> critique
 * pipeline and stores the result as a new draft (status "critiqued").
 * Nothing is published from this route - see /api/drafts/[id]/approve.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await runStudioPipeline(parsed.data);

    const draft = await createDraft({
      topic: parsed.data.topic,
      audience: parsed.data.audience,
      objective: parsed.data.objective,
      voice_profile_id: result.voiceProfile.id ?? null,
      selected_pattern_id: result.selectedPatternIds[0] ?? null,
      content: result.generated.content,
      status: "critiqued",
      critique: result.critique,
      generation_metadata: result.generated.generation_metadata
    });

    return NextResponse.json({ draft, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
