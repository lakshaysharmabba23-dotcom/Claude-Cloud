import { hashContent } from "@/lib/normalization/hash";
import { canonicalizeUrl } from "@/lib/normalization/url";
import { calculateEngagementRate } from "@/lib/performance/calculations";
import { aggregatePatternPerformance, type PerformanceObservation } from "@/lib/performance/aggregation";
import type { ContentPattern, VoiceProfile } from "@/lib/types/schemas";

/**
 * Deterministic, clearly-fictional seed data for DEMO_MODE.
 *
 * Every creator, post, quote and metric here is invented for this project
 * and labeled [FICTIONAL] wherever it appears as "content" a reader might
 * mistake for real. None of it should ever be presented as real-world data
 * (see docs/architecture.md - "Mock mode").
 *
 * Counts match the spec: 20 creators, 100 source posts, 15 content
 * patterns, 20 voice examples, 20 published posts, and performance
 * snapshots for each published post.
 */

// A small seeded PRNG so the dataset is identical across runs (and across
// the app process and any script that imports this module).
function seededRandom(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seededRandom(42);
function pick<T>(arr: readonly T[]): T {
  const item = arr[Math.floor(rand() * arr.length)];
  if (item === undefined) throw new Error("pick() called with an empty array");
  return item;
}
function randInt(min: number, max: number): number {
  return Math.floor(min + rand() * (max - min + 1));
}
function uuid(namespace: string, index: number | string): string {
  // Deterministic, readable pseudo-UUIDs so seed data is stable and greppable.
  const hex = hashContent(`${namespace}:${index}`).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// -----------------------------------------------------------------------------
// content_patterns (15, across all 6 categories)
// -----------------------------------------------------------------------------
export const SEED_PATTERNS: ContentPattern[] = [
  {
    id: uuid("pattern", 0),
    name: "Contrarian Claim -> Evidence",
    category: "hook",
    description: "Opens by challenging a widely-held belief, then spends the rest of the post backing it up.",
    structure: ["contrarian_claim", "why_the_common_view_is_wrong", "evidence", "reframed_takeaway"],
    example:
      "[FICTIONAL EXAMPLE] \"Most founders over-hire for GTM before product-market fit. Here's what actually works instead...\"",
    strengths: ["Strong scroll-stopping power", "Sets up a clear argument to follow"],
    weaknesses: ["Can feel gimmicky if the claim isn't genuinely defensible"]
  },
  {
    id: uuid("pattern", 1),
    name: "Direct Question Hook",
    category: "hook",
    description: "Opens with a question the target audience is likely already asking themselves.",
    structure: ["question", "why_it_matters", "answer", "supporting_point"],
    example: "[FICTIONAL EXAMPLE] \"Why do most sales playbooks fail in the first 90 days?\"",
    strengths: ["Invites immediate mental engagement", "Easy to personalize per audience"],
    weaknesses: ["Overused - needs a genuinely sharp question to stand out"]
  },
  {
    id: uuid("pattern", 2),
    name: "Statistic Cold Open",
    category: "hook",
    description: "Leads with a specific, surprising number before any context is given.",
    structure: ["statistic", "context", "interpretation", "implication"],
    example: "[FICTIONAL EXAMPLE] \"73% of demos never lead to a second call. Here's the pattern I keep seeing...\"",
    strengths: ["Signals credibility and specificity immediately"],
    weaknesses: ["Needs a real, sourced number - a vague statistic undermines trust"]
  },
  {
    id: uuid("pattern", 3),
    name: "Story -> Lesson",
    category: "structure",
    description: "A short first-person narrative that resolves into one generalizable lesson.",
    structure: ["setup", "complication", "turning_point", "lesson", "invitation_to_reader"],
    example: "[FICTIONAL EXAMPLE] A founder describes a failed launch, then extracts one principle from it.",
    strengths: ["Memorable, humanizes the author", "Naturally builds to a clear takeaway"],
    weaknesses: ["Weak if the lesson doesn't generalize beyond the anecdote"]
  },
  {
    id: uuid("pattern", 4),
    name: "Problem / Reframe / Solution",
    category: "structure",
    description: "States a common problem, reframes why the usual fix doesn't work, then offers an alternative.",
    structure: ["problem", "common_but_wrong_fix", "reframe", "alternative_approach"],
    example: null,
    strengths: ["Clear logical flow", "Works well for advice-style posts"],
    weaknesses: ["Can feel formulaic if the reframe isn't genuinely insightful"]
  },
  {
    id: uuid("pattern", 5),
    name: "Numbered Framework",
    category: "structure",
    description: "Breaks a practice into a small numbered list (typically 3-5 items) with one line per item.",
    structure: ["framing_claim", "numbered_list", "closing_synthesis"],
    example: null,
    strengths: ["Easy to scan on mobile", "Feels actionable"],
    weaknesses: ["Items can feel generic without a concrete detail each"]
  },
  {
    id: uuid("pattern", 6),
    name: "Before/After Contrast",
    category: "structure",
    description: "Explicitly contrasts a prior state with a current one to make change legible.",
    structure: ["before_state", "after_state", "what_changed"],
    example: null,
    strengths: ["Makes abstract improvement concrete"],
    weaknesses: ["Needs specific, checkable details on both sides of the contrast"]
  },
  {
    id: uuid("pattern", 7),
    name: "Personal Failure Narrative",
    category: "storytelling",
    description: "Centers a specific mistake the author made, told without excessive self-flattery.",
    structure: ["the_mistake", "the_cost", "what_i_changed"],
    example: null,
    strengths: ["High trust-building potential", "Differentiates from polished thought-leadership posts"],
    weaknesses: ["Can read as performative if repeated too often"]
  },
  {
    id: uuid("pattern", 8),
    name: "Customer/Colleague Vignette",
    category: "storytelling",
    description: "Tells a short story about someone else (with permission/generalized) to illustrate a point.",
    structure: ["who_and_context", "the_moment", "the_insight"],
    example: null,
    strengths: ["Adds social proof without being self-congratulatory"],
    weaknesses: ["Needs enough specific detail to feel real rather than illustrative filler"]
  },
  {
    id: uuid("pattern", 9),
    name: "Data-Point Anchor",
    category: "evidence",
    description: "Anchors the core claim to one specific, cited number rather than general assertion.",
    structure: ["claim", "cited_number", "interpretation"],
    example: null,
    strengths: ["Adds credibility", "Gives readers something concrete to agree/disagree with"],
    weaknesses: ["Requires an actual source - never fabricate the number"]
  },
  {
    id: uuid("pattern", 10),
    name: "First-Person Case Study",
    category: "evidence",
    description: "Uses the author's own documented experience as the primary evidence for the claim.",
    structure: ["context", "action_taken", "measured_result"],
    example: null,
    strengths: ["Hard to dispute since it's the author's own experience"],
    weaknesses: ["Sample size of one - should be framed as such, not generalized"]
  },
  {
    id: uuid("pattern", 11),
    name: "Analogy Bridge",
    category: "evidence",
    description: "Explains an abstract or technical idea by mapping it to a familiar, unrelated domain.",
    structure: ["unfamiliar_concept", "analogy", "mapped_insight"],
    example: null,
    strengths: ["Makes complex ideas accessible fast"],
    weaknesses: ["A weak or stretched analogy undermines the whole post"]
  },
  {
    id: uuid("pattern", 12),
    name: "Open Question CTA",
    category: "cta",
    description: "Closes with a direct, specific question inviting the reader's own experience.",
    structure: ["closing_question"],
    example: "[FICTIONAL EXAMPLE] \"What's the one GTM motion you wish you'd started earlier?\"",
    strengths: ["Reliably drives comments when the question is specific"],
    weaknesses: ["Generic questions ('thoughts?') underperform specific ones"]
  },
  {
    id: uuid("pattern", 13),
    name: "Soft Framework Recap CTA",
    category: "cta",
    description: "Restates the framework/list in one line, then invites saving/sharing rather than commenting.",
    structure: ["recap_line", "save_or_share_invite"],
    example: null,
    strengths: ["Good fit for reference-style posts"],
    weaknesses: ["Lower comment rate than a direct question"]
  },
  {
    id: uuid("pattern", 14),
    name: "Short-Line Formatting",
    category: "formatting",
    description: "Uses frequent line breaks (often one sentence per line) instead of dense paragraphs.",
    structure: ["single_sentence_lines"],
    example: null,
    strengths: ["Highly scannable on mobile", "Creates rhythm/pacing"],
    weaknesses: ["Can feel choppy if overused for genuinely complex arguments"]
  }
];

// -----------------------------------------------------------------------------
// creators (20 fictional public LinkedIn-style creators)
// -----------------------------------------------------------------------------
const NICHES = [
  "B2B SaaS GTM",
  "Engineering leadership",
  "Product management",
  "Founder / early-stage",
  "Sales leadership",
  "People / culture ops",
  "Developer marketing",
  "Data & analytics"
];

const FIRST_NAMES = [
  "Jordan", "Priya", "Marcus", "Elena", "Sam", "Noah", "Amara", "Leo", "Ines", "Tomas",
  "Zoe", "Kwame", "Sofia", "Ravi", "Maya", "Dmitri", "Aisha", "Colin", "Yuki", "Grace"
];
const LAST_NAMES = [
  "Reyes", "Chen", "Okafor", "Petrov", "Lindqvist", "Silva", "Nakamura", "Patel", "Novak", "Doyle",
  "Haddad", "Kim", "Ferreira", "Larsen", "Adeyemi", "Costa", "Winter", "Brandt", "Abara", "Solis"
];

export const SEED_CREATORS = Array.from({ length: 20 }, (_, i) => {
  const name = `${FIRST_NAMES[i]} ${LAST_NAMES[i]}`;
  const niche = NICHES[i % NICHES.length]!;
  return {
    id: uuid("creator", i),
    name,
    profile_url: `https://www.linkedin.com/in/fictional-${name.toLowerCase().replace(/\s+/g, "-")}`,
    niche,
    description: `[FICTIONAL] Demo creator profile writing about ${niche.toLowerCase()} for seed/demo purposes only.`,
    created_at: new Date(Date.now() - (400 - i) * 86_400_000).toISOString()
  };
});

// -----------------------------------------------------------------------------
// source_posts (100), each linked to 1-2 patterns via post_patterns
// -----------------------------------------------------------------------------
const TOPICS = [
  "GTM engineering",
  "founder-led sales",
  "product-market fit",
  "engineering velocity",
  "hiring your first AE",
  "developer-first marketing",
  "pricing experiments",
  "remote team culture",
  "board reporting",
  "customer churn analysis"
];

interface SourcePostSeed {
  id: string;
  creator_id: string;
  source_url: string;
  canonical_url: string;
  content_hash: string;
  source_platform: string;
  author: string;
  content: string;
  published_at: string;
  engagement_data: { impressions: number; likes: number; comments: number; reposts: number };
  raw_data: { fictional: true };
  patternIds: string[];
}

function makePostContent(topic: string, patternNames: string[]): string {
  const usesStory = patternNames.some((n) => n.includes("Story") || n.includes("Failure") || n.includes("Vignette"));
  const usesNumbered = patternNames.some((n) => n.includes("Numbered"));
  const usesQuestion = patternNames.some((n) => n.includes("Question"));
  const usesStat = patternNames.some((n) => n.includes("Statistic") || n.includes("Data-Point"));

  const lines: string[] = [];
  lines.push(
    usesQuestion
      ? `[FICTIONAL] Why does ${topic} quietly break for most teams around month six?`
      : usesStat
      ? `[FICTIONAL] 62% of the teams I've worked with under-invest in ${topic} until it's already a problem.`
      : `[FICTIONAL] Most people treat ${topic} as a one-time project. It isn't.`
  );
  lines.push("");
  if (usesStory) {
    lines.push(
      `[FICTIONAL] A team I worked with ignored ${topic} for two quarters. It cost them a renewal cycle before anyone noticed.`
    );
    lines.push("");
  }
  if (usesNumbered) {
    lines.push(`Three things that actually moved the needle on ${topic}:`);
    lines.push("1. Naming a single owner, not a committee.");
    lines.push("2. Reviewing it monthly instead of annually.");
    lines.push("3. Tying it to one metric leadership already tracks.");
    lines.push("");
  } else {
    lines.push(`The pattern that actually works for ${topic} is smaller and less exciting than people expect.`);
    lines.push("");
  }
  lines.push(
    usesQuestion
      ? `What's the moment you realized ${topic} needed real ownership?`
      : `Curious how other teams are approaching ${topic} right now.`
  );

  return lines.join("\n");
}

export const SEED_SOURCE_POSTS: SourcePostSeed[] = Array.from({ length: 100 }, (_, i) => {
  const creator = SEED_CREATORS[i % SEED_CREATORS.length]!;
  const topic = TOPICS[i % TOPICS.length]!;
  const patternCount = randInt(1, 2);
  const patternIds: string[] = [];
  const patternNames: string[] = [];
  while (patternIds.length < patternCount) {
    const p = pick(SEED_PATTERNS);
    if (!patternIds.includes(p.id!)) {
      patternIds.push(p.id!);
      patternNames.push(p.name);
    }
  }

  const content = makePostContent(topic, patternNames);
  const sourceUrl = `https://www.linkedin.com/posts/fictional-${creator.id.slice(0, 8)}-${i}`;

  return {
    id: uuid("source_post", i),
    creator_id: creator.id,
    source_url: sourceUrl,
    canonical_url: canonicalizeUrl(sourceUrl),
    content_hash: hashContent(content),
    source_platform: "linkedin",
    author: creator.name,
    content,
    published_at: new Date(Date.now() - randInt(5, 500) * 86_400_000).toISOString(),
    engagement_data: {
      impressions: randInt(800, 60_000),
      likes: randInt(5, 1200),
      comments: randInt(0, 180),
      reposts: randInt(0, 90)
    },
    raw_data: { fictional: true },
    patternIds
  } satisfies SourcePostSeed;
});

export const SEED_POST_PATTERNS = SEED_SOURCE_POSTS.flatMap((post) =>
  post.patternIds.map((patternId, i) => ({
    post_id: post.id,
    pattern_id: patternId,
    confidence: Math.round((0.55 + rand() * 0.4) * 1000) / 1000,
    evidence: [i === 0 ? "primary pattern per hook/structure analysis" : "secondary pattern present in formatting/CTA"],
    extraction: { fictional: true }
  }))
);

// -----------------------------------------------------------------------------
// voice_profiles + voice_examples (1 profile, 20 examples)
// -----------------------------------------------------------------------------
export const SEED_VOICE_PROFILE: VoiceProfile = {
  id: uuid("voice_profile", 0),
  name: "Demo Voice Profile",
  tone: ["direct", "candid", "dry-humored"],
  sentence_length: { average_words: 14.2, variance: "medium" },
  paragraph_length: { average_sentences: 2, style: "short" },
  vocabulary: { complexity: "moderate", jargon_level: "light", signature_words: ["frankly", "in practice", "worth noting"] },
  formality: "conversational",
  humor_level: "light",
  storytelling_level: "occasional",
  formatting_style: {
    uses_line_breaks: true,
    uses_bullets: true,
    uses_bold: false,
    uses_emoji: false,
    uses_numbers_and_data: true,
    asks_questions: true,
    cta_style: "ends with a specific, answerable question"
  },
  things_to_avoid: ["corporate jargon", "generic motivational platitudes", "unearned superlatives"],
  sample_count: 20
};

export const SEED_VOICE_EXAMPLES = Array.from({ length: 20 }, (_, i) => {
  const topic = TOPICS[i % TOPICS.length];
  const content = [
    `[FICTIONAL WRITING SAMPLE] I used to think ${topic} was something you set up once and moved on from.`,
    `In practice, the teams that actually get it right revisit it every month, not every year.`,
    `Worth noting: the fix is rarely more tooling. It's usually just naming one clear owner.`,
    `What's your read on this?`
  ].join("\n");

  return {
    id: uuid("voice_example", i),
    voice_profile_id: SEED_VOICE_PROFILE.id!,
    content,
    source: `demo-sample-${i + 1}`,
    created_at: new Date(Date.now() - (200 - i) * 86_400_000).toISOString()
  };
});

// -----------------------------------------------------------------------------
// drafts + published_posts (20) + post_performance snapshots
// -----------------------------------------------------------------------------
export const SEED_DRAFTS = Array.from({ length: 20 }, (_, i) => {
  const topic = TOPICS[i % TOPICS.length]!;
  const pattern = SEED_PATTERNS[i % SEED_PATTERNS.length]!;
  const content = makePostContent(topic, [pattern.name]);
  return {
    id: uuid("draft", i),
    topic,
    audience: "B2B SaaS operators",
    objective: "Generate discussion",
    voice_profile_id: SEED_VOICE_PROFILE.id!,
    selected_pattern_id: pattern.id!,
    content,
    status: "approved" as const,
    critique: null,
    generation_metadata: { fictional: true, model: "mock-heuristic-v1", provider: "mock" },
    created_at: new Date(Date.now() - (180 - i * 6) * 86_400_000).toISOString()
  };
});

export const SEED_PUBLISHED_POSTS = SEED_DRAFTS.map((draft, i) => ({
  id: uuid("published_post", i),
  draft_id: draft.id,
  content: draft.content,
  published_at: new Date(Date.now() - (170 - i * 6) * 86_400_000).toISOString(),
  source_url: null as string | null,
  patternId: draft.selected_pattern_id,
  topic: draft.topic,
  audience: draft.audience
}));

export const SEED_PERFORMANCE = SEED_PUBLISHED_POSTS.flatMap((post) => {
  const snapshotCount = randInt(1, 3);
  return Array.from({ length: snapshotCount }, (_, s) => {
    const impressions = randInt(1500, 45_000);
    const likes = randInt(10, Math.round(impressions * 0.05));
    const comments = randInt(0, Math.round(impressions * 0.01));
    const reposts = randInt(0, Math.round(impressions * 0.008));
    const engagementRate = calculateEngagementRate({ impressions, likes, comments, reposts });
    return {
      id: uuid("performance", `${post.id}-${s}`),
      published_post_id: post.id,
      captured_at: new Date(
        new Date(post.published_at).getTime() + (s + 1) * 3 * 86_400_000
      ).toISOString(),
      impressions,
      likes,
      comments,
      reposts,
      profile_views: randInt(0, Math.round(impressions * 0.02)),
      clicks: randInt(0, Math.round(impressions * 0.015)),
      engagement_rate: engagementRate
    };
  });
});

// -----------------------------------------------------------------------------
// pattern_performance: derived from the same seed data via the real
// aggregation function, so the feedback loop the analytics UI shows is
// consistent with the underlying seed observations by construction.
// -----------------------------------------------------------------------------
function latestSnapshotFor(publishedPostId: string) {
  const snapshots = SEED_PERFORMANCE.filter((p) => p.published_post_id === publishedPostId);
  return snapshots[snapshots.length - 1] ?? null;
}

const observations: PerformanceObservation[] = SEED_PUBLISHED_POSTS.map((post) => {
  const snapshot = latestSnapshotFor(post.id);
  return {
    patternId: post.patternId,
    topic: post.topic,
    audience: post.audience,
    impressions: snapshot?.impressions ?? null,
    engagementRate: snapshot?.engagement_rate ?? null,
    comments: snapshot?.comments ?? null
  };
});

export const SEED_PATTERN_PERFORMANCE = aggregatePatternPerformance(observations).map((row, i) => ({
  id: uuid("pattern_performance", i),
  ...row,
  calculated_at: new Date().toISOString()
}));
