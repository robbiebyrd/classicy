---
id: 0056-mdl
title: 'E 4.1: Control Strip and PopUpSlider glyphs as package data'
purpose: Move the nine Control Strip and PopUpSlider pixel-art glyphs out of TS row arrays into Platinum text data files registered as system art, with ClassicyPixelArt reading rows by key.
type: impr
status: in_progress
priority: "2"
effort: M
created: "2026-10-28T20:26:03.471Z"
updated: "2026-10-29T19:28:44.621Z"
started: "2026-10-29T19:28:42.867Z"
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
      - src/Appearance/Platinum/assets/pixelart/control-strip-tab.txt
      - src/Appearance/Platinum/assets/pixelart/control-strip-collapse.txt
      - src/Appearance/Platinum/assets/pixelart/control-strip-scroll-left.txt
      - src/Appearance/Platinum/assets/pixelart/control-strip-scroll-right.txt
      - src/Appearance/Platinum/assets/pixelart/control-strip-scroll-left-disabled.txt
      - src/Appearance/Platinum/assets/pixelart/control-strip-scroll-right-disabled.txt
      - src/Appearance/Platinum/assets/pixelart/control-strip-module-arrow.txt
      - src/Appearance/Platinum/assets/pixelart/popup-slider-track.txt
      - src/Appearance/Platinum/assets/pixelart/popup-slider-thumb.txt
      - src/Appearance/Platinum/assets/pixelart/platinumPixelArt.ts
      - src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.tsx
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx
      - src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider.tsx
      - src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.stories.tsx
      - src/Appearance/Platinum/assets/art/platinumArt.ts
      - src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripArt.ts
      - src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSliderArt.ts
      - src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.test.tsx
      - src/Appearance/Platinum/assets/pixelart/platinumPixelArt.test.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0055-l4q", "depends"]
  plans:
    - ["0009-agy", "included", ["4.1"]]
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

# E 4.1: Control Strip and PopUpSlider glyphs as package data

## Problem Statement

Audit §3.4 / §4.6: the Control Strip's seven glyphs (`ClassicyControlStripArt.ts:6-111`: tab 17×24, collapse 8×8, four scroll arrows 8×10, module arrow 4×8) and the PopUpSlider's two (`ClassicyPopUpSliderArt.ts:6-89`: track 10×68, thumb 15×10) are TS row arrays inside Classicy; their shape cannot be swapped by a package even though their color already follows the theme.

This section (plan 0009-agy §4.1, umbrella 0002-ldj; §9 Phase 5 item 2) moves the rows into `.txt` files under `src/Appearance/Platinum/assets/pixelart/`, registers each as a `data:text/x-classicy-pixel-art,` asset so it fits Part C's `ClassicyAssetSource` contract, and gives `ClassicyPixelArt` an `art` prop that resolves rows through `useClassicyAsset`. The renderer stays in Classicy.

**Impact:** The Control Strip and PopUpSlider would keep Platinum-shaped art hard-wired in TS, and the nine pixel-art keys appended to `ClassicySystemArtKey` in 1.1 would have no registration.

## Steps

### 1: Write the failing tests

`ClassicyPixelArt.test.tsx` additions:
```ts
it("encode/decode round-trips rows", () => { const rows = ["KKKK", "K33K", "K..K"]; expect(decodeClassicyPixelArtRows(encodeClassicyPixelArtRows(rows))).toEqual(rows); });
it("decode rejects foreign sources and drops a trailing empty row", () => { expect(decodeClassicyPixelArtRows("data:image/png;base64,AAAA")).toEqual([]); expect(decodeClassicyPixelArtRows(undefined)).toEqual([]); expect(decodeClassicyPixelArtRows("data:text/x-classicy-pixel-art,KK%0AKK%0A")).toEqual(["KK", "KK"]); });
it("renders registered art by key", () => { registerClassicySystemArt("platinum", { controlStripModuleArrow: encodeClassicyPixelArtRows(["K.", "KK"]) }); const { container } = render(<ClassicyPixelArt art="controlStripModuleArrow" />); expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 2 2"); expect(container.querySelectorAll("rect")).toHaveLength(2); });
```
`platinumPixelArt.test.ts`: `it("registers the nine Platinum glyphs at their HIG sizes", …)` — after `import "@/Appearance/Platinum"`, `decodeClassicyPixelArtRows(resolveClassicyAsset("systemArt", key, "platinum"))` has `[rows.length, rows[0].length]` equal to tab `[24,17]`, collapse `[8,8]`, each scroll arrow `[10,8]`, module arrow `[8,4]`, track `[68,10]`, thumb `[10,15]`, and every row has the first row's length.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/PixelArt src/Appearance/Platinum/assets/pixelart` — Expected: FAIL (exports missing).

### 3: Write the nine `.txt` files from the row arrays

`python3 -I` script reading the two `*Art.ts` files with a regex over the quoted rows; each file is the rows verbatim, one row per line, written without a trailing newline (`printf`, not `echo`); verify `for f in src/Appearance/Platinum/assets/pixelart/*.txt; do tail -c1 "$f" | xxd | grep -q 0a && echo "trailing newline: $f"; done` prints nothing.

### 4: Implement `encodeClassicyPixelArtRows`, `decodeClassicyPixelArtRows`, `useClassicyPixelArtRows` and the `art` prop in `ClassicyPixelArt.tsx`; implement `platinumPixelArt.ts`; spread into `PLATINUM_SYSTEM_ART`

In `ClassicyPixelArt.tsx`: `export const CLASSICY_PIXEL_ART_MIME = "text/x-classicy-pixel-art"`; `export const encodeClassicyPixelArtRows = (rows: ClassicyPixelArtRows): ClassicyAssetSource` → `` `data:${CLASSICY_PIXEL_ART_MIME},${encodeURIComponent(rows.join("\n"))}` ``; `export const decodeClassicyPixelArtRows = (src: ClassicyAssetSource | undefined): ClassicyPixelArtRows` → `[]` unless `src` starts with `data:text/x-classicy-pixel-art,`, else `decodeURIComponent(payload).split("\n")` with a trailing empty row dropped; `export const useClassicyPixelArtRows = (key: ClassicySystemArtKey): ClassicyPixelArtRows` → `decodeClassicyPixelArtRows(useClassicyAsset("systemArt", key))`; props become `{ rows: ClassicyPixelArtRows } | { art: ClassicySystemArtKey }` (exactly one). The component keeps rendering `rows` when given; with `art` it calls the hook (hooks are unconditional: always call `useClassicyAsset("systemArt", art ?? "controlStripTab")` and ignore the result when `rows` is set). `platinumPixelArt.ts` imports the `.txt` files with `?raw` (`vite/client` types it `string`) and exports `PLATINUM_PIXEL_ART: Readonly<Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>>` = `{ controlStripTab: encode(rows(tab)), controlStripCollapse, controlStripScrollLeft, controlStripScrollRight, controlStripScrollLeftDisabled, controlStripScrollRightDisabled, controlStripModuleArrow, popUpSliderTrack, popUpSliderThumb }` where `rows = (text) => text.replace(/\r/g, "").split("\n")`; `platinumArt.ts` spreads it into `PLATINUM_SYSTEM_ART`. Preferred: `platinumPixelArt.ts` only exports and `platinumArt.ts` registers everything (add it to `sideEffects` only if it registers on its own).

### 5: Point the consumers at keys and delete the row modules

`ClassicyControlStrip.tsx:26-34` import removed; `:174` `<ClassicyPixelArt art="controlStripModuleArrow" />`; `:540` `art="controlStripCollapse"`; `:552-553` `art={canScrollLeft ? "controlStripScrollLeft" : "controlStripScrollLeftDisabled"}` (same shape at `:580-581`); `:604` `art="controlStripTab"`. `ClassicyPopUpSlider.tsx:11-13` import removed; `:161-168` `art="popUpSliderTrack"` / `art="popUpSliderThumb"`. `ClassicyPixelArt.stories.tsx:3-14` import removed; stories pass `art` keys (the `CustomArt` story keeps `rows`). `git rm` the two `*Art.ts` modules; `pnpm exec barrelsby -c .ts-barrel.json`.

### 6: Run tests to verify they pass, then parity

`pnpm exec vitest run src/SystemFolder/SystemResources/PixelArt src/SystemFolder/SystemResources/ControlStrip src/SystemFolder/SystemResources/PopUpSlider src/Appearance/Platinum` — Expected: PASS. Re-shoot `desktop-controlstrip--*`, `controls-popupslider--*`, `system-pixelart--*`; `compare -metric AE` → `0`.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add -A src/Appearance/Platinum/assets src/SystemFolder/SystemResources/{PixelArt,ControlStrip,PopUpSlider} src/index.ts && git commit -m "refactor(pixelart): Control Strip and pop-up slider glyphs become Platinum data files"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/PixelArt src/Appearance/Platinum/assets/pixelart
- [ ] VERIFY: test ! -e src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripArt.ts && test ! -e src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSliderArt.ts
- [ ] `ClassicyPixelArt` accepts `rows` or `art`; `encode/decodeClassicyPixelArtRows` round-trip and the nine `platinum` keys decode to their HIG sizes.
- [ ] [MANUAL] `compare -metric AE` is `0` for every `desktop-controlstrip--*`, `controls-popupslider--*` and `system-pixelart--*` story.

## Files

- `src/Appearance/Platinum/assets/pixelart/control-strip-tab.txt` - create: 17×24 rows
- `src/Appearance/Platinum/assets/pixelart/control-strip-collapse.txt` - create: 8×8 rows
- `src/Appearance/Platinum/assets/pixelart/control-strip-scroll-left.txt` - create: 8×10 rows
- `src/Appearance/Platinum/assets/pixelart/control-strip-scroll-right.txt` - create: 8×10 rows
- `src/Appearance/Platinum/assets/pixelart/control-strip-scroll-left-disabled.txt` - create: 8×10 rows
- `src/Appearance/Platinum/assets/pixelart/control-strip-scroll-right-disabled.txt` - create: 8×10 rows
- `src/Appearance/Platinum/assets/pixelart/control-strip-module-arrow.txt` - create: 4×8 rows
- `src/Appearance/Platinum/assets/pixelart/popup-slider-track.txt` - create: 10×68 rows
- `src/Appearance/Platinum/assets/pixelart/popup-slider-thumb.txt` - create: 15×10 rows
- `src/Appearance/Platinum/assets/pixelart/platinumPixelArt.ts` - create: PLATINUM_PIXEL_ART from ?raw imports
- `src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.tsx` - modify: encode/decode, hook, art prop
- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip.tsx` - modify: art keys instead of imported rows
- `src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider.tsx` - modify: art keys instead of imported rows
- `src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.stories.tsx` - modify: stories read art by key
- `src/Appearance/Platinum/assets/art/platinumArt.ts` - modify: spread PLATINUM_PIXEL_ART
- `src/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripArt.ts` - delete: rows moved to the package
- `src/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSliderArt.ts` - delete: rows moved to the package
- `src/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt.test.tsx` - modify: encode/decode and art-prop tests
- `src/Appearance/Platinum/assets/pixelart/platinumPixelArt.test.ts` - create: nine-glyph size test

## Work Log

### 2026-10-29T19:28:44.621Z - Started in wave 2 beside Part B, out of chain order: 2.1–3.1 need B's SCSS, while 4.1 is TSX plus data only, which the E reconciliation shows does not overlap B. Base 28c4e09a1; implementer dispatched. Binding: E1 (data-only platinumPixelArt.ts, registered through platinumAssets.ts), E15 (pixel-art keys kept out of the --classicy-art-* vars), E16 (deleted public exports listed as breaking). Retarget platinumAssets.test.ts. Parity deferred until after B lands.
