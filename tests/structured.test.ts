import { describe, expect, it } from "vitest";
import { z } from "zod";
import { completeStructuredWithRetry } from "@/lib/ai/structured";

const schema = z.object({ foo: z.string() });

describe("completeStructuredWithRetry", () => {
  it("parses a clean JSON response", async () => {
    const result = await completeStructuredWithRetry({
      schema,
      schemaName: "test",
      prompt: "give me foo",
      callRaw: async () => `{"foo": "bar"}`
    });
    expect(result).toEqual({ foo: "bar" });
  });

  it("strips <think>...</think> reasoning blocks before extracting JSON", async () => {
    const result = await completeStructuredWithRetry({
      schema,
      schemaName: "test",
      prompt: "give me foo",
      callRaw: async () => `<think>Let me consider {this} carefully...</think>\n{"foo": "bar"}`
    });
    expect(result).toEqual({ foo: "bar" });
  });

  it("extracts JSON from a markdown code fence", async () => {
    const result = await completeStructuredWithRetry({
      schema,
      schemaName: "test",
      prompt: "give me foo",
      callRaw: async () => '```json\n{"foo": "bar"}\n```'
    });
    expect(result).toEqual({ foo: "bar" });
  });

  it("retries once, feeding the validation error back, and can recover", async () => {
    let call = 0;
    const result = await completeStructuredWithRetry({
      schema,
      schemaName: "test",
      prompt: "give me foo",
      callRaw: async () => {
        call += 1;
        return call === 1 ? `{"wrong_field": "bar"}` : `{"foo": "bar"}`;
      }
    });
    expect(result).toEqual({ foo: "bar" });
    expect(call).toBe(2);
  });

  it("throws after two failed attempts rather than returning invalid data", async () => {
    await expect(
      completeStructuredWithRetry({
        schema,
        schemaName: "test",
        prompt: "give me foo",
        callRaw: async () => "I refuse to return JSON."
      })
    ).rejects.toThrow(/failed validation twice/i);
  });
});
