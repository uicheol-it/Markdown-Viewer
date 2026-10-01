// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

describe("Korean interface", () => {
  beforeAll(async () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
    const page = new DOMParser().parseFromString(html, "text/html");

    document.documentElement.lang = page.documentElement.lang;
    document.body.innerHTML = page.body.innerHTML;
    await import("../src/main.js");
  });

  it("uses Korean for the default interface", () => {
    expect(document.documentElement.lang).toBe("ko");
    expect(document.querySelector("#open-file-button").textContent).toContain("파일 열기");
    expect(document.querySelector("#markdown-input").getAttribute("aria-label")).toBe("마크다운 원문");
    expect(document.querySelector("#document-name").textContent).toBe("예제.md");
    expect(document.querySelector("#document-stats").textContent).toMatch(/^단어 \d+개 · \d+줄$/);
  });

  it("shows a Korean empty state when the editor is cleared", () => {
    const input = document.querySelector("#markdown-input");
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(document.querySelector("#preview-content").textContent).toContain("미리보기가 여기에 표시됩니다");
    expect(document.querySelector("#document-stats").textContent).toBe("단어 0개 · 1줄");
  });
});
