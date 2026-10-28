---
id: 0015-uth
title: 'G 3.1: readClassicyThemeVar and ClassicyWindow geometry'
purpose: Give JS one way to read a theme metric from CSS and route the window's menu-bar height, zoom margin and resize inset through it instead of hard-coded numbers.
type: impr
status: pending
priority: "2"
effort: M
created: "2026-10-28T19:57:13.886Z"
updated: "2026-10-28T19:57:13.886Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.ts
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.test.ts
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.geometry.test.ts
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.hig.test.tsx
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0014-2b5", "depends"]
  plans:
    - ["0004-vqt", "included", ["3.1"]]
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
---

# G 3.1: readClassicyThemeVar and ClassicyWindow geometry

## Problem Statement

Audit §3.1: `ClassicyWindow.tsx` hard-codes `menuBarHeight = 30` four times (:57, :120, :160, :1316), a `+ 5` resize fudge (:958-959, :1098-1099), a zoom `margin = 8` (:1317) and a stale '~24px' collapsed-height comment (:1492-1495); `useClassicyBalloonHelp.tsx:27-35` already shows the right pattern (`getComputedStyle(...).getPropertyValue("--window-control-size")`). §9 Phase 6 item 4 and umbrella 0002-ldj: JS reads the named derivations (`--menu-bar-height` 30px = control×2.5, `--window-zoom-margin` 8px = padding + 2·border, `--window-resize-inset` 5px = padding − border, G 2.1) from the desktop element.

This story adds `ClassicyThemeMetricReader.ts` (`classicyDefaultThemeVarPx`, `readClassicyThemeVar(name, fallback?, el?)` with the default theme as fallback so SSR/jsdom keep today's values) and rewires `ClassicyWindow.tsx` and the balloon-help reader. Values are identical for Platinum, so the window geometry stays pixel-identical.

**Impact:** G 3.2's icon-grid reads use the same helper; part F's `window.growBoxCorner` / `menuBar.placement` math will build on it. Without it a package that changes `controlSize` moves the title bar but not the window placement.

## Steps

### 1: Write the failing tests

`src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.test.ts`: `it("reads the variable from #classicyDesktop")` (`const d = document.createElement("div"); d.id = "classicyDesktop"; d.style.setProperty("--menu-bar-height", "42px"); document.body.append(d); expect(readClassicyThemeVar("--menu-bar-height")).toBe(42)`); `it("falls back to the default theme value when the desktop is absent")` (`readClassicyThemeVar("--menu-bar-height")` toBe `30`); `it("falls back when the computed value is empty or NaN")` (desktop without the property → 30; explicit fallback 7 → 7); `it("classicyDefaultThemeVarPx throws for an unknown name")` (`classicyDefaultThemeVarPx("--nope")` toThrow `/not emitted/`). `src/SystemFolder/SystemResources/Window/ClassicyWindow.geometry.test.ts`: `it("resolveSize subtracts the menu-bar height read from CSS")` (mount `#classicyDesktop` 800×600 via `Object.defineProperty` on clientWidth/Height with `--menu-bar-height: 40px`; `resolveSize(["100%", "100%"])` toEqual `[800, 560]`); `it("resolvePosition clamps y to the CSS menu-bar height")` (`--menu-bar-height: 25px` → `resolvePosition(["left", "top"], [100, 100])[1] === 25`); `it("without a desktop the constants equal today's values")` (`resolveSize(["100%", "100%"])` toEqual `[800, 570]`); `it("zoom standard rect uses --window-zoom-margin")` (zoomable window with `--window-zoom-margin: 10px`, trigger toggleZoom via the zoom box; expect the dispatched position `[10, 40]` — follow ClassicyWindow.hig.test.tsx:170-185's dispatch-capture idiom). jsdom's `getComputedStyle` returns inline custom properties set with `style.setProperty`; if it does not, stub `window.getComputedStyle` with `Object.defineProperty` to return `{ getPropertyValue }` and note which in the test header.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.test.ts src/SystemFolder/SystemResources/Window/ClassicyWindow.geometry.test.ts` — Expected: FAIL — module not found; `resolveSize` returns 570 regardless of the variable.

### 3: Implement ClassicyThemeMetricReader.ts and rewire ClassicyWindow.tsx and useClassicyBalloonHelp

`export const classicyDefaultThemeVarPx = (name: string): number` — `parseFloat(getThemeVars(getTheme("default"))[name])`; throws a `classicyLog("error", "Theme", …)`-logged Error when the name is not emitted. `export const readClassicyThemeVar = (name: string, fallback: number = classicyDefaultThemeVarPx(name), el?: Element | null): number` — returns `parseFloat(getComputedStyle(el ?? document.getElementById("classicyDesktop") ?? document.documentElement).getPropertyValue(name))` when that is a finite number > 0, else `fallback`; with no `document` returns `fallback`. `ClassicyWindow.tsx`: `resolveSize` (:57), `resolvePosition` (:120), the :160 clamp function and `computeStandardRect` (:1316) replace `const menuBarHeight = 30` with `const menuBarHeight = readClassicyThemeVar("--menu-bar-height")`; `const margin = 8` → `readClassicyThemeVar("--window-zoom-margin")`; the two `+ 5` pairs (:958-959, :1098-1099) → `+ resizeInset` where `const resizeInset = readClassicyThemeVar("--window-resize-inset")` is read once at the top of each handler; rewrite the :1492-1495 comment to 'forced to `--window-collapsed-height` (15 px) by `.classicyWindow.collapsed`'. `useClassicyBalloonHelp.readControlSize` → `readClassicyThemeVar("--window-control-size")`. Run `pnpm exec barrelsby -c .ts-barrel.json`. Verify with `grep -n 'menuBarHeight = 30\|margin = 8\|+ 5;' src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` → no hits.

### 4: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/BalloonHelp src/SystemFolder/ControlPanels/AppearanceManager` — Expected: PASS, including ClassicyWindow.hig.test.tsx `[8, 38]`.

### 5: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src && git commit -m "refactor(window): read menu-bar height, zoom margin and resize inset from theme variables"` with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.geometry.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.test.ts
- [ ] VERIFY: grep -n 'menuBarHeight = 30\|margin = 8\|+ 5;' src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx | wc -l   # 0
- [ ] `readClassicyThemeVar` reads `#classicyDesktop`'s computed custom property and falls back to the default theme's emitted value (30 for `--menu-bar-height`) when the desktop or the value is missing.
- [ ] `ClassicyWindow.hig.test.tsx` still expects position `[8, 38]`; zoom, placement and resize behave as before under Platinum.

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.ts` - create: classicyDefaultThemeVarPx, readClassicyThemeVar
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - :57,120,160,1316 menu-bar height; :958-959,1098-1099 resize inset; :1316-1317,1336,1351,1396 zoom margin; :1492-1495 comment
- `src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.tsx` - :27-35 readControlSize delegates
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader.test.ts` - create
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.geometry.test.ts` - create
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.hig.test.tsx` - existing; :180 [8, 38] must keep passing
- `src/index.ts` - regenerated barrel

## Work Log
