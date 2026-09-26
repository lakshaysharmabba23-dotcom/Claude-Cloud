/**
 * Generic "try each item in order, use the first that succeeds" runner.
 * Pulled out as its own pure function (no fetch, no provider-specific code)
 * so the fallback *behavior* - stop on first success, try the next on any
 * error, throw a combined error only if everything fails - is unit-tested
 * directly (see tests/ai-fallback.test.ts) rather than only indirectly
 * through a real OpenRouter call.
 */
export async function runWithFallback<Item, Result>(
  items: Item[],
  attempt: (item: Item) => Promise<Result>
): Promise<Result> {
  if (items.length === 0) {
    throw new Error("runWithFallback called with an empty item list.");
  }

  const errors: string[] = [];

  for (const item of items) {
    try {
      return await attempt(item);
    } catch (err) {
      errors.push(`${item}: ${(err as Error).message}`);
    }
  }

  throw new Error(`All ${items.length} fallback option(s) failed.\n${errors.join("\n")}`);
}
