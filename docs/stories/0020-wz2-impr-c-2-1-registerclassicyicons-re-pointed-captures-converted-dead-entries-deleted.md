---
id: 0020-wz2
title: 'C 2.1: registerClassicyIcons re-pointed; captures converted; dead entries deleted'
purpose: Route icon registration through the deep-merging registry and make every icon consumer read at render or call time instead of capturing at module load.
type: impr
status: pending
priority: "2"
effort: L
created: "2026-10-28T20:01:12.976Z"
updated: "2026-10-28T20:01:12.976Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.test.ts
      - src/SystemFolder/PDFViewer/PDFViewerUtils.tsx
      - src/SystemFolder/QuickTime/PictureViewer/PictureViewer.tsx
      - src/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils.tsx
      - src/SystemFolder/QuickTime/MoviePlayer/MoviePlayer.tsx
      - src/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils.tsx
      - src/SystemFolder/SystemResources/QuickTime/QuickTimePlayPauseButton.tsx
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeSeekBar.tsx
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeFullscreenButton.tsx
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.tsx
      - src/SystemFolder/SystemResources/QuickTime/QuickTimeUtils.ts
      - src/SystemFolder/SimpleText/SimpleText.tsx
      - src/SystemFolder/Finder/Finder.tsx
      - src/SystemFolder/Finder/FinderPreferences.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound.tsx
      - src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts
      - src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.ts
      - src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.ts
      - src/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetup.tsx
      - src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts
      - src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager.tsx
      - src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx
      - src/SystemFolder/SystemResources/Table/ClassicyTable.tsx
      - src/SystemFolder/SystemResources/Boot/ClassicyDefaultParadeIcons.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx
      - src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.stories.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyMenuBarExtension.stories.tsx
      - src/SystemFolder/PDFViewer/PDFViewerDocument.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx
      - assets/img/icons/control-panels/appearance-manager/app.png
      - docs/BUILDING-APPS.md
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0019-y15", "depends"]
  plans:
    - ["0007-1sl", "included", ["2.1"]]
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

# C 2.1: registerClassicyIcons re-pointed; captures converted; dead entries deleted

## Problem Statement

Audit §4.1: 39 module-scope `const x = ClassicyIcons.a.b` captures (37 in the audit) and direct `@img/`/`./resources/` imports never see a registration, and `registerClassicyIcons` wipes namespaces. Umbrella 0002-ldj's read-side rule: no module-scope captures; components call `useClassicyAsset` or `resolveClassicyAsset` at render/handler time, and the existing `ClassicyIcons` constant remains the Platinum tree Platinum registers.

This story re-points `registerClassicyIcons` at `registerClassicyAssets("icons", …)` (deep-merging, `packageId = "platinum"` default), registers `ClassicyIcons` itself under "platinum", converts every capture and direct import per the conversion rule, turns `ClassicyDefaultParadeIcons` into `getClassicyDefaultParadeIcons()`, moves the Appearance Manager's `app.png` into the icon tree, and deletes the five verified-unconsumed entries `ui.stripe`, `ui.tab`, `ui.menuDropdownArrows`, `ui.halftoneSmall`, `system.bomb`.

**Impact:** C 3.1 registers system art from `ClassicyIcons` leaves and C 6.1's grep gate requires zero module-scope captures; skipping this leaves the shallow-merge wipe in place and later package overrides invisible to consumers.

## Steps

### 1: Write the failing test

File `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.test.ts`:
```ts
it("registers the Platinum icon tree on import") // expect(resolveClassicyAsset("icons","system.apple")).toBe(ClassicyIcons.system.apple); expect(ClassicyIcons.system.apple).not.toBe("")
it("registerClassicyIcons deep-merges: system.alias override keeps every other system entry") // const before = Object.keys(ClassicyIcons.system).length; const original = ClassicyIcons.system.alias; registerClassicyIcons({ system: { alias: "custom.png" } }); expect(Object.keys(ClassicyIcons.system).length).toBe(before); expect(resolveClassicyAsset("icons","system.alias")).toBe("custom.png"); expect(resolveClassicyAsset("icons","system.desktop.trashFull")).toBe(ClassicyIcons.system.desktop.trashFull); afterEach restores alias
it("returns its argument typed") // const r = registerClassicyIcons({ myApp: { app: "x.png" } }); expect(r.myApp.app).toBe("x.png"); expect(resolveClassicyAsset("icons","myApp.app")).toBe("x.png")
it("no longer carries the five unconsumed entries") // expect((ClassicyIcons.ui as Record<string,unknown>).stripe).toBeUndefined(); same for tab, menuDropdownArrows, halftoneSmall, (ClassicyIcons.system as …).bomb
```

### 2: Run it to verify it fails

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.test.ts` — Expected: FAIL — `resolveClassicyAsset` returns undefined (nothing registered) and `stripe` is defined.

### 3: Implement registerClassicyIcons and the Platinum registration in ClassicyIcons.ts; delete the five entries

Replace `ClassicyIcons.ts:21-47` with `const PLATINUM = "platinum"`, `export type ClassicyIconMap = ClassicyAssetTree`, and `export function registerClassicyIcons<T extends ClassicyAssetTree>(icons: T, packageId: string = PLATINUM): T` → `registerClassicyAssets("icons", packageId, icons); return icons;`. After the `ClassicyIcons` literal append `registerClassicyAssets("icons", PLATINUM, ClassicyIcons)` (the constant IS the stored Platinum tree, so in-place merges stay visible to `ClassicyIcons.x.y` readers; Part B moves this call). Delete `ui.stripe`, `ui.tab`, `ui.menuDropdownArrows`, `ui.halftoneSmall`, `system.bomb` (verified unconsumed; asset files stay on disk). `ClassicyAssetRegistry.ts` must not import `ClassicyIcons.ts` (cycle).

### 4: Convert the 39 module-scope captures and the direct imports listed in Files

Conversion rule: inside a component → `const x = useClassicyAsset("icons", "<dotted path>")` (pass `?? ""` where a string is required); in a plain function/module (`*Utils.ts`, `ClassicyFileSystem.ts`, `DefaultClassicyFileSystem.ts`, `ClassicyFileBrowserUtils.ts`, `ClassicyAppManager.ts:604` inside the `DefaultAppManagerState` literal, `ClassicyDefaultParadeIcons.ts`) → `resolveClassicyAsset("icons", "<dotted path>") ?? ""` where the value is used (for `DefaultAppManagerState` keep the `import "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons"` side-effect import and add `// Platinum icons are registered by the ClassicyIcons import above`). `ClassicyDefaultParadeIcons` becomes `export const getClassicyDefaultParadeIcons = (): ClassicyBootParadeIcon[]` (same 11 entries, resolved at call time); update its one caller (`grep -rn ClassicyDefaultParadeIcons src`). `PDFViewerDocument.tsx:2-3` → `useClassicyAsset("icons","system.sherlock.search")` and `useClassicyAsset("icons","ui.cursors.hand")`; `ClassicyAppearanceManager.tsx:60` → `git mv src/SystemFolder/ControlPanels/AppearanceManager/resources/app.png assets/img/icons/control-panels/appearance-manager/app.png`, add `controlPanels.appearanceManager.app: icon("control-panels/appearance-manager/app.png")`, read with `useClassicyAsset("icons","controlPanels.appearanceManager.app")`; `PictureViewer.tsx:2` `sample-picture.jpg?inline` stays (sample content) with a comment; `ClassicyCrashScreen.tsx:2` is C 3.1. Capture sites: PDFViewerUtils.tsx:4, PictureViewer.tsx:37, PictureViewerUtils.tsx:4, MoviePlayer.tsx:37, MoviePlayerUtils.tsx:4, QuickTimePlayPauseButton.tsx:4-5, QuickTimeSeekBar.tsx:5-6, QuickTimeFullscreenButton.tsx:4, QuickTimeMovieEmbed.tsx:20, QuickTimeUtils.ts:3-6, SimpleText.tsx:32, Finder.tsx:72, FinderPreferences.tsx:19, ClassicyWindow.tsx:37, ClassicyDesktopMenuWidgetTime.tsx:5, ClassicyDesktopMenuWidgetSound.tsx:18-20, ClassicyFileSystem.ts:30, DefaultClassicyFileSystem.ts:4-8, ClassicyFileBrowserUtils.ts:5-6, ClassicyDriveSetup.tsx:31, ClassicyAppManager.ts:49,604, ClassicySoundManager.tsx:21, ClassicyDateAndTimeManager.tsx:26, ClassicyTable.tsx:25, ClassicyDefaultParadeIcons.ts:4, ClassicyDesktop.tsx:88,657, ClassicyDesktopMenuBar.tsx:29,281, ClassicyButtonToolbar.stories.tsx:21, ClassicyMenuBarExtension.stories.tsx:17. Then `grep -rn '^const .* = ClassicyIcons\.' src --include=*.ts --include=*.tsx | grep -v stories` prints nothing (the two stories are converted too, so the unfiltered grep is also empty).

### 5: Update docs/BUILDING-APPS.md §10 (lines 866-885)

Replace the "assigns shallowly, so spread the existing namespace" paragraph and example with: registration deep-merges, so `registerClassicyIcons({ applications: { myApp: { app } } })` keeps the bundled apps; read icons at render with `useClassicyAsset("icons", "applications.myApp.app")` or at call time with `resolveClassicyAsset`.

### 6: Run tests to verify they pass

`pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/Boot src/SystemFolder/PDFViewer` — Expected: PASS; existing tests that mocked `ClassicyIcons` keep passing because the constant still exists.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`; then git add -A src assets docs/BUILDING-APPS.md && git commit -m "refactor(icons): deep-merging registerClassicyIcons and render-time icon reads" (with the trailer).

## Acceptance Criteria

- [ ] VERIFY: grep -rn '= ClassicyIcons\.' src --include=*.ts --include=*.tsx | grep -v '\.test\.' | grep -c '^[^:]*:[0-9]*:const '  # expect 0
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.test.ts
- [ ] `registerClassicyIcons({ system: { alias } })` leaves `Object.keys(ClassicyIcons.system).length` unchanged and still resolves `system.desktop.trashFull`; `resolveClassicyAsset("icons","system.apple")` equals `ClassicyIcons.system.apple` after import.
- [ ] `ui.stripe`, `ui.tab`, `ui.menuDropdownArrows`, `ui.halftoneSmall` and `system.bomb` are gone; `getClassicyDefaultParadeIcons()` returns the same 11 parade entries; `grep -rn '@img/' src/SystemFolder --include=*.tsx` prints only `PictureViewer.tsx`.
- [ ] VERIFY: pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test

## Files

- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.ts` - registry-backed registerClassicyIcons, self-registration, five entries deleted
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.test.ts` - new tests
- `src/SystemFolder/PDFViewer/PDFViewerUtils.tsx` - capture at :4 converted
- `src/SystemFolder/QuickTime/PictureViewer/PictureViewer.tsx` - capture at :37 converted; sample import commented
- `src/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils.tsx` - capture at :4 converted
- `src/SystemFolder/QuickTime/MoviePlayer/MoviePlayer.tsx` - capture at :37 converted
- `src/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils.tsx` - capture at :4 converted
- `src/SystemFolder/SystemResources/QuickTime/QuickTimePlayPauseButton.tsx` - captures at :4-5 converted
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeSeekBar.tsx` - captures at :5-6 converted
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeFullscreenButton.tsx` - capture at :4 converted
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.tsx` - capture at :20 converted
- `src/SystemFolder/SystemResources/QuickTime/QuickTimeUtils.ts` - captures at :3-6 converted
- `src/SystemFolder/SimpleText/SimpleText.tsx` - capture at :32 converted
- `src/SystemFolder/Finder/Finder.tsx` - capture at :72 converted
- `src/SystemFolder/Finder/FinderPreferences.tsx` - capture at :19 converted
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - capture at :37 converted
- `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.tsx` - capture at :5 converted
- `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound.tsx` - captures at :18-20 converted
- `src/SystemFolder/SystemResources/File/ClassicyFileSystem.ts` - capture at :30 converted
- `src/SystemFolder/SystemResources/File/DefaultClassicyFileSystem.ts` - captures at :4-8 converted
- `src/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils.ts` - captures at :5-6 converted
- `src/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetup.tsx` - capture at :31 converted
- `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` - captures at :49,604 converted
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager.tsx` - capture at :21 converted
- `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx` - capture at :26 converted
- `src/SystemFolder/SystemResources/Table/ClassicyTable.tsx` - capture at :25 converted
- `src/SystemFolder/SystemResources/Boot/ClassicyDefaultParadeIcons.ts` - becomes getClassicyDefaultParadeIcons()
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` - captures at :88,657 converted
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` - captures at :29,281 converted
- `src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.stories.tsx` - capture at :21 converted
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyMenuBarExtension.stories.tsx` - capture at :17 converted
- `src/SystemFolder/PDFViewer/PDFViewerDocument.tsx` - direct @img imports at :2-3 converted
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx` - ./resources/app.png import at :60 converted
- `assets/img/icons/control-panels/appearance-manager/app.png` - moved from AppearanceManager/resources
- `docs/BUILDING-APPS.md` - §10 icons rewritten for deep merge

## Work Log
