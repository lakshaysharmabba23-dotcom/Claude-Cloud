import { hashContent } from "@/lib/normalization/hash";
import type { VoiceProfile } from "@/lib/types/schemas";
import { SEED_VOICE_PROFILE } from "./seed-data";

/**
 * Replaces the fictional "Demo Voice Profile" with one derived from a real,
 * proven pattern combination (Raw-Number Proof Open + Numbered Framework +
 * Open Question CTA - see real-gtm-patterns.ts) rather than the user's own
 * posts, which weren't getting traction and aren't representative of a
 * working voice yet. The single example below is an ORIGINAL post written
 * for this project (not copied from any creator), demonstrating that
 * pattern combination on the project's own real story.
 *
 * Reuses SEED_VOICE_PROFILE's id so seeding this overwrites the fictional
 * profile in place rather than leaving both around.
 */
const EXAMPLE_CONTENT = [
  "I spent weeks building an AI system that writes LinkedIn posts, and it kept timing out.",
  "",
  "3 AI providers tried before one actually worked. 1 background job system to fix the timeouts for good. 8 real patterns pulled from real posts by working GTM operators.",
  "",
  "Here's what actually moved the needle:",
  "",
  "1. Research first, write second",
  "↳ Every post starts from real sources, not a blank prompt. No sources, no post.",
  "",
  "2. Steal structure, not content",
  "↳ Patterns came from real posts, not templates. The structure is reusable. The words never are.",
  "",
  "3. Critique before a human ever sees it",
  "↳ The system grades its own draft against a checklist before it reaches review. Half the bad drafts never make it that far.",
  "",
  "4. Background jobs, not blocking requests",
  "↳ Real AI calls take longer than a web request allows. Fighting that limit wastes more time than building around it.",
  "",
  "None of this is groundbreaking. It's just pointing the same fundamentals working GTM teams already use at content instead of outbound.",
  "",
  "Over to you: what's the one step in your content process you'd automate first?"
].join("\n");

export const REAL_VOICE_PROFILE: VoiceProfile = {
  ...SEED_VOICE_PROFILE,
  name: "Founder Voice (GTM Engineering)",
  tone: ["direct", "plainspoken", "builder-minded"],
  sentence_length: { average_words: 11, variance: "medium" },
  paragraph_length: { average_sentences: 1, style: "short" },
  vocabulary: { complexity: "moderate", jargon_level: "light", signature_words: ["here's what actually", "over to you", "none of this is groundbreaking"] },
  formality: "conversational",
  humor_level: "none",
  storytelling_level: "occasional",
  formatting_style: {
    uses_line_breaks: true,
    uses_bullets: true,
    uses_bold: false,
    uses_emoji: false,
    uses_numbers_and_data: true,
    asks_questions: true,
    cta_style: "ends with a specific, answerable question ('Over to you: ...')"
  },
  things_to_avoid: ["corporate jargon", "generic motivational platitudes", "unearned superlatives"],
  sample_count: 1
};

function deterministicId(namespace: string, index: number | string): string {
  const hex = hashContent(`real:${namespace}:${index}`).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export const REAL_VOICE_EXAMPLES = [
  {
    id: deterministicId("voice_example", REAL_VOICE_PROFILE.id!),
    voice_profile_id: REAL_VOICE_PROFILE.id!,
    content: EXAMPLE_CONTENT,
    source: "reference-post (original, modeled on a proven real pattern combination - not the user's own writing)",
    created_at: new Date().toISOString()
  }
];
