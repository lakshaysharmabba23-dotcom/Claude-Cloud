import { describe, expect, it } from "vitest";
import { runDeterministicChecks } from "@/lib/critic/deterministic";
import { critiquePost } from "@/lib/critic/critic";

describe("runDeterministicChecks", () => {
  it("flags generic/cliche language", () => {
    const result = runDeterministicChecks({
      draftContent: "This is a total game-changer that will revolutionize your workflow.",
      sourceTexts: []
    });
    expect(result.checks.no_generic_language).toBe(false);
    expect(result.issues.some((i) => i.includes("cliche"))).toBe(true);
  });

  it("passes clean language through", () => {
    const result = runDeterministicChecks({
      draftContent: "Most teams under-invest in onboarding until churn shows up in month three.",
      sourceTexts: []
    });
    expect(result.checks.no_generic_language).toBe(true);
  });

  it("flags an absolute claim with no supporting evidence marker", () => {
    const result = runDeterministicChecks({
      draftContent: "This always works and nobody ever fails when they try it.",
      sourceTexts: []
    });
    expect(result.checks.no_unsupported_claims).toBe(false);
  });

  it("allows an absolute-sounding claim when evidence is present", () => {
    const result = runDeterministicChecks({
      draftContent: "In my experience this always works, and our data shows a 40% lift.",
      sourceTexts: []
    });
    expect(result.checks.no_unsupported_claims).toBe(true);
  });

  it("flags verbatim copying from a source (originality)", () => {
    const source =
      "The quick brown fox jumps over the lazy dog while the sun rises slowly over the distant mountains today.";
    const result = runDeterministicChecks({
      draftContent: `Here is a thought: ${source}`,
      sourceTexts: [source]
    });
    expect(result.checks.originality).toBe(false);
  });

  it("does not flag originality when content is genuinely different", () => {
    const result = runDeterministicChecks({
      draftContent: "A completely original sentence about something else entirely.",
      sourceTexts: ["An unrelated block of source text about a different subject altogether here."]
    });
    expect(result.checks.originality).toBe(true);
  });

  it("detects a recognizable CTA", () => {
    const withCta = runDeterministicChecks({ draftContent: "What do you think?", sourceTexts: [] });
    const withoutCta = runDeterministicChecks({ draftContent: "This is just a statement.", sourceTexts: [] });
    expect(withCta.checks.cta_alignment).toBe(true);
    expect(withoutCta.checks.cta_alignment).toBe(false);
  });
});

describe("critiquePost (deterministic + mock LLM merge)", () => {
  it("returns a fully-populated CriticResult with no bare quality score field", async () => {
    const result = await critiquePost({
      draftContent: "This always works. It is a total game-changer. No questions here.",
      topic: "GTM engineering",
      audience: "founders",
      objective: "discussion",
      voiceProfileSummary: "direct, candid",
      selectedPatternName: "Contrarian Claim",
      sourceTexts: []
    });

    expect(result).not.toHaveProperty("score");
    expect(typeof result.checks.no_generic_language).toBe("boolean");
    expect(typeof result.checks.relevance).toBe("boolean");
    // Deterministic layer should have caught the generic language + missing CTA.
    expect(result.checks.no_generic_language).toBe(false);
    expect(result.checks.cta_alignment).toBe(false);
  });
});

import { stripSourceMarkers } from "@/lib/generation/generator";
describe("stripSourceMarkers", () => {
  it("removes [R2, R3]-style markers and reports them", () => {
    const r = stripSourceMarkers("Most teams stall at 50 leads [R2, R3]. Fix it first [R1] , then scale.");
    expect(r.content).toBe("Most teams stall at 50 leads. Fix it first, then scale.");
    expect(r.markers.sort()).toEqual(["R1", "R2", "R3"]);
  });
  it("leaves normal brackets alone", () => {
    expect(stripSourceMarkers("Use [brackets] sometimes.").content).toBe("Use [brackets] sometimes.");
  });
});
