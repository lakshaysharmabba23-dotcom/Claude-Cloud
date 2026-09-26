import { describe, expect, it, vi } from "vitest";
import { runWithFallback } from "@/lib/ai/fallback";

describe("runWithFallback", () => {
  it("returns the first successful result without trying later items", async () => {
    const attempt = vi.fn(async (item: string) => {
      if (item === "model-1") return "ok from model-1";
      throw new Error("should not be called");
    });
    const result = await runWithFallback(["model-1", "model-2"], attempt);
    expect(result).toBe("ok from model-1");
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("falls through to the next item when the first fails", async () => {
    const attempt = vi.fn(async (item: string) => {
      if (item === "model-1") throw new Error("rate limited");
      return `ok from ${item}`;
    });
    const result = await runWithFallback(["model-1", "model-2", "model-3"], attempt);
    expect(result).toBe("ok from model-2");
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("tries every item before giving up, and reports each failure", async () => {
    const attempt = vi.fn(async (item: string) => {
      throw new Error(`${item} is down`);
    });
    await expect(runWithFallback(["a", "b", "c"], attempt)).rejects.toThrow(/a is down[\s\S]*b is down[\s\S]*c is down/);
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it("throws immediately for an empty item list rather than hanging", async () => {
    await expect(runWithFallback([], async () => "unreachable")).rejects.toThrow(/empty/i);
  });
});
