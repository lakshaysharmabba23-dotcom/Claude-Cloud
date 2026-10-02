import { listPatterns } from "@/lib/data/repository";
import { env } from "@/lib/env";
import { StudioClient } from "./studio-client";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const patterns = await listPatterns();

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-3">Content Intelligence</div>
        <h1 className="display text-4xl sm:text-5xl">Post Studio</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-200">
          Research a topic, ground generation in retrieved patterns and your voice, then review, edit, and
          approve before anything is recorded as published.
        </p>
      </div>
      <StudioClient patterns={patterns} demoMode={env.demoMode} />
    </div>
  );
}
