---
id: 0064-fx9
title: 'F 5.1: menuBar.placement = window: headless screen bar, ClassicyWindowMenuBar slot'
purpose: 'Let a package declare menuBar.placement "window": the screen bar keeps its hooks but renders nothing, and each window renders its own appMenu in a new ClassicyWindowMenuBar slot under the title bar, with keyboard-shortcut dispatch unchanged.'
type: feat
status: pending
priority: "2"
effort: M
created: "2026-10-28T20:31:22.637Z"
updated: "2026-10-29T20:22:00.352Z"
links:
  repo:
    local: ~/classicy
    files:
      - src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.scss
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx
      - src/SystemFolder/SystemResources/Window/ClassicyWindow.scss
      - src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.test.tsx
      - src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.integration.test.tsx
      - src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.layout.test.tsx
      - src/index.ts
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0063-n9x", "depends"]
  plans:
    - ["0010-743", "included", ["5.1"]]
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

# F 5.1: menuBar.placement = window: headless screen bar, ClassicyWindowMenuBar slot

## Problem Statement

Audit §5 ("Desktop | Menu bar at screen top"): the screen menu bar is simply the desktop's first child (`ClassicyDesktop.tsx:636`). Today `ClassicyWindow` takes `appMenu` (`ClassicyWindow.tsx:290, 467`) and, when focused, publishes it with `ClassicyWindowMenu { menuBar }` (`:924-948`) into `System.Manager.Desktop.appMenu` (`ClassicyDesktopManager.tsx:273`); `ClassicyDesktopMenuBar` builds `defaultMenuItems` (`:291-301`), runs `useClassicyShortcutDispatcher` (`:303`) and the `ClassicyShortcutRegister` effects (`:316-344`), and renders the `<nav>` (`:351-369`) inside `ClassicyMenuProvider` (`:128-134`). There is no in-window slot.

This section (plan 0010-743 §5.1, umbrella 0002-ldj; §8.8 `menuBar.placement`) gives `ClassicyDesktopMenuBar` a `placement` prop defaulting to the layout value — it keeps every hook and returns `null` for `window` so chords still register and dispatch — and adds `ClassicyWindowMenuBar`, rendered by `ClassicyWindow` under the title bar when placement is `window`, the window has a non-empty `appMenu`, is not a utility window and is not collapsed. Named limitation: the Apple, Help and switcher clusters have no in-window home, and `menuBarHeight = 30` (`ClassicyWindow.tsx:57, 120, 160, 1316`) still reserves the top band until Part G item 4.

**Impact:** Without it `menuBar.placement` is a dead declaration: the mirrored desktop story (7.1) cannot show an in-window bar and a Windows 3.11-style package has nowhere to put its menus.

## Steps

### 1: Write the failing tests

`ClassicyWindowMenuBar.test.tsx`: `it("renders the window's menus as a bar", () => { render(<ClassicyWindowMenuBar appId="T.app" windowId="main" menuItems={[{ id: "file", title: "File", menuChildren: [{ id: "new", title: "New" }] }]} />); expect(container.querySelector(".classicyWindowMenuBar .classicyDesktopMenu")).not.toBeNull(); expect(screen.getByText("File")).toBeInTheDocument(); })`. `ClassicyDesktop.layout.test.tsx` additions: with `test-mirror` active (1.1), `expect(container.querySelector(".classicyDesktopMenuBar")).toBeNull()`; render a `ClassicyApp` + `ClassicyWindow appMenu={[File…]}` inside the desktop → `expect(container.querySelector(".classicyWindow .classicyWindowMenuBar")).not.toBeNull()` and, after switching back to `platinum`, `.classicyWindowMenuBar` is null and `.classicyDesktopMenuBar` is back. `ClassicyShortcutDispatcher.integration.test.tsx`: copy its existing "chord fires the focused app's item" case (the `it` at the top of the file) into `it("still fires with the screen bar headless (placement window)", …)` that activates `test-mirror` first and asserts the same `onClickFunc` call.

### 2: Run them to verify they fail

`pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.test.tsx src/SystemFolder/SystemResources/Desktop` — Expected: FAIL (module not found; screen bar still rendered).

### 3: Implement `ClassicyWindowMenuBar.tsx` + `.scss`

`export type ClassicyWindowMenuBarProps = { appId: string; windowId: string; menuItems: ClassicyMenuItem[] }`; renders `<div className="classicyWindowMenuBar" data-classicy-part="window-menu-bar"><ClassicyMenuProvider><ClassicyMenu name={`${appId}_${windowId}_menuBar`} menuItems={menuItems} navClass="classicyDesktopMenu classicyWindowMenu" subNavClass="classicySubMenu" /></ClassicyMenuProvider></div>` (`ClassicyMenu` props `name`, `menuItems`, `navClass`, `subNavClass`, `ClassicyMenu.tsx:109-113, 140-157`). `ClassicyWindowMenuBar.scss`: `.classicyWindowMenuBar { flex: 0 0 auto; width: 100%; box-sizing: border-box }` and `.classicyWindowMenu { border-radius: 0; padding: 0 var(--window-padding-size) }`. `pnpm exec barrelsby -c .ts-barrel.json`.

### 4: Make `ClassicyDesktopMenuBar` headless for `window` placement

Add `placement?: "screen" | "window"` (default `useClassicyAppearanceLayout().menuBar.placement`) at `:128-134`; `ClassicyDesktopMenuBarContent` keeps every hook and `return null` after the hooks at `:351` when `placement === "window"` (the provider still wraps it); the doc comment at `:110-127` gains one sentence. `ClassicyDesktop.tsx:636` passes nothing (the default reads the layout).

### 5: Render the slot from `ClassicyWindow.tsx`

Insert `<ClassicyWindowMenuBar appId={appId} windowId={id} menuItems={appMenu} />` after the title bar (before `:1760`) when `layout.menuBar.placement === "window" && appMenu && appMenu.length > 0 && windowType !== "utility" && !ws.collapsed`; `ClassicyWindow.scss`: nothing structural is needed beyond the slot file (the window body is a flex column; confirm at `:222-236`, else add `display: flex; flex-direction: column` only if parity stays 0).

### 6: Run tests to verify they pass, then parity

`pnpm exec vitest run src/SystemFolder/SystemResources/Window src/SystemFolder/SystemResources/Desktop` — Expected: PASS. Re-shoot `desktop-desktop--*`, `desktop-window--*`, `desktop-app--*` → AE `0` (Platinum placement is `screen`, so no slot renders).

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test`, then `git add src/SystemFolder/SystemResources/{Window,Desktop} src/index.ts && git commit -m "feat(menubar): menuBar.placement window renders each window's menus in a ClassicyWindowMenuBar slot"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.integration.test.tsx
- [ ] VERIFY: pnpm exec vitest run src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.test.tsx src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.layout.test.tsx
- [ ] With `menuBar.placement: "window"` the screen bar renders nothing, each window with a non-empty `appMenu` renders `.classicyWindowMenuBar` under its title bar, and the chord integration test still fires the item; with `screen` nothing changes.

## Files

- `src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.tsx` - create: in-window menu bar slot
- `src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.scss` - create: slot layout
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` - modify: menu bar reads placement from the layout
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.tsx` - modify: placement prop, headless when window
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` - modify: render the slot
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.scss` - modify: only if the body is not already a flex column
- `src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.test.tsx` - create: slot test
- `src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher.integration.test.tsx` - modify: headless-bar chord test
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.layout.test.tsx` - modify: placement tests
- `src/index.ts` - regenerate barrel

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
