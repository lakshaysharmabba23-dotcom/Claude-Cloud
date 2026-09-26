import { describe, expect, it } from "vitest";
import { extractTextFromHtml } from "@/lib/research/html-extract";

describe("extractTextFromHtml", () => {
  it("pulls the <title> out separately from the body text", () => {
    const html = "<html><head><title>My Article</title></head><body><p>Hello world.</p></body></html>";
    const { title, text } = extractTextFromHtml(html);
    expect(title).toBe("My Article");
    expect(text).toContain("Hello world.");
  });

  it("strips script and style tags entirely", () => {
    const html = "<body><script>alert('x')</script><style>.a{color:red}</style><p>Real content.</p></body>";
    const { text } = extractTextFromHtml(html);
    expect(text).not.toContain("alert");
    expect(text).not.toContain("color:red");
    expect(text).toContain("Real content.");
  });

  it("decodes common HTML entities", () => {
    const html = "<p>Q&amp;A &mdash; is &lt;this&gt; &quot;quoted&quot;?</p>".replace("&mdash;", "&#39;");
    const { text } = extractTextFromHtml(html);
    expect(text).toContain("Q&A");
    expect(text).toContain("<this>");
    expect(text).toContain('"quoted"');
  });

  it("returns null title and empty text for a page with no usable content", () => {
    const { title, text } = extractTextFromHtml("<html><body></body></html>");
    expect(title).toBeNull();
    expect(text).toBe("");
  });

  it("inserts a line break at block-level tags instead of running text together", () => {
    const html = "<p>First paragraph.</p><p>Second paragraph.</p>";
    const { text } = extractTextFromHtml(html);
    expect(text).not.toContain("paragraph.Second");
    expect(text.replace(/\s+/g, " ")).toBe("First paragraph. Second paragraph.");
  });
});
