// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

describe("Korean interface", () => {
  beforeAll(async () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
    const page = new DOMParser().parseFromString(html, "text/html");

    document.documentElement.lang = page.documentElement.lang;
    document.body.innerHTML = page.body.innerHTML;
    await import("../src/main.js");
  });

  beforeEach(() => {
    document.querySelector("#sample-button").click();
    localStorage.removeItem("translation-endpoint");
    localStorage.removeItem("translation-consent");
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

  it("keeps the source document and provides Korean translation controls", () => {
    expect(document.querySelector("#markdown-input").value).toContain("# A little space");
    expect(document.querySelector("#preview-original-button").textContent).toBe("원문");
    expect(document.querySelector("#preview-korean-button").textContent).toBe("한국어 번역");
    expect(document.querySelector("#translation-settings").textContent).toContain("문서 전체가");
    expect(document.querySelector("#translation-endpoint").value).toBe("");
  });

  it("asks before sending a document and preserves its source after translation", async () => {
    const input = document.querySelector("#markdown-input");
    const endpointInput = document.querySelector("#translation-endpoint");
    const fetchMock = vi.fn(async (_url, request) => ({
      ok: true,
      json: async () => ({
        translatedText: JSON.parse(request.body).text.replace("Original prose", "한국어 문장"),
      }),
    }));
    const originalFetch = window.fetch;
    const originalConfirm = window.confirm;

    localStorage.removeItem("translation-consent");
    endpointInput.value = "https://translator.example/translate";
    window.fetch = fetchMock;
    window.confirm = vi.fn(() => false);
    vi.useFakeTimers();
    try {
      document.querySelector("#save-translation-settings").click();
      input.value = "Original prose";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(501);

      expect(window.confirm).toHaveBeenCalledOnce();
      expect(fetchMock).not.toHaveBeenCalled();

      window.confirm.mockReturnValue(true);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await vi.advanceTimersByTimeAsync(501);

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(input.value).toBe("Original prose");
      expect(document.querySelector("#preview-content").textContent).toContain("한국어 문장");
      expect(document.querySelector("#preview-korean-button").disabled).toBe(false);

      input.value = "Changed prose";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      expect(document.querySelector("#preview-content").textContent).toContain("Changed prose");
      expect(document.querySelector("#preview-korean-button").disabled).toBe(true);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
      window.fetch = originalFetch;
      window.confirm = originalConfirm;
      localStorage.removeItem("translation-endpoint");
      localStorage.removeItem("translation-consent");
    }
  });
});
