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
  // A reasoning-style AI model can take well over a minute per call, and
  // a single generation run makes several sequential calls (per-source
  // research extraction, generation, critique) - 300s isn't a big enough
  // safety margin even with a fast model, and none at all with a slow one.
  maxDuration: 600,
  // The default machine (0.5 GB RAM) ran out of memory (TASK_PROCESS_OOM_KILLED)
  // while scraping pages and loading the pipeline. 2 GB gives plenty of room.
  machine: "medium-1x",
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
