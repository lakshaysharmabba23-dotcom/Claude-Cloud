/**
 * Small in-memory rate limiter for the routes that spend AI credit.
 * Limitation (by design, kept simple): the counter lives in one server
 * instance's memory, so on serverless hosting it is best-effort rather than
 * a hard global cap. It still stops accidental loops and casual abuse.
 */
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now: number = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.ceil((recent[0]! + windowMs - now) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientKey(request: Request, bucket: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${bucket}:${forwarded ?? "unknown"}`;
}

/** Returns a 429 Response if the caller is over the limit, otherwise null. */
export function enforceRateLimit(request: Request, bucket: string, limit = 10, windowMs = 10 * 60_000): Response | null {
  const result = rateLimit(clientKey(request, bucket), { limit, windowMs });
  if (result.allowed) return null;
  return new Response(JSON.stringify({ error: `Too many requests. Try again in ${result.retryAfterSeconds}s.` }), {
    status: 429,
    headers: { "content-type": "application/json", "Retry-After": String(result.retryAfterSeconds) }
  });
}
