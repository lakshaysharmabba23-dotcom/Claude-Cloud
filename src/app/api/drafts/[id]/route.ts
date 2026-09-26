import { NextResponse } from "next/server";
import { z } from "zod";
import { getDraft, updateDraft } from "@/lib/data/repository";

const patchSchema = z.object({
  content: z.string().min(1).optional(),
  status: z.enum(["draft", "critiqued", "approved", "rejected"]).optional()
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const draft = await getDraft(params.id);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  return NextResponse.json({ draft });
}

/** Human edits: this is the only way a draft's content changes after generation. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const draft = await updateDraft(params.id, parsed.data);
    return NextResponse.json({ draft });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}
