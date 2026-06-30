# PDF Viewer — Design Spec

**Date:** 2026-06-30
**Status:** Approved

---

## Overview

A new `PDFViewer.app` that renders PDF files using `pdfjs-dist`. It registers itself as the file-type handler for a new `Pdf` file type, so double-clicking a `.pdf` file in Finder opens it in PDF Viewer. The app follows the same generic "file-type handler" pattern as `SimpleText` — no changes to Finder or its event-routing reducer are required.

## Background

Classicy's Finder already supports generic file-type routing: `ClassicyAppFinderOpenFile` looks up `fileTypeHandlers[file._type]` and dynamically dispatches `ClassicyApp<AppName>OpenFile`. A catch-all reducer in `ClassicyAppManager.ts` (any action type ending in `OpenFile`/`CloseFile`) adds/removes the path from `app.data.openFiles` and opens the app — no per-app reducer needed. `SimpleText` is the existing app built entirely on this path (no custom context file). PDF Viewer reuses this exactly.

Classicy has no real file-upload/import mechanism yet — all virtual filesystem content is seeded in `DefaultClassicyFileSystem.ts`, with binary/media content referenced by URL (see `Videos/BuckBunny.mov`, `Videos/Monkees.mp3`) rather than embedded. PDF Viewer follows the same convention: seeded demo PDF(s) referenced by URL, fetched directly by `pdfjs-dist`.

## Files

- `src/SystemFolder/SystemResources/File/ClassicyFileSystemModel.ts` — add `Pdf = "pdf"` to `ClassicyFileSystemEntryFileType`.
- `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.ts` — seed `Documents/Sample.pdf` (see Seed Data below).
- `src/SystemFolder/PDFViewer/PDFViewer.tsx` — app shell (`ClassicyApp` + `ClassicyWindow` per open file), new.
- `src/SystemFolder/PDFViewer/PDFViewerDocument.tsx` — page-rendering component + toolbar, new.
- `src/SystemFolder/PDFViewer/PDFViewerUtils.ts` — `PDFViewerAppInfo`, any shared types, new.
- `src/index.ts` — export the new app.
- `example/src/app.tsx` — mount `<PDFViewer />` for local dev preview.
- `package.json` — add `pdfjs-dist` dependency.

## App shell — `PDFViewer.tsx`

- `appId: "PDFViewer.app"`, `name: "PDFViewer"` (no space — keeps the dynamically-generated action-type strings, e.g. `ClassicyAppPDFViewerOpenFile`, clean; matches `SimpleText`'s no-space naming convention).
- `icon: ClassicyIcons.system.files.document` (generic placeholder; a dedicated app icon can be dropped into `assets/img/icons/applications/pdfviewer/app.png` later, same flow as other apps).
- `handlesFileTypes={[ClassicyFileSystemEntryFileType.Pdf]}`, `handlesOwnFiles={true}`.
- Reads `appState.data.openFiles` (array of paths, written by the generic `OpenFile`/`CloseFile` reducer). For each path, resolves the entry via `ClassicyFileSystem`, reads `_data` as the PDF URL, and renders a `ClassicyWindow` (multi-window — one per open PDF, same as `SimpleText`/`PictureViewer`).
- `closeFile(path)` dispatches `ClassicyAppPDFViewerCloseFile` (handled by the same generic reducer).
- App menu: `File > Quit` only (`quitMenuItemHelper`), matching `SimpleText`'s `baseMenu`.

## Viewer — `PDFViewerDocument.tsx`

- Props: `{ url: string }`.
- Loads the document via `pdfjs.getDocument({ url }).promise`. Worker wired once at module load via Vite's `?url` import: `import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"` → `GlobalWorkerOptions.workerSrc = pdfWorkerUrl`.
- State: `currentPage` (1-indexed, default 1), `numPages`, `scale` (default 1.0, clamped e.g. 0.5–3.0 in 0.25 steps).
- Renders only the current page to a `<canvas>` ref via `page.render({ canvasContext, viewport })`; re-renders on `currentPage`/`scale`/document change.
- Custom toolbar (hand-built div using `ClassicyButton` + `ClassicyControlLabel`, same pattern as `Browser.tsx`'s nav bar — `ClassicyWindow` has no built-in toolbar slot):
  - Previous / Next page buttons, disabled at bounds.
  - "Page X of Y" label.
  - Zoom In / Zoom Out buttons, disabled at min/max scale.
- Loading state: simple text/spinner placeholder while the document fetches.
- Error state: if load/parse fails, show inline text ("Couldn't load this PDF.") in place of the canvas — no retry logic.

## Seed Data

In `DefaultClassicyFileSystem.ts`, under `Documents`:

```ts
"Sample.pdf": {
  _type: ClassicyFileSystemEntryFileType.Pdf,
  _mimeType: "application/pdf",
  _icon: documentIcon, // ClassicyIcons.system.files.document
  _data: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
},
```

(pdf.js's own canonical demo PDF — fitting given the library choice. Can be swapped for a different URL later.)

## Out of scope

- Any general file-upload/import mechanism for bringing real PDFs into the virtual Finder (explicitly deferred — seeding by URL is sufficient for this feature).
- A custom app icon (using the generic document icon placeholder for now).
- Continuous-scroll / multi-page-at-once rendering.
- Printing, text selection/search, annotations, or any editing capability.

## Testing

- `pdfjs-dist` is mocked in tests (no real network calls).
- `PDFViewer`: opening/closing files via `appState.data.openFiles` (mirrors the generic OpenFile/CloseFile contract `SimpleText` already relies on; covered indirectly by existing `ClassicyAppManager`/`ClassicyFinderEventHandler` tests, plus a `PDFViewer`-specific render test).
- `PDFViewerDocument`: page navigation and zoom button disabled-states at bounds, page-counter text rendering.
- No new Finder-side tests needed — Finder routing is unchanged and already covered by `ClassicyFinderEventHandler.test.ts`.
