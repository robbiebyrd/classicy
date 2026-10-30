---
id: 0010-743
title: 'Part F: Arrangement slots'
type: impl
status: in_progress
priority: "2"
effort: L
created: "2026-10-28T19:26:28.560Z"
updated: "2026-10-30T00:37:29.019Z"
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
    - ["0003-7x7", "depends"]
    - ["0005-1b3", "depends"]
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
    status: in_progress
  "3":
    status: pending
  "3.1":
    status: pending
  "4":
    status: pending
  "4.1":
    status: pending
  "5":
    status: pending
  "5.1":
    status: pending
  "6":
    status: pending
  "6.1":
    status: pending
  "7":
    status: pending
  "7.1":
    status: pending
---

# Part F: Arrangement slots

## Summary

**Goal:** A package can move parts — control-box order and side, grow-box corner, menu bar at the screen top or inside each window, alert icon/button order, Disclosure label side, Tabs strip position, desktop icon grid origin — through CSS `order` on part attributes plus the three `layout` declarations, with Platinum declaring today's values and rendering pixel-identical.

**Problem:** Audit §5 and §8.8 (D21): the menu bar's right cluster is `float: right` + DOM order (`ClassicyDesktopMenuBar.scss:48-56,67-70`, `Widgets/Time/ClassicyDesktopMenuWidgetTime.scss:2`), which defeats `order`; the window title bar's boxes share one wrapper class so CSS cannot address them; the resize math assumes a top-left anchor and bottom-right grip (`ClassicyWindow.tsx:958-959, 1003-1029, 1098-1099`); the screen menu bar is simply the desktop's first child (`ClassicyDesktop.tsx:636`) with no window-level slot; Disclosure's label side is a JSX branch (`ClassicyDisclosure.tsx:114-124`); Tabs' container is not flex; desktop clean-up always fills from the right edge (`ClassicyDesktopIconContext.tsx:26-44, 81-117`).

**Approach:** A `useClassicyAppearanceLayout()` reader (plus a non-hook getter for reducers and `getThemeVars`) feeds the three declared values to JS and CSS; flex + `order` replaces floats and JSX branches wherever parts are siblings; a pure `computeClassicyWindowResize` anchors the corner opposite the grip; a `ClassicyWindowMenuBar` slot renders the window's `appMenu` when placement is `window` while the screen bar keeps running the shortcut dispatcher headlessly; a Storybook-only `mirrored` package proves every slot.

---

# Part 2 — Implementation

**Architecture:** Implements audit §9 Phase 5 item 6 (§8.8, D21) under umbrella plan 0002-ldj (Part F; depends on Parts A and B, runs beside E, G, H, I; owns the readers of the "layout declarations" contract while Part B stores the value). It consumes Part A's `data-classicy-control`, `data-classicy-role`, `data-classicy-part` attributes and Part B's `ClassicyAppearanceLayout`, `getClassicyAppearancePackage`, `useActiveClassicyAppearancePackage`, `registerClassicyAppearancePackage`, `System.Manager.Appearance.packageId`, `ClassicyDesktopChangeAppearancePackage` and `theme.package`. Part E moves the title-bar JSX into `ClassicyWindowTitleBar.tsx`; where this plan edits that JSX it names both locations. For agentic workers: use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task; steps use checkbox syntax.

**Tech Stack:** TypeScript, React 19, Zustand reducer, SCSS, vitest/jsdom (+ `sass.compile` style tests, pattern `ClassicyWindow.resizer.test.ts`), Biome, Storybook 10 (`storybook/.storybook/ClassicyDecorators.tsx`, `helpers.tsx`), Playwright MCP + ImageMagick `compare`.

## Constraints

- Platinum renders pixel-identical (parity AE 0 for every story in `stories.txt`): Platinum declares `{ window: { growBoxCorner: "bottom-right" }, menuBar: { placement: "screen" }, desktop: { iconGridOrigin: "top-right" } }` and every CSS rewrite keeps the default arrangement; the only new pixels are in the new `--mirrored` stories, which have no `before/` shot.
- Before each commit: `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` (CI runs the same three).
- Library code logs through `classicyLog`, never `console.*`.
- `src/index.ts` is barrel-generated: run `pnpm exec barrelsby -c .ts-barrel.json` after adding a module; never hand-edit barrels.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- American English spelling in code, comments, docs and commit messages.
- Keyboard-shortcut dispatch is unchanged in both placements: `useClassicyShortcutDispatcher` and the two `ClassicyShortcutRegister` effects stay inside `ClassicyDesktopMenuBar` (`ClassicyDesktopMenuBar.tsx:303, 316-344`), which keeps mounting and merely renders nothing when placement is `window`.
- Existence of parts stays behavioral (§8.8): which boxes a modal/utility window has, which buttons an alert has, is unchanged; a package may only reorder or hide.
- Review focus: (1) `float` → flex must keep each cluster's own height (floats are top-aligned own-height boxes) → 2.1 Step 4 `align-items: flex-start` and parity; (2) the resize function must reproduce today's bottom-right numbers exactly, `+5` fudge included → 4.1 Step 1 values; (3) the headless screen bar must still register and dispatch chords → 5.1 Step 1 integration test; (4) the Tabs container's switch to flex column must not move the strip's −1 px overhang → 6.1 Step 6 parity; (5) icon clean-up with origin `top-right` must produce byte-identical locations → 6.1 Step 1 test against today's formula.

## Files

| File | Change | Responsibility |
|---|---|---|
| `src/Appearance/useClassicyAppearanceLayout.ts` | create | `CLASSICY_DEFAULT_APPEARANCE_LAYOUT`, `getClassicyAppearanceLayout(packageId?)`, `useClassicyAppearanceLayout()`, `classicyLayoutVars(layout)`. |
| `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts` | modify | `getThemeVars` emits the three `--classicy-layout-*` variables (line 169). |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` | modify | Root `data-classicy-menu-bar` / `data-classicy-grow-box` (603-618); menu bar placement (636). |
| `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` | modify | `placement` prop; headless when `window` (128-134, 351-369). |
| `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss` | modify | Flex bar with `order` per cluster; floats removed (18-31, 48-56, 67-70). |
| `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss` | modify | Drop `float: right` (line 2). |
| `src/SystemFolder/SystemResources/Window/ClassicyWindowResize.ts` | create | `computeClassicyWindowResize` (pure corner-anchored resize math). |
| `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` | modify | Resize handlers use the pure function and the declared corner (958-964, 1003-1029, 1098-1104); renders `ClassicyWindowMenuBar`. |
| `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` | modify | Control-box `order` defaults; grip position keyed on `data-classicy-grow-box` (374-385); window menu bar slot. |
| `src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.tsx` | create | In-window menu bar slot rendering the window's `appMenu`. |
| `src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.scss` | create | Slot layout under the title bar. |
| `src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx` | modify | Guarantee `data-classicy-role` on every button (298-308) if Part A left any without. |
| `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx` | modify | Label side as class, single JSX order (104-125). |
| `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.scss` | modify | `order` rule for the left-label class. |
| `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx` | modify | `stripPosition` prop → container class (307). |
| `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss` | modify | Flex-column container; bottom-strip `order` (28-33, 46-52). |
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx` | modify | Grid origin parameter in `getGridPosition`/`cleanupDesktopIcons`; reducer passes the declared origin (26-44, 81-117, 143-152, 227, 288). |
| `storybook/.storybook/MirroredPackage.ts` | create | Story-level `mirrored` appearance package registration. |
| `storybook/.storybook/mirrored.scss` | create | The package's CSS: `order` flips, hidden stripe spans, moved grip. |
| `storybook/.storybook/ClassicyDecorators.tsx` | modify | `parameters.classicy.appearancePackage` activates a registered package. |
| `src/SystemFolder/SystemResources/{Window,Alert,Desktop,Desktop/MenuBar,Tabs,Disclosure}/*.stories.tsx` | modify | One `Mirrored` story per surface. |
| `docs/AGENT-REFERENCE.md` | modify | Layout declarations, part attributes, `stripPosition`, `ClassicyWindowMenuBar`. |
| `CLAUDE.md` | modify | One paragraph on arrangement slots. |

## Phase 0: Parity baseline

- [ ] Start Storybook (`pnpm storybook`, background; note the port). From `index.json` keep every id whose title starts with Desktop/Window, Desktop/Desktop, Desktop/MenuBar, Desktop/MenuBar/Extension, Desktop/DesktopIcon, Desktop/App, Dialogs/Alert, Controls/Tabs, Controls/Disclosure → `.playwright-mcp/parity/part-F/stories.txt`.
- [ ] Playwright MCP: open each `iframe.html?id=<id>&viewMode=story` at 1024×768, wait networkidle + 500 ms, save `.playwright-mcp/parity/part-F/before/<id>.png`; `ls before | wc -l` equals the line count of stories.txt.
- [ ] Attribute gate: `git grep -n 'data-classicy-part' src/SystemFolder/SystemResources/Desktop/MenuBar src/SystemFolder/SystemResources/Menu` and `git grep -n 'data-classicy-control\|data-classicy-role' src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Alert` must show Part A's six cluster parts, three control attributes and the alert role attribute. Record the hits in `.playwright-mcp/parity/part-F/attributes.txt`; a missing one is added by the section that consumes it (2.1 Step 4, 3.1 Step 3, 6.1 Step 3).
- [ ] No commit.

**Validation:** `ls .playwright-mcp/parity/part-F/before | wc -l  # equals wc -l stories.txt`

## Phase 1: Layout readers

### 1.1: useClassicyAppearanceLayout, getThemeVars layout variables, desktop root attributes

**Files:**
- Create: `src/Appearance/useClassicyAppearanceLayout.ts`
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.ts`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`
- Test: `src/Appearance/useClassicyAppearanceLayout.test.tsx`
- Test: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.layout.test.tsx`

**Depends on:** 0

**Interfaces:**
- Consumes: Part B: `ClassicyAppearanceLayout`, `getClassicyAppearancePackage(id)`, `useActiveClassicyAppearancePackage()`, `CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`, `registerClassicyAppearancePackage`, `theme.package`, store `System.Manager.Appearance.packageId`, action `ClassicyDesktopChangeAppearancePackage`; `getThemeVars` at `ClassicyAppearance.ts:169`; desktop root element at `ClassicyDesktop.tsx:603-618` (Part B added `data-classicy-appearance` there).
- Produces: `src/Appearance/useClassicyAppearanceLayout.ts`: `export const CLASSICY_DEFAULT_APPEARANCE_LAYOUT: ClassicyAppearanceLayout = { window: { growBoxCorner: "bottom-right" }, menuBar: { placement: "screen" }, desktop: { iconGridOrigin: "top-right" } }` (frozen); `export const getClassicyAppearanceLayout = (packageId?: string): ClassicyAppearanceLayout` → `getClassicyAppearancePackage(packageId ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID)?.layout ?? getClassicyAppearancePackage(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID)?.layout ?? CLASSICY_DEFAULT_APPEARANCE_LAYOUT`; `export const useClassicyAppearanceLayout = (): ClassicyAppearanceLayout` → `useActiveClassicyAppearancePackage().layout`; `export const classicyLayoutVars = (layout: ClassicyAppearanceLayout): Record<string, string>` → `{ "--classicy-layout-grow-box-corner": layout.window.growBoxCorner, "--classicy-layout-menu-bar-placement": layout.menuBar.placement, "--classicy-layout-icon-grid-origin": layout.desktop.iconGridOrigin }`. `getThemeVars(theme)` spreads `classicyLayoutVars(getClassicyAppearanceLayout(theme.package))` (type-only import cycle: `ClassicyAppearancePackage.ts` imports `type ClassicyTheme`; `ClassicyAppearance.ts` imports the runtime getter from `useClassicyAppearanceLayout.ts` — no runtime cycle). Desktop root gains `data-classicy-menu-bar={layout.menuBar.placement}` and `data-classicy-grow-box={layout.window.growBoxCorner}` from `useClassicyAppearanceLayout()`.

- [ ] **Step 1: Write the failing tests** — `useClassicyAppearanceLayout.test.tsx`:
```ts
const mirror: ClassicyAppearanceLayout = { window: { growBoxCorner: "bottom-left" }, menuBar: { placement: "window" }, desktop: { iconGridOrigin: "top-left" } };
it("falls back to Platinum's layout", () => { expect(getClassicyAppearanceLayout()).toEqual(CLASSICY_DEFAULT_APPEARANCE_LAYOUT); expect(getClassicyAppearanceLayout("nope")).toEqual(CLASSICY_DEFAULT_APPEARANCE_LAYOUT); });
it("returns a registered package's layout", () => { registerClassicyAppearancePackage({ id: "test-mirror", name: "Mirror", css: "", defaults: { ...getTheme("default"), id: "test-mirror-default", package: "test-mirror" }, layout: mirror }); expect(getClassicyAppearanceLayout("test-mirror")).toEqual(mirror); });
it("the hook follows the active package", () => { const { result } = renderHook(() => useClassicyAppearanceLayout()); expect(result.current.menuBar.placement).toBe("screen"); act(() => dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId: "test-mirror" })); expect(result.current.menuBar.placement).toBe("window"); });
it("classicyLayoutVars emits bare keywords", () => { expect(classicyLayoutVars(mirror)).toEqual({ "--classicy-layout-grow-box-corner": "bottom-left", "--classicy-layout-menu-bar-placement": "window", "--classicy-layout-icon-grid-origin": "top-left" }); });
```
`ClassicyAppearance.test.ts` (after line 123's block): `it("emits the layout variables for the theme's package", () => { const v = getThemeVars(getTheme("default")); expect(v["--classicy-layout-grow-box-corner"]).toBe("bottom-right"); expect(v["--classicy-layout-menu-bar-placement"]).toBe("screen"); expect(v["--classicy-layout-icon-grid-origin"]).toBe("top-right"); expect(getThemeVars({ ...getTheme("default"), package: "test-mirror" })["--classicy-layout-grow-box-corner"]).toBe("bottom-left"); })`. `ClassicyDesktop.layout.test.tsx` (render as `ClassicyDesktop.test.tsx` does): `it("publishes the layout on the desktop root", () => { const root = container.querySelector(".classicyDesktop"); expect(root?.getAttribute("data-classicy-menu-bar")).toBe("screen"); expect(root?.getAttribute("data-classicy-grow-box")).toBe("bottom-right"); })` and the same after switching to `test-mirror` → `"window"`, `"bottom-left"`.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL (module not found; variables undefined; attributes null). — `pnpm exec vitest run src/Appearance/useClassicyAppearanceLayout.test.tsx src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance.test.ts src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.layout.test.tsx`
- [ ] **Step 3: Implement `src/Appearance/useClassicyAppearanceLayout.ts` per Interfaces** — Then `pnpm exec barrelsby -c .ts-barrel.json`.
- [ ] **Step 4: Emit the variables from `getThemeVars` (`ClassicyAppearance.ts:169`)** — Spread `classicyLayoutVars(getClassicyAppearanceLayout(theme.package))` into the returned object beside the metric derivations.
- [ ] **Step 5: Write the two root attributes in `ClassicyDesktop.tsx:603-618`** — `const layout = useClassicyAppearanceLayout();` beside `activeTheme` (158); add the attributes next to `data-classicy-appearance`.
- [ ] **Step 6: Run tests to verify they pass** — Expected: PASS. — `pnpm exec vitest run src/Appearance src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/Desktop`
- [ ] **Step 7: Lint, type-check, commit** — git add src/Appearance src/SystemFolder/ControlPanels/AppearanceManager src/SystemFolder/SystemResources/Desktop src/index.ts && git commit -m "feat(appearance): layout declaration readers, --classicy-layout-* variables and desktop root attributes" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/Appearance/useClassicyAppearanceLayout.test.tsx`

## Phase 2: Menu bar clusters

### 2.1: Floats to flex + order

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx`
- Test: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.layout.test.tsx`

**Depends on:** 0

**Interfaces:**
- Consumes: Part A's `data-classicy-part` on the six clusters: `apple` (the Apple `li`, `classicyDesktopMenuAppleMenu`), `app` (each app-menu `li`), `help`, `switcher` (`classicyDesktopMenuAppSwitcher`), `extensions` (the `<ul id="classicyDesktopMenuExtensions">`, `ClassicyDesktopMenuBar.tsx:363-366`), `clock` (the Time widget root). Today: `.classicyDesktopMenu` is `display: inline-block; width: 100%` (`:18-31`); items are `.classicyMenuItem { float: left }` (`ClassicyMenu.scss:112-114`); right cluster is `float: right` on `.classicyDesktopMenuExtensions` (`:48-56`), `.classicyDesktopMenuAppSwitcher` (`:67-70`), `.classicyDesktopMenuTime` (`Widgets/Time/…scss:2`); visual order today, left to right: Apple, app menus, Help, Extensions, Clock, App Switcher (the first `float: right` in DOM order lands rightmost; see the comment at `ClassicyDesktopMenuBar.tsx:361-362`).
- Produces: `.classicyDesktopMenu { display: flex; flex-direction: row; align-items: flex-start; width: 100%; box-sizing: border-box }` (other declarations unchanged); `.classicyDesktopMenu > * { float: none }`; `order` by part: `[data-classicy-part="apple"] { order: 10 }`, `app` 20, `help` 30, `extensions` 40 plus `margin-left: auto`, `clock` 50, `switcher` 60; the three `float: right` declarations are deleted. The DOM comment at `ClassicyDesktopMenuBar.tsx:361-362` is rewritten ("order via data-classicy-part; see ClassicyDesktopMenuBar.scss").

- [ ] **Step 1: Write the failing tests** — `ClassicyDesktopMenuBar.layout.test.tsx` — style half compiles `ClassicyDesktopMenuBar.scss`, `ClassicyMenu.scss` and the Time widget SCSS with `sass.compile`:
```ts
it("lays the bar out with flex and order, no floats", () => { const bar = rule(".classicyDesktopMenu"); expect(bar.display).toBe("flex"); expect(bar["align-items"]).toBe("flex-start"); expect(rule('.classicyDesktopMenu > [data-classicy-part="extensions"]')["margin-left"]).toBe("auto"); for (const [part, order] of [["apple","10"],["app","20"],["help","30"],["extensions","40"],["clock","50"],["switcher","60"]]) expect(rule(`.classicyDesktopMenu > [data-classicy-part="${part}"]`).order).toBe(order); expect(menuBarCss + timeCss).not.toMatch(/float: right/); });
```
DOM half renders `<ClassicyDesktopMenuBar />` inside the providers the existing `ClassicyDesktopMenuBar.test.tsx:36-60` uses: `it("tags every cluster", () => { for (const part of ["apple","help","switcher","extensions","clock"]) expect(container.querySelector(`.classicyDesktopMenu > [data-classicy-part="${part}"]`)).not.toBeNull(); })` and, with an app menu published, `app` too.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL (`display` is `inline-block`; floats present). — `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.layout.test.tsx`
- [ ] **Step 3: Rewrite `ClassicyDesktopMenuBar.scss:18-31, 48-56, 67-70` and `ClassicyDesktopMenuWidgetTime.scss:2` per Interfaces** — Keep `padding: 0 var(--window-control-size)`, the radius, background and shadow verbatim.
- [ ] **Step 4: Confirm the cluster attributes sit on the flex items** — If `attributes.txt` (Phase 0) shows a part attribute on a descendant rather than on the direct child `li`/`ul` of `.classicyDesktopMenu`, move it to the direct child (`ClassicyMenuItem.className` cannot carry attributes: extend the item's `<li>` at `ClassicyMenu.tsx:340-374` to spread `menuItem.part ? { "data-classicy-part": menuItem.part } : {}` and set `part` on the Apple, Help and switcher items at `:279-284, 298-299`).
- [ ] **Step 5: Run tests to verify they pass, then parity** — Expected: PASS. Re-shoot `desktop-menubar--*`, `desktop-menubar-extension--*`, `desktop-desktop--*`, `desktop-app--*` into `after/`; `compare -metric AE` → `0`. A non-zero means an item's height changed under stretch — `align-items: flex-start` is the fix, never the screenshot. — `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/MenuBar`
- [ ] **Step 6: Lint, type-check, commit** — git add src/SystemFolder/SystemResources/Desktop/MenuBar src/SystemFolder/SystemResources/Menu && git commit -m "refactor(menubar): flex clusters ordered by data-classicy-part instead of floats" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `git grep -n 'float: right' src/SystemFolder/SystemResources/Desktop/MenuBar  # expect no output`

## Phase 3: Window parts

### 3.1: Control-box order, hideable stripes, grip position by attribute

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.layout.test.ts`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.titlebar.test.tsx`

**Depends on:** 1.1

**Interfaces:**
- Consumes: Title-bar JSX `ClassicyWindow.tsx:1689-1758` (or `ClassicyWindowTitleBar.tsx` after Part E): wrappers `.classicyWindowControlBox` are the flex items of `.classicyWindowTitleBar { display: flex; flex-direction: row }` (`ClassicyWindow.scss:242-243`); Part A's `data-classicy-control`; grip rule `ClassicyWindow.scss:374-385` (`right`/`bottom: var(--window-border-size)`); desktop root `data-classicy-grow-box` (1.1).
- Produces: `data-classicy-control` is guaranteed on the wrapper (the flex item): if Part A placed it on the inner box, the wrapper also gets it (`<div className="classicyWindowControlBox" data-classicy-control="close">`). Base SCSS inside the title-bar block: `[data-classicy-control="close"] { order: 10 }`, `.classicyWindowTitle { order: 20 }`, `[data-classicy-control="zoom"] { order: 30 }`, `[data-classicy-control="collapse"] { order: 40 }` (DOM order already matches, so pixels are unchanged; a package overrides the numbers). Grip: after `:374-385` add `[data-classicy-grow-box="bottom-left"] & { left: var(--window-border-size); right: auto }`, `[data-classicy-grow-box="top-right"] & { top: var(--window-border-size); bottom: auto }`, `[data-classicy-grow-box="top-left"] & { left: var(--window-border-size); right: auto; top: var(--window-border-size); bottom: auto }` (`&` = the resizer; the attribute is on the desktop root). Stripe spans `.classicyWindowTitleLeft/Center/Right` need no base change to be hideable (`display: none` from a package); the test pins that none of them carries `display` with `!important`.

- [ ] **Step 1: Write the failing tests** — `ClassicyWindow.layout.test.ts` (sass-compiled `ClassicyWindow.scss`, `rule()` helper):
```ts
it("orders the title-bar parts explicitly", () => { expect(rule('<title bar selector> [data-classicy-control="close"]').order).toBe("10"); expect(rule("<title bar selector> .classicyWindowTitle").order).toBe("20"); expect(rule('<title bar selector> [data-classicy-control="zoom"]').order).toBe("30"); expect(rule('<title bar selector> [data-classicy-control="collapse"]').order).toBe("40"); });
it("moves the grip by the desktop's grow-box attribute", () => { const bl = rule('[data-classicy-grow-box="bottom-left"] <resizer selector>'); expect(bl.left).toBe("var(--window-border-size)"); expect(bl.right).toBe("auto"); const tl = rule('[data-classicy-grow-box="top-left"] <resizer selector>'); expect(tl.top).toBe("var(--window-border-size)"); expect(tl.bottom).toBe("auto"); });
it("stripe spans can be hidden by a package", () => { expect(css).not.toMatch(/classicyWindowTitle(Left|Center|Right)[^}]*display:[^;]*!important/); });
```
`ClassicyWindow.titlebar.test.tsx` addition: `it("tags each control wrapper", () => { for (const c of ["close","zoom","collapse"]) expect(container.querySelector(`.classicyWindowControlBox[data-classicy-control="${c}"]`)).not.toBeNull(); })` (use the suite's existing render helper at `:105-112`).
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL (`order` undefined; wrapper selector null when A tagged the inner box). — `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.layout.test.ts src/SystemFolder/SystemResources/Window/ClassicyWindow.titlebar.test.tsx`
- [ ] **Step 3: Put `data-classicy-control` on the wrappers** — `ClassicyWindow.tsx:1690, 1732, 1746` (or the same three wrappers in `ClassicyWindowTitleBar.tsx`); keep A's inner attribute if present.
- [ ] **Step 4: Add the `order` and grip rules to `ClassicyWindow.scss` per Interfaces** — Inside the title-bar block (after `:251`) and after the resizer rule (`:385`).
- [ ] **Step 5: Run tests to verify they pass, then parity** — Expected: PASS. Re-shoot `desktop-window--*`; `compare -metric AE` → `0`. — `pnpm exec vitest run src/SystemFolder/SystemResources/Window`
- [ ] **Step 6: Lint, type-check, commit** — git add src/SystemFolder/SystemResources/Window && git commit -m "feat(window): control boxes and grip addressable by data-classicy-control and data-classicy-grow-box" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.layout.test.ts`

## Phase 4: Grow-box resize math

### 4.1: computeClassicyWindowResize anchored on the corner opposite the grip

**Files:**
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindowResize.ts`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindowResize.test.ts`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindow.resizeSize.test.tsx`

**Depends on:** 1.1

**Interfaces:**
- Consumes: `ClassicyWindow.tsx:958-964` and `:1098-1104` (`newWidth = Math.abs(anchorX - e.clientX) + 5`, same for height; inline `style.width/height`; `pendingSizeRef`), `:1003-1029` (`startResizeWindow` captures `[left, top]` of the bounding rect into `wsPositionRef`, dispatches `ClassicyWindowPosition`), `:996-1000` (mouseup persists the measured rect's `left/top`), `classicyWindowChromeSize(el)` (`:101-114`), `useClassicyAppearanceLayout()` (1.1).
- Produces: `ClassicyWindowResize.ts`: `export const CLASSICY_WINDOW_RESIZE_FUDGE = 5` (today's `+ 5`; Part G item 4 replaces it with a measured value); `export type ClassicyWindowRect = { left: number; top: number; right: number; bottom: number }`; `export type ClassicyWindowResizeResult = { size: [number, number]; position: [number, number] }`; `export const computeClassicyWindowResize = (corner: ClassicyAppearanceLayout["window"]["growBoxCorner"], rect: ClassicyWindowRect, pointer: [number, number], chrome: [number, number], fudge = CLASSICY_WINDOW_RESIZE_FUDGE): ClassicyWindowResizeResult` with: `bottom-right`: `size = [|rect.left − px| + fudge, |rect.top − py| + fudge]`, `position = [rect.left, rect.top]`; `bottom-left`: `size = [|rect.right − px| + fudge, |rect.top − py| + fudge]`, `position = [rect.right − (size[0] + chrome[0]), rect.top]`; `top-right`: `size = [|rect.left − px| + fudge, |rect.bottom − py| + fudge]`, `position = [rect.left, rect.bottom − (size[1] + chrome[1])]`; `top-left`: `size = [|rect.right − px| + fudge, |rect.bottom − py| + fudge]`, `position = [rect.right − (size[0] + chrome[0]), rect.bottom − (size[1] + chrome[1])]`. In `ClassicyWindow.tsx`: `startResizeWindow` stores the full rect in a new `resizeRectRef` and `chromeRef = classicyWindowChromeSize(windowRef.current)`; both move handlers call `computeClassicyWindowResize(layout.window.growBoxCorner, resizeRectRef.current, [e.clientX, e.clientY], chromeRef.current)`, write `style.width/height` and — when the corner is not `bottom-right` — `style.left/top` from `position`, and keep `pendingSizeRef.current = size`; mouseup is unchanged (it already persists the measured rect).

- [ ] **Step 1: Write the failing tests** — `ClassicyWindowResize.test.ts` — rect `{ left: 100, top: 100, right: 300, bottom: 250 }`, chrome `[10, 30]`, pointer = that corner + (10, 10):
```ts
it("bottom-right keeps today's numbers", () => expect(computeClassicyWindowResize("bottom-right", rect, [310, 260], chrome)).toEqual({ size: [215, 165], position: [100, 100] }));
it("bottom-left anchors the top-right corner", () => expect(computeClassicyWindowResize("bottom-left", rect, [110, 260], chrome)).toEqual({ size: [195, 165], position: [95, 100] }));
it("top-right anchors the bottom-left corner", () => expect(computeClassicyWindowResize("top-right", rect, [310, 110], chrome)).toEqual({ size: [215, 145], position: [100, 75] }));
it("top-left anchors the bottom-right corner", () => expect(computeClassicyWindowResize("top-left", rect, [110, 110], chrome)).toEqual({ size: [195, 145], position: [95, 75] }));
it("the fudge is 5 until Part G measures it", () => expect(CLASSICY_WINDOW_RESIZE_FUDGE).toBe(5));
```
`ClassicyWindow.resizeSize.test.tsx` (reuse its rect mocking at `:148-175`): `it("a bottom-left grow box moves the left edge while dragging", …)` — register `test-mirror` (1.1), switch to it, mock `getBoundingClientRect` → `{ left: 100, top: 100, right: 300, bottom: 250, width: 200, height: 150 }`, `mouseDown` on `.classicyWindowResizer`, `mouseMove` on the window at `(110, 260)`: `expect(windowEl.style.width).toBe("195px")`, `expect(windowEl.style.left).toBe("105px")` (jsdom chrome is `[0, 0]`: `300 − 195`).
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL (module not found; `style.left` empty). — `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindowResize.test.ts src/SystemFolder/SystemResources/Window/ClassicyWindow.resizeSize.test.tsx`
- [ ] **Step 3: Implement `computeClassicyWindowResize` in `ClassicyWindowResize.ts`** — Per Interfaces; `pnpm exec barrelsby -c .ts-barrel.json`.
- [ ] **Step 4: Rewire `ClassicyWindow.tsx:958-964, 1003-1029, 1098-1104`** — `const layout = useClassicyAppearanceLayout();` near the other hooks; replace the two inline formulas with the function call; `resizeRectRef`/`chromeRef` beside `wsPositionRef` (`:567`). `wsPositionRef` stays for the drag path.
- [ ] **Step 5: Run the window suites** — Expected: PASS, including the untouched `resizeSize` cases at `:211-243` (bottom-right numbers unchanged). — `pnpm exec vitest run src/SystemFolder/SystemResources/Window`
- [ ] **Step 6: Parity and a manual check** — Re-shoot `desktop-window--*` → AE `0`. In Storybook `desktop-window--default`, drag the grip 40 px right/down with Playwright MCP (`browser_drag`) and confirm with `browser_evaluate` that `getBoundingClientRect().left/top` are unchanged and width/height grew by 40 (±1).
- [ ] **Step 7: Lint, type-check, commit** — git add src/SystemFolder/SystemResources/Window src/index.ts && git commit -m "feat(window): resize math anchors the corner opposite the declared grow box" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindowResize.test.ts`

## Phase 5: Menu bar in the window

### 5.1: menuBar.placement = window: headless screen bar, ClassicyWindowMenuBar slot

**Files:**
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.tsx`
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.scss`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss`
- Test: `src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.test.tsx`
- Test: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.integration.test.tsx`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.layout.test.tsx`

**Depends on:** 2.1, 3.1

**Interfaces:**
- Consumes: How menus reach the bar today (CLAUDE.md §5 "Desktop | Menu bar at screen top"): `ClassicyWindow` takes `appMenu?: ClassicyMenuItem[]` (`ClassicyWindow.tsx:290, 467`) and, when focused, publishes it with `ClassicyWindowMenu { menuBar }` (`:924-948`) into `System.Manager.Desktop.appMenu` (`ClassicyDesktopManager.tsx:273`); `ClassicyDesktopMenuBar` reads that and builds `defaultMenuItems` (`:291-301`), runs `useClassicyShortcutDispatcher(defaultMenuItems)` (`:303`) and the `ClassicyShortcutRegister` effects (`:316-344`), and renders `<nav class="classicyDesktopMenuBar">` (`:351-369`) through `ClassicyMenuProvider` (`:128-134`); `ClassicyDesktop` mounts it first (`:636`). `ClassicyMenu` props `name`, `menuItems`, `navClass`, `subNavClass` (`ClassicyMenu.tsx:109-113, 140-157`).
- Produces: `ClassicyDesktopMenuBar` gains `placement?: "screen" | "window"` (default `useClassicyAppearanceLayout().menuBar.placement`); `ClassicyDesktopMenuBarContent` keeps every hook and returns `null` when placement is `window` (the provider still wraps it). `ClassicyDesktop.tsx:636` passes nothing (the default reads the layout). `ClassicyWindowMenuBar.tsx`: `export type ClassicyWindowMenuBarProps = { appId: string; windowId: string; menuItems: ClassicyMenuItem[] }`; renders `<div className="classicyWindowMenuBar" data-classicy-part="window-menu-bar"><ClassicyMenuProvider><ClassicyMenu name={`${appId}_${windowId}_menuBar`} menuItems={menuItems} navClass="classicyDesktopMenu classicyWindowMenu" subNavClass="classicySubMenu" /></ClassicyMenuProvider></div>`. `ClassicyWindow` renders it directly under the title bar (after the title-bar JSX, before the header at `:1760`) when `layout.menuBar.placement === "window" && appMenu && appMenu.length > 0 && windowType !== "utility" && !ws.collapsed`. `ClassicyWindowMenuBar.scss`: `.classicyWindowMenuBar { flex: 0 0 auto; width: 100%; box-sizing: border-box }` and `.classicyWindowMenu { border-radius: 0; padding: 0 var(--window-padding-size) }`. Shortcut dispatch is untouched: the headless bar still registers and dispatches chords. Known limitation (named): the Apple, Help and switcher clusters have no in-window home, and `menuBarHeight = 30` (`ClassicyWindow.tsx:57, 120, 160, 1316`) still reserves the top band — Part G item 4 makes it read the layout.

- [ ] **Step 1: Write the failing tests** — `ClassicyWindowMenuBar.test.tsx`: `it("renders the window's menus as a bar", () => { render(<ClassicyWindowMenuBar appId="T.app" windowId="main" menuItems={[{ id: "file", title: "File", menuChildren: [{ id: "new", title: "New" }] }]} />); expect(container.querySelector(".classicyWindowMenuBar .classicyDesktopMenu")).not.toBeNull(); expect(screen.getByText("File")).toBeInTheDocument(); })`. `ClassicyDesktop.layout.test.tsx` additions: with `test-mirror` active (1.1), `expect(container.querySelector(".classicyDesktopMenuBar")).toBeNull()`; render a `ClassicyApp` + `ClassicyWindow appMenu={[File…]}` inside the desktop → `expect(container.querySelector(".classicyWindow .classicyWindowMenuBar")).not.toBeNull()` and, after switching back to `platinum`, `.classicyWindowMenuBar` is null and `.classicyDesktopMenuBar` is back. `ClassicyShortcutDispatcher.integration.test.tsx`: copy its existing "chord fires the focused app's item" case (the `it` at the top of the file) into `it("still fires with the screen bar headless (placement window)", …)` that activates `test-mirror` first and asserts the same `onClickFunc` call.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL (module not found; screen bar still rendered). — `pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.test.tsx src/SystemFolder/SystemResources/Desktop`
- [ ] **Step 3: Implement `ClassicyWindowMenuBar.tsx` + `.scss`** — Per Interfaces; `pnpm exec barrelsby -c .ts-barrel.json`.
- [ ] **Step 4: Make `ClassicyDesktopMenuBar` headless for `window` placement** — Add the `placement` prop at `:128-134` and `return null` after the hooks at `:351` when `placement === "window"`; the doc comment at `:110-127` gains one sentence.
- [ ] **Step 5: Render the slot from `ClassicyWindow.tsx`** — Insert after the title bar (before `:1760`) under the condition in Interfaces; `ClassicyWindow.scss`: nothing structural is needed beyond the slot file (the window body is a flex column; confirm at `:222-236`, else add `display: flex; flex-direction: column` only if parity stays 0).
- [ ] **Step 6: Run tests to verify they pass, then parity** — Expected: PASS. Re-shoot `desktop-desktop--*`, `desktop-window--*`, `desktop-app--*` → AE `0` (Platinum placement is `screen`, so no slot renders). — `pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Desktop`
- [ ] **Step 7: Lint, type-check, commit** — git add src/SystemFolder/SystemResources/{Window,Desktop} src/index.ts && git commit -m "feat(menubar): menuBar.placement window renders each window's menus in a ClassicyWindowMenuBar slot" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.integration.test.tsx`

## Phase 6: Alert, Disclosure, Tabs, icon grid origin

### 6.1: Sibling parts become orderable; clean-up reads iconGridOrigin

**Files:**
- Modify: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.tsx`
- Modify: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss`
- Modify: `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.tsx`
- Modify: `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.scss`
- Modify: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.tsx`
- Modify: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts`
- Test: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.layout.test.tsx`
- Test: `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.test.tsx`
- Test: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.layout.test.ts`

**Depends on:** 1.1

**Interfaces:**
- Consumes: `ClassicyAlert.tsx:272-311` (`.classicyAlertTop` = icon + body, `.classicyAlertButtons` = buttons from `resolvedButtons`, `button.role` ∈ `default | cancel | other | help`), `ClassicyAlert.scss:13-18, 68-74` (both already `display: flex; flex-direction: row`); Part A's `data-classicy-role`; `ClassicyDisclosure.tsx:104-125` (JSX branch on `labelPosition === "left"`), `ClassicyDisclosure.scss:7-12` (`display: flex; gap`); `ClassicyControlLabel` root class `classicyControlLabelHolder` (`ClassicyControlLabel.tsx:158-160`); `ClassicyTabs.tsx:307-308, 360` (`.classicyTabContainer` > `.classicyTabButtonsRow`, `.classicyTabsHolder`), `ClassicyTabs.scss:28-33, 46-52` (container is block; row has `margin-bottom: calc(var(--window-border-size) * -1)`); `ClassicyDesktopIconContext.tsx:26-31` (`createGrid`), `:33-44` (`getGridPosition`: `x = innerWidth − (iconSize*2 + pad)*col`, `y = (iconSize*2 + pad)*row + pad*4`), `:81-117` (`cleanupDesktopIcons(theme, icons)`), reducer calls at `:143-152, 227, 288`; store `ds.System.Manager.Appearance.packageId` (Part B); `getClassicyAppearanceLayout` (1.1).
- Produces: Alert: every non-help `ClassicyButton` at `:298-308` carries `data-classicy-role={button.role === "default" ? "default" : button.role === "cancel" ? "cancel" : "other"}` (add only if Part A did not); base SCSS adds only `.classicyAlertIcon { order: 10 } .classicyAlertBody { order: 20 }` and declares no `order` for buttons (today's button order is the `resolvedButtons` array order with the default last, and any base `order` keyed on role would reorder a consumer's custom button list); a package flips buttons with `.classicyAlertButtons { flex-direction: row-reverse; justify-content: flex-start }` or with `order` on `[data-classicy-role]`. Disclosure: header always renders triangle then label, with class `classicyDisclosureLabelLeft` on `.classicyDisclosureHeader` when `labelPosition === "left"`; SCSS `.classicyDisclosureLabelLeft > .classicyControlLabelHolder { order: -1 }` (the header keeps `justify-content` start, so `order` — not `row-reverse` — keeps the pair at the left edge). Tabs: `stripPosition?: "top" | "bottom"` (default `top`) → class `classicyTabStripBottom` on `.classicyTabContainer`; SCSS `.classicyTabContainer { display: flex; flex-direction: column; align-items: stretch }`, `.classicyTabStripBottom .classicyTabButtonsRow { order: 1; margin-bottom: 0; margin-top: calc(var(--window-border-size) * -1); align-items: flex-start }`. Icons: `export const classicyDesktopIconGridPosition = (iconSize: number, iconPadding: number, col: number, row: number, origin: ClassicyAppearanceLayout["desktop"]["iconGridOrigin"] = "top-right"): [number, number]` with `cell = iconSize * 2 + iconPadding`, `x = origin ends with "right" ? Math.floor(innerWidth − cell * col) : Math.floor(cell * (col − 1) + iconPadding)`, `y = origin starts with "top" ? Math.floor(cell * row) + iconPadding * 4 : Math.floor(innerHeight − cell * (row + 1)) − iconPadding * 4`; `cleanupDesktopIcons(theme, icons, origin = "top-right")`; the three reducer call sites pass `getClassicyAppearanceLayout(ds.System.Manager.Appearance.packageId).desktop.iconGridOrigin`.

- [ ] **Step 1: Write the failing tests** — `ClassicyDesktopIconContext.test.ts` (set `window.innerWidth = 1024; window.innerHeight = 768` via `Object.defineProperty`; iconSize 64, padding 16, cell 144):
```ts
it("top-right reproduces today's formula", () => expect(classicyDesktopIconGridPosition(64, 16, 1, 0)).toEqual([880, 64]));
it("top-left fills from the left edge", () => expect(classicyDesktopIconGridPosition(64, 16, 1, 0, "top-left")).toEqual([16, 64]));
it("bottom-right fills from the bottom", () => expect(classicyDesktopIconGridPosition(64, 16, 1, 0, "bottom-right")).toEqual([880, 560]));
it("bottom-left", () => expect(classicyDesktopIconGridPosition(64, 16, 1, 0, "bottom-left")).toEqual([16, 560]));
it("ClassicyDesktopIconCleanup uses the active package's origin", …) // store with packageId test-mirror (top-left), two visible icons → locations [16, 64] and [16, 208]
```
`ClassicyAlert.layout.test.tsx`: every `.classicyAlertButtons button:not(.classicyAlertHelpButton)` has a `data-classicy-role` in `{default, cancel, other}`; compiled `ClassicyAlert.scss` has `.classicyAlert .classicyAlertIcon` `order` `10`, `.classicyAlertBody` `20`, and no `float`. `ClassicyDisclosure.test.tsx` addition: `labelPosition="left"` → header has class `classicyDisclosureLabelLeft`, `header.lastElementChild` has class `classicyControlLabelHolder`, and the compiled rule `.classicyDisclosureLabelLeft > .classicyControlLabelHolder` has `order: -1`. `ClassicyTabs.layout.test.ts`: `rule(".classicyTabContainer").display === "flex"` with `flex-direction: column`; `rule(".classicyTabStripBottom .classicyTabButtonsRow").order === "1"`; a render with `stripPosition="bottom"` has the class on `.classicyTabContainer`.
- [ ] **Step 2: Run them to verify they fail** — Expected: FAIL. — `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts src/SystemFolder/SystemResources/Alert src/SystemFolder/SystemResources/Disclosure src/SystemFolder/SystemResources/Tabs`
- [ ] **Step 3: Alert: guarantee the role attribute; add the two `order` lines** — `ClassicyAlert.tsx:298-308`, `ClassicyAlert.scss:21-37`.
- [ ] **Step 4: Disclosure: one JSX order plus the class (`ClassicyDisclosure.tsx:104-125`, `.scss:7-12`)** — Per Interfaces.
- [ ] **Step 5: Tabs: `stripPosition` prop and flex column (`ClassicyTabs.tsx:27-29, 307`, `.scss:28-33, 46-52`)** — Per Interfaces; document the prop in the component's JSDoc.
- [ ] **Step 6: Icons: `classicyDesktopIconGridPosition` with origin; reducer passes the declared origin (`ClassicyDesktopIconContext.tsx:33-44, 81-117, 143-152, 227, 288`)** — `createGrid` (26-31) is unchanged. Run tests to verify they pass, then parity: re-shoot `dialogs-alert--*`, `controls-disclosure--*`, `controls-tabs--*`, `desktop-desktop--*`, `desktop-desktopicon--*` → AE `0` (the Tabs flex-column switch must leave the −1 px overhang in place).
- [ ] **Step 7: Run tests to verify they pass** — Expected: PASS, including `ClassicyDesktopIconEventHandler.test.ts:320-345` unchanged. — `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop src/SystemFolder/SystemResources/Alert src/SystemFolder/SystemResources/Disclosure src/SystemFolder/SystemResources/Tabs`
- [ ] **Step 8: Lint, type-check, commit** — git add src/SystemFolder/SystemResources/{Alert,Disclosure,Tabs,Desktop} && git commit -m "feat(layout): alert, disclosure and tabs parts orderable; desktop clean-up reads iconGridOrigin" (with the trailer). — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.test.ts`

## Phase 7: Proof: the mirrored package

### 7.1: Storybook mirrored stories, Playwright position checks, final parity and docs

**Files:**
- Create: `storybook/.storybook/MirroredPackage.ts`
- Create: `storybook/.storybook/mirrored.scss`
- Modify: `storybook/.storybook/ClassicyDecorators.tsx`
- Modify: `storybook/.storybook/helpers.tsx`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Alert/ClassicyAlert.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Tabs/ClassicyTabs.stories.tsx`
- Modify: `src/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.stories.tsx`
- Modify: `docs/AGENT-REFERENCE.md`
- Modify: `CLAUDE.md`

**Depends on:** 2.1, 3.1, 4.1, 5.1, 6.1

**Interfaces:**
- Consumes: `withClassicy` decorator (`ClassicyDecorators.tsx:52-105`: desktop path resets the store via `resetClassicyStore`, plain path spreads `getThemeVars` on a frame div), `desktopParameters` (`helpers.tsx:10-14`), Part B's `registerClassicyAppearancePackage`, `classicy-package` SCSS mixin and Vite `?inline`, action `ClassicyDesktopChangeAppearancePackage`.
- Produces: `MirroredPackage.ts` registers `{ id: "mirrored", name: "Mirrored (Storybook test)", css: mirroredCss, defaults: { ...getTheme("default"), id: "mirrored-default", name: "Mirrored", package: "mirrored" }, layout: { window: { growBoxCorner: "bottom-left" }, menuBar: { placement: "window" }, desktop: { iconGridOrigin: "top-left" } } }` where `mirroredCss` is `import mirroredCss from "./mirrored.scss?inline"`. `mirrored.scss` = `@use "@/Appearance/vocabulary/package"; @include package.classicy-package("mirrored") { [data-classicy-control="close"] { order: 50 } [data-classicy-control="zoom"] { order: 5 } [data-classicy-control="collapse"] { order: 6 } .classicyWindowTitleLeft, .classicyWindowTitleRight, .classicyWindowTitleCenter { display: none } .classicyAlertTop { flex-direction: row-reverse } .classicyAlertButtons { flex-direction: row-reverse; justify-content: flex-start } .classicyDesktopMenu > [data-classicy-part="switcher"] { order: 1; margin-right: auto } .classicyDesktopMenu > [data-classicy-part="extensions"] { margin-left: 0 } .classicyTabContainer .classicyTabButtonsRow { order: 1; margin-bottom: 0; margin-top: calc(var(--window-border-size) * -1) } .classicyDisclosureHeader > .classicyControlLabelHolder { order: -1 } }`. Decorator: `context.parameters.classicy?.appearancePackage` (string) → desktop path dispatches `ClassicyDesktopChangeAppearancePackage { packageId }` right after `resetClassicyStore` and sets `activeTheme.package`; plain path sets `data-classicy-appearance={packageId}` on the frame div and computes vars from `{ ...getTheme(themeId), package: packageId }`. `helpers.tsx` exports `mirroredParameters = { ...desktopParameters, classicy: { ...desktopParameters.classicy, appearancePackage: "mirrored" } }`. Stories: `Mirrored` in `Desktop/Window` (close box right, grip bottom-left, stripes hidden), `Dialogs/Alert` (icon right, default button leftmost), `Desktop/Desktop` (no screen bar; a window with `appMenu` shows the in-window bar; icons from the left), `Desktop/MenuBar` (`placement="screen"` prop forced so the flipped clusters show), `Controls/Tabs` (strip under the panel), `Controls/Disclosure` (label left by CSS).

- [ ] **Step 1: Write the failing Storybook smoke test** — `storybook/.storybook/MirroredPackage.test.ts` (vitest runs it from the root config if `storybook/**` is included; otherwise put it at `src/Appearance/MirroredPackage.test.ts` importing from `../../storybook/.storybook/MirroredPackage`): `it("registers the mirrored package with flipped layout", () => { import "./MirroredPackage"; expect(getClassicyAppearancePackage("mirrored")?.layout).toEqual({ window: { growBoxCorner: "bottom-left" }, menuBar: { placement: "window" }, desktop: { iconGridOrigin: "top-left" } }); expect(getClassicyAppearancePackage("mirrored")?.css).toMatch(/\[data-classicy-appearance="mirrored"\]/); })`.
- [ ] **Step 2: Run it to verify it fails** — Expected: FAIL (module not found). — `pnpm exec vitest run MirroredPackage`
- [ ] **Step 3: Implement `MirroredPackage.ts`, `mirrored.scss`, the decorator parameter and `mirroredParameters`** — Per Interfaces; import `./MirroredPackage` from `preview.tsx` so it registers once per Storybook session.
- [ ] **Step 4: Add the six `Mirrored` stories** — Each `export const Mirrored: Story = { ...Default, parameters: mirroredParameters }` (the `Desktop/MenuBar` story passes `placement="screen"`; the `Desktop/Desktop` story mounts a `ClassicyApp` with one `ClassicyWindow appMenu={[{ id: "file", title: "File", menuChildren: […] }]}` and two desktop icons).
- [ ] **Step 5: Playwright position checks** — With Storybook running, for each mirrored story run `browser_evaluate` and record the array into `.playwright-mcp/parity/part-F/mirrored.txt`; every entry must be `true`:
- `desktop-window--mirrored`: `(() => { const w = document.querySelector('.classicyWindow'); const r = w.getBoundingClientRect(); const c = w.querySelector('[data-classicy-control="close"]').getBoundingClientRect(); const t = w.querySelector('.classicyWindowTitleText').getBoundingClientRect(); const g = w.querySelector('.classicyWindowResizer').getBoundingClientRect(); return [c.left > t.right, Math.abs(g.left - r.left) < 4, Math.abs(g.bottom - r.bottom) < 4, getComputedStyle(w.querySelector('.classicyWindowTitleLeft')).display === 'none']; })()`
- `dialogs-alert--mirrored`: `(() => { const bs = [...document.querySelectorAll('.classicyAlertButtons button')].sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left); const i = document.querySelector('.classicyAlertIcon').getBoundingClientRect(); const b = document.querySelector('.classicyAlertBody').getBoundingClientRect(); return [bs[0].dataset.classicyRole === 'default', i.left >= b.right]; })()`
- `desktop-desktop--mirrored`: `(() => { const root = document.querySelector('.classicyDesktop'); const bar = document.querySelector('.classicyWindow .classicyWindowMenuBar'); const tb = document.querySelector('.classicyWindow .classicyWindowTitleBar').getBoundingClientRect(); const icon = document.querySelector('.classicyDesktopIcon').getBoundingClientRect(); return [document.querySelector('.classicyDesktopMenuBar') === null, root.dataset.classicyMenuBar === 'window', bar !== null && Math.abs(bar.getBoundingClientRect().top - tb.bottom) < 4, icon.left < 200]; })()`
- `desktop-menubar--mirrored`: `(() => { const q = p => document.querySelector(`[data-classicy-part="${p}"]`).getBoundingClientRect(); return [q('switcher').right <= q('apple').left]; })()`
- `controls-tabs--mirrored`: `(() => { const row = document.querySelector('.classicyTabButtonsRow').getBoundingClientRect(); const holder = document.querySelector('.classicyTabsHolder').getBoundingClientRect(); return [row.top >= holder.bottom - 2]; })()`
- `controls-disclosure--mirrored`: `(() => { const l = document.querySelector('.classicyDisclosureHeader .classicyControlLabelHolder').getBoundingClientRect(); const t = document.querySelector('.classicyDisclosureHeader svg').getBoundingClientRect(); return [l.right <= t.left]; })()`
A `false` is a slot that does not work: fix the component or `mirrored.scss`, not the expression.
- [ ] **Step 6: Final parity** — Re-shoot every id in `stories.txt` into `after/` and `for f in before/*.png; do printf '%s ' "$(compare -metric AE "$f" "after/$(basename "$f")" null: 2>&1)"; echo "$f"; done` → `0` for every story (the `--mirrored` ids are new and have no `before/`; shoot them into `after/` for the record).
- [ ] **Step 7: Document** — `docs/AGENT-REFERENCE.md`: a "Layout declarations" subsection (the three keys, their CSS variables and root attributes, `useClassicyAppearanceLayout`/`getClassicyAppearanceLayout`), the part attributes a package may `order`, `ClassicyTabs.stripPosition`, `ClassicyWindowMenuBar`, `computeClassicyWindowResize`. `CLAUDE.md` Theming section: one paragraph — arrangement is CSS `order` on `data-classicy-control`/`data-classicy-role`/`data-classicy-part` plus the package's `layout` block read by `useClassicyAppearanceLayout()`; the Storybook `mirrored` package is the proof and the template for a new package.
- [ ] **Step 8: Lint, type-check, commit; final verification** — git add storybook/.storybook src docs/AGENT-REFERENCE.md CLAUDE.md && git commit -m "test(storybook): mirrored appearance package proves every arrangement slot" (with the trailer). Then `pnpm build:source` → PASS and `pnpm build:storybook` → PASS; stop background dev servers. — `pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`

**Validation:** `pnpm exec vitest run MirroredPackage && cat .playwright-mcp/parity/part-F/mirrored.txt  # every entry true`

## Acceptance Criteria

- [ ] `getThemeVars(getTheme("default"))` emits `--classicy-layout-grow-box-corner: bottom-right`, `--classicy-layout-menu-bar-placement: screen`, `--classicy-layout-icon-grid-origin: top-right`; the desktop root carries `data-classicy-menu-bar` and `data-classicy-grow-box`.
- [ ] `git grep -n 'float: right' src/SystemFolder/SystemResources/Desktop/MenuBar` returns nothing; the six clusters are direct flex children with `order` 10…60.
- [ ] `computeClassicyWindowResize` passes the four-corner table; the bottom-right path reproduces today's numbers; a mirrored window's grip drag moves `style.left`.
- [ ] With `menuBar.placement: "window"` the screen bar renders nothing, each window with `appMenu` renders `.classicyWindowMenuBar`, and the shortcut integration test still fires the chord.
- [ ] Disclosure left label, Tabs bottom strip and alert icon/button order are reachable by CSS alone; `ClassicyDesktopIconCleanup` honors all four origins.
- [ ] Six `--mirrored` stories exist and every Playwright position expression records `true`; parity AE 0 for every pre-existing story.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit -p .`, `pnpm test`, `pnpm build:source`, `pnpm build:storybook` all pass.

## Self-Review

| Requirement | Delivered by |
|---|---|
| Contract: useClassicyAppearanceLayout(), --classicy-layout-* from getThemeVars, data-classicy-menu-bar / data-classicy-grow-box on the desktop root | 1.1 Steps 3-5 |
| §9 Phase 5 item 6: menu bar floats → flex + order on data-classicy-part clusters | 2.1 Steps 3-4 |
| §5 / §8.8: control-box order and side via data-classicy-control; stripe spans hideable; grip position by corner | 3.1 Steps 3-4 |
| §8.8: resize math reads window.growBoxCorner and anchors the opposite corner; tests for four corners | 4.1 Steps 1, 3-4 |
| §8.8: menuBar.placement window — window-level slot, screen bar skipped, shortcut dispatch unchanged | 5.1 Steps 3-5 |
| §9 Phase 5 item 6: Alert order, Disclosure label class, Tabs strip class, desktop.iconGridOrigin | 6.1 Steps 3-6 |
| Umbrella: one mirrored Storybook story per surface driven by a registered test package; Playwright position assertions | 7.1 Steps 3-5 |
| Platinum pixel-identical | Phase 0; 2.1 Step 5; 3.1 Step 5; 4.1 Step 6; 5.1 Step 6; 6.1 Step 6; 7.1 Step 6 |

**Placeholder scan:** No TBDs. Each step names its file and lines, exact signatures, selectors and numbers, and its command with expected output. Selector strings written as `<title bar selector>` / `<resizer selector>` are to be read off the compiled stylesheet with the same `rule()` helper the resizer test already uses; the asserted values are the contract.
**Residual risk:** (1) Float → flex can change a cluster's height under `stretch`; `align-items: flex-start` mimics floats and parity is the gate. (2) The `+5` fudge and `menuBarHeight = 30` remain (Part G item 4); a window placement therefore still reserves a 30 px top band. (3) `data-classicy-part` on menu `li`s depends on how Part A reached them; 2.1 Step 4 carries the fallback through `ClassicyMenuItem.part`. (4) The Storybook test package relies on Part B's `?inline` + `classicy-package` pipeline being usable from `storybook/.storybook`; if the alias `@/Appearance/vocabulary/package` is not resolvable there, add it to `storybook/.storybook/main.ts` `viteFinal.resolve.alias`.

## Next Steps

1. Report to 0002-ldj the contract gaps: (a) the file path of `useClassicyAppearanceLayout` (this plan: `src/Appearance/useClassicyAppearanceLayout.ts`) and the non-hook getter name `getClassicyAppearanceLayout` used by reducers and `getThemeVars`; (b) a `ClassicyMenuItem.part` field if Part A cannot put `data-classicy-part` on menu-bar `li`s any other way; (c) whether `Appearance.packageId` and `theme.package` must agree (the icon reducer reads `packageId`, `getThemeVars` reads `theme.package`); (d) whether `ClassicyAppearanceLayout` should gain `menuBar.clusters` for the in-window bar's missing Apple/Help/switcher homes.
2. Part G item 4: `menuBarHeight = 30` and `CLASSICY_WINDOW_RESIZE_FUDGE` read measured values; with placement `window` the reserved top band disappears.
3. Part H: `mirrored.scss` is the template a real second package (Windows 3.11) starts from.
