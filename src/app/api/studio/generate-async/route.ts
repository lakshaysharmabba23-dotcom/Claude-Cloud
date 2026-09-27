import { NextResponse } from "next/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import type { generatePostTask } from "@/trigger/generatePost";

const requestSchema = z.object({
  topic: z.string().min(2),
  audience: z.string().min(2),
  objective: z.string().min(2),
  selectedPatternId: z.string().optional(),
  sourceUrls: z.array(z.string().url()).optional(),
  researchDepth: z.enum(["quick", "standard", "deep"]).optional()
});

/**
 * Kicks off the same research -> generation -> critique pipeline as
 * POST /api/studio/generate, but as a Trigger.dev background run instead of
 * inline in this request. Real providers (a live web search, a page scrape,
 * several sequential AI calls) can easily take longer than a serverless
 * function's request timeout; Trigger.dev tasks aren't bound by that limit
 * (see trigger.config.ts's maxDuration). The client polls
 * GET /api/studio/generate-async/[runId] for the result.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const handle = await tasks.trigger<typeof generatePostTask>("generate-post", parsed.data);
    return NextResponse.json({ runId: handle.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
