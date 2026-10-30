---
id: 0009-agy
title: 'Part E: Art extraction and title-bar unification'
type: impl
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T19:22:06.942Z"
updated: "2026-10-30T04:24:09.690Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  plans:
    - ["0002-ldj", "parent"]
    - ["0005-1b3", "depends"]
    - ["0007-1sl", "depends"]
    - ["0000-aud", "included"]
progress:
  "0":
    status: complete
  "1":
    status: pending
  "1.1":
    status: complete
  "2":
    status: pending
  "2.1":
    status: complete
  "2.2":
    status: in_progress
  "3":
    status: pending
  "3.1":
    status: in_progress
  "4":
    status: pending
  "4.1":
    status: complete
  "5":
    status: pending
  "5.1":
    status: pending
  "6":
    status: pending
  "6.1":
    status: pending
---

# Part E: Art extraction and title-bar unification

## Summary

**Goal:** Every piece of Platinum art that lives in SCSS data URIs, TS row arrays, Unicode text nodes or JS cursor/color choices moves into the Platinum package as registered system art, and both window chromes draw one shared title bar.

**Problem:** Audit §2.2: 13 base64 SVGs with baked hex in `assets.scss` (stripes, grip, dither, glyphs) plus Slider/Tabs inline SVGs and the compile-time `theme-halftone` cannot follow a runtime theme. §3.4: Control Strip and PopUpSlider pixel art are TS row arrays; menu check/dash, pop-up arrows, FileInput ✕ and two duplicated modifier-glyph tables are text nodes CSS cannot respell. §3.3: `ClassicyWindow.tsx:1833` picks a cursor asset in JS; the ColorPicker crayon carries literal rgba shades. §5: `ClassicyWindow` and `ClassicyWindowFrame` are two parallel title bars, so a package must skin two things.

**Approach:** Art becomes SVG and text data files under `src/Appearance/Platinum/assets/`, registered through Part C's `registerClassicySystemArt` and consumed as `mask-image: var(--classicy-art-<key>)` over a theme `background-color` (or `::before { content }` where a font glyph is the pixel-identical choice); `ClassicyPixelArt` and `ClassicyKbd` read rows and modifiers through shared tables; a new `ClassicyWindowTitleBar` renders the title bar for both window chromes.

---

# Part 2 — Implementation

**Architecture:** Implements audit §9 Phase 5 items 1–5 (D8) under umbrella plan 0002-ldj (Part E; depends on Parts B and C, runs beside F, G, H, I). It consumes Part B's `src/Appearance/Platinum/styles/_assets.scss` location and `classicy-package` scoping, and Part C's `registerClassicySystemArt` / `useClassicyAsset` / `useClassicyAssetVars` (`--classicy-art-<key>` as `url("…")`). It extends `ClassicySystemArtKey` with the keys listed under Interfaces (a contract gap reported to 0002-ldj). For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task; steps use checkbox syntax.

**Tech Stack:** TypeScript, React 19, SCSS (dart-sass), Vite asset queries (`?url`, `?raw`; `vite.config.ts:194-205` keeps them inlined), vitest/jsdom with `sass.compile` style tests (pattern: `ClassicyWindow.resizer.test.ts`), Biome, Storybook 10 + Playwright MCP + ImageMagick `compare`.

## Constraints

- Platinum renders pixel-identical (Storybook parity AE 0) except the three named changes: (a) `ClassicyWindowFrame` title bar adopts the window title bar (19 px, `--ui-font-size` text, left/right stripe bands) — stories `desktop-windowframe--*` differ only inside the title-bar band; (b) the zoom glyph's Illustrator rich-black `#231f20` becomes `var(--color-black)` — difference confined to the zoom box; (c) anti-aliasing at stripe row boundaries of the title-less center band (`classicyWindowTitleCenter`) may differ by ≤ 2 levels per channel because a mask composites dark-over-light instead of two abutting rects.
- Before each commit: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` (CI runs the same three).
- Library code logs through `classicyLog`, never `console.*`.
- `src/index.ts` is barrel-generated: run `pnpm exec barrelsby -c .ts-barrel.json` after adding a module; never hand-edit barrels.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- American English spelling in code, comments, docs and commit messages (color, gray, center, normalize).
- Masks must reproduce today's raster exactly: every mask SVG keeps the original `viewBox` and omits `width`/`height` (so `mask-size: auto` sizes it as `background-size: auto` did); every `background-*` longhand that applied to the old image is mirrored by the same `mask-*` longhand with the same value.
- Only art the Platinum package owns moves; `Extensions/ScreenSaver/savers/**`, `ClassicyTriangle`, `ProgressBar` chasing arrows and `LittleArrows` are out of scope (audit scope and Part C).
- Review focus: (1) a `mask-*` longhand missing its `background-*` twin shifts a stripe or glyph → 2.1 Step 5, 2.2 Step 6 parity; (2) the thumb of a `<input type=range>` has no pseudo-elements, so a mask there would clip the body gradient → 3.1 Step 3 keeps image layers; (3) a pixel-art key registered with a trailing newline renders one extra transparent row → 4.1 Step 2 test; (4) `ClassicyKbd` must keep `textContent` identical (`⇧⌘S`) while adding spans → 5.1 Step 2; (5) the shared title bar must emit byte-identical DOM for `ClassicyWindow` (the titlebar/hig/utility suites are the regression gate) → 6.1 Step 4.

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/Appearance/Platinum/assets/art/*.svg` | create | The 13 `assets.scss` images, Slider thumb/strikes, Tabs outline and the halftone as SVG files (masks use `fill="currentColor"`; grip and dither keep their grays). |
| `src/Appearance/Platinum/assets/art/platinumArt.ts` | create | `PLATINUM_SYSTEM_ART` map and the `registerClassicySystemArt("platinum", …)` call; imported by `src/Appearance/Platinum/index.ts`. |
| `src/Appearance/Platinum/assets/pixelart/*.txt` | create | Nine pixel-art glyphs, one token character per pixel, one row per line. |
| `src/Appearance/Platinum/styles/_assets.scss` | modify | Delete the 13 data-URI variables; declare the Platinum stripe/crayon custom properties on the package root. |
| `src/Appearance/Platinum/styles/_glyphs.scss` | create | Platinum `::before { content }` glyph choices for menu check/dash, pop-up arrows, placard arrow and FileInput remove glyph. |
| `src/Appearance/ClassicyAssetRegistry.ts` | modify | Extend `ClassicySystemArtKey` with Part E's keys (contract gap). |
| `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` | modify | Stripes, red stripes, utility texture, zoom/collapse glyphs, grip, resizer cursor; title-bar block becomes a mixin include. |
| `src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.tsx` | create | Shared title bar used by `ClassicyWindow` and `ClassicyWindowFrame`. |
| `src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.scss` | create | `classicy-window-title-bar` and `classicy-window-title-bar-stripes` mixins (the blocks moved out of `ClassicyWindow.scss`). |
| `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` | modify | Render `ClassicyWindowTitleBar`; drop the JS cursor choice on the resizer. |
| `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.tsx` | modify | Render `ClassicyWindowTitleBar`. |
| `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss` | modify | Include the title-bar mixins; delete the frame-only title rules. |
| `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss` | modify | Movable-alert red stripes via masks. |
| `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss` | modify | Submenu arrow mask; check gutter keeps its box, glyph comes from the package. |
| `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss` | modify | Pop-up indicator mask. |
| `src/SystemFolder/SystemResources/Slider/ClassicySlider.scss` | modify | Thumb border/rect/strikes read `--classicy-art-*` variables. |
| `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss` | modify | Tab outline drawn by a masked `::before`. |
| `src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss` | modify | Halftone as a second, intersected mask layer. |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss` | modify | Same halftone change. |
| `src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.tsx` | modify | `encode/decodeClassicyPixelArtRows`, `useClassicyPixelArtRows`, `art` prop. |
| `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripArt.ts` | delete | Rows move to the package. |
| `src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSliderArt.ts` | delete | Rows move to the package. |
| `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx` | modify | `<ClassicyPixelArt art="…">` instead of imported rows (lines 26-34, 174, 540, 552-553, 580-581, 604). |
| `src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider.tsx` | modify | Same (lines 11-13, 161-168). |
| `src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.stories.tsx` | modify | Stories read art by key (lines 3-14). |
| `src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.ts` | modify | `CLASSICY_MODIFIER_GLYPHS`, `ClassicyModifierName`, `keyboardShortcutModifiers`. |
| `src/SystemFolder/SystemResources/Kbd/ClassicyKbd.tsx` | modify | One span per modifier; shared table. |
| `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx` | modify | Check gutter carries `checked`/`mixed` state classes, no text (lines 382-385). |
| `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx` | modify | Drop `CHECKMARK` (lines 30, 590). |
| `src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.tsx` | modify | Drop `CHECKMARK` (lines 36, 472-473). |
| `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx` | modify | Arrow span has no text (line 523). |
| `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx` | modify | Arrow span has no text (lines 112-116). |
| `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx` | modify | Remove-button glyph span (lines 192-199). |
| `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayon.tsx` | modify | Shade/highlight fills read `--platinum-crayon-*` custom properties (lines 32-59). |
| `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorWheel.tsx` | modify | Crosshair stroke read from a custom property (line 73). |
| `src/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay.tsx` | modify | Caption colors exposed as custom properties, composed in SCSS (lines 81-86). |
| `assets/img/ui/slider-strikes.svg` | delete | Moved into the package. |

## Phase 0: Parity baseline and cap measurement

- [ ] Start Storybook (`pnpm storybook`, background; note the port). `curl -s http://localhost:<port>/index.json | python3 -I -c 'import json,sys; [print(k) for k in json.load(sys.stdin)["entries"]]'` and keep every id whose title starts with Desktop/Window, Desktop/WindowFrame, Desktop/Desktop, Desktop/MenuBar, Desktop/Menu, Desktop/ControlStrip, Desktop/DesktopIcon, Dialogs/Alert, Controls/PopUpMenu, Controls/ComboBox, Controls/BevelButton, Controls/Placard, Controls/FileInput, Controls/Kbd, Controls/Slider, Controls/Tabs, Controls/PopUpSlider, Controls/Icon, Controls/ColorPicker, System/PixelArt → `.playwright-mcp/parity/part-E/stories.txt`.
- [ ] Playwright MCP: for each id open `iframe.html?id=<id>&viewMode=story` at 1024×768, wait for networkidle + 500 ms, screenshot to `.playwright-mcp/parity/part-E/before/<id>.png`; `ls before | wc -l` equals the line count of stories.txt.
- [ ] Measurement gate for the stripe caps: on `desktop-window--default` run `browser_evaluate` with `(() => { const el = document.querySelector('.classicyWindowActive .classicyWindowTitleLeft'); return [getComputedStyle(el, '::before').height, getComputedStyle(el, '::after').height]; })()`. Record the result in `.playwright-mcp/parity/part-E/caps.txt`. Expected `["0px","0px"]` (a `content: " "` block collapses to zero height, so the cap art never paints); then 2.1 Step 4 deletes the cap rules and no cap art is registered. If either value is non-zero, 2.1 Step 4 instead renders caps as spans (fallback spelled out there).
- [ ] No commit.

**Validation:** `ls .playwright-mcp/parity/part-E/before | wc -l  # equals wc -l stories.txt; cat caps.txt`

## Phase 1: Platinum art files and registration

### 1.1: SVG files, keys and the Platinum registration

**Files:**
- Create: `src/Appearance/Platinum/assets/art/window-stripes.svg`
- Create: `src/Appearance/Platinum/assets/art/window-stripes-red.svg`
- Create: `src/Appearance/Platinum/assets/art/window-utility-shade.svg`
- Create: `src/Appearance/Platinum/assets/art/window-utility-highlight.svg`
- Create: `src/Appearance/Platinum/assets/art/window-grip.svg`
- Create: `src/Appearance/Platinum/assets/art/window-dither.svg`
- Create: `src/Appearance/Platinum/assets/art/zoom-glyph.svg`
- Create: `src/Appearance/Platinum/assets/art/collapse-glyph.svg`
- Create: `src/Appearance/Platinum/assets/art/submenu-arrow.svg`
- Create: `src/Appearance/Platinum/assets/art/popup-arrows.svg`
- Create: `src/Appearance/Platinum/assets/art/slider-thumb.svg`
- Create: `src/Appearance/Platinum/assets/art/slider-thumb-rect.svg`
- Create: `src/Appearance/Platinum/assets/art/slider-strikes.svg`
- Create: `src/Appearance/Platinum/assets/art/tab-outline.svg`
- Create: `src/Appearance/Platinum/assets/art/halftone.svg`
- Create: `src/Appearance/Platinum/assets/art/platinumArt.ts`
- Modify: `src/Appearance/ClassicyAssetRegistry.ts`
- Modify: `src/Appearance/Platinum/index.ts`
- Delete: `assets/img/ui/slider-strikes.svg`
- Test: `src/Appearance/Platinum/assets/art/platinumArt.test.ts`

**Depends on:** 0

**Interfaces:**
- Consumes: Part C: `registerClassicySystemArt(packageId, Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>)`, `resolveClassicyAsset("systemArt", key)`, `useClassicyAssetVars()`; Part B: `src/Appearance/Platinum/index.ts` side-effect module.
- Produces: `ClassicySystemArtKey` gains (contract gap, append to the union in `ClassicyAssetRegistry.ts`): `windowUtilityShade`, `windowUtilityHighlight`, `sliderThumbRect`, `halftone`, `controlStripTab`, `controlStripCollapse`, `controlStripScrollLeft`, `controlStripScrollRight`, `controlStripScrollLeftDisabled`, `controlStripScrollRightDisabled`, `controlStripModuleArrow`, `popUpSliderTrack`, `popUpSliderThumb`. `platinumArt.ts` exports `PLATINUM_SYSTEM_ART: Readonly<Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>>` built from `import x from "./<file>.svg?url"` and calls `registerClassicySystemArt("platinum", PLATINUM_SYSTEM_ART)` at module scope. Mapping and pinned geometry (decoded from today's `assets.scss`): `windowStripes` ← `$title-bar-center` → `window-stripes.svg` viewBox `0 0 12 12`, six `<rect y=1|3|5|7|9|11 width=12 height=1 fill="currentColor">` (the dark rows; light rows come from the element background); `windowStripesRed` ← `$title-bar-center-red` → viewBox `0 0 12 12`, dark rows at y=0,2,4,6,8,10 (the red art is phase-inverted: `#ef8c89` sits on even rows); `windowUtilityShade`/`windowUtilityHighlight` ← `$title-bar-utility` split into its two radial layers, each viewBox `0 0 4 4` with the original gradient (`cx=2.6 cy=2.6 r=1.5 stop-opacity .528→0` and `cx=1.3 cy=1.3 r=1.5 stop-opacity .848→0`) as the alpha of a `currentColor` fill; `windowGrip` ← `$resizer` verbatim (viewBox `0 0 10 10`, 67 rects in four grays `#797979 #ababab #ccc #fff` — kept as an image, see 2.2); `windowDither` ← `$corner-dither` verbatim (viewBox `0 0 7 7`, six grays — image, luminosity blend); `zoomGlyph` ← `$zoom` (viewBox `0 0 10 10`, two rects, `fill="currentColor"`); `collapseGlyph` ← `$collapse` (viewBox `0 0 10 10`, rects at y=4 and y=6, `currentColor`); `submenuArrow` ← `$triangle` (viewBox `0 0 8 14`, polygon `8 7 0 0 0 14 8 7`); `popupArrows` ← `$down-arrow` (viewBox `0 0 25 30`, the two polygons verbatim); `sliderThumb` ← `ClassicySlider.scss:25` (viewBox `0 0 21 21`, polygon stroke-width 4, `stroke="currentColor"`); `sliderThumbRect` ← `:35` (rect rx 3 stroke-width 4); `sliderStrikes` ← `assets/img/ui/slider-strikes.svg` moved verbatim (keeps its `#000000`/`#ffffff` two-tone strokes); `tabOutline` ← `ClassicyTabs.scss:26` (viewBox `0 0 75.31 23.44`, `preserveAspectRatio="none"`, path `M0,23.44 L10.32,0 H64.98 L75.31,23.44`, `stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"`); `halftone` ← `appearance.scss:233-237` (viewBox `0 0 2.8 2.8`, the two paths, `fill="currentColor"`). No file carries `width`/`height` attributes; none but `window-grip.svg`, `window-dither.svg` and `slider-strikes.svg` carries a hex fill. `menuCheck`, `menuDash`, `triangle`, `downArrow` are not registered by Platinum (5.1 uses `::before` content for those glyphs).

- [ ] **Step 1: Write the failing tests** — `platinumArt.test.ts` (top of file: `import "@/Appearance/Platinum";` so the side-effect registration runs):
```ts
it("registers every Part E key as an asset source", () => { for (const key of ["windowStripes","windowStripesRed","windowUtilityShade","windowUtilityHighlight","windowGrip","windowDither","zoomGlyph","collapseGlyph","submenuArrow","popupArrows","sliderThumb","sliderThumbRect","sliderStrikes","tabOutline","halftone"]) expect(isClassicyAssetSource(resolveClassicyAsset("systemArt", key, "platinum"))).toBe(true); });
it("exposes the art as --classicy-art-* url() variables", () => { const vars = renderHook(() => useClassicyAssetVars()).result.current; expect(vars["--classicy-art-window-stripes"]).toMatch(/^url\("/); expect(vars["--classicy-art-slider-thumb-rect"]).toMatch(/^url\("/); });
it("mask files carry no baked color and no intrinsic size", () => { for (const f of fs.readdirSync(dir).filter(n => n.endsWith(".svg") && !["window-grip.svg","window-dither.svg","slider-strikes.svg"].includes(n))) { const svg = fs.readFileSync(path.join(dir, f), "utf8"); expect(svg).not.toMatch(/#[0-9a-f]{3,6}/i); expect(svg).toMatch(/currentColor/); expect(svg).not.toMatch(/<svg[^>]*\s(width|height)=/); } });
it("pins the stripe geometry", () => { const s = read("window-stripes.svg"); expect(s).toContain('viewBox="0 0 12 12"'); expect(s.match(/<rect /g)).toHaveLength(6); expect(s).toContain('y="1"'); const r = read("window-stripes-red.svg"); expect(r.match(/<rect /g)).toHaveLength(6); expect(r).toContain('y="0"'); });
```
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL (module `platinumArt.ts` not found / keys resolve to undefined). — `pnpm exec vitest run src/Appearance/Platinum/assets/art/platinumArt.test.ts`
- [ ] **Step 3: Decode the 13 data URIs into files** — `python3 -I` script: read `src/Appearance/Platinum/styles/_assets.scss`, base64/percent-decode each `$name: url(...)`, write the SVG under the file names in Interfaces, then edit by hand: strip XML prolog/Illustrator comments/`id`s, replace `style="fill:#…"` and `class="cls-*"` with `fill="currentColor"` for the mask files, split `$title-bar-utility` into its shade and highlight layers, convert the two red stripe files to the dark-rows-only form. Create `slider-thumb.svg`, `slider-thumb-rect.svg`, `tab-outline.svg`, `halftone.svg` from the inline SVGs at `ClassicySlider.scss:25,35`, `ClassicyTabs.scss:26`, `appearance.scss:235` (post-B: `_mixins.scss`); `git mv assets/img/ui/slider-strikes.svg src/Appearance/Platinum/assets/art/slider-strikes.svg`.
- [ ] **Step 4: Extend `ClassicySystemArtKey` in `src/Appearance/ClassicyAssetRegistry.ts`** — Append the 13 keys from Interfaces to the union; no other change to Part C's file.
- [ ] **Step 5: Implement `PLATINUM_SYSTEM_ART` and the registration in `platinumArt.ts`; import it from `src/Appearance/Platinum/index.ts`** — `import windowStripes from "./window-stripes.svg?url"` for each file (`vite/client` types `*?url` as string; `vite.config.ts:194-205` keeps the query un-externalized). Pixel-art keys are added by 4.1. Add `src/Appearance/Platinum/assets/art/platinumArt.ts` to `package.json` `sideEffects` only if `src/Appearance/Platinum/index.ts` is not already listed there by Part B.
- [ ] **Step 6: Run tests to verify they pass** — Expected: PASS (4 tests). — `pnpm exec vitest run src/Appearance/Platinum`
- [ ] **Step 7: Lint, type-check, commit** — git add src/Appearance assets/img/ui package.json && git commit -m "feat(appearance): register Platinum window, menu, slider and tab art as system art files" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/Platinum/assets/art/platinumArt.test.ts`

## Phase 2: Window chrome consumers

### 2.1: Title-bar stripes, red stripes and the utility texture

**Files:**
- Modify: `src/Appearance/Platinum/styles/_assets.scss`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss`
- Modify: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.art.test.ts`

**Depends on:** 1.1

**Interfaces:**
- Consumes: `--classicy-art-window-stripes`, `--classicy-art-window-stripes-red`, `--classicy-art-window-utility-shade`, `--classicy-art-window-utility-highlight` (1.1). Today's consumers (post-B they live wherever B moved the rule; locate each with `git grep -n 'assets\.\$'`): `ClassicyWindow.scss:101,106-107` (active center/left/right, `background-size: auto 99.8%` on left/right), `:117,126` (caps), `:202-203,208,211,215` (red), `:680-682` (utility, `background-size: 4px 3px`), `ClassicyWindowFrame.scss:19-20`, `ClassicyAlert.scss:92-93,98,101,105`.
- Produces: Platinum package root custom properties in `_assets.scss` (inside the `classicy-package("platinum")` scope): `--platinum-stripe-light: var(--color-white)`, `--platinum-stripe-dark: #787878`, `--platinum-stripe-red-light: #f9dada`, `--platinum-stripe-red-dark: #ef8c89` (the HIG stripe grays are not theme tokens; Part G may re-derive them). Stripe pattern, applied identically to `.classicyWindowTitleCenter`, `.classicyWindowTitleLeft`, `.classicyWindowTitleRight` under the active/red/frame/alert selectors: the element gets `position: relative; background-color: var(--platinum-stripe-light)` and `&::before { content: ""; position: absolute; inset: 0; pointer-events: none; background-color: var(--platinum-stripe-dark); mask-image: var(--classicy-art-window-stripes); mask-repeat: repeat; mask-position: 0 0; mask-size: <the value the old background-size had: auto 100% for center, auto 99.8% for left/right, auto where none was set> }`. Red variants swap the two custom properties and the mask key. Utility: `.classicyWindowUtility .classicyWindowTitleCenter { background-color: var(--color-system-03); &::before { mask-image: var(--classicy-art-window-utility-shade); background-color: var(--color-black) } &::after { mask-image: var(--classicy-art-window-utility-highlight); background-color: var(--color-white) } }` both with `mask-repeat: repeat; mask-size: 4px 3px; inset: 0; position: absolute`, replacing lines 680-682 and the `content: none` at 684-687.

- [ ] **Step 1: Write the failing style tests** — `ClassicyWindow.art.test.ts` compiles `ClassicyWindow.scss`, `ClassicyWindowFrame.scss` and `ClassicyAlert.scss` with `sass.compile` (the `rule()` helper from `ClassicyWindow.resizer.test.ts:33-60`):
```ts
it("draws the active stripes as a masked dark layer over a light ground", () => { const el = rule(".classicyWindowActive .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter"); expect(el["background-color"]).toBe("var(--platinum-stripe-light)"); const before = rule(".classicyWindowActive .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter::before"); expect(before["mask-image"]).toBe("var(--classicy-art-window-stripes)"); expect(before["mask-size"]).toBe("auto 100%"); expect(before["background-color"]).toBe("var(--platinum-stripe-dark)"); });
it("keeps the 99.8% stripe scale on the side bands", () => { expect(rule(".classicyWindowActive .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleLeft::before")["mask-size"]).toBe("auto 99.8%"); });
it("red windows use the red mask and colors", () => { const b = rule(".classicyWindowRed .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleCenter::before"); expect(b["mask-image"]).toBe("var(--classicy-art-window-stripes-red)"); expect(b["background-color"]).toBe("var(--platinum-stripe-red-dark)"); });
it("utility texture is two masked radial layers at 4px 3px", () => { const s = rule(".classicyWindowUtility .classicyWindowTitleCenter::before"); expect(s["mask-image"]).toBe("var(--classicy-art-window-utility-shade)"); expect(s["mask-size"]).toBe("4px 3px"); expect(rule(".classicyWindowUtility .classicyWindowTitleCenter::after")["mask-image"]).toBe("var(--classicy-art-window-utility-highlight)"); });
it("no stylesheet embeds stripe art any more", () => { for (const css of [windowCss, frameCss, alertCss]) expect(css).not.toMatch(/data:image\/svg\+xml/); });
```
Adjust the selector strings to the exact nesting the compiled output prints (Part A reordered the file); the assertions on values are the contract.
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL (`mask-image` undefined, data URIs present). — `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.art.test.ts`
- [ ] **Step 3: Declare the Platinum stripe custom properties in `src/Appearance/Platinum/styles/_assets.scss`** — Replace the 13 `$…: url(...)` variables with the four `--platinum-stripe-*` declarations on the package root (the block `classicy-package("platinum")` already wraps). Keep a comment naming HIGOS8 Figure 3-1 and the original hex values.
- [ ] **Step 4: Rewrite the stripe consumers (Window active 101-129, red 202-216, WindowFrame 19-20, Alert 92-106)** — Apply the pattern from Interfaces. Caps: per the Phase 0 gate result `["0px","0px"]`, delete the `&:after`/`&:before` cap blocks (Window 109-128, 210-216, Alert 100-106) outright — they never painted. Fallback (only if the gate measured a non-zero height): keep the pseudo boxes with their exact `position/top/right/left/float/width/display` declarations, give each `background-color: var(--platinum-stripe-light)` plus `mask-image: var(--classicy-art-window-stripes-cap-left|right)` and register `windowStripesCapLeft/Right` (+ `Red`) masks of the opaque pixels (3×12: left cap even rows x0-2 and odd rows x1-2; right cap even rows x0-1 and odd rows x0-2) in 1.1's map; the dark rows then come from a `repeating-linear-gradient(to bottom, transparent 0 1px, var(--platinum-stripe-dark) 1px 2px)` background-image on the same pseudo.
- [ ] **Step 5: Rewrite the utility texture (Window 677-688)** — Per Interfaces. Remove the `!important`s only if Part A left them; never add new ones.
- [ ] **Step 6: Run tests, then parity for the window stories** — Expected: PASS. Then re-shoot `desktop-window--*`, `dialogs-alert--*`, `desktop-windowframe--*` into `.playwright-mcp/parity/part-E/after/` and `compare -metric AE before/<id>.png after/<id>.png null:` → `0` for every window and alert story. WindowFrame stories may differ (named change (a)) only once 6.1 lands; at this step they must still be `0`. A non-zero elsewhere means a `mask-*` longhand does not mirror its old `background-*` twin — fix the SCSS, never the screenshot. — `pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Alert`
- [ ] **Step 7: Lint, type-check, commit** — git add src/Appearance/Platinum/styles src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Alert && git commit -m "refactor(window): draw title-bar stripes and utility texture from masked package art" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.art.test.ts`

### 2.2: Control-box glyphs, dither, grip, menu triangle, pop-up arrows and the resizer cursor

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`
- Modify: `src/Appearance/Platinum/styles/_mixins.scss`
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss`
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.art.test.ts`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.resizer.test.ts`
- Test: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.art.test.ts`

**Depends on:** 2.1

**Interfaces:**
- Consumes: `--classicy-art-zoom-glyph`, `--classicy-art-collapse-glyph`, `--classicy-art-window-dither`, `--classicy-art-window-grip`, `--classicy-art-submenu-arrow`, `--classicy-art-popup-arrows` (1.1); Part C's `--classicy-cursor-resize-lr`. Today's sites: `ClassicyWindow.scss:342` (collapse, `opacity .65`, `background-position: top left`), `:350-352` (zoom, same plus `margin-top`), `:394-399` (grip: `no-repeat`, `center`, `background-size: calc(var(--window-control-size) - (var(--window-border-size) * 2))`), `appearance.scss:128-132` (dither in `platinumWindowControlBox` `&:before`: `no-repeat`, `cover`, `mix-blend-mode: luminosity`, `opacity: .25`; post-B in `_mixins.scss` as `platinum-window-control-box`), `ClassicyMenu.scss:227-229` (`1em` box, `no-repeat`, `right center`), `ClassicyPopUpMenu.scss:116-119` (`no-repeat`, `center`, `45%`), `ClassicyWindow.tsx:1833-1834` (`setCursor("resizeLr")` on the resizer).
- Produces: Glyph pseudo-elements: `background-color: var(--color-black); mask-image: var(--classicy-art-<key>); mask-repeat: no-repeat; mask-position: <old background-position>` (collapse/zoom keep `opacity: .65` — named change (b) applies to zoom). Grip and dither stay images: `background-image: var(--classicy-art-window-grip)` / `var(--classicy-art-window-dither)` with every other longhand unchanged (a four-gray grip and a six-gray luminosity dither have no single-color mask equivalent; see nextSteps). Resizer cursor moves to CSS: `.classicyWindowResizer { cursor: var(--classicy-cursor-resize-lr), auto; }` and `ClassicyWindow.tsx` loses the `onMouseEnter`/`onMouseLeave` pair (and the `useClassicyCursor` call/import when `setCursor` has no other use in the file).

- [ ] **Step 1: Write the failing tests** — Append to `ClassicyWindow.art.test.ts`:
```ts
it("zoom and collapse glyphs are masks over --color-black", () => { const z = rule("<zoom box selector>::after"); expect(z["mask-image"]).toBe("var(--classicy-art-zoom-glyph)"); expect(z["mask-position"]).toBe("top left"); expect(z["background-color"]).toBe("var(--color-black)"); expect(z.opacity).toBe("0.65"); expect(rule("<collapse box selector>::after")["mask-image"]).toBe("var(--classicy-art-collapse-glyph)"); });
it("grip and dither are package images with unchanged geometry", () => { const g = rule("<resizer selector>"); expect(g["background-image"]).toBe("var(--classicy-art-window-grip)"); expect(g["background-size"]).toBe("calc(var(--window-control-size) - (var(--window-border-size) * 2))"); });
```
In `ClassicyWindow.resizer.test.ts` add `it("asks for the package's horizontal resize cursor", () => { expect(rule(<the resizer selector line 136 uses>).cursor).toBe("var(--classicy-cursor-resize-lr), auto"); })`. `ClassicyMenu.art.test.ts` (compile `ClassicyMenu.scss` and `ClassicyPopUpMenu.scss`): `expect(rule(".classicyMenuItemChildMenuIndicator::after")["mask-image"]).toBe("var(--classicy-art-submenu-arrow)")`, `mask-position` `right center`; `expect(rule(".classicyPopUpMenuIndicator")["mask-image"]).toBe("var(--classicy-art-popup-arrows)")`, `mask-size` `45%`; both css strings contain no `data:image`.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL on the new cases only. — `pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Menu/ClassicyMenu.art.test.ts`
- [ ] **Step 3: Rewrite the six SCSS sites per Interfaces** — Zoom/collapse (`ClassicyWindow.scss:340-354`), grip (`:394`), dither (`_mixins.scss` `platinum-window-control-box` `&:before`), submenu arrow (`ClassicyMenu.scss:227`), pop-up indicator (`ClassicyPopUpMenu.scss:116`); delete every `@use` of the old assets module these files still carry; add the resizer `cursor` beside `:374-400`.
- [ ] **Step 4: Delete the JS cursor choice in `ClassicyWindow.tsx:1833-1834`** — Remove the two handlers; `grep -n setCursor src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` → if empty, remove the `useClassicyCursor` call and import.
- [ ] **Step 5: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Menu src/SystemFolder/SystemResources/PopUpMenu`
- [ ] **Step 6: Parity** — Re-shoot `desktop-window--*`, `desktop-menu--*`, `controls-popupmenu--*`, `desktop-windowframe--*`; `compare -metric AE` → `0` everywhere except `desktop-window--default` / other zoomable window stories, where the only permitted difference is inside the zoom box (verify with `compare before after diff.png` and inspect: the highlighted pixels lie within the 12×12 zoom box).
- [ ] **Step 7: Lint, type-check, commit** — git add -A src/SystemFolder/SystemResources/{Window,Menu,PopUpMenu} src/Appearance/Platinum/styles && git commit -m "refactor(appearance): window glyphs, grip, dither and menu arrows read registered package art" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `git grep -n 'data:image/svg' src/SystemFolder --include='*.scss' -- ':!src/SystemFolder/SystemResources/Slider' ':!src/SystemFolder/SystemResources/Tabs' ':!src/SystemFolder/SystemResources/Icon' ':!src/SystemFolder/SystemResources/Desktop'  # expect no output`

## Phase 3: Slider, Tabs and halftone

### 3.1: Thumb art, tab outline and the icon halftone

**Files:**
- Modify: `src/SystemFolder/SystemResources/Slider/ClassicySlider.scss`
- Modify: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss`
- Modify: `src/SystemFolder/SystemResources/Icon/ClassicyIcon.scss`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss`
- Modify: `src/Appearance/Platinum/styles/_mixins.scss`
- Test: `src/SystemFolder/SystemResources/Slider/ClassicySlider.art.test.ts`
- Test: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.art.test.ts`
- Test: `src/SystemFolder/SystemResources/Icon/ClassicyIcon.art.test.ts`

**Depends on:** 1.1

**Interfaces:**
- Consumes: `--classicy-art-slider-thumb`, `--classicy-art-slider-thumb-rect`, `--classicy-art-slider-strikes`, `--classicy-art-tab-outline`, `--classicy-art-halftone` (1.1). Sites: `ClassicySlider.scss:25,30,35` (variables), `:39-47` (`thumb-appearance` mixin layers `border 0 0 / 100% 100% no-repeat`, `strikes center 30% / 45% 35% no-repeat`, body gradient), `:213-235` (rect variants, strikes `center 50%`), `:265,274`; `ClassicyTabs.scss:26` and `:81-95` (`.classicyTabButtonWrapper`: `clip-path: $tab-shape`, `background-image` outline, `background-size: 100% 100%`, `no-repeat`, `background-color: var(--color-system-04)`, active `system-02`); `ClassicyIcon.scss:50-57` and `ClassicyDesktopIcon.scss:48-55` (`mask-image: var(--classicy-icon-mask)`, `mask-mode: alpha`, `mask-size: calc(100% - var(--window-border-size))`, `no-repeat`, then `theme-halftone(#000000, 7%)` = `background-image: url(halftone black)`, `repeat`, `background-size: 7%`).
- Produces: Slider: `$_thumb-border-svg` → `var(--classicy-art-slider-thumb)`, `$_thumb-rect-svg` → `var(--classicy-art-slider-thumb-rect)`, `$_thumb-strikes-svg` → `var(--classicy-art-slider-strikes)`, every layer position/size unchanged — image layers, not masks, because `::-webkit-slider-thumb` has no pseudo-elements and a mask would clip the body gradient (recoloring the stroke is deferred, see nextSteps). Tabs: the wrapper gets `position: relative; isolation: isolate` and `&::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; background-color: var(--color-black); mask-image: var(--classicy-art-tab-outline); mask-size: 100% 100%; mask-repeat: no-repeat }`; the wrapper's `background-image/size/repeat` lines are deleted (the pseudo paints above the wrapper background and below the in-flow button, the same stacking the image layer had). Halftone: the two icon rules become `mask-image: var(--classicy-icon-mask), var(--classicy-art-halftone); mask-mode: alpha, alpha; mask-size: calc(100% - var(--window-border-size)), 7%; mask-repeat: no-repeat, repeat; mask-composite: intersect; background-color: var(--color-black)` (black halftone dots clipped to the icon shape — the same pixels as a black halftone image clipped by the icon mask). `encode-color` and `theme-halftone` are deleted from `_mixins.scss`.

- [ ] **Step 1: Write the failing style tests** — Each test compiles its component SCSS with `sass.compile` and the `rule()` helper:
```ts
// ClassicySlider.art.test.ts
it("thumb layers come from the package art variables", () => { expect(css).toMatch(/var\(--classicy-art-slider-thumb\) 0 0 \/ 100% 100% no-repeat/); expect(css).toMatch(/var\(--classicy-art-slider-strikes\) center 30% \/ 45% 35% no-repeat/); expect(css).toMatch(/var\(--classicy-art-slider-thumb-rect\) 0 0 \/ 100% 100% no-repeat/); expect(css).not.toMatch(/data:image|slider-strikes\.svg/); });
// ClassicyTabs.art.test.ts
it("tab outline is a masked pseudo under the button", () => { const b = rule(".classicyTabButtonWrapper::before"); expect(b["mask-image"]).toBe("var(--classicy-art-tab-outline)"); expect(b["mask-size"]).toBe("100% 100%"); expect(b["z-index"]).toBe("-1"); expect(rule(".classicyTabButtonWrapper")["background-image"]).toBeUndefined(); expect(css).not.toMatch(/data:image/); });
// ClassicyIcon.art.test.ts (compile both icon files)
it("halftone is an intersected second mask layer", () => { for (const sel of [".classicyIconMask", ".classicyDesktopIconMask"]) { const r = rule(sel); expect(r["mask-image"]).toBe("var(--classicy-icon-mask), var(--classicy-art-halftone)"); expect(r["mask-size"]).toBe("calc(100% - var(--window-border-size)), 7%"); expect(r["mask-composite"]).toBe("intersect"); expect(r["background-color"]).toBe("var(--color-black)"); expect(r["background-image"]).toBeUndefined(); } });
```
(Confirm the icon mask class names at `ClassicyIcon.scss:49` / `ClassicyDesktopIcon.scss:47` before writing the selectors.)
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL. — `pnpm exec vitest run src/SystemFolder/SystemResources/Slider/ClassicySlider.art.test.ts src/SystemFolder/SystemResources/Tabs/ClassicyTabs.art.test.ts src/SystemFolder/SystemResources/Icon/ClassicyIcon.art.test.ts`
- [ ] **Step 3: Rewrite `ClassicySlider.scss` (lines 25, 30, 35 and every layer list that names them)** — Replace the three `$_thumb-*` definitions with the `var()` references; the mixin bodies at 39-47, 213-235, 265, 274 keep their layer order and geometry verbatim.
- [ ] **Step 4: Rewrite `ClassicyTabs.scss:26,81-95` per Interfaces** — Delete `$_tab-border-svg`; the `:has(.classicyTabButtonActive)` fill rule stays on the wrapper.
- [ ] **Step 5: Rewrite the halftone in `ClassicyIcon.scss:50-57` and `ClassicyDesktopIcon.scss:48-55`; delete `encode-color`/`theme-halftone` from `_mixins.scss`** — `git grep -n 'theme-halftone\|encode-color' src` must return nothing afterwards.
- [ ] **Step 6: Run tests to verify they pass, then parity** — Expected: PASS. Re-shoot `controls-slider--*`, `controls-tabs--*`, `controls-icon--*`, `desktop-desktopicon--*`, `desktop-desktop--*`; `compare -metric AE` → `0` for all. — `pnpm exec vitest run src/SystemFolder/SystemResources/Slider src/SystemFolder/SystemResources/Tabs src/SystemFolder/SystemResources/Icon src/SystemFolder/SystemResources/Desktop`
- [ ] **Step 7: Lint, type-check, commit** — git add -A src/SystemFolder/SystemResources/{Slider,Tabs,Icon,Desktop} src/Appearance/Platinum/styles && git commit -m "refactor(appearance): slider thumb, tab outline and icon halftone read package art" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `git grep -n 'data:image/svg\|theme-halftone\|encode-color' src --include='*.scss'  # expect no output`

## Phase 4: Pixel art data files

### 4.1: Control Strip and PopUpSlider glyphs as package data

**Files:**
- Create: `src/Appearance/Platinum/assets/pixelart/control-strip-tab.txt`
- Create: `src/Appearance/Platinum/assets/pixelart/control-strip-collapse.txt`
- Create: `src/Appearance/Platinum/assets/pixelart/control-strip-scroll-left.txt`
- Create: `src/Appearance/Platinum/assets/pixelart/control-strip-scroll-right.txt`
- Create: `src/Appearance/Platinum/assets/pixelart/control-strip-scroll-left-disabled.txt`
- Create: `src/Appearance/Platinum/assets/pixelart/control-strip-scroll-right-disabled.txt`
- Create: `src/Appearance/Platinum/assets/pixelart/control-strip-module-arrow.txt`
- Create: `src/Appearance/Platinum/assets/pixelart/popup-slider-track.txt`
- Create: `src/Appearance/Platinum/assets/pixelart/popup-slider-thumb.txt`
- Create: `src/Appearance/Platinum/assets/pixelart/platinumPixelArt.ts`
- Modify: `src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.tsx`
- Modify: `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx`
- Modify: `src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider.tsx`
- Modify: `src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.stories.tsx`
- Modify: `src/Appearance/Platinum/assets/art/platinumArt.ts`
- Delete: `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripArt.ts`
- Delete: `src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSliderArt.ts`
- Test: `src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.test.tsx`
- Test: `src/Appearance/Platinum/assets/pixelart/platinumPixelArt.test.ts`

**Depends on:** 1.1

**Interfaces:**
- Consumes: `useClassicyAsset("systemArt", key)`, `resolveClassicyAsset`, `registerClassicySystemArt` (Part C); `ClassicyPixelArtRows` (`ClassicyPixelArt.tsx:10`); today's rows at `ClassicyControlStripArt.ts:6-111` (7 glyphs: tab 17×24, collapse 8×8, four scroll arrows 8×10, module arrow 4×8) and `ClassicyPopUpSliderArt.ts:6-89` (track 10×68, thumb 15×10).
- Produces: In `ClassicyPixelArt.tsx`: `export const CLASSICY_PIXEL_ART_MIME = "text/x-classicy-pixel-art"`; `export const encodeClassicyPixelArtRows = (rows: ClassicyPixelArtRows): ClassicyAssetSource` → `` `data:${CLASSICY_PIXEL_ART_MIME},${encodeURIComponent(rows.join("\n"))}` ``; `export const decodeClassicyPixelArtRows = (src: ClassicyAssetSource | undefined): ClassicyPixelArtRows` → `[]` unless `src` starts with `data:text/x-classicy-pixel-art,`, else `decodeURIComponent(payload).split("\n")` with a trailing empty row dropped; `export const useClassicyPixelArtRows = (key: ClassicySystemArtKey): ClassicyPixelArtRows` → `decodeClassicyPixelArtRows(useClassicyAsset("systemArt", key))`; props become `{ rows: ClassicyPixelArtRows } | { art: ClassicySystemArtKey }` (exactly one; `art` resolves through the hook). Package: each `.txt` is the rows verbatim, one row per line, no trailing newline; `platinumPixelArt.ts` imports them with `?raw` (`vite/client` types it `string`) and exports `PLATINUM_PIXEL_ART: Readonly<Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>>` = `{ controlStripTab: encode(rows(tab)), controlStripCollapse, controlStripScrollLeft, controlStripScrollRight, controlStripScrollLeftDisabled, controlStripScrollRightDisabled, controlStripModuleArrow, popUpSliderTrack, popUpSliderThumb }` where `rows = (text) => text.replace(/\r/g, "").split("\n")`; `platinumArt.ts` spreads it into `PLATINUM_SYSTEM_ART`.

- [ ] **Step 1: Write the failing tests** — `ClassicyPixelArt.test.tsx` additions:
```ts
it("encode/decode round-trips rows", () => { const rows = ["KKKK", "K33K", "K..K"]; expect(decodeClassicyPixelArtRows(encodeClassicyPixelArtRows(rows))).toEqual(rows); });
it("decode rejects foreign sources and drops a trailing empty row", () => { expect(decodeClassicyPixelArtRows("data:image/png;base64,AAAA")).toEqual([]); expect(decodeClassicyPixelArtRows(undefined)).toEqual([]); expect(decodeClassicyPixelArtRows("data:text/x-classicy-pixel-art,KK%0AKK%0A")).toEqual(["KK", "KK"]); });
it("renders registered art by key", () => { registerClassicySystemArt("platinum", { controlStripModuleArrow: encodeClassicyPixelArtRows(["K.", "KK"]) }); const { container } = render(<ClassicyPixelArt art="controlStripModuleArrow" />); expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 2 2"); expect(container.querySelectorAll("rect")).toHaveLength(2); });
```
`platinumPixelArt.test.ts`: `it("registers the nine Platinum glyphs at their HIG sizes", …)` — after `import "@/Appearance/Platinum"`, `decodeClassicyPixelArtRows(resolveClassicyAsset("systemArt", key, "platinum"))` has `[rows.length, rows[0].length]` equal to tab `[24,17]`, collapse `[8,8]`, each scroll arrow `[10,8]`, module arrow `[8,4]`, track `[68,10]`, thumb `[10,15]`, and every row has the first row's length.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL (exports missing). — `pnpm exec vitest run src/SystemFolder/SystemResources/PixelArt src/Appearance/Platinum/assets/pixelart`
- [ ] **Step 3: Write the nine `.txt` files from the row arrays** — `python3 -I` script reading the two `*Art.ts` files with a regex over the quoted rows; write each file without a trailing newline (`printf`, not `echo`); verify `for f in src/Appearance/Platinum/assets/pixelart/*.txt; do tail -c1 "$f" | xxd | grep -q 0a && echo "trailing newline: $f"; done` prints nothing.
- [ ] **Step 4: Implement `encodeClassicyPixelArtRows`, `decodeClassicyPixelArtRows`, `useClassicyPixelArtRows` and the `art` prop in `ClassicyPixelArt.tsx`; implement `platinumPixelArt.ts`; spread into `PLATINUM_SYSTEM_ART`** — The component keeps rendering `rows` when given; with `art` it calls the hook (hooks are unconditional: always call `useClassicyAsset("systemArt", art ?? "controlStripTab")` and ignore the result when `rows` is set). Add `src/Appearance/Platinum/assets/pixelart/platinumPixelArt.ts` to the `sideEffects` list only if it registers on its own; preferred: it only exports and `platinumArt.ts` registers everything.
- [ ] **Step 5: Point the consumers at keys and delete the row modules** — `ClassicyControlStrip.tsx:26-34` import removed; `:174` `<ClassicyPixelArt art="controlStripModuleArrow" />`; `:540` `art="controlStripCollapse"`; `:552-553` `art={canScrollLeft ? "controlStripScrollLeft" : "controlStripScrollLeftDisabled"}` (same shape at `:580-581`); `:604` `art="controlStripTab"`. `ClassicyPopUpSlider.tsx:11-13` import removed; `:161-168` `art="popUpSliderTrack"` / `art="popUpSliderThumb"`. `ClassicyPixelArt.stories.tsx:3-14` import removed; stories pass `art` keys (the `CustomArt` story keeps `rows`). `git rm` the two `*Art.ts` modules; `pnpm exec barrelsby -c .ts-barrel.json`.
- [ ] **Step 6: Run tests to verify they pass, then parity** — Expected: PASS. Re-shoot `desktop-controlstrip--*`, `controls-popupslider--*`, `system-pixelart--*`; `compare -metric AE` → `0`. — `pnpm exec vitest run src/SystemFolder/SystemResources/PixelArt src/SystemFolder/SystemResources/ControlStrip src/SystemFolder/SystemResources/PopUpSlider src/Appearance/Platinum`
- [ ] **Step 7: Lint, type-check, commit** — git add -A src/Appearance/Platinum/assets src/SystemFolder/SystemResources/{PixelArt,ControlStrip,PopUpSlider} src/index.ts && git commit -m "refactor(pixelart): Control Strip and pop-up slider glyphs become Platinum data files" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/PixelArt src/Appearance/Platinum/assets/pixelart`

## Phase 5: Text-node glyphs, modifier table, data-driven colors

### 5.1: Unicode glyphs to CSS content, one modifier table, crayon and caption colors as custom properties

**Files:**
- Create: `src/Appearance/Platinum/styles/_glyphs.scss`
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.tsx`
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss`
- Modify: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.tsx`
- Modify: `src/SystemFolder/SystemResources/ComboBox/ClassicyComboBox.tsx`
- Modify: `src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.tsx`
- Modify: `src/SystemFolder/SystemResources/Placard/ClassicyPlacard.tsx`
- Modify: `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx`
- Modify: `src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.scss`
- Modify: `src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.ts`
- Modify: `src/SystemFolder/SystemResources/Kbd/ClassicyKbd.tsx`
- Modify: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerCrayon.tsx`
- Modify: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorWheel.tsx`
- Modify: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.scss`
- Modify: `src/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay.tsx`
- Modify: `src/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay.scss`
- Modify: `src/Appearance/Platinum/styles/_assets.scss`
- Test: `src/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.test.tsx`
- Test: `src/SystemFolder/SystemResources/Menu/ClassicyMenu.glyphs.test.tsx`
- Test: `src/SystemFolder/SystemResources/Kbd/ClassicyKbd.test.tsx`
- Test: `src/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut.test.ts`
- Test: `src/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker.test.tsx`
- Test: `src/SystemFolder/SystemResources/QuickTime/QuickTimeCaptionsOverlay.test.tsx`

**Depends on:** 1.1

**Interfaces:**
- Consumes: Part A: `CLASSICY_STATE.checked`, `CLASSICY_STATE.mixed`, `classicyStateClasses`; Part B: `classicy-package("platinum")` wrapper and the Platinum SCSS entry that concatenates `styles/*.scss`. Sites: `ClassicyMenu.tsx:382-385` (`–`/`✓` text in `.classicyMenuItemCheck`), `ClassicyPopUpMenu.tsx:30,590` and `ClassicyComboBox.tsx:36,472-473` (`CHECKMARK` in `.classicyPopUpMenuCheck`), `ClassicyBevelButton.tsx:523` (`▸`/`▾` in `.classicyBevelButtonArrow` + `…Horizontal|Vertical`), `ClassicyPlacard.tsx:112-116` (`▾` in `.classicyPlacardArrow`), `ClassicyFileInput.tsx:192-199` (`✕` as a `ClassicyButton` child with `aria-label`), `ClassicyKbd.tsx:6-11,36-45,94-98` and `ClassicyKeyboardShortcut.ts:24-29,81-89,296-306` (duplicate `MODIFIER_GLYPHS`), `ClassicyColorPickerCrayon.tsx:32-59` (eleven `rgba(...)` literals), `ClassicyColorWheel.tsx:73` (`ctx.strokeStyle = "#ffffff"`), `QuickTimeCaptionsOverlay.tsx:81-86` (inline `color`/`backgroundColor` composed in JS).
- Produces: Glyph choice is look, so it lives in the Platinum package: `_glyphs.scss` (scoped by `classicy-package`) declares `.classicyMenuItemCheck.checked::before { content: "✓" }`, `.classicyMenuItemCheck.mixed::before { content: "–" }`, `.classicyPopUpMenuCheck.checked::before { content: "✓" }`, `.classicyBevelButtonArrowHorizontal::before { content: "▸" }`, `.classicyBevelButtonArrowVertical::before, .classicyPlacardArrow::before { content: "▾" }`, `.classicyFileInputRemoveGlyph::before { content: "✕" }` — the same font glyphs, so pixels are identical; base SCSS keeps every box (`display: inline-flex`, widths) and `ClassicyFileInput.scss` adds `.classicyFileInputRemoveGlyph { display: inline-block }`. TSX: `ClassicyMenu.tsx:383` span gets `className={classNames("classicyMenuItemCheck", classicyStateClasses({ checked: menuItem.checked === true, mixed: menuItem.checked === "mixed" }))}` and no children; PopUpMenu/ComboBox spans get `classicyStateClasses({ checked: isSelected })` and no children, `CHECKMARK` constants deleted; BevelButton/Placard arrow spans lose their text; FileInput renders `<span className="classicyFileInputRemoveGlyph" aria-hidden={true} />` inside the button (the `aria-label` stays the accessible name). Keyboard: `ClassicyKeyboardShortcut.ts` exports `CLASSICY_MODIFIER_GLYPHS = { control: "⌃", option: "⌥", shift: "⇧", command: "⌘" } as const`, `type ClassicyModifierName = keyof typeof CLASSICY_MODIFIER_GLYPHS`, `CLASSICY_MODIFIER_ORDER: readonly ClassicyModifierName[] = ["control","option","shift","command"]`, `keyboardShortcutModifiers(raw: string | undefined): ClassicyModifierName[]` (the set modifiers in canonical order); `formatKeyboardShortcut`/`keyboardShortcutParts` read the shared table. `ClassicyKbd` deletes its own table and renders, in both variants, `<span className="classicyKbdModifier" data-classicy-part={`modifier-${name}`}>{CLASSICY_MODIFIER_GLYPHS[name]}</span>` per modifier followed by the key text (keycaps: one `<kbd class="classicyKbdKeycap">` per part as today, the modifier span inside it); `textContent` is unchanged. Colors: `ClassicyColorPicker.scss` (base) declares nothing; `_assets.scss` (package root) declares `--platinum-crayon-outline: rgba(0,0,0,.4)`, `--platinum-crayon-facet-light: rgba(255,255,255,.25)`, `--platinum-crayon-facet-dark: rgba(0,0,0,.2)`, `--platinum-crayon-strip-dark: rgba(0,0,0,.22)`, `--platinum-crayon-strip-light: rgba(255,255,255,.22)`, `--platinum-crayon-gloss: rgba(255,255,255,.07)`, `--platinum-crayon-band: rgba(255,255,255,.48)`, `--platinum-crayon-line-1: rgba(0,0,0,.2)`, `--platinum-crayon-line-2: rgba(0,0,0,.14)`, `--platinum-crayon-end-outline: rgba(0,0,0,.28)`, `--platinum-color-wheel-crosshair: #ffffff` (Part G rewrites these with `classicy-alpha`); the crayon SVG uses `fill="var(--platinum-crayon-facet-light)"` etc. (inline SVG inherits custom properties); the wheel reads `getComputedStyle(canvas).getPropertyValue("--platinum-color-wheel-crosshair").trim() || "#ffffff"`. Captions: the overlay sets `--classicy-caption-fg: <r>, <g>, <b>`, `--classicy-caption-fg-alpha`, `--classicy-caption-bg`, `--classicy-caption-bg-alpha` (plus `fontFamily`/`fontSize` as today) and `QuickTimeCaptionsOverlay.scss` composes `.quickTimePlayerCaptionsCustomStyle { color: rgba(var(--classicy-caption-fg), var(--classicy-caption-fg-alpha)); background-color: rgba(var(--classicy-caption-bg), var(--classicy-caption-bg-alpha)) }`.

- [ ] **Step 1: Update the glyph-text assertions and write the failing tests** — `ClassicyPopUpMenu.test.tsx:75` → `expect(current).toHaveClass("checked")`; `:79` → `.not.toHaveClass("checked")`. New `ClassicyMenu.glyphs.test.tsx`: `it("marks checked and mixed items with state classes and no text", …)` renders a menu with items `{ checked: true }`, `{ checked: "mixed" }`, `{ checked: false }` and expects the three `.classicyMenuItemCheck` spans to have classes `checked`, `mixed`, neither, and `textContent === ""` for all. `ClassicyKbd.test.tsx`: keep line 12's `toHaveTextContent("⇧⌘S")` and add `it("renders one addressable span per modifier", () => { const parts = kbd.querySelectorAll("[data-classicy-part^='modifier-']"); expect([...parts].map(p => p.getAttribute("data-classicy-part"))).toEqual(["modifier-shift", "modifier-command"]); })`. `ClassicyKeyboardShortcut.test.ts`: `expect(keyboardShortcutModifiers("Ctrl+Cmd+S")).toEqual(["control","command"])`, `expect(keyboardShortcutModifiers("F1")).toEqual([])`, `expect(CLASSICY_MODIFIER_GLYPHS.command).toBe("⌘")`. `ClassicyColorPicker.test.tsx`: `it("crayon facets read package custom properties", () => { expect(container.querySelector('polygon[fill="var(--platinum-crayon-facet-light)"]')).not.toBeNull(); expect(container.innerHTML).not.toMatch(/rgba\(/); })`. `QuickTimeCaptionsOverlay.test.tsx`: `it("publishes caption colors as custom properties", …)` → with `captionStyle` `{ color: 0xff0000, colorOpacity: 0.5, bgColor: 0, bgOpacity: 0.25, size: 100, font: "ui" }` the caption element's `style.getPropertyValue("--classicy-caption-fg")` is `"255, 0, 0"`, `--classicy-caption-fg-alpha` `"0.5"`, and `style.color` is `""`. FileInput: in the existing FileInput test file add `expect(screen.getByRole("button", { name: /Remove/ }).textContent).toBe("")` beside its remove-button test.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL on the new/changed cases. — `pnpm exec vitest run src/SystemFolder/SystemResources/{PopUpMenu,Menu,Kbd,ColorPicker,QuickTime,FileInput}`
- [ ] **Step 3: Implement the shared modifier table in `ClassicyKeyboardShortcut.ts` and rewrite `ClassicyKbd.tsx`** — Per Interfaces; delete `MODIFIER_GLYPHS` from both files (`ClassicyKeyboardShortcut.ts:24-29` renamed/exported; `ClassicyKbd.tsx:6-11` removed).
- [ ] **Step 4: Remove the glyph text nodes in the six components and add `_glyphs.scss` to the Platinum package** — Per Interfaces. Wire `_glyphs.scss` into the Platinum SCSS entry Part B created (the file that `@use`s `_mixins`, `_scrollbars`, `_assets`).
- [ ] **Step 5: Move the crayon, wheel and caption colors to custom properties** — Per Interfaces; `ClassicyColorPickerHSV.tsx:58-59` and `HLS.tsx:58-59` already set `--classicy-slider-track-from/to` from the picked color and stay as they are (data, not look).
- [ ] **Step 6: Run tests to verify they pass, then parity** — Expected: PASS. Re-shoot `desktop-menu--*`, `controls-popupmenu--*`, `controls-combobox--*`, `controls-bevelbutton--*`, `controls-placard--*`, `controls-fileinput--*`, `controls-kbd--*`, `controls-colorpicker--*`; `compare -metric AE` → `0` (same font glyphs, same boxes). — `pnpm exec vitest run src/SystemFolder/SystemResources`
- [ ] **Step 7: Grep for leftovers** — Expected: only doc comments (lines starting with `*` or `//`). Any JSX text hit is a missed site. — `git grep -nP '[✓–▸▾✕⌃⌥⇧⌘]' src --include='*.tsx' -- ':!*.test.tsx' ':!*.stories.tsx' ':!*Kbd*' ':!*KeyboardShortcut*' ':!*KeyboardEquivalent*'`
- [ ] **Step 8: Lint, type-check, commit** — git add -A src/SystemFolder/SystemResources src/Appearance/Platinum/styles && git commit -m "refactor(glyphs): menu, pop-up, bevel, placard and file-input glyphs come from package CSS; one modifier table" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Menu src/SystemFolder/SystemResources/Kbd src/SystemFolder/SystemResources/PopUpMenu`

## Phase 6: Title-bar unification and close-out

### 6.1: One `ClassicyWindowTitleBar` for `ClassicyWindow` and `ClassicyWindowFrame`

**Files:**
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.tsx`
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.scss`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.tsx`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss`
- Modify: `docs/AGENT-REFERENCE.md`
- Modify: `CLAUDE.md`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.test.tsx`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx`

**Depends on:** 2.2

**Interfaces:**
- Consumes: Part A's `data-classicy-control="close" | "zoom" | "collapse"` attributes (carried over verbatim from wherever A placed them in `ClassicyWindow.tsx:1689-1758`); the existing title-bar DOM at `ClassicyWindow.tsx:1683-1759` (control box → title → zoom box → collapse box; `classicyWindowTitleBarModal`; `classicyWindowTitleLeft`/`classicyWindowIcon`/`classicyWindowTitleText`/`classicyWindowTitleRight` when `title !== "" && windowType !== "utility"`, else `classicyWindowTitleCenter`); `ClassicyWindowFrame.tsx:51-60`; SCSS blocks `ClassicyWindow.scss:237-358` (title bar + control boxes, nested in `.classicyWindow`), `:88-131` (active stripes, nested in `.classicyWindowActive`), `ClassicyWindowFrame.scss:14-30`.
- Produces: `ClassicyWindowTitleBar.tsx`: `export type ClassicyWindowTitleBarProps = { title: string; icon?: string; hideIcon?: boolean; variant?: "document" | "utility"; modal?: boolean; onClose?: () => void; onZoom?: () => void; onCollapse?: (e: MouseEvent<HTMLDivElement>) => void; onCollapseKey?: () => void; onTitleMouseDown?: (e: MouseEvent<HTMLDivElement>) => void; onTitleDoubleClick?: () => void; className?: string }`; `export const ClassicyWindowTitleBar: FunctionalComponent<ClassicyWindowTitleBarProps>` renders byte-for-byte the DOM of lines 1683-1759: the close box when `onClose` is set, the zoom box when `onZoom && !modal`, the collapse box when `onCollapse` is set (Enter/Space on it calls `onCollapseKey ?? onCollapse`), the utility branch when `variant === "utility"`. `ClassicyWindowTitleBar.scss`: `@mixin classicy-window-title-bar` (the block 237-358 verbatim) and `@mixin classicy-window-title-bar-stripes` (88-131 verbatim, as rewritten by 2.1). `ClassicyWindow.scss` replaces the two blocks with `@include title-bar.classicy-window-title-bar` inside `.classicyWindow` and `@include title-bar.classicy-window-title-bar-stripes` inside `.classicyWindowActive`, at the same positions, so the compiled rules are identical. `ClassicyWindowFrame.scss` includes both mixins inside `.classicyWindowFrame` and deletes `.classicyWindowFrameTitleBar`/`.classicyWindowFrameTitleText`. `ClassicyWindowFrame.tsx` renders `<ClassicyWindowTitleBar title={title} hideIcon />` (named change (a)).

- [ ] **Step 1: Write the failing tests** — `ClassicyWindowTitleBar.test.tsx`:
```ts
it("renders close, zoom and collapse boxes only for the handlers given", () => { const { container } = render(<ClassicyWindowTitleBar title="T" onClose={vi.fn()} onCollapse={vi.fn()} />); expect(container.querySelector(".classicyWindowCloseBox")).not.toBeNull(); expect(container.querySelector(".classicyWindowZoomBox")).toBeNull(); expect(container.querySelector(".classicyWindowCollapseBox")).not.toBeNull(); });
it("hides the zoom box on a modal title bar even with onZoom", …);
it("keeps the Part A control attributes", () => { expect(container.querySelector('[data-classicy-control="close"]')).not.toBeNull(); });
it("renders the utility center band instead of title text", () => { render(<ClassicyWindowTitleBar title="Tools" variant="utility" />); expect(container.querySelector(".classicyWindowTitleText")).toBeNull(); expect(container.querySelector(".classicyWindowTitleCenter")).not.toBeNull(); });
it("fires onTitleDoubleClick and onTitleMouseDown from the title area", …);
```
`ClassicyWindowFrame.test.tsx:22-30`: the selector becomes `.classicyWindowTitleText`; add `it("draws the shared title bar", () => expect(container.querySelector(".classicyWindowFrame > .classicyWindowTitleBar")).not.toBeNull())`.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL (module not found; frame selector null). — `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar.test.tsx src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.test.tsx`
- [ ] **Step 3: Implement `ClassicyWindowTitleBar.tsx` and the two SCSS mixins** — Cut lines 1683-1759 of `ClassicyWindow.tsx` into the component (handlers become props; the three `biome-ignore` comments move with their elements); cut the SCSS blocks into the mixins. `pnpm exec barrelsby -c .ts-barrel.json`.
- [ ] **Step 4: Render it from `ClassicyWindow.tsx` and `ClassicyWindowFrame.tsx`** — Window: `<ClassicyWindowTitleBar title={title} icon={icon} hideIcon={hideIcon} variant={windowType === "utility" ? "utility" : "document"} modal={modal === true} onClose={closable ? close : undefined} onZoom={zoomable ? toggleZoom : undefined} onCollapse={collapsable ? onCollapseBoxClick : undefined} onCollapseKey={toggleCollapse} onTitleMouseDown={onTitleMouseDown} onTitleDoubleClick={doubleClickTitleToCollapse ? toggleCollapse : undefined} />`. The existing `ClassicyWindow.titlebar`, `.hig`, `.utility`, `.collapse`, `.beforeclose`, `.resizeSize` suites must stay green unchanged — they are the DOM-identity gate.
- [ ] **Step 5: Run the window suites** — Expected: PASS with no test edited other than the two named in Step 1. — `pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/WebViewer`
- [ ] **Step 6: Full parity** — Re-shoot every id in `stories.txt` into `after/`; `for f in before/*.png; do printf '%s ' "$(compare -metric AE "$f" "after/$(basename "$f")" null: 2>&1)"; echo "$f"; done`. Expected `0` for every story except: `desktop-windowframe--*` (named change (a); run `compare before after diff.png` and confirm the highlighted pixels sit within the title-bar band, y ≤ 19 px below the frame's top border), zoomable window stories (change (b), zoom box only), and title-less center bands (change (c): re-run those with `-fuzz 1%` → `0`). Anything else: fix SCSS, never the screenshot.
- [ ] **Step 7: Document** — `docs/AGENT-REFERENCE.md`: add `ClassicyWindowTitleBar` props, the `--classicy-art-*` keys Platinum registers (1.1 + 4.1), `ClassicyPixelArt`'s `art` prop and `encode/decodeClassicyPixelArtRows`, `CLASSICY_MODIFIER_GLYPHS`/`keyboardShortcutModifiers`. `CLAUDE.md`: in the Theming section add one paragraph: Platinum art lives in `src/Appearance/Platinum/assets/` and is read via `var(--classicy-art-<key>)` masks or `::before` glyph content in `_glyphs.scss`; never embed a data URI or a text glyph in component code.
- [ ] **Step 8: Lint, type-check, commit** — git add -A src/SystemFolder/SystemResources/Window src/index.ts docs/AGENT-REFERENCE.md CLAUDE.md && git commit -m "refactor(window): one ClassicyWindowTitleBar for ClassicyWindow and ClassicyWindowFrame" (with the trailer). Then `pnpm build:source` → PASS; `grep -c 'data:image/svg' dist/classicy.css` → 0; stop background dev servers. — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Window && grep -c 'data:image/svg' dist/classicy.css  # 0 after pnpm build:source`

## Acceptance Criteria

- [ ] `git grep -n 'data:image' src --include='*.scss'` returns nothing; `src/Appearance/Platinum/styles/_assets.scss` holds no `url(` at all.
- [ ] `resolveClassicyAsset("systemArt", key, "platinum")` is a valid asset source for the 15 SVG keys and the 9 pixel-art keys; `useClassicyAssetVars()` exposes each as `--classicy-art-<kebab-key>`.
- [ ] `ClassicyControlStripArt.ts`, `ClassicyPopUpSliderArt.ts`, `assets/img/ui/slider-strikes.svg`, `theme-halftone`, `encode-color` and both `MODIFIER_GLYPHS` tables no longer exist; `ClassicyKbd` renders one `data-classicy-part="modifier-<name>"` span per modifier with unchanged `textContent`.
- [ ] No JSX text node in `src/SystemFolder/SystemResources/**/*.tsx` contains `✓ – ▸ ▾ ✕`; `ClassicyWindow.tsx` no longer calls `setCursor`.
- [ ] `ClassicyWindow` and `ClassicyWindowFrame` both render `ClassicyWindowTitleBar`; the Window title-bar test suites pass unedited.
- [ ] Parity: AE 0 for every story in `stories.txt` except the three named changes, each confined to its stated region.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm test`, `pnpm build:source` all pass.

## Self-Review

| Requirement | Delivered by |
|---|---|
| §9 Phase 5 item 1: assets.scss base64 SVGs → package SVG files via mask-image, recoloring with the theme | 1.1 Steps 3-5; 2.1 Steps 3-5; 2.2 Step 3 |
| §9 Phase 5 item 1: Slider/Tabs inline SVGs and the external strikes file; theme-halftone replaced | 1.1 Step 3; 3.1 Steps 3-5 |
| §9 Phase 5 item 2: PixelArt rows → package data files, renderer stays in Classicy | 4.1 Steps 3-5 |
| §9 Phase 5 item 3: Unicode glyphs → package CSS; Kbd/ClassicyKeyboardShortcut share one modifier table and render one span per modifier | 5.1 Steps 3-4 |
| §9 Phase 5 item 4: ClassicyWindow.tsx:1833 cursor → role (CSS cursor variable); ColorPicker / captions literal colors → custom properties | 2.2 Step 4; 5.1 Step 5 |
| §9 Phase 5 item 5: one title bar for ClassicyWindow and ClassicyWindowFrame with data-classicy-control preserved | 6.1 Steps 3-4 |
| Contract: Platinum registers art through registerClassicySystemArt under id "platinum"; SCSS reads var(--classicy-art-*) | 1.1 Step 5; every consumer step |
| Pixel-identical Platinum except named changes | Phase 0; 2.1 Step 6; 2.2 Step 6; 3.1 Step 6; 4.1 Step 6; 5.1 Step 6; 6.1 Step 6 |

**Placeholder scan:** No TBDs. Every step names its file and lines, its exact selectors/values or signatures, and its command with expected output. The one branch (stripe caps) is gated by a measured value recorded in Phase 0 with both outcomes spelled out in 2.1 Step 4.
**Residual risk:** (1) Browser rasterization of a mask may differ from the same SVG as a background at non-integer scales (the 99.8% side bands, the 15 px title-less band); the parity gate catches it and the recorded remedy is matching `mask-*` longhands, with ≤ 2-level tolerance only for change (c). (2) `::-webkit-slider-thumb` art cannot recolor through a mask; the stroke stays `currentColor`-black in the file and is only swappable, not themeable, until a thumb DOM change (nextSteps). (3) Part B's final SCSS file layout may move the cited rules; every consumer step says to locate them with `git grep 'assets\.\$'` rather than by line.

## Next Steps

1. Report to 0002-ldj the contract gaps: (a) `ClassicySystemArtKey` needs the 13 Part E keys (utility shade/highlight, slider thumb rect, halftone, nine pixel-art keys), and `menuCheck`/`menuDash`/`triangle`/`downArrow` go unused by Platinum; (b) where Platinum's art registration file lives (Part C vs `src/Appearance/Platinum/assets/art/platinumArt.ts`); (c) the Platinum stripe colors `#787878`/`#ef8c89`/`#f9dada` are not theme tokens — decide between `--platinum-*` package properties (this plan) and new color targets.
2. Part G: rewrite `--platinum-stripe-*` and `--platinum-crayon-*` with `classicy-tint`/`classicy-alpha` where a token-derived value is pixel-identical.
3. Themeable grip and dither: a four-mask decomposition of `windowGrip` or a PixelArt-rows version once a theme token matches `#797979`/`#ababab`; a luminance-mask dither once `mask-mode: luminance` parity is proven.
4. Themeable slider thumb stroke: wrap the range input so the thumb outline can be a masked pseudo-element on a real element.
