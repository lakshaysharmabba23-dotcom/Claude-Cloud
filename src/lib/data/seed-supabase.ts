import type { SupabaseClient } from "@supabase/supabase-js";
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
} from "./seed-data";

export interface SeedResult {
  table: string;
  rows: number;
  error: string | null;
}

/**
 * Pushes the fictional seed dataset directly into a real Supabase project
 * via supabase-js (no SQL Editor, no copy-paste). Used by:
 *   - scripts/seed/run.ts (CLI, when this repo is run somewhere with
 *     network access to Supabase)
 *   - POST /api/admin/seed (so it can be triggered from a browser hitting
 *     the deployed app, which - unlike some sandboxes - has real internet
 *     access to Supabase; see docs/architecture.md)
 *
 * Idempotent: every table upserts on primary key, so running this more
 * than once just re-writes the same rows rather than duplicating them.
 */
export async function seedSupabase(supabase: SupabaseClient): Promise<SeedResult[]> {
  const results: SeedResult[] = [];

  async function upsert(table: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) {
      results.push({ table, rows: 0, error: null });
      return;
    }
    const { error } = await supabase.from(table).upsert(rows);
    results.push({ table, rows: rows.length, error: error?.message ?? null });
  }

  await upsert("creators", SEED_CREATORS);
  await upsert("content_patterns", SEED_PATTERNS);
  await upsert(
    "source_posts",
    SEED_SOURCE_POSTS.map(({ patternIds: _patternIds, ...post }) => post)
  );
  await upsert("post_patterns", SEED_POST_PATTERNS);
  await upsert("voice_profiles", [SEED_VOICE_PROFILE]);
  await upsert("voice_examples", SEED_VOICE_EXAMPLES);
  await upsert("drafts", SEED_DRAFTS);
  await upsert(
    "published_posts",
    SEED_PUBLISHED_POSTS.map(({ patternId: _p, topic: _t, audience: _a, ...post }) => post)
  );
  await upsert("post_performance", SEED_PERFORMANCE);
  await upsert("pattern_performance", SEED_PATTERN_PERFORMANCE);

  return results;
}
