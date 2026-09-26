import { canonicalizeUrl } from "./url";
import { hashContent } from "./hash";
import type { ResearchDocument } from "@/lib/types/schemas";

/**
 * The normalized shape every research result is converted into before it
 * touches the database. This is deliberately provider-agnostic: whether a
 * document came from Firecrawl, a different research provider, or the mock
 * provider, it ends up looking identical downstream.
 */
export interface NormalizedDocument {
  title: string | null;
  author: string | null;
  source_url: string;
  canonical_url: string;
  content_hash: string;
  source_type: ResearchDocument["source_type"];
  published_at: string | null;
  content: string;
  metadata: Record<string, unknown>;
}

export interface RawDocumentInput {
  title?: string | null;
  author?: string | null;
  source_url: string;
  source_type?: ResearchDocument["source_type"];
  published_at?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
}

export function normalizeDocument(input: RawDocumentInput): NormalizedDocument {
  const content = input.content.trim();
  return {
    title: input.title?.trim() || null,
    author: input.author?.trim() || null,
    source_url: input.source_url.trim(),
    canonical_url: canonicalizeUrl(input.source_url),
    content_hash: hashContent(content),
    source_type: input.source_type ?? "other",
    published_at: input.published_at ?? null,
    content,
    metadata: input.metadata ?? {}
  };
}

/**
 * Deduplicate a batch of normalized documents by (canonical_url, content_hash).
 * When the same canonical URL appears twice, the longer/more complete content
 * wins. When the same content_hash appears at two different URLs (a
 * cross-post), the first-seen URL wins and is kept as the canonical source.
 */
export function dedupeDocuments<T extends NormalizedDocument>(docs: T[]): T[] {
  const byUrl = new Map<string, T>();
  const seenHashes = new Set<string>();
  const result: T[] = [];

  for (const doc of docs) {
    const existingByUrl = byUrl.get(doc.canonical_url);
    if (existingByUrl) {
      if (doc.content.length > existingByUrl.content.length) {
        byUrl.set(doc.canonical_url, doc);
        const idx = result.indexOf(existingByUrl);
        if (idx >= 0) result[idx] = doc;
      }
      continue;
    }

    if (seenHashes.has(doc.content_hash)) {
      // Same content, different URL - skip as a duplicate cross-post.
      continue;
    }

    byUrl.set(doc.canonical_url, doc);
    seenHashes.add(doc.content_hash);
    result.push(doc);
  }

  return result;
}
