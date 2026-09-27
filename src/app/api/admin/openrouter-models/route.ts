import { NextResponse } from "next/server";

/**
 * Diagnostic-only: fetches OpenRouter's live model catalog (a public
 * endpoint, no key required) and returns the IDs currently priced at zero.
 * Exists because OpenRouter's free-tier lineup changes often enough that a
 * hardcoded list (see .env.example) goes stale - this asks OpenRouter
 * itself, from a deployment that (unlike some sandboxes) has real internet
 * access, rather than guessing from a point-in-time list.
 *
 * Guarded by the same SEED_ADMIN_TOKEN as the other /api/admin/* routes.
 */
export async function GET(request: Request) {
  const configuredToken = process.env.SEED_ADMIN_TOKEN;
  if (!configuredToken) {
    return NextResponse.json({ error: "SEED_ADMIN_TOKEN is not set on this deployment." }, { status: 403 });
  }
  const providedToken = new URL(request.url).searchParams.get("token");
  if (providedToken !== configuredToken) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 401 });
  }

  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) {
    return NextResponse.json({ error: `OpenRouter /models failed (${res.status})` }, { status: 502 });
  }

  const data = (await res.json()) as {
    data: Array<{
      id: string;
      name?: string;
      context_length?: number;
      pricing?: { prompt?: string; completion?: string };
    }>;
  };

  const free = data.data
    .filter((m) => Number(m.pricing?.prompt ?? "1") === 0 && Number(m.pricing?.completion ?? "1") === 0)
    .map((m) => ({ id: m.id, name: m.name ?? null, context_length: m.context_length ?? null }))
    .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0));

  return NextResponse.json({ count: free.length, free });
}
