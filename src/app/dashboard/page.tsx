import Link from "next/link";
import { getDashboardSummary } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  const stats = [
    { label: "Posts analysed", value: summary.counts.sourcePosts },
    { label: "Patterns in library", value: summary.counts.patterns },
    { label: "Drafts generated", value: summary.counts.drafts },
    { label: "Published posts", value: summary.counts.published },
    { label: "Performance snapshots", value: summary.counts.performanceSnapshots }
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow mb-3">Content Intelligence</div>
        <h1 className="display text-4xl sm:text-5xl">Dashboard</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-200">
          A snapshot of the whole pipeline: posts analysed, patterns in the library, drafts generated,
          posts published, and performance recorded.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="display text-4xl">{stat.value}</div>
            <div className="eyebrow mt-2 !text-ink-400">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Top recurring patterns</h2>
            <Link href="/patterns" className="text-xs text-accent-400 hover:underline">
              View library &rarr;
            </Link>
          </div>
          <ul className="space-y-2">
            {summary.topPatterns.map((pattern) => (
              <li key={pattern.id} className="flex items-center justify-between rounded-lg bg-ink-800 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{pattern.name}</div>
                  <div className="text-xs text-ink-400">{pattern.category}</div>
                </div>
                <span className="badge">{pattern.usage_count} posts</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Recent drafts</h2>
            <Link href="/drafts" className="text-xs text-accent-400 hover:underline">
              View all drafts &rarr;
            </Link>
          </div>
          <ul className="space-y-2">
            {summary.recentDrafts.map((draft) => (
              <li key={draft.id} className="rounded-lg bg-ink-800 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{draft.topic}</span>
                  <span className="badge">{draft.status}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-ink-400">{draft.content}</p>
              </li>
            ))}
            {summary.recentDrafts.length === 0 && (
              <p className="text-sm text-ink-400">No drafts yet - generate one in the Post Studio.</p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
