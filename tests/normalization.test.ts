import { describe, expect, it } from "vitest";
import { canonicalizeUrl, urlsAreEquivalent } from "@/lib/normalization/url";
import { hashContent } from "@/lib/normalization/hash";
import { normalizeDocument, dedupeDocuments } from "@/lib/normalization/normalize";

describe("canonicalizeUrl", () => {
  it("lowercases the host and strips www.", () => {
    expect(canonicalizeUrl("https://WWW.Example.com/Post")).toBe("example.com/post");
  });

  it("strips a trailing slash", () => {
    expect(canonicalizeUrl("https://example.com/post/")).toBe("example.com/post");
  });

  it("removes tracking query params but keeps meaningful ones", () => {
    const url = "https://example.com/post?utm_source=li&ref=share&id=42";
    expect(canonicalizeUrl(url)).toBe("example.com/post?id=42");
  });

  it("sorts remaining query params for stability", () => {
    const a = canonicalizeUrl("https://example.com/post?b=2&a=1");
    const b = canonicalizeUrl("https://example.com/post?a=1&b=2");
    expect(a).toBe(b);
  });

  it("treats http/https and www variants as equivalent", () => {
    expect(urlsAreEquivalent("http://www.example.com/post/", "https://example.com/post")).toBe(true);
  });

  it("falls back to a trimmed lowercase string for unparseable input", () => {
    expect(canonicalizeUrl("  Not A URL  ")).toBe("not a url");
  });
});

describe("hashContent", () => {
  it("produces the same hash for whitespace/punctuation-only differences", () => {
    const a = hashContent("Hello,   World!!");
    const b = hashContent("hello world");
    expect(a).toBe(b);
  });

  it("produces a different hash for different content", () => {
    expect(hashContent("hello world")).not.toBe(hashContent("goodbye world"));
  });
});

describe("normalizeDocument + dedupeDocuments", () => {
  it("normalizes a raw document into the canonical shape", () => {
    const doc = normalizeDocument({
      title: "  My Post  ",
      source_url: "https://WWW.Example.com/a/",
      content: "  Some content.  "
    });
    expect(doc.title).toBe("My Post");
    expect(doc.canonical_url).toBe("example.com/a");
    expect(doc.content).toBe("Some content.");
  });

  it("deduplicates by canonical URL, keeping the longer content", () => {
    const short = normalizeDocument({ source_url: "https://example.com/a", content: "Short." });
    const long = normalizeDocument({ source_url: "https://example.com/a/", content: "Short. But with more detail." });
    const result = dedupeDocuments([short, long]);
    expect(result).toHaveLength(1);
    expect(result[0]!.content).toBe(long.content);
  });

  it("deduplicates cross-posted identical content at different URLs", () => {
    const original = normalizeDocument({ source_url: "https://a.com/post", content: "Identical content here." });
    const crossPost = normalizeDocument({ source_url: "https://b.com/post", content: "Identical content here." });
    const result = dedupeDocuments([original, crossPost]);
    expect(result).toHaveLength(1);
    expect(result[0]!.source_url).toBe("https://a.com/post");
  });

  it("keeps genuinely distinct documents", () => {
    const a = normalizeDocument({ source_url: "https://a.com/1", content: "First piece of content." });
    const b = normalizeDocument({ source_url: "https://a.com/2", content: "Second, unrelated content." });
    expect(dedupeDocuments([a, b])).toHaveLength(2);
  });
});
