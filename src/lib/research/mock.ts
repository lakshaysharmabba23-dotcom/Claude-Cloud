import type { ExtractedStructuredData, ResearchProvider, ScrapedPage, SearchResult } from "./provider";

/**
 * Deterministic mock research provider used when DEMO_MODE=true or
 * RESEARCH_PROVIDER=mock. It never calls the network. Every document it
 * returns is clearly fictional (fictional outlet names, fictional authors)
 * so it can never be mistaken for real research - this satisfies the "never
 * fabricate sources" rule by making fabrication impossible to miss rather
 * than by pretending to be real.
 */

const FICTIONAL_OUTLETS = [
  "The Operator's Notebook",
  "GTM Field Notes",
  "Founder Signal",
  "Systems & Scale Weekly",
  "The Growth Ledger"
];

// Simple seeded PRNG (mulberry32) so mock output is reproducible in tests.
function seededRandom(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export class MockResearchProvider implements ResearchProvider {
  readonly name = "mock";

  async search(query: string, options?: { limit?: number }): Promise<SearchResult[]> {
    const limit = options?.limit ?? 5;
    const rand = seededRandom(hashStringToSeed(query));
    const results: SearchResult[] = [];

    for (let i = 0; i < limit; i++) {
      const outlet = FICTIONAL_OUTLETS[Math.floor(rand() * FICTIONAL_OUTLETS.length)];
      const slug = query
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40);
      results.push({
        url: `https://demo-research.fictional/${slug}-${i + 1}`,
        title: `[FICTIONAL] ${outlet}: notes on ${query}`,
        snippet: `A fictional demo-data summary discussing ${query}, generated for offline development.`
      });
    }

    return results;
  }

  async scrape(url: string): Promise<ScrapedPage> {
    const rand = seededRandom(hashStringToSeed(url));
    const topicGuess = decodeURIComponent(url.split("/").pop() ?? "topic").replace(/-\d+$/, "").replace(/-/g, " ");
    const outlet = FICTIONAL_OUTLETS[Math.floor(rand() * FICTIONAL_OUTLETS.length)];

    const paragraphs = [
      `[FICTIONAL DEMO CONTENT] This piece from ${outlet} explores ${topicGuess} from a practitioner's point of view.`,
      `In our fictional dataset, teams that focused on ${topicGuess} reported clearer prioritization within a single quarter, though this is illustrative demo data, not a real study.`,
      `A recurring theme in this fictional source is that ${topicGuess} works best when paired with a lightweight feedback loop rather than a heavyweight process.`,
      `The fictional author closes by noting that ${topicGuess} is still an evolving practice and encourages readers to adapt it to their own context.`
    ];

    return {
      url,
      title: `[FICTIONAL] ${outlet} on ${topicGuess}`,
      author: `Demo Author ${Math.floor(rand() * 50) + 1}`,
      publishedAt: new Date(Date.now() - Math.floor(rand() * 90) * 86_400_000).toISOString(),
      content: paragraphs.join("\n\n"),
      sourceType: "article",
      metadata: { fictional: true, generatedBy: "MockResearchProvider" }
    };
  }

  async extractStructured(page: ScrapedPage, focus: string): Promise<ExtractedStructuredData> {
    const rand = seededRandom(hashStringToSeed(page.url + focus));
    const facts = [
      `[FICTIONAL] Demo source reports increased engagement when discussing "${focus}" with a concrete example.`,
      `[FICTIONAL] Demo source suggests audiences respond to a clear before/after framing on "${focus}".`,
      `[FICTIONAL] Demo source notes that brevity outperformed long-form treatment of "${focus}" in its (fictional) sample.`
    ];
    // Deterministically vary how many facts we "found" so tests can exercise
    // both populated and sparse extraction cases.
    const count = 1 + Math.floor(rand() * facts.length);
    return {
      facts: facts.slice(0, count),
      summary: `[FICTIONAL] Demo summary of ${page.title ?? page.url} as it relates to ${focus}.`
    };
  }
}
