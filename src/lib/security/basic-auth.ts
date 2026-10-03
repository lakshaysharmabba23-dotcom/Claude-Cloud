/**
 * Shared-password gate (HTTP Basic auth), kept as a pure function so it can
 * be unit-tested and used from Next.js middleware (edge runtime: no Node APIs).
 * Any username is accepted; only the password is checked.
 */
function safeEqual(a: string, b: string): boolean {
  // Constant-time-ish comparison: always walks the longer string.
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export type AuthDecision = "ok" | "challenge" | "not-configured";

export function checkBasicAuth(authorizationHeader: string | null, password: string | undefined): AuthDecision {
  if (!password) return "not-configured";
  if (!authorizationHeader?.startsWith("Basic ")) return "challenge";

  let decoded = "";
  try {
    decoded = atob(authorizationHeader.slice(6).trim());
  } catch {
    return "challenge";
  }
  const sep = decoded.indexOf(":");
  const provided = sep === -1 ? decoded : decoded.slice(sep + 1);
  return safeEqual(provided, password) ? "ok" : "challenge";
}
