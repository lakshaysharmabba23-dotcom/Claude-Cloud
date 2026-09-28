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
import { REAL_CREATORS, REAL_SOURCE_POSTS, REAL_PATTERNS, REAL_POST_PATTERNS } from "./real-gtm-patterns";
import { REAL_VOICE_PROFILE, REAL_VOICE_EXAMPLES } from "./real-voice-profile";

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
  // The drafts.critique column is `not null default '{}'::jsonb` - passing
  // an explicit null (as the seed data does, to satisfy the TS Draft type's
  // "no critique yet" case) overrides that default and trips the not-null
  // constraint on insert, so it's coerced to {} right here at the DB
  // boundary rather than widening the shared, TS-typed seed data.
  await upsert(
    "drafts",
    SEED_DRAFTS.map((d) => ({ ...d, critique: d.critique ?? {} }))
  );
  await upsert(
    "published_posts",
    SEED_PUBLISHED_POSTS.map(({ patternId: _p, topic: _t, audience: _a, ...post }) => post)
  );
  await upsert("post_performance", SEED_PERFORMANCE);
  await upsert("pattern_performance", SEED_PATTERN_PERFORMANCE);

  return results;
}

/**
 * Pushes a real, evidence-based Pattern Library into Supabase - see
 * src/lib/data/real-gtm-patterns.ts for provenance (public LinkedIn posts
 * the user collected themselves and handed over for analysis; this app
 * never scrapes LinkedIn). Additive alongside the fictional DEMO_MODE
 * dataset, not a replacement - both can coexist in content_patterns.
 * Idempotent, same as seedSupabase.
 */
export async function seedRealPatterns(supabase: SupabaseClient): Promise<SeedResult[]> {
  const results: SeedResult[] = [];

  async function upsert(table: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) {
      results.push({ table, rows: 0, error: null });
      return;
    }
    const { error } = await supabase.from(table).upsert(rows);
    results.push({ table, rows: rows.length, error: error?.message ?? null });
  }

  await upsert("creators", REAL_CREATORS);
  await upsert("content_patterns", REAL_PATTERNS);
  await upsert("source_posts", REAL_SOURCE_POSTS);
  await upsert("post_patterns", REAL_POST_PATTERNS);

  return results;
}

/**
 * Replaces the fictional "Demo Voice Profile" with one derived from a real,
 * proven pattern combination (see real-voice-profile.ts for why - the
 * user's own posts weren't getting traction, so a working reference beats
 * feeding in an unproven voice). Overwrites in place: same id as the
 * fictional profile, so nothing dangles.
 */
export async function seedRealVoiceProfile(supabase: SupabaseClient): Promise<SeedResult[]> {
  const results: SeedResult[] = [];

  async function upsert(table: string, rows: Record<string, unknown>[]) {
    const { error } = await supabase.from(table).upsert(rows);
    results.push({ table, rows: rows.length, error: error?.message ?? null });
  }

  await upsert("voice_profiles", [REAL_VOICE_PROFILE]);
  await upsert("voice_examples", REAL_VOICE_EXAMPLES);
  // Drop every OTHER example on this profile (the old fictional ones) -
  // done after the upsert, and by excluding the real ids rather than
  // deleting-then-inserting, so this is safe to re-run and its result is
  // actually checked (a previous version of this function fired the
  // delete without reading its error, so a failed delete went unnoticed
  // and stale [FICTIONAL] examples lingered).
  const realExampleIds = REAL_VOICE_EXAMPLES.map((e) => e.id);
  const { error: deleteError, count } = await supabase
    .from("voice_examples")
    .delete({ count: "exact" })
    .eq("voice_profile_id", REAL_VOICE_PROFILE.id!)
    .not("id", "in", `(${realExampleIds.join(",")})`);
  results.push({ table: "voice_examples (stale removed)", rows: count ?? 0, error: deleteError?.message ?? null });

  return results;
}

/**
 * Deletes every row of the fictional DEMO_MODE seed dataset (by its
 * deterministic ids), so a real deployment's UI only shows the real
 * pattern library + voice profile seeded above. Never touches anything a
 * real user created through the app themselves (Studio-generated drafts,
 * approved posts, voice examples from Voice Lab) - only the exact rows
 * this project's own fictional seed data introduced.
 */
export async function deleteFictionalSeedData(supabase: SupabaseClient): Promise<SeedResult[]> {
  const results: SeedResult[] = [];

  async function del(table: string, column: string, ids: string[]) {
    if (ids.length === 0) {
      results.push({ table, rows: 0, error: null });
      return;
    }
    const { error } = await supabase.from(table).delete().in(column, ids);
    results.push({ table, rows: ids.length, error: error?.message ?? null });
  }

  // Children before parents, to respect foreign keys.
  await del(
    "post_patterns",
    "post_id",
    SEED_SOURCE_POSTS.map((p) => p.id)
  );
  await del("post_performance", "id", SEED_PERFORMANCE.map((p) => p.id));
  await del("pattern_performance", "id", SEED_PATTERN_PERFORMANCE.map((p) => p.id));
  await del("published_posts", "id", SEED_PUBLISHED_POSTS.map((p) => p.id));
  await del("drafts", "id", SEED_DRAFTS.map((d) => d.id));
  await del("source_posts", "id", SEED_SOURCE_POSTS.map((p) => p.id));
  await del("content_patterns", "id", SEED_PATTERNS.map((p) => p.id!));
  await del("creators", "id", SEED_CREATORS.map((c) => c.id));

  return results;
}
