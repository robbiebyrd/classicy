---
id: 0052-44l
title: 'E 1.1: SVG files, keys and the Platinum registration'
purpose: Turn the 13 base64 SVGs of assets.scss plus the Slider, Tabs and halftone inline art into SVG files registered as Platinum system art so every consumer can read them as --classicy-art-* variables.
type: feat
status: pending
priority: "2"
effort: L
created: "2026-10-28T20:23:11.963Z"
updated: "2026-10-28T20:23:11.963Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/Platinum/assets/art/window-stripes.svg
      - src/Appearance/Platinum/assets/art/window-stripes-red.svg
      - src/Appearance/Platinum/assets/art/window-utility-shade.svg
      - src/Appearance/Platinum/assets/art/window-utility-highlight.svg
      - src/Appearance/Platinum/assets/art/window-grip.svg
      - src/Appearance/Platinum/assets/art/window-dither.svg
      - src/Appearance/Platinum/assets/art/zoom-glyph.svg
      - src/Appearance/Platinum/assets/art/collapse-glyph.svg
      - src/Appearance/Platinum/assets/art/submenu-arrow.svg
      - src/Appearance/Platinum/assets/art/popup-arrows.svg
      - src/Appearance/Platinum/assets/art/slider-thumb.svg
      - src/Appearance/Platinum/assets/art/slider-thumb-rect.svg
      - src/Appearance/Platinum/assets/art/slider-strikes.svg
      - src/Appearance/Platinum/assets/art/tab-outline.svg
      - src/Appearance/Platinum/assets/art/halftone.svg
      - src/Appearance/Platinum/assets/art/platinumArt.ts
      - src/Appearance/ClassicyAssetRegistry.ts
      - src/Appearance/Platinum/index.ts
      - assets/img/ui/slider-strikes.svg
      - src/Appearance/Platinum/assets/art/platinumArt.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0051-532", "depends"]
  plans:
    - ["0009-agy", "included", ["1.1"]]
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

# E 1.1: SVG files, keys and the Platinum registration

## Problem Statement

Audit §2.2: `assets.scss` holds 13 base64 SVG variables with baked hex colors (title-bar stripes, red stripes, utility crosshatch, grip, corner dither, zoom/collapse/triangle/down-arrow glyphs); `ClassicySlider.scss:25,30,35` and `ClassicyTabs.scss:26` embed inline SVGs and an external `assets/img/ui/slider-strikes.svg`; `appearance.scss:233-237` bakes the halftone color at compile time. None of it can follow a runtime theme or be swapped by another Appearance Package (D8).

This section (plan 0009-agy §1.1, umbrella 0002-ldj) decodes every one of them into an SVG file under `src/Appearance/Platinum/assets/art/`, pins each file's viewBox geometry, uses `fill="currentColor"` wherever the art will be used as a mask, extends `ClassicySystemArtKey` with the keys Part C's contract lacks, and registers the set under the `platinum` package id from `platinumArt.ts` so `useClassicyAssetVars()` exposes each as `--classicy-art-<kebab-key>`.

**Impact:** Every later Part E story reads `var(--classicy-art-*)`; without the files and the registration none of the consumer rewrites (2.1 through 4.1) can compile or render.

## Steps

### 1: Write the failing tests

`platinumArt.test.ts` (top of file: `import "@/Appearance/Platinum";` so the side-effect registration runs):
```ts
it("registers every Part E key as an asset source", () => { for (const key of ["windowStripes","windowStripesRed","windowUtilityShade","windowUtilityHighlight","windowGrip","windowDither","zoomGlyph","collapseGlyph","submenuArrow","popupArrows","sliderThumb","sliderThumbRect","sliderStrikes","tabOutline","halftone"]) expect(isClassicyAssetSource(resolveClassicyAsset("systemArt", key, "platinum"))).toBe(true); });
it("exposes the art as --classicy-art-* url() variables", () => { const vars = renderHook(() => useClassicyAssetVars()).result.current; expect(vars["--classicy-art-window-stripes"]).toMatch(/^url\("/); expect(vars["--classicy-art-slider-thumb-rect"]).toMatch(/^url\("/); });
it("mask files carry no baked color and no intrinsic size", () => { for (const f of fs.readdirSync(dir).filter(n => n.endsWith(".svg") && !["window-grip.svg","window-dither.svg","slider-strikes.svg"].includes(n))) { const svg = fs.readFileSync(path.join(dir, f), "utf8"); expect(svg).not.toMatch(/#[0-9a-f]{3,6}/i); expect(svg).toMatch(/currentColor/); expect(svg).not.toMatch(/<svg[^>]*\s(width|height)=/); } });
it("pins the stripe geometry", () => { const s = read("window-stripes.svg"); expect(s).toContain('viewBox="0 0 12 12"'); expect(s.match(/<rect /g)).toHaveLength(6); expect(s).toContain('y="1"'); const r = read("window-stripes-red.svg"); expect(r.match(/<rect /g)).toHaveLength(6); expect(r).toContain('y="0"'); });
```

### 2: Run it to verify it fails

`pnpm exec vitest run src/Appearance/Platinum/assets/art/platinumArt.test.ts` — Expected: FAIL (module `platinumArt.ts` not found / keys resolve to undefined).

### 3: Decode the 13 data URIs into files

`python3 -I` script: read `src/Appearance/Platinum/styles/_assets.scss`, base64/percent-decode each `$name: url(...)`, write the SVG under the file names in the mapping, then edit by hand: strip XML prolog/Illustrator comments/`id`s, replace `style="fill:#…"` and `class="cls-*"` with `fill="currentColor"` for the mask files, split `$title-bar-utility` into its shade and highlight layers, convert the two red stripe files to the dark-rows-only form. Create `slider-thumb.svg`, `slider-thumb-rect.svg`, `tab-outline.svg`, `halftone.svg` from the inline SVGs at `ClassicySlider.scss:25,35`, `ClassicyTabs.scss:26`, `appearance.scss:235` (post-B: `_mixins.scss`); `git mv assets/img/ui/slider-strikes.svg src/Appearance/Platinum/assets/art/slider-strikes.svg`.

Pinned geometry (decoded from today's `assets.scss`): `windowStripes` ← `$title-bar-center` → `window-stripes.svg` viewBox `0 0 12 12`, six `<rect y=1|3|5|7|9|11 width=12 height=1 fill="currentColor">` (the dark rows; light rows come from the element background); `windowStripesRed` ← `$title-bar-center-red` → viewBox `0 0 12 12`, dark rows at y=0,2,4,6,8,10 (the red art is phase-inverted: `#ef8c89` sits on even rows); `windowUtilityShade`/`windowUtilityHighlight` ← `$title-bar-utility` split into its two radial layers, each viewBox `0 0 4 4` with the original gradient (`cx=2.6 cy=2.6 r=1.5 stop-opacity .528→0` and `cx=1.3 cy=1.3 r=1.5 stop-opacity .848→0`) as the alpha of a `currentColor` fill; `windowGrip` ← `$resizer` verbatim (viewBox `0 0 10 10`, 67 rects in four grays `#797979 #ababab #ccc #fff` — kept as an image); `windowDither` ← `$corner-dither` verbatim (viewBox `0 0 7 7`, six grays — image, luminosity blend); `zoomGlyph` ← `$zoom` (viewBox `0 0 10 10`, two rects, `fill="currentColor"`); `collapseGlyph` ← `$collapse` (viewBox `0 0 10 10`, rects at y=4 and y=6, `currentColor`); `submenuArrow` ← `$triangle` (viewBox `0 0 8 14`, polygon `8 7 0 0 0 14 8 7`); `popupArrows` ← `$down-arrow` (viewBox `0 0 25 30`, the two polygons verbatim); `sliderThumb` ← `ClassicySlider.scss:25` (viewBox `0 0 21 21`, polygon stroke-width 4, `stroke="currentColor"`); `sliderThumbRect` ← `:35` (rect rx 3 stroke-width 4); `sliderStrikes` ← `assets/img/ui/slider-strikes.svg` moved verbatim (keeps its `#000000`/`#ffffff` two-tone strokes); `tabOutline` ← `ClassicyTabs.scss:26` (viewBox `0 0 75.31 23.44`, `preserveAspectRatio="none"`, path `M0,23.44 L10.32,0 H64.98 L75.31,23.44`, `stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"`); `halftone` ← `appearance.scss:233-237` (viewBox `0 0 2.8 2.8`, the two paths, `fill="currentColor"`). No file carries `width`/`height` attributes; none but `window-grip.svg`, `window-dither.svg` and `slider-strikes.svg` carries a hex fill. `menuCheck`, `menuDash`, `triangle`, `downArrow` are not registered by Platinum (5.1 uses `::before` content for those glyphs).

### 4: Extend `ClassicySystemArtKey` in `src/Appearance/ClassicyAssetRegistry.ts`

Append to the union (contract gap reported to 0002-ldj): `windowUtilityShade`, `windowUtilityHighlight`, `sliderThumbRect`, `halftone`, `controlStripTab`, `controlStripCollapse`, `controlStripScrollLeft`, `controlStripScrollRight`, `controlStripScrollLeftDisabled`, `controlStripScrollRightDisabled`, `controlStripModuleArrow`, `popUpSliderTrack`, `popUpSliderThumb`; no other change to Part C's file.

### 5: Implement `PLATINUM_SYSTEM_ART` and the registration in `platinumArt.ts`; import it from `src/Appearance/Platinum/index.ts`

`platinumArt.ts` exports `PLATINUM_SYSTEM_ART: Readonly<Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>>` built from `import windowStripes from "./window-stripes.svg?url"` for each file (`vite/client` types `*?url` as string; `vite.config.ts:194-205` keeps the query un-externalized) and calls `registerClassicySystemArt("platinum", PLATINUM_SYSTEM_ART)` at module scope. Pixel-art keys are added by 4.1. Add `src/Appearance/Platinum/assets/art/platinumArt.ts` to `package.json` `sideEffects` only if `src/Appearance/Platinum/index.ts` is not already listed there by Part B.

### 6: Run tests to verify they pass

`pnpm exec vitest run src/Appearance/Platinum` — Expected: PASS (4 tests).

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/Appearance assets/img/ui package.json && git commit -m "feat(appearance): register Platinum window, menu, slider and tab art as system art files"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance/Platinum/assets/art/platinumArt.test.ts
- [ ] VERIFY: test ! -e assets/img/ui/slider-strikes.svg && test -e src/Appearance/Platinum/assets/art/slider-strikes.svg
- [ ] `resolveClassicyAsset("systemArt", key, "platinum")` returns a valid asset source for all 15 keys and `useClassicyAssetVars()` exposes each as `--classicy-art-<kebab-key>` `url("…")`.
- [ ] Every mask SVG keeps its original viewBox, omits `width`/`height`, and uses `currentColor`; only `window-grip.svg`, `window-dither.svg` and `slider-strikes.svg` keep hex fills.
- [ ] `ClassicySystemArtKey` includes the 13 appended keys and `pnpm exec tsc --noEmit -p .` passes.

## Files

- `src/Appearance/Platinum/assets/art/window-stripes.svg` - create: 12×12 dark-rows mask
- `src/Appearance/Platinum/assets/art/window-stripes-red.svg` - create: 12×12 dark-rows mask, even rows
- `src/Appearance/Platinum/assets/art/window-utility-shade.svg` - create: 4×4 radial shade alpha
- `src/Appearance/Platinum/assets/art/window-utility-highlight.svg` - create: 4×4 radial highlight alpha
- `src/Appearance/Platinum/assets/art/window-grip.svg` - create: grip image, four grays
- `src/Appearance/Platinum/assets/art/window-dither.svg` - create: corner dither image, six grays
- `src/Appearance/Platinum/assets/art/zoom-glyph.svg` - create: zoom glyph mask
- `src/Appearance/Platinum/assets/art/collapse-glyph.svg` - create: collapse glyph mask
- `src/Appearance/Platinum/assets/art/submenu-arrow.svg` - create: submenu triangle mask
- `src/Appearance/Platinum/assets/art/popup-arrows.svg` - create: pop-up double-triangle mask
- `src/Appearance/Platinum/assets/art/slider-thumb.svg` - create: thumb pentagon stroke
- `src/Appearance/Platinum/assets/art/slider-thumb-rect.svg` - create: thumb rounded-rect stroke
- `src/Appearance/Platinum/assets/art/slider-strikes.svg` - move from assets/img/ui, verbatim
- `src/Appearance/Platinum/assets/art/tab-outline.svg` - create: three-sided tab outline mask
- `src/Appearance/Platinum/assets/art/halftone.svg` - create: 2.8×2.8 halftone mask
- `src/Appearance/Platinum/assets/art/platinumArt.ts` - create: PLATINUM_SYSTEM_ART and registration
- `src/Appearance/ClassicyAssetRegistry.ts` - modify: append 13 ClassicySystemArtKey members
- `src/Appearance/Platinum/index.ts` - modify: import platinumArt
- `assets/img/ui/slider-strikes.svg` - delete: moved into the package
- `src/Appearance/Platinum/assets/art/platinumArt.test.ts` - create: registration and file-shape tests

## Work Log
