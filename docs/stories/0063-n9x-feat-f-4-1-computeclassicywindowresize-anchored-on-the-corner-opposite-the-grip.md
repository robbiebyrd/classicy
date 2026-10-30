---
id: 0063-n9x
title: 'F 4.1: computeClassicyWindowResize anchored on the corner opposite the grip'
purpose: Replace the window's inline top-left-anchored resize formulas with a pure function that reads the declared grow-box corner and anchors the opposite corner, keeping today's bottom-right numbers exactly.
type: feat
status: in_progress
priority: "2"
effort: M
created: "2026-10-28T20:30:41.718Z"
updated: "2026-10-30T03:02:31.789Z"
started: "2026-10-30T02:18:30.774Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/Window/ClassicyWindowResize.ts
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindowResize.test.ts
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.resizeSize.test.tsx
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0062-sxu", "depends"]
  plans:
    - ["0010-743", "included", ["4.1"]]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
  "6":
    status: pending
  "7":
    status: pending
---

# F 4.1: computeClassicyWindowResize anchored on the corner opposite the grip

## Problem Statement

Audit §5 / §3.1: the resize math at `ClassicyWindow.tsx:958-964` and `:1098-1104` computes `newWidth = Math.abs(anchorX - e.clientX) + 5` from the top-left corner captured by `startResizeWindow` (`:1003-1029`), so the grip can only live bottom-right; a package declaring another `window.growBoxCorner` would resize from the wrong edge.

This section (plan 0010-743 §4.1, umbrella 0002-ldj; §8.8 "Declared" slot) adds `computeClassicyWindowResize(corner, rect, pointer, chrome, fudge)` in `ClassicyWindowResize.ts`, keeps today's `+ 5` as `CLASSICY_WINDOW_RESIZE_FUDGE` (Part G item 4 replaces it), and rewires both move handlers to call it with `useClassicyAppearanceLayout().window.growBoxCorner`, writing `style.left/top` when the anchored corner is not top-left. Mouseup already persists the measured rect (`:996-1000`).

**Impact:** Without it the grip moved by 3.1's CSS would still resize from the top-left anchor, making the mirrored window story (7.1) unusable and the layout declaration a lie.

## Steps

### 1: Write the failing tests

`ClassicyWindowResize.test.ts` — rect `{ left: 100, top: 100, right: 300, bottom: 250 }`, chrome `[10, 30]`, pointer = that corner + (10, 10):
```ts
it("bottom-right keeps today's numbers", () => expect(computeClassicyWindowResize("bottom-right", rect, [310, 260], chrome)).toEqual({ size: [215, 165], position: [100, 100] }));
it("bottom-left anchors the top-right corner", () => expect(computeClassicyWindowResize("bottom-left", rect, [110, 260], chrome)).toEqual({ size: [195, 165], position: [95, 100] }));
it("top-right anchors the bottom-left corner", () => expect(computeClassicyWindowResize("top-right", rect, [310, 110], chrome)).toEqual({ size: [215, 145], position: [100, 75] }));
it("top-left anchors the bottom-right corner", () => expect(computeClassicyWindowResize("top-left", rect, [110, 110], chrome)).toEqual({ size: [195, 145], position: [95, 75] }));
it("the fudge is 5 until Part G measures it", () => expect(CLASSICY_WINDOW_RESIZE_FUDGE).toBe(5));
```
`ClassicyWindow.resizeSize.test.tsx` (reuse its rect mocking at `:148-175`): `it("a bottom-left grow box moves the left edge while dragging", …)` — register `test-mirror` (1.1), switch to it, mock `getBoundingClientRect` → `{ left: 100, top: 100, right: 300, bottom: 250, width: 200, height: 150 }`, `mouseDown` on `.classicyWindowResizer`, `mouseMove` on the window at `(110, 260)`: `expect(windowEl.style.width).toBe("195px")`, `expect(windowEl.style.left).toBe("105px")` (jsdom chrome is `[0, 0]`: `300 − 195`).

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindowResize.test.ts src/SystemFolder/SystemResources/Window/ClassicyWindow.resizeSize.test.tsx` — Expected: FAIL (module not found; `style.left` empty).

### 3: Implement `computeClassicyWindowResize` in `ClassicyWindowResize.ts`

`export const CLASSICY_WINDOW_RESIZE_FUDGE = 5`; `export type ClassicyWindowRect = { left: number; top: number; right: number; bottom: number }`; `export type ClassicyWindowResizeResult = { size: [number, number]; position: [number, number] }`; `export const computeClassicyWindowResize = (corner: ClassicyAppearanceLayout["window"]["growBoxCorner"], rect: ClassicyWindowRect, pointer: [number, number], chrome: [number, number], fudge = CLASSICY_WINDOW_RESIZE_FUDGE): ClassicyWindowResizeResult` with: `bottom-right`: `size = [|rect.left − px| + fudge, |rect.top − py| + fudge]`, `position = [rect.left, rect.top]`; `bottom-left`: `size = [|rect.right − px| + fudge, |rect.top − py| + fudge]`, `position = [rect.right − (size[0] + chrome[0]), rect.top]`; `top-right`: `size = [|rect.left − px| + fudge, |rect.bottom − py| + fudge]`, `position = [rect.left, rect.bottom − (size[1] + chrome[1])]`; `top-left`: `size = [|rect.right − px| + fudge, |rect.bottom − py| + fudge]`, `position = [rect.right − (size[0] + chrome[0]), rect.bottom − (size[1] + chrome[1])]`. Then `pnpm exec barrelsby -c .ts-barrel.json`.

### 4: Rewire `ClassicyWindow.tsx:958-964, 1003-1029, 1098-1104`

`const layout = useClassicyAppearanceLayout();` near the other hooks; `startResizeWindow` stores the full rect in a new `resizeRectRef` and `chromeRef = classicyWindowChromeSize(windowRef.current)` (`:101-114`), both beside `wsPositionRef` (`:567`); both move handlers call `computeClassicyWindowResize(layout.window.growBoxCorner, resizeRectRef.current, [e.clientX, e.clientY], chromeRef.current)`, write `style.width/height` and — when the corner is not `bottom-right` — `style.left/top` from `position`, and keep `pendingSizeRef.current = size`; mouseup is unchanged. `wsPositionRef` stays for the drag path.

### 5: Run the window suites

`pnpm exec vitest run src/SystemFolder/SystemResources/Window` — Expected: PASS, including the untouched `resizeSize` cases at `:211-243` (bottom-right numbers unchanged).

### 6: Parity and a manual check

Re-shoot `desktop-window--*` → AE `0`. In Storybook `desktop-window--default`, drag the grip 40 px right/down with Playwright MCP (`browser_drag`) and confirm with `browser_evaluate` that `getBoundingClientRect().left/top` are unchanged and width/height grew by 40 (±1).

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/SystemFolder/SystemResources/Window src/index.ts && git commit -m "feat(window): resize math anchors the corner opposite the declared grow box"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindowResize.test.ts
- [ ] `computeClassicyWindowResize` passes the four-corner table; the bottom-right path reproduces today's numbers with `CLASSICY_WINDOW_RESIZE_FUDGE = 5`; a mirrored window's grip drag moves `style.left`.
- [ ] The untouched `ClassicyWindow.resizeSize.test.tsx:211-243` cases still pass.

## Files

- `src/SystemFolder/SystemResources/Window/ClassicyWindowResize.ts` - create: pure corner-anchored resize math
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - modify: handlers call the pure function with the declared corner
- `src/SystemFolder/SystemResources/Window/ClassicyWindowResize.test.ts` - create: four-corner table
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.resizeSize.test.tsx` - modify: bottom-left drag test
- `src/index.ts` - regenerate barrel

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T02:58:29.063Z - F 4.1 implemented on feat/appearance-part-f (b26e3b72c resize math anchored on the corner opposite the declared grow box; 72abc49cd pins every grow-box corner rule). 4044 tests pass; all 27 window/app/alert stories AE 0 against part-F/before. Live 40 px grip drag on desktop-window--default keeps left/top and grows by +43 at both BASE and HEAD (the existing +5 grip fudge), so Platinum behavior is unchanged. Task review dispatched.

### 2026-10-30T03:02:31.789Z - F 4.1 task review: Needs fixes. Bottom-right unchanged and the +43 drag confirmed as today's +5 fudge; Important: flipped corners ignore minimum size and the viewport floor (y>=30, x>=0), so the anchored edge drifts (reachable via F 7.1's mirrored package). Fixes (optional minimum/floor params on the pure function, React-path resizing gate, test comment) sent to the F 5.1 implementer to land as a separate commit.
