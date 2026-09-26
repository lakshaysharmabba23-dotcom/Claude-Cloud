/**
 * URL canonicalization.
 *
 * The goal is to make two URLs that point at "the same content" compare
 * equal, so the dedup step (see dedupe.ts) can collapse them:
 *   https://Example.com/post/123?utm_source=li&ref=share#comments
 *   http://example.com/post/123/
 * both canonicalize to: example.com/post/123
 */

const TRACKING_PARAM_PREFIXES = ["utm_", "ref", "ref_src", "igshid", "fbclid", "gclid", "si", "trk"];

export function canonicalizeUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    // Not a parseable URL - return a trimmed, lowercased fallback so callers
    // still get a stable string to key on instead of throwing.
    return rawUrl.trim().toLowerCase();
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  let pathname = url.pathname.replace(/\/+$/, "");
  if (pathname === "") pathname = "/";

  const keptParams: [string, string][] = [];
  for (const [key, value] of url.searchParams.entries()) {
    const lowerKey = key.toLowerCase();
    const isTracking = TRACKING_PARAM_PREFIXES.some(
      (prefix) => lowerKey === prefix || lowerKey.startsWith(prefix)
    );
    if (!isTracking) keptParams.push([key, value]);
  }
  keptParams.sort(([a], [b]) => a.localeCompare(b));

  const query = keptParams.length
    ? "?" + keptParams.map(([k, v]) => `${k}=${v}`).join("&")
    : "";

  return `${host}${pathname}${query}`.toLowerCase();
}

export function urlsAreEquivalent(a: string, b: string): boolean {
  return canonicalizeUrl(a) === canonicalizeUrl(b);
}
