import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";
import { runStudioPipeline } from "@/lib/generation/pipeline";
import { createDraft } from "@/lib/data/repository";
import { postLengthSchema } from "@/lib/types/schemas";

/**
 * This route makes several sequential AI calls (research fact extraction,
 * generation, critique) - easily over Vercel's default 10s serverless
 * function timeout, which produces a plain-text platform error page
 * ("An error occurred with your deployment...") instead of JSON. 60s is the
 * max duration Vercel's Hobby plan allows.
 */
export const maxDuration = 60;

const requestSchema = z.object({
  topic: z.string().min(2),
  audience: z.string().min(2),
  objective: z.string().min(2),
  selectedPatternId: z.string().optional(),
  sourceUrls: z.array(z.string().url()).optional(),
  researchDepth: z.enum(["quick", "standard", "deep"]).optional(),
  postLength: postLengthSchema.optional()
});

/**
 * Runs the full topic research -> retrieval -> generation -> critique
 * pipeline and stores the result as a new draft (status "critiqued").
 * Nothing is published from this route - see /api/drafts/[id]/approve.
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "generate");
  if (limited) return limited;
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
