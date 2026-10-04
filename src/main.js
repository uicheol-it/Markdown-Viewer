import { renderMarkdown } from "./markdown.js";
import { isKoreanDocument, translateMarkdown, validateTranslationEndpoint } from "./translation.js";
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
const translationEndpointInput = document.querySelector("#translation-endpoint");
const translationSettings = document.querySelector("#translation-settings");
const translationStatus = document.querySelector("#translation-status");
const originalPreviewButton = document.querySelector("#preview-original-button");
const koreanPreviewButton = document.querySelector("#preview-korean-button");
let toastTimer;
let activeFilename = "예제.md";
let translationEndpoint = window.localStorage.getItem("translation-endpoint") ?? "";
let translatedMarkdown = "";
let translationTimer;
let translationController;
let documentRevision = 0;
let previewLanguage = "original";

translationEndpointInput.value = translationEndpoint;

function updateDocument() {
  const markdown = input.value;
  const lines = markdown.split("\n").length;
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;

  const displayedMarkdown = previewLanguage === "korean" ? translatedMarkdown : markdown;
  preview.innerHTML = displayedMarkdown.trim()
    ? renderMarkdown(displayedMarkdown)
    : '<div class="empty-preview"><span aria-hidden="true">✎</span><h3>미리보기가 여기에 표시됩니다</h3><p>편집기에서 작성을 시작하거나 마크다운 파일을 열어 보세요.</p></div>';
  koreanPreviewButton.disabled = !translatedMarkdown;
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
    scheduleTranslation();
    input.focus();
    showToast(`파일을 열었습니다: ${file.name}`);
  });
  reader.addEventListener("error", () => showToast("파일을 읽을 수 없습니다. 다른 파일을 선택해 주세요."));
  reader.readAsText(file);
}

input.addEventListener("input", () => {
  updateDocument();
  scheduleTranslation();
});
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
  scheduleTranslation();
  input.focus();
});

function setPreviewLanguage(language) {
  previewLanguage = language;
  for (const [button, active] of [
    [originalPreviewButton, language === "original"],
    [koreanPreviewButton, language === "korean"],
  ]) {
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  updateDocument();
}

originalPreviewButton.addEventListener("click", () => setPreviewLanguage("original"));
koreanPreviewButton.addEventListener("click", () => setPreviewLanguage("korean"));

document.querySelector("#translation-settings-button").addEventListener("click", (event) => {
  const expanded = event.currentTarget.getAttribute("aria-expanded") === "true";
  event.currentTarget.setAttribute("aria-expanded", String(!expanded));
  translationSettings.hidden = expanded;
});

document.querySelector("#save-translation-settings").addEventListener("click", () => {
  let endpoint;
  try {
    endpoint = validateTranslationEndpoint(translationEndpointInput.value);
  } catch (error) {
    showToast(error.message);
    return;
  }

  translationEndpoint = endpoint;
  window.localStorage.setItem("translation-endpoint", endpoint);
  translationStatus.textContent = "번역 서비스가 설정되었습니다. 비한국어 문서는 동의 후 자동 번역됩니다.";
  showToast("번역 서비스 주소를 저장했습니다.");
  scheduleTranslation();
});

function scheduleTranslation() {
  window.clearTimeout(translationTimer);
  translationController?.abort();
  translatedMarkdown = "";
  if (previewLanguage === "korean") {
    setPreviewLanguage("original");
  } else {
    updateDocument();
  }
  documentRevision += 1;
  const revision = documentRevision;

  if (!input.value.trim()) {
    translationStatus.textContent = "번역할 문서가 없습니다.";
    if (previewLanguage === "korean") updateDocument();
    return;
  }
  if (isKoreanDocument(input.value)) {
    translationStatus.textContent = "한국어 문서로 판단되어 번역하지 않습니다.";
    if (previewLanguage === "korean") updateDocument();
    return;
  }
  if (!translationEndpoint) {
    translationStatus.textContent = "번역 서비스 주소를 설정하면 한국어가 아닌 문서를 자동 번역합니다.";
    if (previewLanguage === "korean") updateDocument();
    return;
  }

  translationStatus.textContent = "한국어 번역을 준비하고 있습니다.";
  translationTimer = window.setTimeout(() => requestTranslation(revision), 500);
}

async function requestTranslation(revision) {
  const consentKey = "translation-consent";
  if (window.localStorage.getItem(consentKey) !== translationEndpoint) {
    const consent = window.confirm(
      `문서 전체의 Markdown 텍스트가 설정한 외부 번역 서비스(${translationEndpoint})로 전송됩니다. 코드와 주석을 포함한 내용의 개인정보 처리 방침을 확인했으며 번역을 계속하시겠습니까?`,
    );
    if (!consent) {
      translationStatus.textContent = "동의하지 않아 번역하지 않았습니다. 원문은 이 기기에 그대로 있습니다.";
      return;
    }
    window.localStorage.setItem(consentKey, translationEndpoint);
  }

  translationController = new AbortController();
  const source = input.value;
  translationStatus.textContent = "문서를 한국어로 번역하고 있습니다.";
  try {
    const result = await translateMarkdown(source, translationEndpoint, {
      fetchImpl: window.fetch.bind(window),
      signal: translationController.signal,
    });
    if (revision !== documentRevision) return;
    translatedMarkdown = result;
    translationStatus.textContent = "한국어 번역이 완료되었습니다. 원문은 편집기에 보존되어 있습니다.";
    setPreviewLanguage("korean");
  } catch (error) {
    if (error.name === "AbortError" || revision !== documentRevision) return;
    translationStatus.textContent = "번역하지 못했습니다. 서비스 주소와 네트워크를 확인해 주세요.";
    showToast(`번역 실패: ${error.message}`);
  }
}

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
scheduleTranslation();
