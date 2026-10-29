---
id: 0021-l6d
title: 'C 3.1: registerClassicySystemArt and the Platinum art module'
purpose: Register Platinum's system art under "platinum" from a side-effect module and have every consumer read it at render, exposing the art as --classicy-art-* variables on the desktop root.
type: feat
status: complete
priority: "2"
effort: L
created: "2026-10-28T20:02:06.942Z"
updated: "2026-10-29T00:01:03.821Z"
started: "2026-10-28T23:33:07.248Z"
completed: "2026-10-28T23:39:48.037Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/Appearance/Platinum/assets/platinumAssets.ts
      - src/Appearance/Platinum/assets/platinumAssets.test.ts
      - src/Appearance/Platinum/assets/art
      - src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx
      - src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx
      - src/SystemFolder/Finder/Finder.tsx
      - src/SystemFolder/SystemResources/File/ClassicyTrash.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx
      - src/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton.tsx
      - src/SystemFolder/Finder/FinderAboutThisComputer.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.assetVars.test.tsx
      - storybook/.storybook/preview.tsx
      - package.json
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0020-wz2", "depends"]
  plans:
    - ["0007-1sl", "included", ["3.1"]]
progress:
  "1":
    status: complete
  "2":
    status: complete
  "3":
    status: complete
  "4":
    status: complete
  "5":
    status: complete
  "6":
    status: complete
---

# C 3.1: registerClassicySystemArt and the Platinum art module

## Problem Statement

Audit §4.6: the Apple menu logo, crash-screen sad Mac, Trash, alias badge, help button, About art and the `assets.scss` base64 window art (stripes, grip, dither, zoom/collapse glyphs, triangle, down arrow) are module captures, direct `@img` imports or compile-time SCSS, so no package can replace them (D6). Umbrella 0002-ldj pins `registerClassicySystemArt(packageId, Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>)` and `--classicy-art-<key>` variables spread by `ClassicyDesktop`.

This story decodes the 13 `assets.scss` SVGs plus the Slider/Tabs inline SVGs, `slider-strikes.svg` and `sad-mac.png` into `src/Appearance/Platinum/assets/art/`, creates the side-effect module `platinumAssets.ts` that registers 21 of the 25 `ClassicySystemArtKey`s under "platinum" (`startupWordmark`, `paradeDefault`, `menuCheck`, `menuDash` have no Platinum asset yet), converts each consumer to a render-time read, and spreads `useClassicyAssetVars()` onto the desktop root beside the theme vars. `assets.scss`, `ClassicySlider.scss` and `ClassicyTabs.scss` are not edited, so Platinum stays pixel-identical; Part E swaps the files in.

**Impact:** C 3.2, C 4.1 and C 5.1 all extend `platinumAssets.ts`; without it there is no module for cursors, wallpapers or fonts to register from, and Part E has no `--classicy-art-*` variables to point SCSS at.

## Steps

### 1: Decode the SCSS and inline SVGs to files (one-off script in the scratchpad, not committed)

For each `$name: url('data:image/svg+xml;base64,…')` in `styles/assets.scss` write `src/Appearance/Platinum/assets/art/<name>.svg` (base64-decoded; `$triangle` and `$down-arrow` are URL-encoded `data:image/svg+xml,` — decode with `decodeURIComponent`); write `slider-thumb.svg` from `ClassicySlider.scss:25` (`$_thumb-border-svg`, URL-encoded) and `tab-outline.svg` from `ClassicyTabs.scss:26`; `cp assets/img/ui/slider-strikes.svg` and `cp assets/img/ui/sad-mac.png` into `art/`. Verify: `for f in src/Appearance/Platinum/assets/art/*.svg; do xmllint --noout "$f" || echo BAD $f; done` prints nothing and `ls src/Appearance/Platinum/assets/art | wc -l` is 17. `assets.scss`, `ClassicySlider.scss` and `ClassicyTabs.scss` are NOT edited.

### 2: Write the failing tests

`src/Appearance/Platinum/assets/platinumAssets.test.ts` (imports the module for its side effect):
```ts
const REGISTERED: ClassicySystemArtKey[] = ["appleMenu","sadMac","startupLogo","trashEmpty","trashFull","aliasBadge","helpButton","aboutLogo","windowStripes","windowStripesRed","windowGrip","windowDither","zoomGlyph","collapseGlyph","triangle","downArrow","submenuArrow","popupArrows","sliderThumb","sliderStrikes","tabOutline"];
it.each(REGISTERED)("registers system art %s", key => expect(resolveClassicyAsset("systemArt", key)).toMatch(/\S/))
it("leaves the keys Platinum has no art for unregistered") // ["startupWordmark","paradeDefault","menuCheck","menuDash"] each undefined
it("the Apple menu, trash, alias badge and help button are the icon-tree leaves") // resolveClassicyAsset("systemArt","appleMenu") === ClassicyIcons.system.apple, etc. for trashFull, aliasBadge, helpButton
```
`src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.assetVars.test.tsx` (render a `ClassicyDesktop` with `startupScreen={false}` inside `ClassicyAppManagerProvider` as other Desktop tests do):
```ts
it("spreads the asset variables onto the desktop root beside the theme vars") // const root = document.getElementById("classicyDesktop"); expect(root.style.getPropertyValue("--classicy-art-window-grip")).toMatch(/^url\("/); expect(root.style.getPropertyValue("--classicy-cursor-resize-lr")).toMatch(/^url\("/); expect(root.style.getPropertyValue("--color-system-01")).not.toBe("")
```

### 3: Run them to verify they fail

`pnpm exec vitest run src/Appearance/Platinum src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.assetVars.test.tsx` — Expected: FAIL — module not found / empty custom property.

### 4: Implement platinumAssets.ts, the sideEffects entry and the consumer reads per the Interfaces block

`platinumAssets.ts` (side-effect module, `const PLATINUM = "platinum"`): imports `ClassicyIcons` (which registers icons), the 17 art files via `import.meta.glob("./art/*.{svg,png}", { eager: true, import: "default" }) as Record<string,string>` with a local `art(name)` helper, and calls `registerClassicySystemArt(PLATINUM, { appleMenu: ClassicyIcons.system.apple, sadMac: art("sad-mac.png"), startupLogo: ClassicyIcons.system.macosSvg, trashEmpty: ClassicyIcons.system.desktop.trashEmpty, trashFull: ClassicyIcons.system.desktop.trashFull, aliasBadge: ClassicyIcons.system.alias, helpButton: ClassicyIcons.ui.helpButton, aboutLogo: ClassicyIcons.classicy.logo, windowStripes: art("title-bar-center.svg"), windowStripesRed: art("title-bar-center-red.svg"), windowGrip: art("resizer.svg"), windowDither: art("corner-dither.svg"), zoomGlyph: art("zoom.svg"), collapseGlyph: art("collapse.svg"), triangle: art("triangle.svg"), downArrow: art("down-arrow.svg"), submenuArrow: art("triangle.svg"), popupArrows: art("down-arrow.svg"), sliderThumb: art("slider-thumb.svg"), sliderStrikes: art("slider-strikes.svg"), tabOutline: art("tab-outline.svg") })` — 21 of 25 keys; `startupWordmark`, `paradeDefault`, `menuCheck`, `menuDash` stay unregistered. Consumers: `ClassicyCrashScreen` (class component) reads `resolveClassicyAsset("systemArt","sadMac") ?? ""` in `render()` (drop the `@img/ui/sad-mac.png` import at :2); `ClassicyDesktopMenuBar:281` `image: useClassicyAsset("systemArt","appleMenu")`; `ClassicyStartupScreen:54` default `logo = resolveClassicyAsset("systemArt","startupLogo")` applied inside the body (`logo ?? …`), doc comment updated; `Finder.tsx:556-565` `const trashFullIcon = useClassicyAsset("systemArt","trashFull")`, `trashEmptyIcon` likewise, both in the effect's dependency array so a later registration re-dispatches `ClassicyDesktopIconAdd`; `ClassicyTrash.ts:69` `resolveClassicyAsset("systemArt","trashEmpty")`; `ClassicyDesktopIcon` `const aliasBadge = useClassicyAsset("systemArt","aliasBadge")` for the mask var (:469) and the `<img>` (:475), doc comment (118-124) now says `registerClassicySystemArt("<package>", { aliasBadge })`; `ClassicyHelpButton:45` `icon={useClassicyAsset("systemArt","helpButton")}` (comment at :35 updated); `FinderAboutThisComputer:95-103` logo `useClassicyAsset("systemArt","aboutLogo")`, `classicy.bg` and `system.macos`/`system.mac` via `useClassicyAsset("icons", …)`. `ClassicyDesktop.tsx`: line 90 adds `import "@/Appearance/Platinum/assets/platinumAssets"` (keep the `fonts.scss` import until C 4.1); `const assetVars = useClassicyAssetVars()`; root `style={{ ...currentTheme, ...assetVars } as CSSProperties}` (:608). `package.json` `sideEffects` gains `"./src/Appearance/Platinum/assets/platinumAssets.ts"`. Storybook `preview.tsx:1` imports the same module (keeps `fonts.scss` until C 4.1).

### 5: Run tests to verify they pass

`pnpm exec vitest run src/Appearance src/SystemFolder/SystemResources/Desktop src/SystemFolder/Finder src/SystemFolder/SystemResources/CrashScreen src/SystemFolder/SystemResources/HelpButton src/SystemFolder/SystemResources/Boot` — Expected: PASS.

### 6: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; then git add -A src package.json storybook/.storybook/preview.tsx && git commit -m "feat(appearance): register Platinum system art and read it at render" (with the trailer).

## Acceptance Criteria

- [~] VERIFY: pnpm exec vitest run src/Appearance/Platinum/assets/platinumAssets.test.ts && grep -rn 'sad-mac\|@img/' src/SystemFolder --include=*.tsx | grep -v 'sample-picture' | wc -l  # expect 0
- [x] 21 of the 25 `ClassicySystemArtKey`s resolve to a non-empty source under "platinum"; `startupWordmark`, `paradeDefault`, `menuCheck`, `menuDash` resolve to `undefined`.
- [x] `#classicyDesktop` carries `--classicy-art-*` (and later `--classicy-cursor-*`) inline variables beside `--color-*`; `assets.scss`, `ClassicySlider.scss` and `ClassicyTabs.scss` are unchanged.
- [x] `src/Appearance/Platinum/assets/art/` holds 17 files that pass `xmllint --noout`; `package.json` `sideEffects` lists `platinumAssets.ts`.
- [x] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/Appearance/Platinum/assets/platinumAssets.ts` - create the Platinum registration module
- `src/Appearance/Platinum/assets/platinumAssets.test.ts` - create
- `src/Appearance/Platinum/assets/art` - 17 decoded art files (13 assets.scss SVGs, slider-thumb, slider-strikes, tab-outline, sad-mac.png)
- `src/SystemFolder/SystemResources/CrashScreen/ClassicyCrashScreen.tsx` - :2,90 sadMac read at render
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` - :281 appleMenu via useClassicyAsset
- `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx` - :54 startupLogo default resolved in body
- `src/SystemFolder/Finder/Finder.tsx` - :556-565 trash icons via useClassicyAsset
- `src/SystemFolder/SystemResources/File/ClassicyTrash.ts` - :69 trashEmpty via resolveClassicyAsset
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx` - :118-124,469,475 aliasBadge
- `src/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton.tsx` - :35,45 helpButton
- `src/SystemFolder/Finder/FinderAboutThisComputer.tsx` - :95-103 aboutLogo and icons at render
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` - :90 platinumAssets import; :569,608 spread useClassicyAssetVars()
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.assetVars.test.tsx` - create
- `storybook/.storybook/preview.tsx` - :1 import platinumAssets
- `package.json` - sideEffects entry

## Work Log

### 2026-10-28T23:35:30.999Z - pnpm lint blocked by pre-existing drift in untouched ClassicyScreenSaverWarp.tsx; fixed at part close-out (criterion 5 set not_applicable; tsc, pnpm test and build:source passed)

### 2026-10-28T23:35:31.105Z - Implemented in commits ab1a3b5..9694ce7, task review clean. Criterion 1 left open: platinumAssets tests pass (26) but the sad-mac/@img grep prints 4, not 0 (ClassicyTree.stories.tsx x3, vi.mock in ClassicyTabs.test.tsx), all outside this section's file list; the CrashScreen hit is gone. xmllint is not installed, so the 17 art files were validated as XML with Python minidom instead (criterion 4 counted as done on that evidence).

### 2026-10-28T23:39:46.603Z - Literal grep over-broad (4 hits: ClassicyTree.stories.tsx x3, ClassicyTabs.test.tsx vi.mock); narrowed grep excluding *.stories.tsx and *.test.tsx = 0; intent met (controller ruling)

### 2026-10-29T00:01:03.821Z - pnpm lint passes repo-wide on the part branch (format fix cherry-picked: A e1ab6a417 / C 4d92822d3)
