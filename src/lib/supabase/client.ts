import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let browserClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

/**
 * Client for use in browser/client-components. Uses the anon key, subject to
 * RLS. Returns null when Supabase isn't configured (DEMO_MODE without a real
 * project) so callers can fall back to seed fixtures.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  if (!browserClient) {
    browserClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return browserClient;
}

/**
 * Server-only client using the service role key. Used by API routes,
 * server components, and Trigger.dev tasks that need to write data. Never
 * import this from a client component.
 */
export function getServiceSupabase(): SupabaseClient | null {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;
  if (!serviceClient) {
    serviceClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });
  }
  return serviceClient;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && (env.supabaseAnonKey || env.supabaseServiceRoleKey));
}
