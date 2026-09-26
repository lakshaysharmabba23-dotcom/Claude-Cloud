import { NextResponse } from "next/server";
import { updateDraft } from "@/lib/data/repository";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const draft = await updateDraft(params.id, { status: "rejected" });
    return NextResponse.json({ draft });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}
