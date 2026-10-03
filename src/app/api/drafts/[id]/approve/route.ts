import { NextResponse } from "next/server";
import { getDraft, updateDraft, publishDraft, findPublishedByDraft } from "@/lib/data/repository";
import { canApprove } from "@/lib/data/draft-rules";

/**
 * Human approval. This is the ONLY path in the app that creates a
 * published_posts record - there is no automated publishing anywhere.
 * Approving marks the draft "approved" and records the final (possibly
 * human-edited) content as published. Safe to call twice: the second call
 * returns the existing record instead of creating another.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const draft = await getDraft(params.id);
    if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

    if (draft.status === "approved") {
      const existing = await findPublishedByDraft(params.id);
      if (existing) return NextResponse.json({ published: existing, alreadyApproved: true });
    } else if (!canApprove(draft.status)) {
      return NextResponse.json({ error: `A ${draft.status} draft cannot be approved.` }, { status: 409 });
    }

    await updateDraft(params.id, { status: "approved" });
    const published = await publishDraft(params.id);
    return NextResponse.json({ published });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
