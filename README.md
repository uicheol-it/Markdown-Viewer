# Markdown Viewer

A small, private-by-default Markdown editor and preview. Open a local Markdown or text file, drop one onto the page, or edit the included sample. The rendered preview updates as you type.

## Features

- GitHub Flavored Markdown, including tables, task lists, and strikethrough.
- HTML is sanitized before it is rendered in the preview.
- Responsive side-by-side editor and preview, with a simple view switcher on small screens.
- Local file loading and drag-and-drop; documents are not uploaded or saved by the app.

## Run locally

Requires Node.js 20 or later.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build or run the focused renderer tests:

```sh
npm run build
npm test
```

Markdown rendering uses `marked` with GFM enabled. Rendered HTML passes through DOMPurify before it is inserted into the preview.
