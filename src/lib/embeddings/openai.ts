import { requireEnv } from "@/lib/env";
import type { EmbeddingProvider } from "./provider";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = "openai";
  readonly dimensions: number;

  private readonly apiKey: string;
  private readonly model: string;

  constructor(model: string, dimensions: number, apiKey?: string) {
    this.model = model;
    this.dimensions = dimensions;
    this.apiKey = requireEnv("OPENAI_API_KEY", apiKey ?? "");
  }

  async embed(text: string): Promise<number[]> {
    const vectors = await this.embedBatch([text]);
    const vector = vectors[0];
    if (!vector) throw new Error("OpenAI embeddings API returned no vector.");
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ model: this.model, input: texts })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI embeddings request failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
    return data.data.map((d) => d.embedding);
  }
}
