import { NextResponse } from "next/server";
import { runs } from "@trigger.dev/sdk/v3";

const TERMINAL_FAILURE_STATUSES = new Set([
  "CANCELED",
  "FAILED",
  "CRASHED",
  "SYSTEM_FAILURE",
  "TIMED_OUT",
  "EXPIRED",
  "INTERRUPTED"
]);

/**
 * Polled by the Studio UI after POST /api/studio/generate-async returns a
 * runId. Reports the current Trigger.dev run status, and the pipeline's
 * output once it's COMPLETED.
 */
export async function GET(_request: Request, { params }: { params: { runId: string } }) {
  try {
    const run = await runs.retrieve(params.runId);
    const status = String(run.status);

    if (status === "COMPLETED") {
      return NextResponse.json({ status, output: run.output });
    }
    if (TERMINAL_FAILURE_STATUSES.has(status)) {
      return NextResponse.json({
        status,
        error: run.error?.message ?? `Generation run ended with status ${status}.`
      });
    }
    return NextResponse.json({ status });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
