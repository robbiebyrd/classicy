# Central Keyboard-Shortcut Registry — Design

**Status:** Approved (design)
**Date:** 2026-07-24

## Goal

Make keyboard-shortcut behavior in Classicy explicit and arbitrated:

1. **App shortcuts** (declared on menu items) fire **only when that app is focused**.
2. **Global shortcuts** (work regardless of focus) may be declared **only by
   Classicy Extensions**, explicitly.
3. Global shortcuts **cannot conflict** with each other — **the first registrant
   of a chord wins**; later duplicate registrations are ignored.

A single registry in the Zustand store is the source of truth, and one central
`document` keydown dispatcher arbitrates every modifier-chord shortcut.

## Background — current state

- **App menu shortcuts are already focus-scoped, but only incidentally.** The
  desktop menu bar mounts one `document` keydown listener
  (`ClassicyMenu.tsx:93-121`) that matches against `System.Manager.Desktop.appMenu`
  — the **focused** app's menu. Switch apps and the menu (and its shortcuts) swap
  out. There is no registry enforcing this; it falls out of the menu-bar swap.
- **Extensions have no shortcut path.** `extension: true` apps
  (`ClassicyApp.tsx:30`) are background-only (no Apple-menu entry, no menu-bar
  presence), so they never push an `appMenu` and cannot register any shortcut.
- **Two escape hatches bypass focus:** ad-hoc `document`/`window` keydown
  listeners (e.g. `QuickTimeMovieEmbed.tsx:159`) and dialog `useKeyboardEquivalents`.
- **No conflict detection** exists anywhere.

## Requirements

- **R1** — App shortcuts fire only while their app is the focused app. Different
  apps may reuse the same chord (each active only when focused).
- **R2** — Global shortcuts are declared only by Extensions, via an explicit,
  declarative API. Firing a global shortcut dispatches an event into the store.
- **R3** — Global shortcuts are unique across all globals; **first registrant
  wins**, later duplicates ignored (dev `console.warn`).
- **R4** — Precedence, highest to lowest: (1) the **focused app's** shortcut,
  (2) an always-active **system** shortcut (the desktop's own Apple/system/Help
  menus, which are in the bar regardless of focus — e.g. Help `⌥H`, `⌃S`),
  (3) an Extension **global**. A lower tier fires only when no higher tier claims
  the chord. Overlap across tiers is precedence, **not** a conflict.
- **R5** — Scope is **modifier chords only** (`⌘`/`⌃`/`⌥` + key). Plain-key and
  dialog handling (Return, Escape, ⌘-. cancel, media Space/arrows) is unchanged.
- **R6** — Existing menu shortcut behavior is preserved: `onClickFunc` and
  `event`/`eventData` menu actions still fire; `nativeShortcut` items
  (⌘Z/X/C/V/A) are never intercepted.
- **R7** — The registry is runtime state, rebuilt each session from mounted
  apps/extensions, and is **excluded from `localStorage` persistence**.

## Design

### Data model — `System.Manager.Keyboard`

```ts
type ClassicyKeyboardState = {
  // Canonical chords each app claims (serializable — strings only). Keyed by appId
  // so focus-scoping is a single lookup. Auto-derived from the app's menu.
  app: Record<string, string[]>;
  // Always-active chords owned by the desktop's Apple/system/Help menus. Claims
  // only; action resolved from the live system/Help menu. Fire regardless of focus.
  system: string[];
  // Extension globals. Unique across all globals; first-wins. Serializable action.
  global: Record<string, { appId: string; event: string; eventData?: Record<string, unknown> }>;
};
```

- **`canonicalChord(raw: string): string`** — a new helper built on the existing
  `parseKeyboardShortcut`. Produces a stable key: modifiers in fixed order
  (control, option, shift, command) + the lowercased key, e.g.
  `"Cmd+Shift+S"` → `"command+shift+s"`. Used as the `global` map key, as the
  per-app claim value, and for conflict detection. Empty-key shortcuts (no
  non-modifier key) canonicalize to `""` and are ignored.

**Why claims, not actions, for app shortcuts:** existing menu shortcuts use
`onClickFunc` **closures** (e.g. HyperCard's ⌃T View-menu toggle). Closures cannot
live in the store (it persists to `localStorage`; `sanitizeStateForPersistence`
already strips non-serializable runtime). So the registry stores only *which
appId claims which chord*; the **action** for an app shortcut is resolved from
that app's **live menu** at dispatch time via the existing
`findMenuItemByShortcut`. Extension globals have no menu, so they store a
serializable `{ event, eventData }` directly.

### Registration

- **Events** (new reducer cases, routed by the existing prefix router):
  - `ClassicyShortcutRegister` — `{ scope: "app" | "system" | "global", appId, ... }`.
    - `scope: "app"` — payload carries the app's canonical chords
      (`chords: string[]`); replaces `app[appId]` (idempotent re-registration on
      menu change). A duplicate chord *within the same list* is de-duplicated +
      dev-warned.
    - `scope: "system"` — payload carries `chords: string[]`; replaces the
      `system` claim list (idempotent). Registered by the desktop, not an app.
    - `scope: "global"` — payload carries `{ chord, event, eventData? }`. If
      `global[chord]` already exists, the registration is **ignored** (first-wins)
      and dev-warned; otherwise it is added.
  - `ClassicyShortcutUnregister` — `{ scope, appId, chord? }`. Removes
    `app[appId]` (all of that app's claims) or a specific `global[chord]` owned by
    `appId` (an extension only unregisters chords it owns). (`system` is desktop-
    lifetime and is simply re-registered when its menus change.)
- **App auto-registration:** `ClassicyApp` walks its menu (the same `appMenu` it
  already manages), collects each item's `keyboardShortcut` (skipping
  `nativeShortcut` items), canonicalizes them, and dispatches
  `ClassicyShortcutRegister { scope: "app" }` on mount and whenever the menu
  changes; dispatches `ClassicyShortcutUnregister { scope: "app" }` on unmount.
  The menu remains the single authoring surface — glyph and claim never drift.
- **Extension global declaration:** a new optional prop on `ClassicyApp`:
  ```tsx
  <ClassicyApp extension globalShortcuts={[{ shortcut: "Ctrl+Space", event: "MyExtToggle", eventData: {…} }]}>
  ```
  `type ClassicyGlobalShortcut = { shortcut: string; event: string; eventData?: Record<string, unknown> }`.
  On mount, each entry is canonicalized and dispatched as
  `ClassicyShortcutRegister { scope: "global" }`; on unmount, `ClassicyShortcutUnregister`.
  `globalShortcuts` is honored only for `extension` apps (ignored + dev-warned
  otherwise, enforcing R2).
- **System auto-registration:** the desktop menu bar
  (`ClassicyDesktopMenuBar`) already builds the combined Apple/system/Help menu.
  It walks the **system + Help** portions (not the focused app's `appMenu`),
  collects their `keyboardShortcut`s (skipping `nativeShortcut`), canonicalizes,
  and dispatches `ClassicyShortcutRegister { scope: "system" }` on mount and
  whenever those menus change. This runs at desktop init — before any extension
  mounts — so system chords are claimed first.

### Dispatch — the one central listener

A new hook/component (mounted once by `ClassicyDesktop`) binds a single
`document` keydown listener. On each keydown:

1. Ignore unless a menu-equivalent modifier is present (`metaKey || ctrlKey ||
   altKey`), mirroring today's guard. Apply the existing text-field guard
   (Option-only chords do not fire inside `INPUT`/`TEXTAREA`/`contentEditable`).
   Skip if `event.defaultPrevented`.
2. Compute `chord = canonicalChord` from the event (a new
   `canonicalChordFromEvent(e)` that mirrors `shortcutMatchesEvent`'s
   command-or-ctrl handling and key/code fallback). If no non-modifier key, bail.
   The action for tiers 3–4 resolves from the combined live menu
   (`System.Manager.Desktop.appMenu` + system + Help) via
   `findMenuItemByShortcut(combinedMenu, e)`; the chord uniquely identifies the
   item, so the claim tier is only the *gate*, not which subtree is searched.
3. **Focused app (tier 1):** if `app[focusedAppId]` includes `chord`, resolve its
   action from the combined menu, run it (`runMenuItemAction`),
   `preventDefault()`, stop.
4. **System (tier 2):** else if `system` includes `chord`, resolve its action
   from the combined menu, run it, `preventDefault()`, stop.
5. **Global (tier 3):** else if `global[chord]` exists, dispatch
   `{ type: global[chord].event, ...global[chord].eventData }`,
   `preventDefault()`, stop.
6. Else let the keystroke pass through (native).

`nativeShortcut` items are never intercepted (they are excluded from app/system
auto-registration in the first place, so their chords are not claimed).

### Migration / what changes

- Remove `ClassicyMenu`'s `document` keydown effect (`ClassicyMenu.tsx:93-121`)
  and its `findMenuItemByShortcut` import usage there. Menu **click / flash /
  submenu / action** machinery is untouched.
- Add the central dispatcher (mounted by `ClassicyDesktop`).
- `findMenuItemByShortcut`, `runMenuItemAction`, `parseKeyboardShortcut` are
  reused unchanged. Add `canonicalChord` / `canonicalChordFromEvent` beside them
  in `ClassicyKeyboardShortcut.ts`.
- Every existing menu shortcut (including the View-menu ⌃T/⌃I) keeps working,
  now gated on the registry claim derived from the same menu.
- `sanitizeStateForPersistence` strips `System.Manager.Keyboard`.

### Out of scope (per approved boundary)

- Plain-key / dialog handling: Return, Escape, ⌘-. (cancel via
  `useKeyboardEquivalents`), media Space/arrows — unchanged.
- Ad-hoc global listeners (e.g. `QuickTimeMovieEmbed` window keydown, which use
  plain keys anyway) — **follow-up** to focus-guard; noted, not built here.
- Remapping/user-configurable shortcuts, chord sequences (multi-key), and a
  visual shortcut-conflict UI — not in this feature.

## Testing

- **`canonicalChord`:** `"Cmd+Shift+S"`, `"⇧⌘S"`, `"command shift s"` all →
  `"command+shift+s"`; modifier-only → `""`; case/spacing/glyph-insensitive.
- **Reducer:** app register replaces prior claims; global register adds; a second
  global register of the same chord is ignored (first-wins) and does not overwrite
  owner/event; unregister removes app claims / an owned global; unknown
  unregister is a no-op.
- **Persistence:** `sanitizeStateForPersistence` output has no
  `System.Manager.Keyboard`.
- **Extension prop:** a non-extension app's `globalShortcuts` is ignored + warned;
  an extension's globals register on mount and unregister on unmount.
- **Dispatcher:** focused app's claimed chord runs its menu action and
  `preventDefault`s; a **system** chord (e.g. Help `⌥H`) fires regardless of which
  app is focused; a global fires when no focused-app/system claim matches; a
  global is shadowed when the focused app (or system) claims the same chord;
  native/text-field guards hold; `nativeShortcut` chords are never claimed nor
  intercepted. Removing `ClassicyMenu`'s listener also drops the transient
  contextual-menu keyboard path — intended (a right-click menu's chords must not
  fire globally).
- **Integration:** an app's menu shortcut fires only when that app is focused; an
  extension global fires regardless of focus except when shadowed.

## Acceptance Criteria

1. App menu shortcuts fire only when the app is focused; different apps may reuse
   a chord (R1).
2. Extensions declare globals via `globalShortcuts`; firing dispatches the event
   (R2). Non-extension `globalShortcuts` is ignored.
3. Duplicate global registration is ignored, first-wins (R3).
4. Precedence focused app > system > global; a lower tier fires only when no
   higher tier claims the chord; system shortcuts (Help `⌥H`, `⌃S`) keep working
   regardless of focus (R4).
5. Only modifier chords are governed; dialogs/plain keys unchanged (R5).
6. `onClickFunc` and `event` menu actions still fire; `nativeShortcut` never
   intercepted (R6).
7. Registry excluded from persistence (R7).
8. Old `ClassicyMenu` document listener removed; touched-file Biome clean;
   `pnpm build:source` type-clean; existing tests green.
