import { listPatterns } from "@/lib/data/repository";
import { StudioClient } from "./studio-client";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const patterns = await listPatterns();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Post Studio</h1>
        <p className="mt-1 text-sm text-ink-400">
          Research a topic, ground generation in retrieved patterns and your voice, then review, edit, and
          approve before anything is recorded as published.
        </p>
      </div>
      <StudioClient patterns={patterns} />
    </div>
  );
}
