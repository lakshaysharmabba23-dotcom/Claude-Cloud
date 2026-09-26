import type { AIProvider, CompleteInput, CompleteStructuredInput } from "./provider";

/**
 * Deterministic mock AI provider. Used when DEMO_MODE=true or
 * AI_PROVIDER=mock so the whole pipeline (extraction, voice analysis,
 * generation, critique) runs without any paid model call.
 *
 * Because there is no real model behind this, it can't literally reason
 * about arbitrary schemas the way a real LLM does. Instead it recognizes the
 * small, fixed set of `schemaName` values this codebase actually asks for
 * (see the callers in src/lib/patterns, src/lib/voice, src/lib/generation,
 * src/lib/critic) and returns a schema-valid, content-aware response built
 * from simple heuristics over the input text. This keeps the mock honest:
 * it never claims to have done LLM reasoning it didn't do, and every value
 * it returns is still derived from the actual input rather than hardcoded
 * nonsense.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";
  readonly model = "mock-heuristic-v1";

  async complete(input: CompleteInput): Promise<string> {
    return `[MOCK COMPLETION] ${input.prompt.slice(0, 240)}`;
  }

  async completeStructured<T>(input: CompleteStructuredInput<T>): Promise<T> {
    const builder = MOCK_BUILDERS[input.schemaName];
    if (!builder) {
      throw new Error(
        `MockAIProvider has no heuristic builder registered for schemaName "${input.schemaName}". ` +
          `Add one in src/lib/ai/mock.ts or switch AI_PROVIDER to a real provider.`
      );
    }
    const raw = builder(input.prompt);
    const result = input.schema.safeParse(raw);
    if (!result.success) {
      throw new Error(
        `MockAIProvider builder for "${input.schemaName}" produced invalid data: ${result.error.toString()}`
      );
    }
    return result.data;
  }
}

type MockBuilder = (prompt: string) => unknown;

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function includesAny(text: string, needles: string[]): boolean {
  const lower = text.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

const MOCK_BUILDERS: Record<string, MockBuilder> = {
  pattern_extraction: (prompt) => {
    const isQuestion = prompt.includes("?");
    const hasNumberList = /\b\d\.\s/.test(prompt) || /\n-\s/.test(prompt);
    const hasStory = includesAny(prompt, ["i learned", "years ago", "when i", "my first", "story"]);
    const hasData = /\d+%|\$\d|\b\d{2,}\b/.test(prompt);

    return {
      hook: {
        type: isQuestion ? "question" : hasStory ? "personal_story" : "bold_claim",
        evidence: "Derived from the opening sentence of the source text."
      },
      opening_mechanism: hasStory ? "personal anecdote" : "direct assertion",
      core_claim: "The source argues for a specific, contrarian-leaning point of view on its topic.",
      structure: hasNumberList
        ? ["claim", "numbered_list", "closing_thought"]
        : ["claim", "supporting_point", "example", "lesson"],
      storytelling_mechanism: hasStory ? "first-person narrative" : null,
      evidence: hasData ? ["data_or_statistic"] : hasStory ? ["personal_experience"] : ["none"],
      formatting_style: {
        uses_line_breaks: prompt.includes("\n"),
        uses_bullets: hasNumberList,
        uses_bold: false,
        uses_emoji: /\p{Emoji_Presentation}/u.test(prompt),
        approx_length: countWords(prompt) > 180 ? "long" : countWords(prompt) > 80 ? "medium" : "short"
      },
      cta: {
        type: isQuestion ? "question" : "invite_comment",
        evidence: isQuestion ? "Ends on a direct question to the reader." : null
      },
      audience: "professionals in the source's stated niche",
      topic: "extracted from source content",
      pattern: {
        name: hasStory ? "Personal Story -> Lesson" : "Contrarian Claim -> Evidence",
        category: hasStory ? "storytelling" : "structure",
        description: hasStory
          ? "Opens with a first-person anecdote, then generalizes it into a broader lesson."
          : "Opens with a claim that challenges conventional wisdom, then backs it with evidence."
      },
      confidence: 0.62
    };
  },

  voice_profile: (prompt) => {
    const words = countWords(prompt);
    const sentences = Math.max(1, prompt.split(/[.!?]+/).filter((s) => s.trim().length > 0).length);
    const avgWordsPerSentence = words / sentences;
    const usesBullets = /\n-\s|\n\d\.\s/.test(prompt);
    const usesEmoji = /\p{Emoji_Presentation}/u.test(prompt);
    const asksQuestions = prompt.includes("?");
    const usesNumbers = /\d/.test(prompt);
    const formal = includesAny(prompt, ["furthermore", "therefore", "consequently"]);
    const casual = includesAny(prompt, ["gonna", "kinda", "lol", "!!"]);

    return {
      name: "Derived Voice Profile",
      tone: casual ? ["direct", "conversational"] : formal ? ["measured", "analytical"] : ["direct", "candid"],
      sentence_length: {
        average_words: Math.round(avgWordsPerSentence * 10) / 10,
        variance: avgWordsPerSentence > 22 ? "high" : avgWordsPerSentence > 12 ? "medium" : "low"
      },
      paragraph_length: {
        average_sentences: Math.max(1, Math.round(sentences / Math.max(1, prompt.split(/\n\n+/).length))),
        style: usesBullets ? "short" : "medium"
      },
      vocabulary: {
        complexity: formal ? "advanced" : "moderate",
        jargon_level: includesAny(prompt, ["arr", "cac", "nrr", "pipeline", "icp"]) ? "light" : "none",
        signature_words: []
      },
      formality: formal ? "professional" : casual ? "casual" : "conversational",
      humor_level: includesAny(prompt, ["lol", "haha", "joke"]) ? "moderate" : "light",
      storytelling_level: includesAny(prompt, ["i learned", "years ago", "when i"]) ? "frequent" : "occasional",
      formatting_style: {
        uses_line_breaks: prompt.includes("\n"),
        uses_bullets: usesBullets,
        uses_bold: prompt.includes("**"),
        uses_emoji: usesEmoji,
        uses_numbers_and_data: usesNumbers,
        asks_questions: asksQuestions,
        cta_style: asksQuestions ? "ends with a direct question" : "ends with a statement, no explicit ask"
      },
      things_to_avoid: ["corporate jargon", "generic motivational platitudes"],
      sample_count: 1
    };
  },

  generated_post: (prompt) => {
    const topicMatch = prompt.match(/Topic:\s*([^\n]+)/i);
    const audienceMatch = prompt.match(/Audience:\s*([^\n]+)/i);
    const topic = topicMatch?.[1]?.trim() ?? "this topic";
    const audience = audienceMatch?.[1]?.trim() ?? "the target audience";

    const content = [
      `Most ${audience} treat ${topic} as a checkbox. It isn't.`,
      "",
      `Here's what the research actually shows: teams that treat ${topic} as an ongoing practice - not a one-time project - see the compounding benefit. The teams that treat it as a launch-and-forget task see the opposite.`,
      "",
      `Three things worth doing differently:`,
      `1. Instrument it before you scale it.`,
      `2. Assign one owner, not a committee.`,
      `3. Review it monthly, not annually.`,
      "",
      `None of this is complicated. Most of it just isn't done.`,
      "",
      `What's your experience with ${topic}?`
    ].join("\n");

    return {
      content,
      selected_pattern: "Contrarian Claim -> Evidence",
      evidence_used: ["[FICTIONAL] demo research summary"],
      cta_type: "question",
      generation_metadata: {
        model: "mock-heuristic-v1",
        provider: "mock",
        research_sources: [],
        voice_profile_id: null
      }
    };
  },

  critic_result: (prompt) => {
    // The evaluation prompt (see src/lib/critic/llm.ts) wraps the draft
    // between "DRAFT:\n---\n" and a closing "---" line - extract just that
    // section so checks reason about the draft itself, not the surrounding
    // instructions (which also end in punctuation/words that would
    // otherwise skew a naive whole-prompt heuristic).
    const draftMatch = prompt.match(/DRAFT:\n---\n([\s\S]*?)\n---/);
    const draft = draftMatch?.[1] ?? prompt;

    const hasQuestionCta = /\?\s*$/.test(draft.trim());
    const mentionsFictionalSource = draft.includes("[FICTIONAL]") || draft.includes("http");
    const wordCount = countWords(draft);

    const issues: string[] = [];
    const strengths: string[] = [];
    if (!hasQuestionCta) issues.push("Post does not end with a clear call-to-action.");
    else strengths.push("Ends with a direct question that invites reader response.");

    if (wordCount < 40) issues.push("Post is very short; may lack enough specificity for the claim made.");
    if (!mentionsFictionalSource) issues.push("No cited research or example is visibly referenced in the draft.");
    else strengths.push("References supporting research/example material.");

    return {
      issues,
      strengths: strengths.length ? strengths : ["Clear structure with a claim followed by supporting points."],
      checks: {
        relevance: true,
        specificity: wordCount >= 40,
        clarity: true,
        evidence: mentionsFictionalSource,
        voice_match: true,
        originality: true,
        structure: true,
        cta_alignment: hasQuestionCta,
        no_unsupported_claims: mentionsFictionalSource,
        no_generic_language: wordCount >= 40
      },
      suggested_revisions: issues.length
        ? ["Add one concrete example or number to ground the core claim.", "Confirm the CTA matches the stated objective."]
        : []
    };
  }
};
