# PDF Viewer — Design Spec

**Date:** 2026-06-30
**Status:** Approved

---

## Overview

A new `PDFViewer.app` that renders PDF files using `pdfjs-dist`. It registers itself as the file-type handler for a new `Pdf` file type, so double-clicking a `.pdf` file in Finder opens it in PDF Viewer. The app is structured like `QuickTime/PictureViewer` — an `AppInfo` + types module (`PDFViewerUtils.tsx`), a dedicated state reducer (`PDFViewerContext.tsx`), and an app shell (`PDFViewer.tsx`) — plus a standalone, embeddable rendering component (`PDFViewerDocument.tsx`) with no dependency on Finder, windows, or app state, which PictureViewer does not have (its `<img>` is inlined directly in its app shell).

## Background

Classicy's Finder already supports generic file-type routing: `ClassicyAppFinderOpenFile` looks up `fileTypeHandlers[file._type]` and dynamically dispatches `ClassicyApp<AppName>OpenFile`. By default, a catch-all branch in `ClassicyAppManager.ts` (any action type ending in `OpenFile`/`CloseFile`) handles this for apps with no app-specific reducer (e.g. `SimpleText`). Apps may instead self-register a dedicated reducer via `registerAppEventHandler(prefix, handler)`; once registered, the kernel router (`classicyDesktopStateEventReducer`) sends every action whose type starts with that prefix to the app's own handler instead of the generic one (see `Finder`'s and `PictureViewer`'s own self-registered handlers). PDF Viewer follows the `PictureViewer` pattern: a self-registered `PDFViewerContext.tsx` reducer explicitly owns `ClassicyAppPDFViewerOpenFile`/`ClassicyAppPDFViewerCloseFile` — Finder's dispatch and the action names are unchanged from the generic path, so **no changes to `Finder.tsx`/`FinderContext.tsx` are required**; only the receiving side changes from implicit (generic catch-all) to explicit (own reducer).

Classicy has no real file-upload/import mechanism yet — all virtual filesystem content is seeded in `DefaultClassicyFileSystem.ts`, with binary/media content referenced by URL (see `Videos/BuckBunny.mov`, `Videos/Monkees.mp3`) rather than embedded. PDF Viewer follows the same convention: seeded demo PDF(s) referenced by URL, fetched directly by `pdfjs-dist`.

Unlike `PictureViewer`'s documents (ad hoc `{url, name, icon}` objects not backed by the virtual filesystem), PDF files live in and are resolved from the virtual filesystem by path (`ClassicyFileSystem.resolve(path)`). `PDFViewerContext.tsx` therefore tracks `openFiles: string[]` (paths), matching what `Finder` already sends (`{app, path}`), rather than mirroring `PictureViewer`'s document-object shape.

## Files

- `src/SystemFolder/SystemResources/File/ClassicyFileSystemModel.ts` — add `Pdf = "pdf"` to `ClassicyFileSystemEntryFileType`.
- `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.ts` — seed `Documents/Sample.pdf` (see Seed Data below).
- `src/SystemFolder/PDFViewer/PDFViewerUtils.tsx` — `PDFViewerAppInfo`, `PDFViewerData` type, `isPDFViewerData` type guard, new.
- `src/SystemFolder/PDFViewer/PDFViewerContext.tsx` — self-registered reducer for `ClassicyAppPDFViewerOpenFile`/`CloseFile`, new.
- `src/SystemFolder/PDFViewer/PDFViewer.tsx` — app shell (`ClassicyApp` + `ClassicyWindow` per open file), new.
- `src/SystemFolder/PDFViewer/PDFViewerDocument.tsx` — standalone, embeddable page-rendering component + toolbar (no Finder/app-state dependency), new.
- `src/index.ts` — export the new app.
- `example/src/app.tsx` — mount `<PDFViewer />` for local dev preview.
- `package.json` — add `pdfjs-dist` dependency.

## State — `PDFViewerUtils.tsx` / `PDFViewerContext.tsx`

Mirrors `PictureViewerUtils.tsx` / `PictureViewerContext.tsx` exactly in shape, adapted for path-based `openFiles`:

- `PDFViewerUtils.tsx` exports `PDFViewerAppInfo = { id: "PDFViewer.app", name: "PDFViewer", icon: ClassicyIcons.system.files.document }` (no space in `name` — keeps action-type strings like `ClassicyAppPDFViewerOpenFile` clean, matching `SimpleText`'s no-space convention), `PDFViewerData = { openFiles: string[] }`, and `isPDFViewerData`.
- `PDFViewerContext.tsx` exports `classicyPDFViewerEventHandler`, self-registered via `registerAppEventHandler("ClassicyAppPDFViewer", classicyPDFViewerEventHandler)`. On `ClassicyAppPDFViewerOpenFile` (`{path}`): auto-loads the app if not yet registered (`loadApp`, mirroring `PictureViewer`'s auto-load), appends `path` to `openFiles` if not already present, opens the app. On `ClassicyAppPDFViewerCloseFile` (`{path}`): removes `path` from `openFiles`.

## App shell — `PDFViewer.tsx`

- Reads `id`/`name`/`icon` from `PDFViewerAppInfo` (mirrors `PictureViewer.tsx`'s `const { name: appName, id: appId, icon: appIcon } = PictureViewerAppInfo;`).
- `handlesFileTypes={[ClassicyFileSystemEntryFileType.Pdf]}`, `handlesOwnFiles={true}` — registering `handlesFileTypes` is independent of which reducer ultimately handles the resulting `OpenFile`/`CloseFile` actions, so Finder's routing is unaffected by the switch to a dedicated reducer.
- Reads `appState.data.openFiles` (array of paths, written by `PDFViewerContext.tsx`). For each path, resolves the entry via `ClassicyFileSystem`, reads `_data` as the PDF URL, and renders a `ClassicyWindow` containing `<PDFViewerDocument url={...} />` (multi-window — one per open PDF, same as `SimpleText`/`PictureViewer`).
- `closeFile(path)` dispatches `ClassicyAppPDFViewerCloseFile` (now routed to `PDFViewerContext.tsx`'s reducer instead of the generic catch-all).
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
- `PDFViewerContext.tsx`: dedicated reducer tests mirroring `ClassicyPictureViewerEventHandler.test.ts` — opening a file adds it to `openFiles` and opens the app, opening an already-open path is a no-op (dedup), closing removes it, the auto-load-when-unregistered path, and that `classicyDesktopStateEventReducer` correctly routes `ClassicyAppPDFViewer*` actions to this handler (not the generic catch-all).
- `PDFViewerUtils.tsx`: `isPDFViewerData` type-guard tests, mirroring `PictureViewerData.test.ts`.
- `PDFViewerDocument`: page navigation and zoom button disabled-states at bounds, page-counter text rendering, loading/error states — tested standalone (no app-state/store dependency, since it's a plain `{url}` component).
- No new Finder-side tests needed — Finder's dispatch and the action names it sends are unchanged; only the receiving reducer changed. Covered already by `ClassicyFinderEventHandler.test.ts`.
