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
          A curated library of reusable content patterns - hooks, structures, storytelling mechanisms,
          evidence types, CTAs, and formatting - analysed by hand from a real export of creator posts.
          Adding new patterns is a manual step for now.
        </p>
      </div>
      <PatternExplorer patterns={patterns} />
    </div>
  );
}
