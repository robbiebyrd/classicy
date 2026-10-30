---
id: 0055-l4q
title: 'E 3.1: Thumb art, tab outline and the icon halftone'
purpose: Point the slider thumb layers, the tab outline and the icon halftone at registered package art and delete the compile-time encode-color/theme-halftone helpers.
type: impr
status: in_progress
priority: "2"
effort: M
created: "2026-10-28T20:25:11.193Z"
updated: "2026-10-30T04:24:12.130Z"
started: "2026-10-30T04:24:07.441Z"
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
      - src/SystemFolder/SystemResources/Slider/ClassicySlider.scss
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss
      - src/Appearance/Platinum/styles/_mixins.scss
      - src/SystemFolder/SystemResources/Slider/ClassicySlider.art.test.ts
      - src/SystemFolder/SystemResources/Tabs/ClassicyTabs.art.test.ts
      - src/SystemFolder/SystemResources/Icon/ClassicyIcon.art.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0054-b5i", "depends"]
  plans:
    - ["0009-agy", "included", ["3.1"]]
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

# E 3.1: Thumb art, tab outline and the icon halftone

## Problem Statement

Audit §2.2: `ClassicySlider.scss:25,30,35` embeds the thumb border/rect SVGs with `stroke='black'` and pulls the external `slider-strikes.svg`; `ClassicyTabs.scss:26` embeds the tab outline; `ClassicyIcon.scss:57` and `ClassicyDesktopIcon.scss:55` call `theme-halftone(#000000, 7%)`, which bakes the color into a data URI at compile time through `encode-color` (`appearance.scss:225-237`).

This section (plan 0009-agy §3.1, umbrella 0002-ldj) makes the slider layers read `--classicy-art-slider-thumb`, `--classicy-art-slider-thumb-rect` and `--classicy-art-slider-strikes` (image layers, not masks: `::-webkit-slider-thumb` has no pseudo-elements and a mask would clip the body gradient), draws the tab outline from a masked `::before` under the button, turns the halftone into an intersected second mask layer over `--color-black`, and deletes `encode-color` and `theme-halftone`.

**Impact:** The Slider, Tabs, Icon and DesktopIcon stylesheets would keep data URIs and the compile-time halftone, failing the plan's `git grep 'data:image/svg|theme-halftone|encode-color'` acceptance criterion.

## Steps

### 1: Write the failing style tests

Each test compiles its component SCSS with `sass.compile` and the `rule()` helper:
```ts
// ClassicySlider.art.test.ts
it("thumb layers come from the package art variables", () => { expect(css).toMatch(/var\(--classicy-art-slider-thumb\) 0 0 \/ 100% 100% no-repeat/); expect(css).toMatch(/var\(--classicy-art-slider-strikes\) center 30% \/ 45% 35% no-repeat/); expect(css).toMatch(/var\(--classicy-art-slider-thumb-rect\) 0 0 \/ 100% 100% no-repeat/); expect(css).not.toMatch(/data:image|slider-strikes\.svg/); });
// ClassicyTabs.art.test.ts
it("tab outline is a masked pseudo under the button", () => { const b = rule(".classicyTabButtonWrapper::before"); expect(b["mask-image"]).toBe("var(--classicy-art-tab-outline)"); expect(b["mask-size"]).toBe("100% 100%"); expect(b["z-index"]).toBe("-1"); expect(rule(".classicyTabButtonWrapper")["background-image"]).toBeUndefined(); expect(css).not.toMatch(/data:image/); });
// ClassicyIcon.art.test.ts (compile both icon files)
it("halftone is an intersected second mask layer", () => { for (const sel of [".classicyIconMask", ".classicyDesktopIconMask"]) { const r = rule(sel); expect(r["mask-image"]).toBe("var(--classicy-icon-mask), var(--classicy-art-halftone)"); expect(r["mask-size"]).toBe("calc(100% - var(--window-border-size)), 7%"); expect(r["mask-composite"]).toBe("intersect"); expect(r["background-color"]).toBe("var(--color-black)"); expect(r["background-image"]).toBeUndefined(); } });
```
(Confirm the icon mask class names at `ClassicyIcon.scss:49` / `ClassicyDesktopIcon.scss:47` before writing the selectors.)

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/Slider/ClassicySlider.art.test.ts src/SystemFolder/SystemResources/Tabs/ClassicyTabs.art.test.ts src/SystemFolder/SystemResources/Icon/ClassicyIcon.art.test.ts` — Expected: FAIL.

### 3: Rewrite `ClassicySlider.scss` (lines 25, 30, 35 and every layer list that names them)

Replace the three `$_thumb-*` definitions with `var(--classicy-art-slider-thumb)`, `var(--classicy-art-slider-thumb-rect)`, `var(--classicy-art-slider-strikes)`; the mixin bodies at 39-47, 213-235, 265, 274 keep their layer order and geometry verbatim (`border 0 0 / 100% 100% no-repeat`, `strikes center 30% / 45% 35% no-repeat`, rect variants with strikes `center 50%`). Image layers, not masks: recoloring the stroke is deferred.

### 4: Rewrite `ClassicyTabs.scss:26,81-95`

Delete `$_tab-border-svg`; the wrapper gets `position: relative; isolation: isolate` and `&::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; background-color: var(--color-black); mask-image: var(--classicy-art-tab-outline); mask-size: 100% 100%; mask-repeat: no-repeat }`; the wrapper's `background-image/size/repeat` lines are deleted (the pseudo paints above the wrapper background and below the in-flow button, the same stacking the image layer had); the `:has(.classicyTabButtonActive)` fill rule stays on the wrapper.

### 5: Rewrite the halftone in `ClassicyIcon.scss:50-57` and `ClassicyDesktopIcon.scss:48-55`; delete `encode-color`/`theme-halftone` from `_mixins.scss`

Both icon rules become `mask-image: var(--classicy-icon-mask), var(--classicy-art-halftone); mask-mode: alpha, alpha; mask-size: calc(100% - var(--window-border-size)), 7%; mask-repeat: no-repeat, repeat; mask-composite: intersect; background-color: var(--color-black)` (black halftone dots clipped to the icon shape — the same pixels as a black halftone image clipped by the icon mask). `git grep -n 'theme-halftone\|encode-color' src` must return nothing afterwards.

### 6: Run tests to verify they pass, then parity

`pnpm exec vitest run src/SystemFolder/SystemResources/Slider src/SystemFolder/SystemResources/Tabs src/SystemFolder/SystemResources/Icon src/SystemFolder/SystemResources/Desktop` — Expected: PASS. Re-shoot `controls-slider--*`, `controls-tabs--*`, `controls-icon--*`, `desktop-desktopicon--*`, `desktop-desktop--*`; `compare -metric AE` → `0` for all.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src/SystemFolder/SystemResources/{Slider,Tabs,Icon,Desktop} src/Appearance/Platinum/styles && git commit -m "refactor(appearance): slider thumb, tab outline and icon halftone read package art"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: git grep -n 'data:image/svg\|theme-halftone\|encode-color' src --include='*.scss'  # expect no output
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Slider/ClassicySlider.art.test.ts src/SystemFolder/SystemResources/Tabs/ClassicyTabs.art.test.ts src/SystemFolder/SystemResources/Icon/ClassicyIcon.art.test.ts
- [ ] Slider thumb layers keep their positions and sizes and read `--classicy-art-slider-*`; the tab outline is a `z-index: -1` masked `::before`; both icon masks intersect `--classicy-art-halftone` at `7%` over `--color-black`.

## Files

- `src/SystemFolder/SystemResources/Slider/ClassicySlider.scss` - modify: thumb layers read art variables
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss` - modify: outline as masked ::before
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss` - modify: halftone as intersected mask layer
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss` - modify: same halftone change
- `src/Appearance/Platinum/styles/_mixins.scss` - modify: delete encode-color and theme-halftone
- `src/SystemFolder/SystemResources/Slider/ClassicySlider.art.test.ts` - create: slider layer assertions
- `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.art.test.ts` - create: tab outline assertions
- `src/SystemFolder/SystemResources/Icon/ClassicyIcon.art.test.ts` - create: halftone mask assertions

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.

### 2026-10-30T04:24:12.130Z - Started on feat/appearance-part-e-v2 (BASE 5a2fbe724). Scope narrowed by ruling G16: E 3.1 registers the halftone art only; the halftone readers and the platinum-halftone/encode-color deletion belong to G 1.2 (its own branch). The halftone parts of the acceptance criteria are verified once both E and G have landed.
