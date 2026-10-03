import { NextResponse } from "next/server";
import { getDraft, updateDraft } from "@/lib/data/repository";
import { canReject } from "@/lib/data/draft-rules";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const draft = await getDraft(params.id);
    if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    if (draft.status === "rejected") return NextResponse.json({ draft });
    if (!canReject(draft.status)) {
      return NextResponse.json({ error: `A ${draft.status} draft cannot be rejected.` }, { status: 409 });
    }
    const updated = await updateDraft(params.id, { status: "rejected" });
    return NextResponse.json({ draft: updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}
