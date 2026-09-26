import { listPatterns } from "@/lib/data/repository";
import { PatternExplorer } from "./pattern-explorer";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const patterns = await listPatterns();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pattern Library</h1>
        <p className="mt-1 text-sm text-ink-400">
          Reusable content patterns discovered by evidence-based extraction over researched posts - hooks,
          structures, storytelling mechanisms, evidence types, CTAs, and formatting.
        </p>
      </div>
      <PatternExplorer patterns={patterns} />
    </div>
  );
}
