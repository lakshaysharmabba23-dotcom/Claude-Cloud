import { describe, expect, it } from "vitest";
import { checkBasicAuth } from "@/lib/security/basic-auth";
import { rateLimit } from "@/lib/security/rate-limit";

const basic = (user: string, pass: string) => `Basic ${btoa(`${user}:${pass}`)}`;

describe("checkBasicAuth", () => {
  it("accepts the right password with any username", () => {
    expect(checkBasicAuth(basic("me", "s3cret"), "s3cret")).toBe("ok");
    expect(checkBasicAuth(basic("", "s3cret"), "s3cret")).toBe("ok");
  });
  it("challenges on missing, wrong or malformed credentials", () => {
    expect(checkBasicAuth(null, "s3cret")).toBe("challenge");
    expect(checkBasicAuth(basic("me", "wrong"), "s3cret")).toBe("challenge");
    expect(checkBasicAuth("Basic !!!notbase64", "s3cret")).toBe("challenge");
    expect(checkBasicAuth("Bearer abc", "s3cret")).toBe("challenge");
  });
  it("reports not-configured when no password is set", () => {
    expect(checkBasicAuth(basic("a", "b"), undefined)).toBe("not-configured");
    expect(checkBasicAuth(null, "")).toBe("not-configured");
  });
  it("handles passwords containing colons", () => {
    expect(checkBasicAuth(basic("me", "a:b:c"), "a:b:c")).toBe("ok");
  });
});

describe("rateLimit", () => {
  it("allows up to the limit then blocks, then recovers after the window", () => {
    const opts = { limit: 3, windowMs: 1000 };
    expect(rateLimit("t1", opts, 0).allowed).toBe(true);
    expect(rateLimit("t1", opts, 10).allowed).toBe(true);
    expect(rateLimit("t1", opts, 20).allowed).toBe(true);
    const blocked = rateLimit("t1", opts, 30);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(rateLimit("t1", opts, 1500).allowed).toBe(true);
  });
  it("tracks callers separately", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit("a", opts, 0).allowed).toBe(true);
    expect(rateLimit("b", opts, 0).allowed).toBe(true);
    expect(rateLimit("a", opts, 1).allowed).toBe(false);
  });
});
