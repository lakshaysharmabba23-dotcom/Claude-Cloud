import {
  SEED_CREATORS,
  SEED_SOURCE_POSTS,
  SEED_POST_PATTERNS,
  SEED_PATTERNS,
  SEED_VOICE_PROFILE,
  SEED_VOICE_EXAMPLES,
  SEED_DRAFTS,
  SEED_PUBLISHED_POSTS,
  SEED_PERFORMANCE,
  SEED_PATTERN_PERFORMANCE
} from "./seed-data";
import type { ContentPattern, Draft, VoiceProfile } from "@/lib/types/schemas";

/**
 * In-memory fallback data store, used only when Supabase is not configured
 * (DEMO_MODE without a real project). It is seeded once per server process
 * from the deterministic fixtures in seed-data.ts and then mutated as the
 * user interacts with the app (creating drafts, approving posts, logging
 * performance).
 *
 * This is explicitly a development/demo convenience, not a database: state
 * lives only in this process's memory and resets on restart. See
 * docs/architecture.md "Mock mode" for why this tradeoff is acceptable for
 * a portfolio project, and .env.example for how to point the app at a real
 * Supabase project instead.
 */

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export interface VoiceExampleRecord {
  id: string;
  voice_profile_id: string;
  content: string;
  source: string | null;
  created_at: string;
}

export interface DraftRecord extends Draft {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceRecord {
  id: string;
  published_post_id: string;
  captured_at: string;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  reposts: number | null;
  profile_views: number | null;
  clicks: number | null;
  engagement_rate: number | null;
}

export interface PublishedPostRecord {
  id: string;
  draft_id: string | null;
  content: string;
  published_at: string;
  source_url: string | null;
  created_at?: string;
  patternId: string;
  topic: string;
  audience: string;
}

class MemoryStore {
  creators = clone(SEED_CREATORS);
  sourcePosts = clone(SEED_SOURCE_POSTS);
  postPatterns = clone(SEED_POST_PATTERNS);
  patterns: ContentPattern[] = clone(SEED_PATTERNS);
  voiceProfiles: VoiceProfile[] = [clone(SEED_VOICE_PROFILE)];
  voiceExamples: VoiceExampleRecord[] = clone(SEED_VOICE_EXAMPLES);
  drafts: DraftRecord[] = clone(SEED_DRAFTS).map((d: (typeof SEED_DRAFTS)[number]) => ({
    ...d,
    updated_at: d.created_at
  }));
  publishedPosts: PublishedPostRecord[] = clone(SEED_PUBLISHED_POSTS);
  performance: PerformanceRecord[] = clone(SEED_PERFORMANCE);
  patternPerformance = clone(SEED_PATTERN_PERFORMANCE);
}

// A module-level singleton survives across requests within one Next.js dev
// server process (and one serverless instance in production), which is all
// an in-memory demo store needs to provide.
const globalForStore = globalThis as unknown as { __contentIntelStore?: MemoryStore };

export const memoryStore = globalForStore.__contentIntelStore ?? new MemoryStore();
globalForStore.__contentIntelStore = memoryStore;
