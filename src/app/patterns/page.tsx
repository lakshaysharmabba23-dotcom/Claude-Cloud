import { listPatterns } from "@/lib/data/repository";
import { PatternExplorer } from "./pattern-explorer";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const patterns = await listPatterns();

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-3">Content Intelligence</div>
        <h1 className="display text-4xl sm:text-5xl">Pattern Library</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-200">
          Reusable content patterns discovered by evidence-based extraction over researched posts - hooks,
          structures, storytelling mechanisms, evidence types, CTAs, and formatting.
        </p>
      </div>
      <PatternExplorer patterns={patterns} />
    </div>
  );
}
