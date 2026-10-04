import { describe, expect, it, vi } from "vitest";
import { isKoreanDocument, translateMarkdown, validateTranslationEndpoint } from "../src/translation.js";

describe("translation service", () => {
  it("requires an HTTPS endpoint without embedded credentials or query parameters", () => {
    expect(validateTranslationEndpoint("https://translator.example/translate")).toBe(
      "https://translator.example/translate",
    );
    expect(validateTranslationEndpoint("http://localhost:3000/translate")).toBe(
      "http://localhost:3000/translate",
    );
    expect(() => validateTranslationEndpoint("http://translator.example/translate")).toThrow(/HTTPS/);
    expect(() => validateTranslationEndpoint("https://user:secret@translator.example/translate")).toThrow(
      /자격 증명/,
    );
    expect(() => validateTranslationEndpoint("https://translator.example/translate?key=secret")).toThrow(
      /URL 매개변수/,
    );
  });

  it("translates prose while restoring code, URLs, and Markdown syntax", async () => {
    const fetchImpl = vi.fn(async (_url, request) => {
      const payload = JSON.parse(request.body);
      return {
        ok: true,
        json: async () => ({ translatedText: payload.text.replace("Welcome", "환영합니다") }),
      };
    });
    const markdown = "# Welcome\n\nSee [the guide](https://example.com/docs).\n\n```js\nconst value = 1;\n```";

    const result = await translateMarkdown(markdown, "https://translator.example/translate", { fetchImpl });

    expect(result).toContain("# 환영합니다");
    expect(result).toContain("[the guide](https://example.com/docs)");
    expect(result).toContain("```js\nconst value = 1;\n```");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toMatchObject({
      source: "auto",
      target: "ko",
    });
  });

  it("rejects altered Markdown placeholders and invalid service responses", async () => {
    await expect(
      translateMarkdown("`code`", "https://translator.example/translate", {
        fetchImpl: async () => ({ ok: true, json: async () => ({ translatedText: "placeholder lost" }) }),
      }),
    ).rejects.toThrow(/표식/);
    await expect(
      translateMarkdown("Text", "https://translator.example/translate", {
        fetchImpl: async () => ({ ok: false, status: 502 }),
      }),
    ).rejects.toThrow(/HTTP 502/);
  });

  it("detects Korean documents", () => {
    expect(isKoreanDocument("# 문서")).toBe(true);
    expect(isKoreanDocument("# 문서\n\nThis English paragraph should be translated into Korean.")).toBe(false);
    expect(isKoreanDocument("# A document")).toBe(false);
    expect(isKoreanDocument("# 문서\n\n日本語の段落を韓国語に翻訳します。")).toBe(false);
  });
});
