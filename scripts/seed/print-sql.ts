/**
 * Prints the seed dataset (src/lib/data/seed-data.ts) as plain SQL INSERT
 * statements, in FK-safe order. Unlike scripts/seed/run.ts (which needs a
 * live Supabase connection via supabase-js), this needs no network at all -
 * it's pure data -> SQL text, meant to be pasted into the Supabase SQL
 * Editor exactly like the schema migration was.
 *
 * Usage: npx tsx scripts/seed/print-sql.ts > seed.sql
 */
import {
  SEED_CREATORS,
  SEED_SOURCE_POSTS,
  SEED_PATTERNS,
  SEED_POST_PATTERNS,
  SEED_VOICE_PROFILE,
  SEED_VOICE_EXAMPLES,
  SEED_DRAFTS,
  SEED_PUBLISHED_POSTS,
  SEED_PERFORMANCE,
  SEED_PATTERN_PERFORMANCE
} from "../../src/lib/data/seed-data";

function esc(value: string): string {
  return value.replace(/'/g, "''");
}
function s(value: string | null | undefined): string {
  if (value === null || value === undefined) return "null";
  return `'${esc(value)}'`;
}
function j(value: unknown): string {
  return `'${esc(JSON.stringify(value))}'::jsonb`;
}
function n(value: number | null | undefined): string {
  return value === null || value === undefined ? "null" : String(value);
}

/** Batches rows into multiple INSERT statements of at most `batchSize` rows each, so no single paste block gets too long to copy reliably. */
function insert(table: string, columns: string[], rows: string[][], batchSize = 25): string {
  if (rows.length === 0) return `-- (no rows for ${table})\n`;
  const statements: string[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = batch.map((r) => `  (${r.join(", ")})`).join(",\n");
    statements.push(`insert into ${table} (${columns.join(", ")}) values\n${values}\non conflict do nothing;`);
  }
  return statements.join("\n\n") + "\n";
}

const out: string[] = [];

out.push("-- ==== creators ====");
out.push(
  insert(
    "creators",
    ["id", "name", "profile_url", "niche", "description", "created_at"],
    SEED_CREATORS.map((c) => [s(c.id), s(c.name), s(c.profile_url), s(c.niche), s(c.description), s(c.created_at)])
  )
);

out.push("-- ==== content_patterns ====");
out.push(
  insert(
    "content_patterns",
    ["id", "name", "category", "description", "structure", "example", "strengths", "weaknesses"],
    SEED_PATTERNS.map((p) => [
      s(p.id!),
      s(p.name),
      s(p.category),
      s(p.description),
      j(p.structure),
      s(p.example ?? null),
      j(p.strengths),
      j(p.weaknesses)
    ])
  )
);

out.push("-- ==== source_posts ====");
out.push(
  insert(
    "source_posts",
    [
      "id",
      "creator_id",
      "source_url",
      "canonical_url",
      "content_hash",
      "source_platform",
      "author",
      "content",
      "published_at",
      "engagement_data",
      "raw_data"
    ],
    SEED_SOURCE_POSTS.map((p) => [
      s(p.id),
      s(p.creator_id),
      s(p.source_url),
      s(p.canonical_url),
      s(p.content_hash),
      s(p.source_platform),
      s(p.author),
      s(p.content),
      s(p.published_at),
      j(p.engagement_data),
      j(p.raw_data)
    ])
  )
);

out.push("-- ==== post_patterns ====");
out.push(
  insert(
    "post_patterns",
    ["post_id", "pattern_id", "confidence", "evidence", "extraction"],
    SEED_POST_PATTERNS.map((pp) => [s(pp.post_id), s(pp.pattern_id), n(pp.confidence), j(pp.evidence), j(pp.extraction)])
  )
);

out.push("-- ==== voice_profiles ====");
out.push(
  insert(
    "voice_profiles",
    [
      "id",
      "name",
      "tone",
      "sentence_length",
      "paragraph_length",
      "vocabulary",
      "formality",
      "humor_level",
      "storytelling_level",
      "formatting_style",
      "things_to_avoid",
      "sample_count"
    ],
    [
      [
        s(SEED_VOICE_PROFILE.id!),
        s(SEED_VOICE_PROFILE.name),
        j(SEED_VOICE_PROFILE.tone),
        j(SEED_VOICE_PROFILE.sentence_length),
        j(SEED_VOICE_PROFILE.paragraph_length),
        j(SEED_VOICE_PROFILE.vocabulary),
        s(SEED_VOICE_PROFILE.formality),
        s(SEED_VOICE_PROFILE.humor_level),
        s(SEED_VOICE_PROFILE.storytelling_level),
        j(SEED_VOICE_PROFILE.formatting_style),
        j(SEED_VOICE_PROFILE.things_to_avoid),
        n(SEED_VOICE_PROFILE.sample_count)
      ]
    ]
  )
);

out.push("-- ==== voice_examples ====");
out.push(
  insert(
    "voice_examples",
    ["id", "voice_profile_id", "content", "source", "created_at"],
    SEED_VOICE_EXAMPLES.map((e) => [s(e.id), s(e.voice_profile_id), s(e.content), s(e.source), s(e.created_at)])
  )
);

out.push("-- ==== drafts ====");
out.push(
  insert(
    "drafts",
    [
      "id",
      "topic",
      "audience",
      "objective",
      "voice_profile_id",
      "selected_pattern_id",
      "content",
      "status",
      "generation_metadata",
      "created_at",
      "updated_at"
    ],
    SEED_DRAFTS.map((d) => [
      s(d.id),
      s(d.topic),
      s(d.audience),
      s(d.objective),
      s(d.voice_profile_id),
      s(d.selected_pattern_id),
      s(d.content),
      s(d.status),
      j(d.generation_metadata),
      s(d.created_at),
      s(d.created_at)
    ])
  )
);

out.push("-- ==== published_posts ====");
out.push(
  insert(
    "published_posts",
    ["id", "draft_id", "content", "published_at", "source_url"],
    SEED_PUBLISHED_POSTS.map((p) => [s(p.id), s(p.draft_id), s(p.content), s(p.published_at), s(p.source_url)])
  )
);

out.push("-- ==== post_performance ====");
out.push(
  insert(
    "post_performance",
    [
      "id",
      "published_post_id",
      "captured_at",
      "impressions",
      "likes",
      "comments",
      "reposts",
      "profile_views",
      "clicks",
      "engagement_rate"
    ],
    SEED_PERFORMANCE.map((p) => [
      s(p.id),
      s(p.published_post_id),
      s(p.captured_at),
      n(p.impressions),
      n(p.likes),
      n(p.comments),
      n(p.reposts),
      n(p.profile_views),
      n(p.clicks),
      n(p.engagement_rate)
    ])
  )
);

out.push("-- ==== pattern_performance ====");
out.push(
  insert(
    "pattern_performance",
    [
      "id",
      "pattern_id",
      "topic",
      "audience",
      "posts_analyzed",
      "impressions_median",
      "engagement_rate_median",
      "comments_median",
      "confidence",
      "calculated_at"
    ],
    SEED_PATTERN_PERFORMANCE.map((p) => [
      s(p.id),
      s(p.pattern_id),
      s(p.topic),
      s(p.audience),
      n(p.posts_analyzed),
      n(p.impressions_median),
      n(p.engagement_rate_median),
      n(p.comments_median),
      s(p.confidence),
      s(p.calculated_at)
    ])
  )
);

console.log(out.join("\n"));
