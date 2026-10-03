import type { DraftStatus } from "@/lib/types/schemas";

/**
 * Allowed draft status moves. Approved and rejected are final: this keeps
 * published counts and performance stats trustworthy (e.g. a rejected draft
 * can't be pushed to "approved" through the API, and approving twice can't
 * record two published posts).
 */
export function canApprove(status: DraftStatus): boolean {
  return status === "draft" || status === "critiqued";
}

export function canReject(status: DraftStatus): boolean {
  return status === "draft" || status === "critiqued";
}

/** Text edits are only allowed before a decision is made. */
export function canEdit(status: DraftStatus): boolean {
  return status === "draft" || status === "critiqued";
}
