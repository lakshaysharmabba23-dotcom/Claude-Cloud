import { describe, expect, it } from "vitest";
import { rankBySimilarity } from "@/lib/embeddings/retrieval";
import { cosineSimilarity } from "@/lib/embeddings/mock";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("returns 0 (not NaN) for a zero-magnitude vector", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe("rankBySimilarity", () => {
  const candidates = [
    { id: "a", embedding: [1, 0, 0] },
    { id: "b", embedding: [0.9, 0.1, 0] },
    { id: "c", embedding: [0, 1, 0] },
    { id: "d", embedding: null }
  ];

  it("ranks candidates by descending similarity to the query", () => {
    const ranked = rankBySimilarity([1, 0, 0], candidates, 3);
    expect(ranked.map((r) => r.item.id)).toEqual(["a", "b", "c"]);
    expect(ranked[0]!.similarity).toBeGreaterThan(ranked[1]!.similarity);
  });

  it("excludes candidates with no embedding", () => {
    const ranked = rankBySimilarity([1, 0, 0], candidates, 10);
    expect(ranked.find((r) => r.item.id === "d")).toBeUndefined();
  });

  it("respects topK", () => {
    const ranked = rankBySimilarity([1, 0, 0], candidates, 1);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.item.id).toBe("a");
  });

  it("returns an empty array when topK is 0", () => {
    expect(rankBySimilarity([1, 0, 0], candidates, 0)).toHaveLength(0);
  });
});
