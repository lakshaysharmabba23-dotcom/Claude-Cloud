import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { memoryStore } from "./memory-store";
import { aggregatePatternPerformance, type PerformanceObservation } from "@/lib/performance/aggregation";
import { calculateEngagementRate } from "@/lib/performance/calculations";
import type {
  ContentPattern,
  Draft,
  DraftStatus,
  PatternPerformanceRow,
  PerformanceSnapshotInput,
  VoiceProfile
} from "@/lib/types/schemas";

/**
 * Data access layer. Every function here checks isSupabaseConfigured():
 *   - When a real Supabase project is configured, it reads/writes Postgres.
 *   - Otherwise (the default for local/demo use), it reads/writes the
 *     in-memory seed store (see memory-store.ts).
 *
 * This is the ONLY module in the app that should import the Supabase
 * client directly or the memory store directly - everything else (API
 * routes, Trigger.dev tasks, server components) goes through here, so the
 * "runs fully without paid APIs / without a hosted DB" property is
 * enforced in one place.
 */

function getSupabaseClientIfConfigured() {
  const client = isSupabaseConfigured() ? getServiceSupabase() : null;
  return client;
}

// -----------------------------------------------------------------------------
// Creators / source posts
// -----------------------------------------------------------------------------

export async function listCreators() {
  const db = getSupabaseClientIfConfigured();
  if (db) {
    const { data, error } = await db.from("creators").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
  return memoryStore.creators;
}

export async function listSourcePosts(filter?: { creatorId?: string }) {
  const db = getSupabaseClientIfConfigured();
  if (db) {
    let query = db.from("source_posts").select("*").order("published_at", { ascending: false });
    if (filter?.creatorId) query = query.eq("creator_id", filter.creatorId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  return filter?.creatorId
    ? memoryStore.sourcePosts.filter((p) => p.creator_id === filter.creatorId)
    : memoryStore.sourcePosts;
}

// -----------------------------------------------------------------------------
// Pattern library
// -----------------------------------------------------------------------------

export interface PatternWithStats extends ContentPattern {
  usage_count: number;
  topics: string[];
  performance: PatternPerformanceRow[];
}

export async function listPatterns(filter?: { category?: string }): Promise<PatternWithStats[]> {
  const db = getSupabaseClientIfConfigured();

  if (db) {
    let query = db.from("content_patterns").select("*");
    if (filter?.category) query = query.eq("category", filter.category);
    const { data: patterns, error } = await query;
    if (error) throw error;

    const { data: postPatterns } = await db.from("post_patterns").select("pattern_id");
    const { data: performance } = await db.from("pattern_performance").select("*");

    return (patterns ?? []).map((p) => attachStats(p, postPatterns ?? [], [], performance ?? []));
  }

  const patterns = filter?.category
    ? memoryStore.patterns.filter((p) => p.category === filter.category)
    : memoryStore.patterns;

  return patterns.map((p) =>
    attachStats(
      p,
      memoryStore.postPatterns,
      memoryStore.sourcePosts,
      memoryStore.patternPerformance
    )
  );
}

function attachStats(
  pattern: ContentPattern,
  postPatterns: Array<{ pattern_id: string; post_id?: string }>,
  sourcePosts: Array<{ id: string; content: string }>,
  performance: PatternPerformanceRow[]
): PatternWithStats {
  const usages = postPatterns.filter((pp) => pp.pattern_id === pattern.id);
  const topics = new Set<string>();
  for (const usage of usages) {
    const post = sourcePosts.find((p) => p.id === usage.post_id);
    if (post) {
      // Topics aren't stored per-post in this simplified schema view; the
      // pattern_performance rows (grouped by topic) are the authoritative
      // topic breakdown, added below.
      void post;
    }
  }
  const perfRows = performance.filter((row) => row.pattern_id === pattern.id);
  for (const row of perfRows) if (row.topic) topics.add(row.topic);

  return {
    ...pattern,
    usage_count: usages.length,
    topics: [...topics],
    performance: perfRows
  };
}

export async function getPattern(id: string): Promise<PatternWithStats | null> {
  const patterns = await listPatterns();
  return patterns.find((p) => p.id === id) ?? null;
}

// -----------------------------------------------------------------------------
// Voice profiles
// -----------------------------------------------------------------------------

export async function getDefaultVoiceProfile(): Promise<VoiceProfile | null> {
  const db = getSupabaseClientIfConfigured();
  if (db) {
    const { data, error } = await db
      .from("voice_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as VoiceProfile | null;
  }
  return memoryStore.voiceProfiles[0] ?? null;
}

export async function listVoiceExamples(voiceProfileId: string) {
  const db = getSupabaseClientIfConfigured();
  if (db) {
    const { data, error } = await db
      .from("voice_examples")
      .select("*")
      .eq("voice_profile_id", voiceProfileId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
  return memoryStore.voiceExamples.filter((e) => e.voice_profile_id === voiceProfileId);
}

export async function saveVoiceProfile(profile: VoiceProfile): Promise<VoiceProfile> {
  const db = getSupabaseClientIfConfigured();
  const withTimestamp = { ...profile, updated_at: new Date().toISOString() };

  if (db) {
    const { data, error } = await db
      .from("voice_profiles")
      .upsert(profile.id ? { ...withTimestamp, id: profile.id } : withTimestamp)
      .select()
      .single();
    if (error) throw error;
    return data as VoiceProfile;
  }

  const idx = memoryStore.voiceProfiles.findIndex((p) => p.id === profile.id);
  if (idx >= 0) {
    memoryStore.voiceProfiles[idx] = profile;
  } else {
    memoryStore.voiceProfiles.unshift(profile);
  }
  return profile;
}

export async function addVoiceExamples(
  voiceProfileId: string,
  examples: Array<{ content: string; source?: string }>
) {
  const db = getSupabaseClientIfConfigured();
  if (db) {
    const { data, error } = await db
      .from("voice_examples")
      .insert(examples.map((e) => ({ voice_profile_id: voiceProfileId, content: e.content, source: e.source })))
      .select();
    if (error) throw error;
    return data;
  }

  const inserted = examples.map((e, i) => ({
    id: `local-${Date.now()}-${i}`,
    voice_profile_id: voiceProfileId,
    content: e.content,
    source: e.source ?? null,
    created_at: new Date().toISOString()
  }));
  memoryStore.voiceExamples.unshift(...inserted);
  return inserted;
}

// -----------------------------------------------------------------------------
// Drafts / human review
// -----------------------------------------------------------------------------

export async function listDrafts(filter?: { status?: DraftStatus }) {
  const db = getSupabaseClientIfConfigured();
  if (db) {
    let query = db.from("drafts").select("*").order("created_at", { ascending: false });
    if (filter?.status) query = query.eq("status", filter.status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  return filter?.status
    ? memoryStore.drafts.filter((d) => d.status === filter.status)
    : memoryStore.drafts;
}

export async function getDraft(id: string) {
  const db = getSupabaseClientIfConfigured();
  if (db) {
    const { data, error } = await db.from("drafts").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  }
  return memoryStore.drafts.find((d) => d.id === id) ?? null;
}

export async function createDraft(draft: Draft) {
  const db = getSupabaseClientIfConfigured();
  const now = new Date().toISOString();

  if (db) {
    const { data, error } = await db
      .from("drafts")
      .insert({ ...draft, status: draft.status ?? "draft" })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const record = {
    ...draft,
    id: draft.id ?? `local-draft-${Date.now()}`,
    status: draft.status ?? "draft",
    critique: draft.critique ?? null,
    created_at: now,
    updated_at: now
  };
  memoryStore.drafts.unshift(record);
  return record;
}

export async function updateDraft(id: string, patch: Partial<Draft>) {
  const db = getSupabaseClientIfConfigured();
  const now = new Date().toISOString();

  if (db) {
    const { data, error } = await db
      .from("drafts")
      .update({ ...patch, updated_at: now })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const idx = memoryStore.drafts.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error(`Draft ${id} not found`);
  const existing = memoryStore.drafts[idx]!;
  const updated = { ...existing, ...patch, updated_at: now };
  memoryStore.drafts[idx] = updated;
  return updated;
}

// -----------------------------------------------------------------------------
// Publish record (always human-triggered - never called automatically)
// -----------------------------------------------------------------------------

export async function findPublishedByDraft(draftId: string) {
  const db = getSupabaseClientIfConfigured();
  if (db) {
    const { data, error } = await db.from("published_posts").select("*").eq("draft_id", draftId).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }
  return memoryStore.publishedPosts.find((p) => p.draft_id === draftId) ?? null;
}

export async function publishDraft(draftId: string) {
  const draft = await getDraft(draftId);
  if (!draft) throw new Error(`Draft ${draftId} not found`);
  if (draft.status !== "approved") {
    throw new Error(`Draft ${draftId} must be approved by a human before it can be recorded as published.`);
  }

  // Idempotent: a draft is recorded as published at most once.
  const existing = await findPublishedByDraft(draftId);
  if (existing) return existing;

  const db = getSupabaseClientIfConfigured();
  const record = {
    id: `local-published-${Date.now()}`,
    draft_id: draftId,
    content: draft.content,
    published_at: new Date().toISOString(),
    source_url: null as string | null
  };

  if (db) {
    const { data, error } = await db
      .from("published_posts")
      .insert({ draft_id: draftId, content: draft.content })
      .select()
      .single();
    if (error) {
      // Two simultaneous approvals: the unique index on draft_id rejected the
      // second insert, so return the one that won.
      if ((error as { code?: string }).code === "23505") {
        const winner = await findPublishedByDraft(draftId);
        if (winner) return winner;
      }
      throw error;
    }
    return data;
  }

  memoryStore.publishedPosts.unshift({
    ...record,
    patternId: draft.selected_pattern_id ?? "",
    topic: draft.topic,
    audience: draft.audience
  });
  return record;
}

export async function listPublishedPosts() {
  const db = getSupabaseClientIfConfigured();
  if (db) {
    const { data, error } = await db.from("published_posts").select("*").order("published_at", { ascending: false });
    if (error) throw error;
    return data;
  }
  return memoryStore.publishedPosts;
}

// -----------------------------------------------------------------------------
// Performance
// -----------------------------------------------------------------------------

export async function addPerformanceSnapshot(input: PerformanceSnapshotInput) {
  const engagement_rate = calculateEngagementRate(input);
  const db = getSupabaseClientIfConfigured();
  const record = {
    id: `local-perf-${Date.now()}`,
    published_post_id: input.published_post_id,
    captured_at: new Date().toISOString(),
    impressions: input.impressions,
    likes: input.likes,
    comments: input.comments,
    reposts: input.reposts,
    profile_views: input.profile_views,
    clicks: input.clicks,
    engagement_rate
  };

  if (db) {
    const { data, error } = await db.from("post_performance").insert(record).select().single();
    if (error) throw error;
    return data;
  }

  memoryStore.performance.push(record);
  return record;
}

export async function listPerformance(publishedPostId?: string) {
  const db = getSupabaseClientIfConfigured();
  if (db) {
    let query = db.from("post_performance").select("*").order("captured_at", { ascending: true });
    if (publishedPostId) query = query.eq("published_post_id", publishedPostId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  return publishedPostId
    ? memoryStore.performance.filter((p) => p.published_post_id === publishedPostId)
    : memoryStore.performance;
}

// -----------------------------------------------------------------------------
// Feedback loop: recompute pattern_performance from published posts + their
// latest performance snapshot + the pattern they used.
// -----------------------------------------------------------------------------

export async function recomputePatternPerformance(): Promise<PatternPerformanceRow[]> {
  const db = getSupabaseClientIfConfigured();

  if (db) {
    const [{ data: published }, { data: performance }] = await Promise.all([
      db.from("published_posts").select("id, draft_id"),
      db.from("post_performance").select("*")
    ]);
    const { data: drafts } = await db.from("drafts").select("id, selected_pattern_id, topic, audience");

    const observations: PerformanceObservation[] = (published ?? []).map((post) => {
      const draft = (drafts ?? []).find((d) => d.id === post.draft_id);
      const snapshots = (performance ?? [])
        .filter((p) => p.published_post_id === post.id)
        .sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
      const latest = snapshots[snapshots.length - 1];
      return {
        patternId: draft?.selected_pattern_id ?? "",
        topic: draft?.topic ?? null,
        audience: draft?.audience ?? null,
        impressions: latest?.impressions ?? null,
        engagementRate: latest?.engagement_rate ?? null,
        comments: latest?.comments ?? null
      };
    });

    const rows = aggregatePatternPerformance(observations.filter((o) => o.patternId));
    // Clear the old derived rows. The filter must be a valid uuid comparison
    // (comparing the uuid column to "" is rejected by Postgres), and every
    // error is checked so a failed rebuild can't silently leave duplicates.
    const { error: deleteError } = await db.from("pattern_performance").delete().not("id", "is", null);
    if (deleteError) throw new Error(`Could not clear pattern_performance: ${deleteError.message}`);
    if (rows.length) {
      const { error: insertError } = await db.from("pattern_performance").insert(rows);
      if (insertError) throw new Error(`Could not save pattern_performance: ${insertError.message}`);
    }
    return rows;
  }

  const observations: PerformanceObservation[] = memoryStore.publishedPosts.map((post) => {
    const snapshots = memoryStore.performance
      .filter((p) => p.published_post_id === post.id)
      .sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
    const latest = snapshots[snapshots.length - 1];
    return {
      patternId: post.patternId,
      topic: post.topic,
      audience: post.audience,
      impressions: latest?.impressions ?? null,
      engagementRate: latest?.engagement_rate ?? null,
      comments: latest?.comments ?? null
    };
  });

  const rows = aggregatePatternPerformance(observations.filter((o) => o.patternId));
  memoryStore.patternPerformance = rows.map((row, i) => ({
    id: `local-pp-${i}`,
    ...row,
    calculated_at: new Date().toISOString()
  }));
  return rows;
}

export async function listPatternPerformance(): Promise<PatternPerformanceRow[]> {
  const db = getSupabaseClientIfConfigured();
  if (db) {
    const { data, error } = await db.from("pattern_performance").select("*");
    if (error) throw error;
    return data as PatternPerformanceRow[];
  }
  return memoryStore.patternPerformance;
}

// -----------------------------------------------------------------------------
// Dashboard summary
// -----------------------------------------------------------------------------

export async function getDashboardSummary() {
  const [creators, sourcePosts, patterns, drafts, published, performance] = await Promise.all([
    listCreators(),
    listSourcePosts(),
    listPatterns(),
    listDrafts(),
    listPublishedPosts(),
    listPerformance()
  ]);

  const topPatterns = [...patterns].sort((a, b) => b.usage_count - a.usage_count).slice(0, 5);

  return {
    counts: {
      creators: creators.length,
      sourcePosts: sourcePosts.length,
      patterns: patterns.length,
      drafts: drafts.length,
      published: published.length,
      performanceSnapshots: performance.length
    },
    topPatterns,
    recentResearch: sourcePosts.slice(0, 8),
    recentDrafts: drafts.slice(0, 5)
  };
}
