import { cosineSimilarity } from "./mock";
import { getEmbeddingProvider } from "./index";

/**
 * Pure, provider-agnostic semantic ranking logic. This is deliberately
 * separated from any Supabase/pgvector call so it can run (and be tested)
 * entirely in memory: given a query embedding and a set of candidate rows
 * that each carry an `embedding`, return the top-K most similar with a
 * similarity score attached.
 *
 * In production against a real Supabase project, the SQL functions in
 * supabase/migrations/0001_init.sql (match_voice_examples,
 * match_content_patterns, match_content_research, match_source_posts) do
 * this same ranking inside Postgres via pgvector's `<=>` operator, which is
 * far more efficient at scale. This module exists so that:
 *   (a) the ranking logic itself is unit-testable without a database, and
 *   (b) DEMO_MODE can run the identical retrieval step against in-memory
 *       seed data when no Supabase project is configured.
 *
 * Per the project's rule "do not use vector search when a normal SQL filter
 * is sufficient": callers should filter candidates down with plain
 * equality/range filters (category, topic, audience, voice_profile_id)
 * BEFORE calling into this module, not rely on similarity ranking to do
 * that filtering.
 */
export interface EmbeddedCandidate {
  id: string;
  embedding: number[] | null;
}

export interface RankedResult<T> {
  item: T;
  similarity: number;
}

export function rankBySimilarity<T extends EmbeddedCandidate>(
  queryEmbedding: number[],
  candidates: T[],
  topK: number
): RankedResult<T>[] {
  return candidates
    .filter((c): c is T & { embedding: number[] } => Array.isArray(c.embedding) && c.embedding.length > 0)
    .map((item) => ({ item, similarity: cosineSimilarity(queryEmbedding, item.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(0, topK));
}

export async function embedQuery(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  return provider.embed(text);
}

/** Convenience wrapper: embed `queryText` then rank `candidates` against it. */
export async function retrieveSimilar<T extends EmbeddedCandidate>(
  queryText: string,
  candidates: T[],
  topK: number
): Promise<RankedResult<T>[]> {
  const queryEmbedding = await embedQuery(queryText);
  return rankBySimilarity(queryEmbedding, candidates, topK);
}
