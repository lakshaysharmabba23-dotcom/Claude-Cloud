import { listDrafts } from "@/lib/data/repository";
import { DraftsList } from "./drafts-list";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const drafts = await listDrafts();

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-3">Content Intelligence</div>
        <h1 className="display text-4xl sm:text-5xl">Drafts</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-200">
          Every post you generate or edit in the Studio is saved here. Copy the text to post it yourself.
          Approved drafts are also recorded as published, ready for you to log results in Analytics.
        </p>
      </div>
      <DraftsList
        drafts={drafts.map((d) => ({
          id: String(d.id),
          topic: d.topic,
          audience: d.audience,
          content: d.content,
          status: d.status ?? "draft",
          created_at: d.created_at ?? null
        }))}
      />
    </div>
  );
}
