import { NextResponse } from "next/server";
import { updateDraft, publishDraft } from "@/lib/data/repository";

/**
 * Human approval. This is the ONLY path in the app that creates a
 * published_posts record - there is no automated publishing anywhere.
 * Approving marks the draft "approved" and records the final (possibly
 * human-edited) content as published.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    await updateDraft(params.id, { status: "approved" });
    const published = await publishDraft(params.id);
    return NextResponse.json({ published });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
