import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(source) {
  return DOMPurify.sanitize(marked.parse(source));
}
