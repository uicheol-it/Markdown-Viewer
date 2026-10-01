import { renderMarkdown } from "./markdown.js";
import "./styles.css";

const SAMPLE = `# A little space for your ideas

Welcome to **Markdown Viewer** — a simple place to write and preview Markdown.

## Make yourself at home

Type on the left and your preview will update as you go. You can also open a \`.md\` file or drop one anywhere on this page.

> Good writing is clear thinking made visible.

### The essentials, covered

- **Headings** and paragraphs
- Lists, links, and **bold** or *italic* text
- Fenced code blocks with syntax hints
- Tables, task lists, and ~~strikethrough~~

| Keep it simple | Keep it yours |
| :--- | :--- |
| No account needed | Files stay on your device |

\`\`\`js
const idea = "something wonderful";
console.log(idea);
\`\`\`

- [x] Write a little
- [ ] See it take shape
`;

const input = document.querySelector("#markdown-input");
const preview = document.querySelector("#preview-content");
const name = document.querySelector("#document-name");
const stats = document.querySelector("#document-stats");
const lineGutter = document.querySelector("#line-gutter");
const fileInput = document.querySelector("#file-input");
const dropOverlay = document.querySelector("#drop-overlay");
const toast = document.querySelector("#toast");
let toastTimer;
let activeFilename = "예제.md";

function updateDocument() {
  const markdown = input.value;
  const lines = markdown.split("\n").length;
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;

  preview.innerHTML = markdown.trim()
    ? renderMarkdown(markdown)
    : '<div class="empty-preview"><span aria-hidden="true">✎</span><h3>미리보기가 여기에 표시됩니다</h3><p>편집기에서 작성을 시작하거나 마크다운 파일을 열어 보세요.</p></div>';
  name.textContent = activeFilename;
  stats.textContent = `단어 ${words}개 · ${lines}줄`;
  lineGutter.textContent = Array.from({ length: lines }, (_, index) => index + 1).join("\n");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2800);
}

function loadFile(file) {
  if (!file) return;
  const supported = /\.(md|markdown|mdown|mkd|txt)$/i.test(file.name) || file.type === "text/markdown" || file.type === "text/plain";
  if (!supported) {
    showToast("마크다운 또는 일반 텍스트 파일을 선택해 주세요.");
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    input.value = typeof reader.result === "string" ? reader.result : "";
    activeFilename = file.name;
    updateDocument();
    input.focus();
    showToast(`파일을 열었습니다: ${file.name}`);
  });
  reader.addEventListener("error", () => showToast("파일을 읽을 수 없습니다. 다른 파일을 선택해 주세요."));
  reader.readAsText(file);
}

input.addEventListener("input", updateDocument);
input.addEventListener("scroll", () => {
  lineGutter.scrollTop = input.scrollTop;
});

document.querySelector("#open-file-button").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  loadFile(fileInput.files?.[0]);
  fileInput.value = "";
});

document.querySelector("#sample-button").addEventListener("click", () => {
  input.value = SAMPLE;
  activeFilename = "예제.md";
  updateDocument();
  input.focus();
});

for (const tab of document.querySelectorAll(".mobile-tab")) {
  tab.addEventListener("click", () => {
    for (const pane of document.querySelectorAll(".pane")) pane.classList.toggle("mobile-active", pane.id === tab.dataset.pane);
    for (const item of document.querySelectorAll(".mobile-tab")) {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    }
  });
}

let dragDepth = 0;
window.addEventListener("dragenter", (event) => {
  if (!event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  dragDepth += 1;
  dropOverlay.classList.add("visible");
});
window.addEventListener("dragover", (event) => {
  if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
});
window.addEventListener("dragleave", (event) => {
  if (!event.dataTransfer?.types.includes("Files")) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dropOverlay.classList.remove("visible");
});
window.addEventListener("drop", (event) => {
  if (!event.dataTransfer?.files.length) return;
  event.preventDefault();
  dragDepth = 0;
  dropOverlay.classList.remove("visible");
  loadFile(event.dataTransfer.files[0]);
});

input.value = SAMPLE;
updateDocument();
