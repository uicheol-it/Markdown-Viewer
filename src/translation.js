const PROTECTED_MARKDOWN_PATTERNS = [
  /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?=\r?$)/m,
  /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[ \t]*$/gm,
  /(`+)[^\n]*?\1/g,
  /https?:\/\/[^\s)>]+/gi,
  /(?<=\]\()<?[^)\s>]+>?/g,
  /<[^>\n]+>/g,
  /^ {0,3}#{1,6}(?=[ \t])/gm,
  /^ {0,3}(?:[-+*]|\d+[.)])(?=[ \t])/gm,
  /^ {0,3}>[ \t]?/gm,
  /^ {0,3}(?:\|?[ \t]*:?-{3,}:?[ \t]*\|)+[ \t]*$/gm,
  /^ {0,3}(?:[-*_][ \t]*){3,}$/gm,
  /\*\*|__|~~|[*_]/g,
];

export function isKoreanDocument(markdown) {
  const prose = markdown
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[ \t]*$/gm, " ")
    .replace(/(`+)[^\n]*?\1/g, " ")
    .replace(/https?:\/\/[^\s)>]+/gi, " ");
  const letters = prose.match(/\p{L}/gu) ?? [];
  const koreanLetters = letters.filter((letter) => /\p{Script=Hangul}/u.test(letter)).length;
  const otherLetters = letters.length - koreanLetters;
  return koreanLetters > 0 && koreanLetters >= otherLetters;
}

export function validateTranslationEndpoint(value) {
  let endpoint;
  try {
    endpoint = new URL(value.trim());
  } catch {
    throw new Error("HTTPS 번역 서비스 주소를 입력해 주세요.");
  }

  const localDevelopmentHost = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if (
    !["https:", "http:"].includes(endpoint.protocol) ||
    (endpoint.protocol !== "https:" && !localDevelopmentHost) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new Error("HTTPS 주소를 사용해 주세요. 로컬 개발 주소 외에는 자격 증명이나 URL 매개변수를 사용할 수 없습니다.");
  }

  return endpoint.href;
}

function protectMarkdown(source) {
  const protectedParts = [];
  let placeholderPrefix = "MVPROTECTEDTOKEN";
  while (source.includes(placeholderPrefix)) placeholderPrefix += "X";

  let text = source;
  for (const pattern of PROTECTED_MARKDOWN_PATTERNS) {
    text = text.replace(pattern, (part) => {
      if (part.includes(placeholderPrefix)) return part;
      const placeholder = `${placeholderPrefix}${protectedParts.length}END`;
      protectedParts.push(part);
      return placeholder;
    });
  }

  return {
    text,
    restore(translated) {
      return protectedParts.reduce((result, part, index) => {
        const placeholder = `${placeholderPrefix}${index}END`;
        if (result.split(placeholder).length !== 2) {
          throw new Error("번역 서비스가 Markdown 구조 보호 표식을 변경했습니다.");
        }
        return result.replace(placeholder, part);
      }, translated);
    },
  };
}

export async function translateMarkdown(markdown, endpoint, { fetchImpl = fetch, signal } = {}) {
  const protectedMarkdown = protectMarkdown(markdown);
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: protectedMarkdown.text, source: "auto", target: "ko" }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`번역 서비스가 HTTP ${response.status} 응답을 반환했습니다.`);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("번역 서비스가 올바른 JSON 응답을 반환하지 않았습니다.");
  }
  if (typeof result.translatedText !== "string" || !result.translatedText.trim()) {
    throw new Error("번역 서비스 응답에 translatedText 문자열이 없습니다.");
  }

  return protectedMarkdown.restore(result.translatedText);
}
