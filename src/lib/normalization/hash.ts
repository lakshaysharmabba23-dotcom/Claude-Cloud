import { createHash } from "node:crypto";

/**
 * A stable content hash used to catch duplicate content published at
 * different URLs (a cross-post, a syndicated article, a copy-pasted
 * LinkedIn post). We normalize whitespace/case before hashing so trivial
 * formatting differences don't produce false negatives on dedup.
 */
export function hashContent(content: string): string {
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();

  return createHash("sha256").update(normalized).digest("hex");
}
