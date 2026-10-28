---
id: 0023-yme
title: 'C 4.1: registerClassicyWallpapers, the .jpg glob, registerClassicyFonts and the Fonts tab'
purpose: Make wallpapers and fonts registries that the Desktop and Fonts tabs read, with Platinum's fonts shipped as woff2 files instead of base64 SCSS.
type: feat
status: pending
priority: "2"
effort: L
created: "2026-10-28T20:03:35.059Z"
updated: "2026-10-28T20:03:35.059Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/Platinum/assets/fonts
      - src/Appearance/ClassicyAssetRegistry.fonts.test.ts
      - src/Appearance/ClassicyAssetRegistry.ts
      - src/Appearance/Platinum/assets/platinumAssets.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx
      - storybook/.storybook/preview.tsx
      - src/custom.d.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/styles/fonts.scss
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.test.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.test.tsx
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0022-cbh", "depends"]
  plans:
    - ["0007-1sl", "included", ["4.1"]]
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
---

# C 4.1: registerClassicyWallpapers, the .jpg glob, registerClassicyFonts and the Fonts tab

## Problem Statement

Audit §4.4: fonts are base64 `@font-face` rules in `fonts.scss` and the Fonts tab list is a literal (`ClassicyAppearanceManager.Fonts.tsx:9-16`); §4.5: `ClassicyWallpapers.ts:3-6` globs `*.png` only (the one `.jpg` is skipped) and the picker is a mutable array with no register API. Umbrella 0002-ldj pins `registerClassicyWallpapers(packageId, Array<{ name, src }>)` and `registerClassicyFonts(packageId, Array<{ family, src, weight?, style? }>)` writing `<style id="classicy-fonts-<packageId>">`.

This story adds both wrappers, decodes the 13 woff2 payloads from `fonts.scss` into `src/Appearance/Platinum/assets/fonts/`, registers Platinum's wallpapers (now including `default.jpg`) and fonts from `platinumAssets.ts`, makes the Desktop and Fonts tabs read `useClassicyAssetTree`, and deletes `fonts.scss` with its two imports.

**Impact:** C 5.1's bundling change assumes the fonts are file imports under `src/Appearance/**`; without this story there is nothing to emit as files, `verify:dist`'s 13-woff2 invariant cannot pass, and the Fonts tab stays a hard-coded list.

## Steps

### 1: Write the failing tests

`src/Appearance/ClassicyAssetRegistry.fonts.test.ts` (`beforeEach`: `resetClassicyAssets(); document.head.innerHTML = ""`):
```ts
it("writes one @font-face per face into <style id=classicy-fonts-<packageId>>") // registerClassicyFonts("platinum",[{family:"Geneva",src:"geneva.woff2"},{family:"Geneva",src:"geneva-b.woff2",weight:"bold"}]); const css = document.getElementById("classicy-fonts-platinum")!.textContent!; expect(css.match(/@font-face/g)).toHaveLength(2); expect(css).toContain('font-family:"Geneva";src:url("geneva-b.woff2") format("woff2");font-weight:bold;font-style:normal;font-display:swap')
it("re-registering replaces the style element's content, not duplicates it") // register twice → still one element, 2 faces
it("places the element after #classicy-styles when present") // prepend <style id=classicy-styles>; register; expect(styles.nextElementSibling.id).toBe("classicy-fonts-platinum")
it("keys the fonts tree by family and weight-style") // resolveClassicyAsset("fonts","Geneva.bold-normal") === "geneva-b.woff2"
it("derives format from a data: mime") // src "data:font/woff;base64,AAAA" → 'format("woff")'
```
`ClassicyWallpapers.test.ts` add:
```ts
it("includes the jpg wallpaper") // expect(ClassicyWallpapers.some(w => w.label === "Default Photo" && w.value.endsWith(".jpg") || w.value.startsWith("data:image/jpeg"))).toBe(true); resolveWallpaper("default.jpg") !== ""
```
`ClassicyAppearanceManager.Fonts.test.tsx` (render the tab's `children` via `renderHook(() => useFontsTab({...}))` inside the providers, with `platinumAssets` imported):
```ts
it("lists the registered font families in registration order with the Digital label") // option labels equal ["Charcoal","ChicagoFLF","Geneva","AppleGaramond","Monaco","Digital"]; value of "Digital" is "VCR OSD Mono"
it("a family registered after mount appears") // act(() => registerClassicyFonts("platinum",[{family:"Espy Sans",src:"espy.woff2"}])) → an "Espy Sans" option
```

### 2: Run them to verify they fail

`pnpm exec vitest run src/Appearance/ClassicyAssetRegistry.fonts.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.test.tsx` — Expected: FAIL — `registerClassicyFonts` is not exported; jpg not found; option list is the literal.

### 3: Decode the 13 woff2 payloads to files (scratchpad script, not committed)

Parse `fonts.scss`: for each `@font-face` block take `font-family`, `font-weight`, `font-style` and the first `url(data:…;base64,<b64>) format('woff2')`; write `src/Appearance/Platinum/assets/fonts/<Family sans spaces>-<weight>-<style>.woff2` — `ChicagoFLF-normal-normal`, `Charcoal-normal-normal`, `Geneva-normal-normal`, `Geneva-bold-normal`, `Geneva-normal-italic`, `AppleGaramond-bold-normal`, `AppleGaramond-bold-italic`, `AppleGaramond-normal-italic`, `AppleGaramond-300-normal`, `AppleGaramond-300-italic`, `AppleGaramond-normal-normal`, `VCROSDMono-normal-normal`, `Monaco-normal-normal` (woff2 only; the woff fallback is dropped). Verify `ls src/Appearance/Platinum/assets/fonts/*.woff2 | wc -l` is 13 and `file` reports `Web Open Font Format (Version 2)` for each.

### 4: Implement registerClassicyFonts/writeClassicyFontFaces, the wallpaper glob and registration, the two tabs, the Platinum font registration; delete fonts.scss and its two imports

In `ClassicyAssetRegistry.ts`: `export type ClassicyFontFace = { family: string; src: ClassicyAssetSource; weight?: string; style?: string }`; `registerClassicyFonts(packageId: string, fonts: ClassicyFontFace[]): void` → `registerClassicyAssets("fonts", packageId, { [family]: { [`${weight ?? "normal"}-${style ?? "normal"}`]: src } })` then local `writeClassicyFontFaces(packageId)`: one `@font-face{font-family:"<family>";src:url("<src>")<format>;font-weight:<w>;font-style:<s>;font-display:swap}` per leaf, `<format>` = ` format("woff2")`/`("woff")`/`("truetype")`/`("opentype")` by extension or `data:font/<ext>` mime, empty otherwise; written into `<style id="classicy-fonts-<packageId>">` (created after `#classicy-styles` when present, else at the head's start; `textContent` replaced on every call; no-op without `document`). `ClassicyWallpapers.ts`: glob `"../../../../assets/img/wallpapers/*.{png,jpg}"` (line 4); the array gains `{ label: "Default Photo", value: wp("default.jpg") }` after "Default"; `platinumAssets.ts` calls `registerClassicyWallpapers(PLATINUM, ClassicyWallpapers.map(w => ({ name: w.label, src: w.value })))`. `ClassicyAppearanceManager.Desktop.tsx`: `const wallpapers = useClassicyAssetTree("wallpapers")` → `options={Object.entries(wallpapers).filter(([, v]) => typeof v === "string").map(([label, value]) => ({ label, value }))}`. `ClassicyAppearanceManager.Fonts.tsx`: delete lines 9-16; `const fonts = useClassicyAssetTree("fonts")`; `const CLASSICY_FONT_LABELS: Record<string,string> = { "VCR OSD Mono": "Digital" }`; `options = Object.keys(fonts).map(family => ({ label: CLASSICY_FONT_LABELS[family] ?? family, value: family }))`. `platinumAssets.ts` imports the fonts with `import.meta.glob("./fonts/*.woff2", { eager: true, import: "default" })` and calls `registerClassicyFonts(PLATINUM, [...])` in the order Charcoal, ChicagoFLF, Geneva (3), AppleGaramond (6), Monaco, VCR OSD Mono. `custom.d.ts`: `declare module "*.woff2" { const value: string; export default value; }`. Delete `fonts.scss`; `ClassicyDesktop.tsx:90` and `preview.tsx:1` lose that import. `grep -rn fonts.scss src storybook vite.config.ts bin` must then show only `vite.config.ts` comments (rewritten in C 5.1).

### 5: Run tests to verify they pass

`pnpm exec vitest run src/Appearance src/SystemFolder/ControlPanels/AppearanceManager` — Expected: PASS.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; then git add -A src storybook/.storybook/preview.tsx && git commit -m "feat(appearance): wallpaper and font registries; Platinum fonts as files" (with the trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/Appearance/ClassicyAssetRegistry.fonts.test.ts src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.test.tsx
- [ ] `registerClassicyFonts` writes one `@font-face` per face into `<style id="classicy-fonts-<packageId>">`, replaces it on re-register, and places it after `#classicy-styles`.
- [ ] The wallpaper picker lists 47 entries including "Default Photo" (`default.jpg`); the Fonts tab lists Charcoal, ChicagoFLF, Geneva, AppleGaramond, Monaco, Digital in that order with Digital's value `VCR OSD Mono`.
- [ ] `src/Appearance/Platinum/assets/fonts/` holds 13 `.woff2` files; `fonts.scss` and its imports in `ClassicyDesktop.tsx` and `preview.tsx` are gone.
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/Appearance/Platinum/assets/fonts` - 13 decoded woff2 files
- `src/Appearance/ClassicyAssetRegistry.fonts.test.ts` - create
- `src/Appearance/ClassicyAssetRegistry.ts` - registerClassicyFonts, ClassicyFontFace, writeClassicyFontFaces
- `src/Appearance/Platinum/assets/platinumAssets.ts` - wallpaper and font registrations
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.ts` - :3-6 glob includes jpg; :81-128 Default Photo entry
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop.tsx` - :6,69 picker reads useClassicyAssetTree("wallpapers")
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.tsx` - :9-16,47 list reads useClassicyAssetTree("fonts")
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` - :90 fonts.scss import removed
- `storybook/.storybook/preview.tsx` - :1 fonts.scss import removed
- `src/custom.d.ts` - declare module *.woff2
- `src/SystemFolder/ControlPanels/AppearanceManager/styles/fonts.scss` - deleted
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers.test.ts` - jpg test added
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts.test.tsx` - create

## Work Log
