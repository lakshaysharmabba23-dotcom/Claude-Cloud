import { listCreators, listSourcePosts } from "@/lib/data/repository";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type Engagement = { likes?: number | null; comments?: number | null; reposts?: number | null };

export default async function ResearchPage() {
  const [creators, posts] = await Promise.all([listCreators(), listSourcePosts()]);
  const countByCreator = new Map<string, number>();
  for (const post of posts) {
    if (post.creator_id) countByCreator.set(post.creator_id, (countByCreator.get(post.creator_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow mb-3">Content Intelligence</div>
        <h1 className="display text-4xl sm:text-5xl">Research</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-200">
          The creator posts the pattern library is built from.{" "}
          {env.demoMode
            ? "In demo mode these are fictional sample posts."
            : "These are public posts from a manual export, shown with attribution and a link to the original. Nothing is scraped from LinkedIn by this app."}
        </p>
      </div>

      <section className="card">
        <h2 className="mb-3 font-medium">Creators ({creators.length})</h2>
        <ul className="flex flex-wrap gap-2">
          {creators.map((creator) => (
            <li key={creator.id} className="rounded-lg bg-ink-800 px-3 py-2 text-sm">
              <span className="font-medium">{creator.name}</span>
              <span className="ml-2 text-xs text-ink-400">{countByCreator.get(creator.id) ?? 0} posts</span>
            </li>
          ))}
          {creators.length === 0 && (
            <li className="text-sm text-ink-400">No creators yet. Load the sample data from the README setup steps.</li>
          )}
        </ul>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Source posts ({posts.length})</h2>
          <span className="text-xs text-ink-400">Newest first</span>
        </div>
        <ul className="space-y-3">
          {posts.map((post) => {
            const e = (post.engagement_data ?? {}) as Engagement;
            return (
              <li key={post.id} className="rounded-lg bg-ink-800 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{post.author ?? "Unknown author"}</span>
                  <span className="text-xs text-ink-400">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString() : "date unknown"}
                    {" · "}
                    {e.likes ?? 0} likes · {e.comments ?? 0} comments
                  </span>
                </div>
                <p className="mt-2 line-clamp-4 whitespace-pre-line break-words text-ink-200">{post.content}</p>
                {post.source_url && !env.demoMode && (
                  <a href={post.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-accent-400 hover:underline">
                    View original post &rarr;
                  </a>
                )}
              </li>
            );
          })}
          {posts.length === 0 && <li className="text-sm text-ink-400">No source posts yet.</li>}
        </ul>
      </section>
    </div>
  );
}
