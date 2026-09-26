/**
 * Provider-agnostic embedding interface, used for everything stored in a
 * pgvector column: source posts, voice examples, content research, patterns.
 */
export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;

  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
