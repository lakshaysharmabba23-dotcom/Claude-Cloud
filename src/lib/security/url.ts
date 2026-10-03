/**
 * Guards for any URL the server is asked to fetch on a user's behalf (SSRF
 * protection): only http(s) URLs that point at the public internet.
 *
 * Known limit: this checks the hostname text. It cannot stop a public-looking
 * domain whose DNS points at a private address (DNS rebinding). That would
 * need resolving DNS at fetch time, which the serverless runtime here doesn't
 * give us a simple way to pin.
 */
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet"];

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

export function isSafePublicUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return false;
  if (host.startsWith("[")) return false; // IPv6 literals are never needed for public articles
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return !isPrivateIPv4(host);
  if (!host.includes(".")) return false; // single-label names like "intranet"
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return false;
  return true;
}

/**
 * fetch + read text with a timeout, a size cap, and redirect targets
 * re-checked at every hop (a public URL can't redirect us to a private one).
 */
export async function safeFetchText(
  url: string,
  options: { timeoutMs?: number; maxBytes?: number; headers?: Record<string, string>; maxRedirects?: number } = {}
): Promise<{ finalUrl: string; text: string }> {
  const { timeoutMs = 10_000, maxBytes = 2_000_000, headers, maxRedirects = 3 } = options;
  let current = url;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!isSafePublicUrl(current)) throw new Error(`Refusing to fetch a non-public or invalid URL: ${current}`);

    const res = await fetch(current, { headers, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Fetching ${current} failed (${res.status}).`);

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > maxBytes) throw new Error(`Page at ${current} is too large (${declared} bytes).`);

    const reader = res.body?.getReader();
    if (!reader) return { finalUrl: current, text: await res.text() };
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        break; // keep what we have: the first maxBytes are plenty for article text
      }
      chunks.push(value);
    }
    return { finalUrl: current, text: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  throw new Error(`Too many redirects fetching ${url}.`);
}
