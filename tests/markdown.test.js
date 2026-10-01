// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../src/markdown.js";

describe("renderMarkdown", () => {
  it("renders common GFM features", () => {
    const html = renderMarkdown([
      "# Notes",
      "",
      "A ~~small~~ **useful** note.",
      "",
      "| Name | Value |",
      "| --- | --- |",
      "| One | Two |",
      "",
      "- [x] Done",
      "- [ ] Next",
    ].join("\n"));

    expect(html).toContain("<h1>Notes</h1>");
    expect(html).toContain("<del>small</del>");
    expect(html).toContain("<strong>useful</strong>");
    expect(html).toContain("<table>");
    expect(html).toContain('type="checkbox"');
  });

  it("removes executable HTML while preserving safe inline HTML", () => {
    const html = renderMarkdown(
      '<img src="x" onerror="alert(1)"><a href="javascript:alert(1)">link</a><strong>safe</strong>',
    );

    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("<strong>safe</strong>");
  });
});
