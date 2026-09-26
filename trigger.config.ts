import { defineConfig } from "@trigger.dev/sdk/v3";

/**
 * Trigger.dev project configuration. Long-running/retryable pipeline steps
 * (research, extraction, generation, critique, performance analysis) run as
 * Trigger.dev tasks - see src/trigger/*.ts - rather than as ad-hoc
 * setTimeout/queue code, so they get durable retries and structured logs
 * for free.
 *
 * Set TRIGGER_PROJECT_ID / TRIGGER_SECRET_KEY in .env.local to run these
 * against a real Trigger.dev project (https://trigger.dev). Nothing in the
 * Next.js app itself depends on Trigger.dev being configured - the API
 * routes call the same lib/ functions directly for the synchronous, low-
 * latency parts of the pipeline (see docs/architecture.md).
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "proj_placeholder",
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
