import { describe, expect, it } from "vitest";
import { canApprove, canEdit, canReject } from "@/lib/data/draft-rules";

describe("draft status rules", () => {
  it("allows decisions only on undecided drafts", () => {
    for (const s of ["draft", "critiqued"] as const) {
      expect(canApprove(s)).toBe(true);
      expect(canReject(s)).toBe(true);
      expect(canEdit(s)).toBe(true);
    }
  });
  it("treats approved and rejected as final", () => {
    for (const s of ["approved", "rejected"] as const) {
      expect(canApprove(s)).toBe(false);
      expect(canReject(s)).toBe(false);
      expect(canEdit(s)).toBe(false);
    }
  });
});
