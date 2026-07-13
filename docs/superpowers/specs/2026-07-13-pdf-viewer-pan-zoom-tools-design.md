# PDF Viewer Pan & Zoom Tools

**Date:** 2026-07-13
**Status:** Approved

## Goal

Give the PDF Viewer a MacPaint-style tool palette: a Pan tool (hand) that
drags to scroll the document, and a Zoom tool (magnifying glass) that
clicks to zoom in and Control-clicks to zoom out, centered on the click
point. Also shorten the step-zoom buttons: "Zoom In" → "+", "Zoom Out" → "-".

## Decisions

- **Zoom focus:** zooming via the Zoom tool keeps the clicked document
  point under the cursor (scroll offsets are recomputed after rescale).
  The "+"/"-" buttons keep their current center-agnostic behavior.
- **Tool exclusivity:** exactly one tool is always active; a new document
  opens with Pan selected. Clicking the other tool's button switches.
  There is no "no tool" state.
- **Cursors:** the canvas wrapper's mouse cursor becomes the active tool —
  the Mac OS 8 hand (`cursor-hand.png`, 16×16, hotspot 8 8, fallback
  `grab`) for Pan, the Sherlock magnifying glass (`search.png`, 32×32,
  hotspot 10 10 over the lens, fallbacks `zoom-in`) for Zoom.

## UI

The existing toolbar keeps its layout and gains two square icon buttons:

```
[Previous] Page 1 of 3 [Next]  [-] [+]  [🖐] [🔍]
```

- "-" / "+" are the existing scale-step buttons, relabeled. Each gets an
  `aria-label` ("Zoom Out" / "Zoom In") since a bare glyph is a poor
  accessible name.
- Pan and Zoom tool buttons use `ClassicyButton` with
  `buttonShape="square"`, an `<img>` icon (imported via `@img/`), and
  `aria-label` "Pan Tool" / "Zoom Tool". The active tool renders with
  `depressed` (which also emits `aria-pressed`).

## Behavior

**State:** one new `useState` — `activeTool: 'pan' | 'zoom'`, initial
`'pan'`. Single-variable state makes mutual exclusivity structural.

**Pan tool** (pointer events on `.pdfViewerDocumentCanvasWrapper`, the
`overflow: auto` container):

- `pointerdown` → capture the pointer (`setPointerCapture?.()`, optional-
  called for jsdom), record start client coords + start scroll offsets.
- `pointermove` while dragging → `scrollLeft/Top = startScroll - delta`.
- `pointerup`/`pointercancel` → end the drag.
- Inert when the Zoom tool is active.

**Zoom tool** (click on the wrapper):

- New scale = `clamp(scale ± SCALE_STEP)` — minus when `ctrlKey` is held.
  Reuses the existing `MIN_SCALE`/`MAX_SCALE`/`SCALE_STEP` constants.
- Click-point centering: convert the click to unscaled document coords
  (`doc = (client - canvasRect.topLeft) / oldScale`), stash
  `{docX, docY, clientX, clientY}` in a ref, then `setScale`. The render
  effect applies the scroll adjustment **after** resizing the canvas
  (`scroll = doc * newScale - cursorOffsetInWrapper`) — adjusting before
  the canvas grows would be clamped to the old content size.
- At min/max the click is a no-op (same clamp as the buttons).
- Inert when the Pan tool is active.

## Styling

`PDFViewerDocument.scss` gains tool-specific wrapper modifiers using
relative asset URLs (the `ClassicySlider` pattern):

```scss
.pdfViewerDocumentToolPan  { cursor: url('...cursor-hand.png') 8 8, grab; }
.pdfViewerDocumentToolZoom { cursor: url('...search.png') 10 10, zoom-in; }
```

Tool-button icons are sized to 16×16 inside the square buttons.

## Testing (TDD, `PDFViewerDocument.test.tsx`)

- "+" / "-" labels render; old "Zoom In"/"Zoom Out" text queries updated
  to the new accessible names.
- Pan Tool is depressed (`aria-pressed`) by default; clicking Zoom Tool
  flips depression and the wrapper's tool class.
- Pan drag: pointerdown/move on the wrapper mutates `scrollLeft`/
  `scrollTop` by the drag delta; drag does nothing while Zoom is active.
- Zoom click: re-render uses `scale + 0.25`; ctrl-click uses
  `scale - 0.25` (asserted via `getViewport` mock calls); clamped at
  MIN/MAX; click does nothing while Pan is active.
