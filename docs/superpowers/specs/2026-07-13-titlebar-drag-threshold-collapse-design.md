# Title Bar Drag Threshold + Double-Click Collapse — Design

**Date:** 2026-07-13
**Status:** Approved (Approach A)

## Problem

In `ClassicyWindow`, a bare single click on the title bar immediately enters
drag state: `startMoveWindow` runs on `mousedown`, sets `isDraggingRef`,
dispatches `ClassicyWindowMove`/`ClassicyWindowDrag`, and plays the move-idle
sound. There is no double-click behavior on the title bar.

## Desired Behavior

1. **Drag only on click-and-hold-move:** a mousedown on the title bar arms a
   potential drag; the drag actually starts (state, events, sound, analytics)
   only after the pointer moves more than **4px** (Euclidean distance from the
   mousedown point) while the button is held.
2. **Double-click collapses:** a native `dblclick` on the title bar toggles
   window collapse via the existing `toggleCollapse()`, which already respects
   the `collapsable` prop. This mirrors Mac OS 8's WindowShade behavior.
3. A bare click (down + up, < 4px movement) does nothing beyond the existing
   focus behavior — no drag events, no move sound.

## Approach (A — movement threshold)

All changes confined to `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`:

- Add refs: `pendingDragRef` (armed but not yet dragging) and
  `dragStartPointRef` (mousedown client coordinates).
- `startMoveWindow` (title bar `onMouseDown`) becomes the **arm** step: keep
  the modal-error guard and click-offset capture, record the mousedown point,
  set `pendingDragRef` — but do **not** set `isDraggingRef`, dispatch events,
  play sound, or track analytics.
- New `promoteDragIfNeeded(clientX, clientY)`: when armed and movement exceeds
  the 4px threshold, disarm pending, set `isDraggingRef`, dispatch
  `ClassicyWindowMove` (moving: true, current rect position), call
  `setDragging(true)`, play `ClassicyWindowMoveIdle`, track `move`.
- Call the promotion check at the top of both mousemove paths: the
  document-level `docMoveHandlerRef` handler and the React `changeWindow`
  handler.
- Disarm `pendingDragRef` in both mouseup paths (`docUpHandlerRef`,
  `stopChangeWindow`).
- Add `onDoubleClick={toggleCollapse}` to the `.classicyWindowTitle` div.

## Rejected Alternatives

- **B. Hold-delay timer** (drag after ~200ms hold): laggy, penalizes fast drags.
- **C. Manual click-count timer** instead of native `dblclick`: more code and
  edge cases for no benefit once drag no longer starts on bare mousedown.

## Testing

New component test `ClassicyWindow.titlebar.test.tsx` (jsdom +
testing-library, following the `ClassicyDesktopIcon.test.tsx` mocking
conventions):

- mousedown + mouseup without movement dispatches no drag/move events.
- mousedown + move beyond threshold dispatches drag/move events.
- mousedown + move below threshold dispatches nothing.
- double-click dispatches `ClassicyWindowCollapse`; second double-click
  dispatches `ClassicyWindowExpand`.
- double-click on a non-collapsable window dispatches neither.
