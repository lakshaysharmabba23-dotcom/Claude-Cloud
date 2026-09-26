/**
 * Deterministic (non-LLM) critic checks. These run identically every time
 * given the same input, and are computed with plain string/array logic -
 * no model call, no randomness. They exist because some checks (did the
 * draft copy a sentence verbatim from a source, does it contain a known
 * cliche, does it end with a recognizable CTA) don't need a model's
 * judgment and are more trustworthy when computed directly.
 *
 * The LLM-assisted layer (see llm.ts) supplies the more subjective checks
 * (relevance, clarity, voice_match, structure) and its output is merged
 * with these results in critic.ts, with deterministic results always
 * winning when both layers speak to the same check.
 */

const GENERIC_PHRASES = [
  "game-changer",
  "game changer",
  "in today's fast-paced world",
  "unlock your potential",
  "leverage synergies",
  "think outside the box",
  "at the end of the day",
  "it goes without saying",
  "needless to say",
  "revolutionize",
  "seamless",
  "cutting-edge",
  "paradigm shift"
];

const ABSOLUTE_CLAIM_MARKERS = [
  "always",
  "never",
  "everyone knows",
  "everybody knows",
  "guaranteed",
  "100% of the time",
  "proven to",
  "no one",
  "nobody"
];

const EVIDENCE_MARKERS = [
  "%",
  "study",
  "studies",
  "research shows",
  "data shows",
  "in my experience",
  "i learned",
  "we found",
  "according to",
  "example:",
  "for example"
];

const CTA_MARKERS = [
  "?",
  "let me know",
  "comment below",
  "share your thoughts",
  "what's your take",
  "what's your experience",
  "curious to hear",
  "follow for more",
  "dm me",
  "reach out"
];

export interface DeterministicCriticResult {
  checks: {
    no_generic_language: boolean;
    no_unsupported_claims: boolean;
    originality: boolean;
    cta_alignment: boolean;
  };
  issues: string[];
  strengths: string[];
}

function containsAny(haystack: string, needles: string[]): string[] {
  const lower = haystack.toLowerCase();
  return needles.filter((n) => lower.includes(n));
}

/** Longest shared word-sequence length between two texts, used to catch near-verbatim copying. */
function longestSharedNGram(a: string, b: string): number {
  const wordsA = a.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  const wordsB = new Set<string>();
  const bWords = b.toLowerCase().match(/[a-z0-9']+/g) ?? [];

  const MIN_N = 8;
  for (let n = bWords.length; n >= MIN_N; n--) {
    for (let i = 0; i + n <= bWords.length; i++) {
      wordsB.add(bWords.slice(i, i + n).join(" "));
    }
  }
  if (wordsB.size === 0) return 0;

  let longest = 0;
  for (let n = wordsA.length; n >= MIN_N; n--) {
    for (let i = 0; i + n <= wordsA.length; i++) {
      const gram = wordsA.slice(i, i + n).join(" ");
      if (wordsB.has(gram)) {
        longest = Math.max(longest, n);
      }
    }
  }
  return longest;
}

export function runDeterministicChecks(params: {
  draftContent: string;
  sourceTexts: string[];
}): DeterministicCriticResult {
  const issues: string[] = [];
  const strengths: string[] = [];

  const genericHits = containsAny(params.draftContent, GENERIC_PHRASES);
  const noGenericLanguage = genericHits.length === 0;
  if (!noGenericLanguage) {
    issues.push(`Contains generic/cliche phrasing: ${genericHits.join(", ")}.`);
  } else {
    strengths.push("No generic or cliche marketing phrases detected.");
  }

  const absoluteHits = containsAny(params.draftContent, ABSOLUTE_CLAIM_MARKERS);
  const hasEvidence = containsAny(params.draftContent, EVIDENCE_MARKERS).length > 0;
  const noUnsupportedClaims = absoluteHits.length === 0 || hasEvidence;
  if (!noUnsupportedClaims) {
    issues.push(
      `Contains absolute claim(s) ("${absoluteHits.join('", "')}") without a visible supporting example, data point, or citation.`
    );
  }

  let maxSharedRun = 0;
  for (const source of params.sourceTexts) {
    maxSharedRun = Math.max(maxSharedRun, longestSharedNGram(params.draftContent, source));
  }
  const originality = maxSharedRun < 8;
  if (!originality) {
    issues.push(
      `Draft shares an ${maxSharedRun}-word sequence verbatim with a source document - rewrite in original language.`
    );
  } else {
    strengths.push("No verbatim copying detected against provided source material.");
  }

  const ctaHits = containsAny(params.draftContent, CTA_MARKERS);
  const ctaAlignment = ctaHits.length > 0;
  if (!ctaAlignment) {
    issues.push("No recognizable call-to-action found (no question, invite to comment/share, etc.).");
  }

  return {
    checks: {
      no_generic_language: noGenericLanguage,
      no_unsupported_claims: noUnsupportedClaims,
      originality,
      cta_alignment: ctaAlignment
    },
    issues,
    strengths
  };
}
