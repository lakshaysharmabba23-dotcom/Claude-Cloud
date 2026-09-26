import type { EmbeddingProvider } from "./provider";

/**
 * Deterministic, dependency-free "embedding" used in DEMO_MODE. It is NOT a
 * semantically meaningful embedding in the way a real model's output is -
 * it's a bag-of-words hashing trick (a fixed-size vector where each
 * dimension accumulates a hash of the words present). It is good enough to
 * make cosine-similarity-based retrieval demonstrably work end to end
 * offline (texts sharing more vocabulary score more similar), which is all
 * the demo pipeline needs it for.
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = "mock";
  readonly dimensions: number;

  constructor(dimensions = 256) {
    this.dimensions = dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const vector = new Array(this.dimensions).fill(0);
    const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (const word of words) {
      const bucket = hashToBucket(word, this.dimensions);
      vector[bucket] += 1;
    }
    return normalize(vector);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

function hashToBucket(word: string, dimensions: number): number {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
  }
  return hash % dimensions;
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
