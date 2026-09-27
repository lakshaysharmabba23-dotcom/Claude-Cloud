import { defineConfig } from "@trigger.dev/sdk/v3";

/**
 * Trigger.dev project configuration. Long-running/retryable pipeline steps
 * (research, extraction, generation, critique, performance analysis) run as
 * Trigger.dev tasks - see src/trigger/*.ts - rather than as ad-hoc
 * setTimeout/queue code, so they get durable retries and structured logs
 * for free.
 *
 * The project ref below isn't a secret (it's just an identifier, like a
 * repo name) - TRIGGER_PROJECT_ID can still override it if you ever create
 * a second Trigger.dev project. TRIGGER_SECRET_KEY (set in Vercel/.env.local)
 * is the actual credential the deployed app uses to trigger and poll runs
 * against this project. Nothing in the Next.js app itself depends on
 * Trigger.dev being configured in DEMO_MODE - see docs/architecture.md.
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "proj_pxqxxhivlhectpbltqei",
  dirs: ["./src/trigger"],
  maxDuration: 300,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true
    }
  }
});
