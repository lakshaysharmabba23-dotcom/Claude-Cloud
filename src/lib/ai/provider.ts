import type { ZodType, ZodTypeDef } from "zod";

/**
 * Provider-agnostic AI interface. Every layer that needs an LLM (pattern
 * extraction, voice analysis, generation, critique) calls through this
 * interface, never a vendor SDK directly, so swapping OpenAI / Anthropic /
 * OpenRouter / a mock is a one-line change (see src/lib/ai/index.ts).
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;

  /** Free-form text completion. */
  complete(input: CompleteInput): Promise<string>;

  /**
   * Structured completion validated against a Zod schema. Implementations
   * should retry once on a validation failure by feeding the parser error
   * back to the model; callers can assume the returned value satisfies
   * `schema`.
   */
  completeStructured<T>(input: CompleteStructuredInput<T>): Promise<T>;
}

export interface CompleteInput {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompleteStructuredInput<T> extends CompleteInput {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: ZodType<T, ZodTypeDef, any>;
  schemaName: string;
}
