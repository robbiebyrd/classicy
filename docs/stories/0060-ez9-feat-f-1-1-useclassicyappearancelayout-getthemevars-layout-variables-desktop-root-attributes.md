---
id: 0060-ez9
title: 'F 1.1: useClassicyAppearanceLayout, getThemeVars layout variables, desktop root attributes'
purpose: 'Give JS and CSS one reader for the active package''s layout declarations: a hook and getter, three --classicy-layout-* variables from getThemeVars, and two attributes on the desktop root.'
type: feat
status: in_progress
priority: "2"
effort: M
created: "2026-10-28T20:29:01.741Z"
updated: "2026-10-30T00:27:28.352Z"
started: "2026-10-29T23:18:40.166Z"
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
      - src/Appearance/useClassicyAppearanceLayout.ts
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx
      - src/Appearance/useClassicyAppearanceLayout.test.tsx
      - src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.layout.test.tsx
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0059-2t4", "depends"]
  plans:
    - ["0010-743", "included", ["1.1"]]
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

# F 1.1: useClassicyAppearanceLayout, getThemeVars layout variables, desktop root attributes

## Problem Statement

Audit §8.8: arrangement that JS and CSS must agree on — grow-box corner, menu-bar placement, icon-grid origin — is declared in the package's `layout` block (Part B stores it), but nothing reads it yet. The umbrella 0002-ldj "layout declarations" contract names the readers Part F owns: `useClassicyAppearanceLayout()`, `--classicy-layout-grow-box-corner`, `--classicy-layout-menu-bar-placement`, `--classicy-layout-icon-grid-origin` emitted by `getThemeVars`, and `data-classicy-menu-bar` / `data-classicy-grow-box` on the desktop root.

This section (plan 0010-743 §1.1) creates `src/Appearance/useClassicyAppearanceLayout.ts` with the hook, a non-hook `getClassicyAppearanceLayout(packageId?)` for reducers and `getThemeVars`, and `classicyLayoutVars`, wires the variables into `getThemeVars` (`ClassicyAppearance.ts:169`) and the attributes into the desktop root (`ClassicyDesktop.tsx:603-618`).

**Impact:** Every later Part F story reads the layout through these names; the resize math (4.1), the menu-bar placement (5.1), the icon grid (6.1) and the package CSS keyed on the root attributes (3.1, 7.1) cannot be written without them.

## Steps

### 1: Write the failing tests

`useClassicyAppearanceLayout.test.tsx`:
```ts
const mirror: ClassicyAppearanceLayout = { window: { growBoxCorner: "bottom-left" }, menuBar: { placement: "window" }, desktop: { iconGridOrigin: "top-left" } };
it("falls back to Platinum's layout", () => { expect(getClassicyAppearanceLayout()).toEqual(CLASSICY_DEFAULT_APPEARANCE_LAYOUT); expect(getClassicyAppearanceLayout("nope")).toEqual(CLASSICY_DEFAULT_APPEARANCE_LAYOUT); });
it("returns a registered package's layout", () => { registerClassicyAppearancePackage({ id: "test-mirror", name: "Mirror", css: "", defaults: { ...getTheme("default"), id: "test-mirror-default", package: "test-mirror" }, layout: mirror }); expect(getClassicyAppearanceLayout("test-mirror")).toEqual(mirror); });
it("the hook follows the active package", () => { const { result } = renderHook(() => useClassicyAppearanceLayout()); expect(result.current.menuBar.placement).toBe("screen"); act(() => dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId: "test-mirror" })); expect(result.current.menuBar.placement).toBe("window"); });
it("classicyLayoutVars emits bare keywords", () => { expect(classicyLayoutVars(mirror)).toEqual({ "--classicy-layout-grow-box-corner": "bottom-left", "--classicy-layout-menu-bar-placement": "window", "--classicy-layout-icon-grid-origin": "top-left" }); });
```
`ClassicyAppearance.test.ts` (after line 123's block): `it("emits the layout variables for the theme's package", () => { const v = getThemeVars(getTheme("default")); expect(v["--classicy-layout-grow-box-corner"]).toBe("bottom-right"); expect(v["--classicy-layout-menu-bar-placement"]).toBe("screen"); expect(v["--classicy-layout-icon-grid-origin"]).toBe("top-right"); expect(getThemeVars({ ...getTheme("default"), package: "test-mirror" })["--classicy-layout-grow-box-corner"]).toBe("bottom-left"); })`. `ClassicyDesktop.layout.test.tsx` (render as `ClassicyDesktop.test.tsx` does): `it("publishes the layout on the desktop root", () => { const root = container.querySelector(".classicyDesktop"); expect(root?.getAttribute("data-classicy-menu-bar")).toBe("screen"); expect(root?.getAttribute("data-classicy-grow-box")).toBe("bottom-right"); })` and the same after switching to `test-mirror` → `"window"`, `"bottom-left"`.

### 2: Run them to verify they fail

`pnpm exec vitest run src/Appearance/useClassicyAppearanceLayout.test.tsx src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.layout.test.tsx` — Expected: FAIL (module not found; variables undefined; attributes null).

### 3: Implement `src/Appearance/useClassicyAppearanceLayout.ts`

`export const CLASSICY_DEFAULT_APPEARANCE_LAYOUT: ClassicyAppearanceLayout = { window: { growBoxCorner: "bottom-right" }, menuBar: { placement: "screen" }, desktop: { iconGridOrigin: "top-right" } }` (frozen); `export const getClassicyAppearanceLayout = (packageId?: string): ClassicyAppearanceLayout` → `getClassicyAppearancePackage(packageId ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID)?.layout ?? getClassicyAppearancePackage(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID)?.layout ?? CLASSICY_DEFAULT_APPEARANCE_LAYOUT`; `export const useClassicyAppearanceLayout = (): ClassicyAppearanceLayout` → `useActiveClassicyAppearancePackage().layout`; `export const classicyLayoutVars = (layout: ClassicyAppearanceLayout): Record<string, string>` → `{ "--classicy-layout-grow-box-corner": layout.window.growBoxCorner, "--classicy-layout-menu-bar-placement": layout.menuBar.placement, "--classicy-layout-icon-grid-origin": layout.desktop.iconGridOrigin }`. Then `pnpm exec barrelsby -c .ts-barrel.json`.

### 4: Emit the variables from `getThemeVars` (`ClassicyAppearance.ts:169`)

Spread `classicyLayoutVars(getClassicyAppearanceLayout(theme.package))` into the returned object beside the metric derivations (type-only import cycle: `ClassicyAppearancePackage.ts` imports `type ClassicyTheme`; `ClassicyAppearance.ts` imports the runtime getter from `useClassicyAppearanceLayout.ts` — no runtime cycle).

### 5: Write the two root attributes in `ClassicyDesktop.tsx:603-618`

`const layout = useClassicyAppearanceLayout();` beside `activeTheme` (158); add `data-classicy-menu-bar={layout.menuBar.placement}` and `data-classicy-grow-box={layout.window.growBoxCorner}` next to `data-classicy-appearance`.

### 6: Run tests to verify they pass

`pnpm exec vitest run src/Appearance src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/Desktop` — Expected: PASS.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/Appearance src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/Desktop src/index.ts && git commit -m "feat(appearance): layout declaration readers, --classicy-layout-* variables and desktop root attributes"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [x] The desktop root carries `data-classicy-menu-bar` and `data-classicy-grow-box` that follow `ClassicyDesktopChangeAppearancePackage`.
- [x] `getClassicyAppearanceLayout` falls back to Platinum's layout for unknown or omitted ids and `useClassicyAppearanceLayout` follows the active package.
- [x] The desktop root's style carries `--classicy-layout-grow-box-corner: bottom-right`, `--classicy-layout-menu-bar-placement: screen` and `--classicy-layout-icon-grid-origin: top-right` from `classicyLayoutVars(useClassicyAppearanceLayout())` (contract amendment and F-R1: not `getThemeVars`)
- [x] VERIFY: pnpm exec vitest run src/Appearance/useClassicyAppearanceLayout.test.ts src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.layout.test.tsx

## Files

- `src/Appearance/useClassicyAppearanceLayout.ts` - create: default layout, getter, hook, vars
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` - modify: getThemeVars emits layout vars
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` - modify: root layout attributes
- `src/Appearance/useClassicyAppearanceLayout.test.tsx` - create: reader tests
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts` - modify: layout variable test
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.layout.test.tsx` - create: root attribute test
- `src/index.ts` - regenerate barrel

## Work Log

### 2026-10-29T23:18:42.182Z - Started on the landed Part B (29a15c243; worktree part-f, branch feat/appearance-part-f). B already created useClassicyAppearanceLayout.ts (the default layout, a store-free getter, the hook, classicyLayoutVars), so this task does only the rest: spread classicyLayoutVars on the desktop root beside the theme vars and add data-classicy-menu-bar and data-classicy-grow-box. Superseded plan text: the contract amendment (layout vars come from classicyLayoutVars, not getThemeVars) and ruling B-R18 (the active package comes from Appearance.packageId, never theme.package) override step 4 and the second acceptance criterion. The reconciliation predates B's landing and is being re-verified. Parity runs against the shared post-B baseline. Implementer dispatched.

### 2026-10-30T00:27:28.352Z - Done at f95309251 (feat/appearance-part-f, pushed); the spec review approved it with no Critical or Important findings. Gate: lint, tsc, 4025/4025 tests, build:source with verify:dist. Parity: 68 desktop-* and dialogs-* stories at AE 0 against the shared post-B baseline. The criteria were rewritten to match the code (B's .test.ts; layout variables come from classicyLayoutVars on the desktop root, not getThemeVars, per the contract amendment and F-R1). The review's minor coverage findings carry into F 2.1's first commit: re-register Platinum after the reset; add a desktop case for an unregistered packageId; rename the hook test after its action. The stale getThemeVars text in plans 0011-v9t:293 and 0010-743 carries to F 7.1 and Part H. Completion waits on F 0 (0059-2t4).
