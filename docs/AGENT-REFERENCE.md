# Classicy — Public API Reference for AI Agents

This document describes the public interface of the `classicy` npm package for
coding agents working in **consumer** applications (apps that install and use
Classicy). It covers every UI component, the app registration interface, event
and icon registration, and the other extension seams the package exposes.

Classicy is a React/TypeScript UI framework that replicates the Mac OS 8
(Platinum) interface: a desktop, menu bar, windows, and a full set of
Platinum-styled controls, plus built-in apps (Finder, SimpleText, HyperCard,
PDF Viewer, Movie Player, Picture Viewer, Web Viewer).

- Package: `classicy` (ES + UMD builds, TypeScript types included)
- License: Unlicense
- Peer dependencies you must install: `react` (18 or 19), `react-dom`,
  `zustand@^5`, `immer@^11`, `@tanstack/react-table@^8`, `react-player@^3`

**Writing an app rather than looking up an API?** Read
[`BUILDING-APPS.md`](BUILDING-APPS.md) instead — it is the narrative,
step-by-step version of §3 here, and covers the failure modes (prefix
collisions, menu memoization, window id collisions, persistence) that this
reference only names.

---

## 1. Installation & Setup

```bash
npm install classicy react react-dom zustand immer @tanstack/react-table react-player
```

Every export comes from the package root (a flat barrel). Importing it also
installs the stylesheet: the bundle injects `classicy.css` as a
`<style id="classicy-styles">` at the top of `<head>` on first import (once; not
during SSR). The bundled fonts are files (`dist/assets/*.woff2`) that the
Platinum appearance package registers at runtime, so there is nothing to import:

```ts
// no longer needed: the Platinum package registers its fonts; the import is a deprecated no-op
// import 'classicy/fonts'
```

Under a Content-Security-Policy that forbids inline `<style>`, link
`classicy/dist/classicy.css` instead; importing it as well is harmless. Link
`classicy.css` **first in `<head>`**, before any other stylesheet: its opening
layer order statement (below) only fixes the order if no earlier sheet has
named a layer.

**Vite consumers (breaking change).** The package's fonts and art are files in
`dist/assets/`, referenced as `new URL("assets/…", import.meta.url)`. Vite's dev
server pre-bundles dependencies into `node_modules/.vite/deps/`, which rewrites
those URLs, so fonts and art would come back as the SPA fallback page. Keep
classicy out of the pre-bundle:

```ts
// vite.config.ts
export default defineConfig({
    optimizeDeps: { exclude: ['classicy'] },
})
```

Excluding classicy means any CommonJS dependency it pulls in may then need to be
listed in `optimizeDeps.include`. Bundlers that handle
`new URL(…, import.meta.url)` (a Vite production build, webpack 5, Rollup with a
URL plugin) need no setting; with any other (plain esbuild, Rollup without such
a plugin), copy `dist/assets/` next to your bundle.
Also new in this release: `import 'classicy/fonts'` is a deprecated no-op (the
Platinum package registers its fonts), and `classicy/dist/fonts.css` no longer
exists.

### Cascade layers (overriding Classicy styles)

The stylesheet (injected or linked) starts by declaring three cascade layers,
then puts every Classicy component rule in the first one:

```css
@layer classicy.base, classicy.package, classicy.user;
@layer classicy.base { /* every component stylesheet, one block per file */ }
```

`classicy.package` is reserved for appearance packages and `classicy.user` for
host overrides; a later layer beats an earlier one whatever the specificity.
The runtime fonts stylesheet (`<style id="classicy-fonts-platinum">`, written by
`registerClassicyFonts`) is not layered: it holds only `@font-face` rules, which
layers do not affect.

**Consequence for hosts.** Classicy's order statement is the first thing in
`<head>` (the injected `<style>` is inserted at the top), so Classicy's three
layers come first in the layer order. Two kinds of host CSS therefore outrank
*every* Classicy layer, `classicy.user` included, whatever their specificity:

1. **Unlayered CSS.** A host `button { padding: 0 }` now beats Classicy's
   `.classicyButton { padding: … }`. Before, the host rule needed higher
   specificity, or equal specificity and a later position.
2. **Every host layer declared later**, which is all of them. Layered
   frameworks and resets fall here. The canonical case is Tailwind v4: its
   preflight sits in `@layer base` and resets `*{margin:0;padding:0;border:0
   solid}`, which now strips the bevels, padding and borders from every
   Classicy control. The same goes for its `components` and `utilities` layers,
   and for any reset you put in a layer of your own.

To **override** Classicy on purpose, write plain unlayered rules, or put the
overrides in `@layer classicy.user { … }`. That beats `classicy.base` and
`classicy.package` (an appearance package) whatever the specificity, and still
loses to your unlayered CSS and your own layers.

To keep a broad host default from overriding Classicy's components, put it in
**`classicy.base.host`**. That sublayer name is reserved for hosts, and Classicy
never declares or uses it. A sublayer ranks below the rules directly in
`classicy.base`, so Classicy's own rules win there, and the default applies
everywhere else:

```css
@layer classicy.base.host {
  div { overscroll-behavior: none; }  /* Classicy's pop-up list keeps `contain` */
}
```

**Tailwind v4.** `@import "tailwindcss";` is shorthand for four lines that
load Preflight into `@layer base`, which outranks Classicy. Adding a second
Preflight import next to it does not help, because the shorthand still loads its
own copy into `base`. **Replace** `@import "tailwindcss";` with its granular
form, and move only Preflight:

```css
/* replaces @import "tailwindcss"; */
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(classicy.base.host);
@import "tailwindcss/utilities.css" layer(utilities);
```

These file and layer names follow Tailwind's own Preflight page (tailwindcss.com/docs/preflight).
Its utilities still beat Classicy, which is usually what you want from a
`class="…"` on a Classicy element. Your own `@layer base` styles also still
outrank Classicy, so put any meant only for your markup in `classicy.base.host` too.

`!important` reverses the order: an `!important` declaration in
`classicy.base` would beat an unlayered `!important` one, which is why Classicy
ships none. Inline `style` attributes are unaffected by layers.

Package `exports` map:

| Specifier | Resolves to |
|---|---|
| `classicy` | ES/UMD bundle + types |
| `classicy/dist/classicy.css` | The stylesheet the bundle injects; link it yourself only under a strict CSP |
| `classicy/fonts` | Deprecated no-op kept so existing `import 'classicy/fonts'` lines keep resolving |
| `classicy/dist/*` | Anything in dist; the fonts ship as `dist/assets/*.woff2` |
| `classicy/scss/*` | Raw SCSS partials (theme styles) |

### Minimal app

```tsx
import {
    ClassicyAppManagerProvider,
    ClassicyDesktop,
    ClassicyApp,
    ClassicyWindow,
    ClassicyButton,
    registerClassicyIcons,
} from 'classicy'
import myIcon from './my-icon.png'

// Register custom icons ONCE, at module scope, before rendering.
export const AppIcons = registerClassicyIcons({ demo: { app: myIcon } })

export default function App() {
    return (
        <ClassicyAppManagerProvider>
            <ClassicyDesktop>
                <ClassicyApp id="MyApp.app" name="My App" icon={AppIcons.demo.app}>
                    <ClassicyWindow id="main" appId="MyApp.app" title="Hello" defaultWindow>
                        <ClassicyButton>OK</ClassicyButton>
                    </ClassicyWindow>
                </ClassicyApp>
            </ClassicyDesktop>
        </ClassicyAppManagerProvider>
    )
}
```

### ClassicyAppManagerProvider props (root provider)

All optional:

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `gaMeasurementIds` | `string[]` | — | Google Analytics measurement ids |
| `gtmContainerId` | `string` | — | Google Tag Manager container |
| `appName` | `string` | `"classicy"` | Analytics app name; also namespaces the persisted user id (`${appName}_user_id`) |
| `eventPrefix` | `string` | `"classicy_"` | Prefix applied to analytics `track()` event names (not pageview paths) |
| `defaultState` | `DeepPartial<ClassicyStore>` | — | Initial store overrides; applied ONCE, and only when nothing was hydrated from localStorage |
| `defaultFileSystem` | `ClassicyFileSystemTree` | — | Seed file system tree |
| `defaultFileSystemMode` | `"merge" \| "exclusive"` | `"merge"` | How the seed combines with stored state |
| `defaultFileSystemSeedMigrations` | `ClassicyFileSystemSeedMigration[]` | — | One-time corrections applied to a **returning** visitor's persisted tree (see `ClassicyFileSystemSeedMigrations.ts`) |
| `disableSimpleText`, `disablePDFViewer`, `disableMoviePlayer`, `disablePictureViewer`, `disableHyperCard`, `disableWebViewer` | `boolean` | `false` | Turn off individual built-in apps |
| `defaultMuted` | `boolean` | `false` | Boot with sound off (first mount only; not persisted) |

State persists automatically to `localStorage` under the key
`classicyDesktopState` (debounced 500 ms). Because persisted state wins over
`defaultState`, clearing that key resets the desktop.

---

## 2. Core Concepts: Store, Dispatch, Events

Classicy has one global Zustand store (`ClassicyStore`) and one event reducer.
Everything — windows, apps, desktop icons, themes, date/time — is driven by
dispatching `{ type: string, ...payload }` actions.

### Reading state

```tsx
import { useAppManager } from 'classicy'

// ALWAYS use a selector — subscribing to the whole store causes excess re-renders.
const app = useAppManager((s) => s.System.Manager.Applications.apps['MyApp.app'])
```

Store shape (top level):

```ts
interface ClassicyStore {
    System: {
        Manager: {
            Desktop:      // icons, menus, selectBox, disableBalloonHelp, fsVersion, ...
            Sound:        // volume, labels, disabled[]
            Applications: // apps: Record<appId, app>, fileTypeHandlers, focusedAppId
            Appearance:   // availableThemes, customThemes, activeTheme, alertSound, alertVolume
            DateAndTime:  // dateTime, timeZoneOffset, display flags, bounds
            Boot:         // paradeIcons
            Keyboard:     // app/system/global shortcut registries
        }
    }
}
```

Note: the app slice is `System.Manager.Applications` (not `.App`). Each app is
`{ id, name, icon, windows, open, focused?, data?: Record<string, unknown>, ... }` —
`data` is your app's private state bag, written by your event handler.

`windows` is a `Record<windowId, ClassicyStoreSystemAppWindow>` (exported alias
`ClassicyStoreSystemAppWindows`; each entry's `id` equals its key). Read and
write it through the helpers in `ClassicyAppWindows.ts`, all exported from
`classicy`. Read helpers accept `undefined` for a missing app:

```ts
getAppWindow(app, id): ClassicyStoreSystemAppWindow | undefined
listAppWindows(app): ClassicyStoreSystemAppWindow[]        // fresh array, insertion order
hasAppWindow(app, id): boolean
countAppWindows(app): number
setAppWindow(app, window): void                            // upsert by window.id; mutates
removeAppWindow(app, id): boolean                          // mutates
updateAppWindow(app, id, patch | ((w) => void)): window | undefined   // mutates
mostRecentAppWindow(windows): window | undefined           // highest zOrder, first on ties
normalizeClassicyAppWindows(value: unknown): ClassicyStoreSystemAppWindows
migrateClassicyState(state): ClassicyStore                 // idempotent, copy-on-write
```

Never branch on list position: integer-like ids (`"2"`) are enumerated first.

#### Upgrading from 0.x

`windows` was an array in 0.x. Replace `app.windows.find((w) => w.id === id)`
with `getAppWindow(app, id)`, iteration with `listAppWindows(app)`,
`.length` with `countAppWindows(app)`, and `push`/`filter`/`map` writes with
`setAppWindow`/`removeAppWindow`/`updateAppWindow`. Saved state needs no
action: on load, `migrateClassicyState` converts every `windows` array into a
record keyed by `id` (entries without a non-empty string id are dropped; on a
duplicate id the later entry wins; anything else becomes `{}`). The same pass
runs on `mergeClassicyState` results, so a 0.x-shaped `defaultState` still
works. There is no array compatibility shim at runtime: hand-built state set
directly with `useAppManager.setState` must use the record.

### Dispatching

```tsx
import { useAppManagerDispatch } from 'classicy'

const dispatch = useAppManagerDispatch()
dispatch({ type: 'ClassicyAppOpen', app: { id: 'MyApp.app', name: 'My App', icon } })
```

`dispatch(action, trust?)` routes the action through
`classicyDesktopStateEventReducer` inside an immer `produce`. The optional
second argument is `"trusted"` (default) or `"untrusted"` (see §6).

The same `dispatch` function is also exported at module level (the hook just
returns it) — use the bare import in non-React code such as module-scope
registration, file-system adapters, or engine callbacks.

### Event routing (by `type` prefix, in this exact order)

1. Trust gate — untrusted actions that fail the gate are rejected before any handler runs.
2. `ClassicyWindow*` → window operations (focus, move, resize, collapse, zoom)
3. `ClassicyDesktopIcon*` → icon add/selection/interaction
4. `ClassicyDesktop*` → desktop (menus, themes, backgrounds, balloon help toggle)
5. `ClassicyBootParadeIcon*` → boot parade
6. `ClassicyManagerDateTime*` → date/time manager
7. `ClassicyShortcut*` → keyboard shortcut registry
8. **Registered plugin handlers** — first registered prefix that matches wins
   (insertion order, NOT longest-match; register more specific prefixes first)
9. `ClassicyApp*` → generic app lifecycle (open, close, focus, activate)
10. Otherwise: dev-mode "Unhandled action type" warning.

Add `debug: true` to any action to get a `console.group` dump of before/after
state (non-production only).

Common built-in actions:

| Action | Payload | Effect |
|---|---|---|
| `ClassicyAppOpen` | `{ app: { id, name, icon } }` | Open an app |
| `ClassicyAppClose` | `{ app: { id } }` | Close an app |
| `ClassicyAppFocus` | `{ app: { id } }` | Focus an app |
| `ClassicyWindowFocus` | `{ app: { id }, window: { id } }` | Focus a window |
| `ClassicyDesktopChangeTheme` | `{ activeTheme: "<themeId>" }` | Switch theme (built-ins, then custom themes) |
| `ClassicyDesktopChangeColor` | `{ colorKey, index?, color }` | Set one theme colour (forks a built-in into "Custom"; see §8) |
| `ClassicyDesktopLoadThemes` | `{ availableThemes: ClassicyTheme[] }` | Replace the theme list |
| `ClassicyDesktopImportTheme` | `{ theme: ClassicyTheme }` | Add a (schema-validated) theme to `customThemes` with a fresh id and activate it (see §8 "Theme files") |
| `ClassicyDesktopChangeBackground` | `{ backgroundImage }` | Set wallpaper |
| `ClassicyDesktopSetBalloonHelp` | `{ disableBalloonHelp: boolean }` | Toggle balloon help globally |
| `ClassicyDesktopSetDoubleClickTitleToCollapse` | `{ doubleClickTitleToCollapse: boolean }` | Toggle whether double-clicking a window's title bar collapses it (`System.Manager.Desktop.doubleClickTitleToCollapse`, default `true`; the Appearance control panel's checkbox) |
| `ClassicyDesktopChangeAlertSound` | `{ alertSound: string }` | Set the default alert sound (a `ClassicyAlert*` key) |
| `ClassicyDesktopChangeAlertVolume` | `{ alertVolume: number }` | Set the alert level, 0–100 (clamped, rounded; non-finite ignored) |

Helper functions (exported, callable inside custom handlers): `openApp`,
`closeApp`, `focusApp` / `activateApp`, `deFocusApps`, `focusWindow`,
`loadApp`, `getDefaultAppForFileType`, `pickSuccessorApp`,
`dispatchToPlugin(ds, prefix, action)` (cross-app orchestration without a
direct import). Payload type-guard predicates (`hasApp`, `hasWindow`,
`hasPath`, `hasUrl`, …) are exported from the action-predicates module.

---

## 3. Building an App

### ClassicyApp (app container)

```tsx
<ClassicyApp
    id="TV.app"                      // unique app id (".app" suffix is convention)
    name="TV"
    icon={AppIcons.demo.app}
    defaultWindow="main"             // window id to open on launch
    showDesktopIcon={false}          // default true — desktop icon on/off
    showInApplicationsFolder={true}  // default true — listing in the derived Applications folder
    desktopIconBalloonHelp="Double-click to watch TV."
    contextMenu={[{ id: 'about', title: 'About TV…' }]}
>
    {/* ClassicyWindow children */}
</ClassicyApp>
```

Full props:

| Prop | Type | Default | Notes |
|---|---|---|---|
| `id` | `string` | — | **required** |
| `name` | `string` | — | **required** |
| `icon` | `string` | — | **required** (URL/data URI) |
| `defaultWindow` | `string` | — | window id opened on launch |
| `restoreWindowFocus` | `boolean` | `true` | when the app is focused with no window focused, raise its most recent window (else `defaultWindow`); Finder turns it off so the desktop stays active |
| `showDesktopIcon` | `boolean` | `true` | ignored for extensions (they never get icons) |
| `showInApplicationsFolder` | `boolean` | `true` | independent of `showDesktopIcon` |
| `desktopIconBalloonHelp` | `string \| ClassicyIconBalloonHelp` | — | string form is titled with the app name |
| `addSystemMenu` | `boolean` | — | contribute to the system menu |
| `extension` | `boolean` | — | background app: no windows UI affordances, no icons |
| `globalShortcuts` | `{ shortcut, event, eventData? }[]` | — | honored only for extensions |
| `bootIcon` | `boolean \| string` | — | show in the boot icon parade (string = custom icon) |
| `debug` | `boolean` | `false` | |
| `handlesFileTypes` | `ClassicyFileSystemEntryFileType[]` | — | register as a file-type handler |
| `handlesOwnFiles` | `boolean` | `false` | |
| `contextMenu` | `ClassicyMenuItem[]` | — | app-level right-click menu |
| `noDesktopIcon`, `inApplicationsFolder` | `boolean` | — | **deprecated** aliases; note `noDesktopIcon` alone no longer hides the app from Applications |

Menu/lifecycle hooks for app authors: `useClassicyWindowClose`,
`useClassicyAboutMenu`, `useClassicyHelpMenu`, `useClassicyEditMenu`, plus
menu-item helpers `quitAppHelper`, `quitMenuItemHelper`,
`closeWindowMenuItemHelper`, `closeAllWindowsMenuItemHelper`.
`ClassicyAppIdContext` provides the current app id to descendants.

### App manifest registration — `registerApp`

If your app needs custom state or actions, register a manifest **at module
load** (side-effect import, before rendering):

```ts
import { registerApp } from 'classicy'
import { z } from 'zod'

export const TVDataSchema = z.looseObject({
    channel: z.number().optional().describe('Currently tuned channel.'),
    muted: z.boolean().optional().describe('Whether TV audio is muted.'),
})
export type TVData = z.infer<typeof TVDataSchema>

registerApp({
    id: 'TV.app',
    description: 'Watches television.',
    prefix: 'ClassicyAppTV',          // action-type prefix routed to `handler`
    handler: tvEventHandler,          // (ds: ClassicyStore, action) => ClassicyStore
    actions: {
        ClassicyAppTVTune: {
            description: 'Tune to a channel.',
            params: z.object({ channel: z.number().int().min(2).max(99) }),
            scriptable: true,         // expose to HyperCard stack scripts (see §6)
        },
    },
    state: TVDataSchema,
})
```

Rules (enforced/warned by the kernel):

- `prefix` and `handler` must be provided **together**; supplying only one
  registers no routing and warns in dev.
- `state` MUST be a `z.looseObject` — the kernel writes undeclared keys (e.g.
  `openFiles` queues) into `apps[id].data`. Top-level fields should be
  `.optional()` (data is empty before the first action). `.describe()` text
  powers balloon help via `describeAppState`.
- Re-registering the same `id` merges **additively**: new prefix+handler pairs
  append (duplicate prefix is a no-op), `actions` merge first-wins, the first
  `state` schema wins (a different second schema warns).
- `scriptable: true` auto-adds the action type to the untrusted allowlist and
  validates script-authored args against `params` before dispatch.
- Dev builds validate `apps[id].data` against the schema after each routed
  action — **warn-only**, never rejects.

Read-side helpers:

| Function | Signature | Use |
|---|---|---|
| `getAppManifest` | `(appId) => ClassicyAppManifest \| undefined` | |
| `listAppManifests` | `() => ClassicyAppManifest[]` | |
| `listScriptableActions` | `() => ClassicyScriptableAction[]` | actions exposed to stack scripts |
| `describeAppAction` | `(appId, type) => { title, content } \| undefined` | balloon-ready copy |
| `describeAppState` | `(appId, "dot.path") => { title, content } \| undefined` | field docs from `.describe()` |
| `parseAppData<T>` | `(appId, raw) => T \| undefined` | typed guard for `apps[id].data`; `undefined` on failure — use `parseAppData<TVData>(id, raw) ?? {}` |

Deprecated but still working: `registerAppEventHandler(prefix, handler)`
(routing only — no manifest, so no balloon help / script discovery / dev
validation) and `registerClassicyUntrustedActionAllowlist(type)` (prefer
`scriptable: true`; still valid for host-reviewed custom effect types with no
manifest).

---

## 4. UI Component Reference

All components are exported from the package root. Shared types used
throughout:

- `ClassicyControlLabelSize = "small" | "medium" | "large"`
- `ClassicyLabelPosition = "above" | "left" | "right" | "below"`
- `ClassicyMenuItem = { id, title?, icon?, disabled?, checked?, keyboardShortcut?, event?, eventData?, onClickFunc?, menuChildren?, balloon?, ... }`
- `ClassicyIconBalloonHelp = { title?, content, position?, delay? }`

### 4.0 HTML element ⇄ Classicy component map

Inside a Classicy desktop, always prefer the Platinum-styled component over
the raw HTML element it replaces — the component brings theming (CSS
variables), UI sounds, balloon help, keyboard behavior, and store integration
for free. When you would reach for one of these elements, use the component
instead:

| Instead of raw HTML… | Use | Notes |
|---|---|---|
| `<a>` | `ClassicyLink` | renders a real `<a>`; routes clicks through `ClassicyDesktopOpenUrl` with a `disposition` prop (§13); also takes `event`/`eventData` for internal actions |
| `<button>` | `ClassicyButton` | renders a real `<button>`. Latching/toggle/radio/popup buttons: `ClassicyBevelButton` |
| `<input type="checkbox">` | `ClassicyCheckbox` | button-shaped checkbox: `ClassicyBevelButton mode="toggle"` |
| `<input type="radio">` | `ClassicyRadioInput` | one component renders the whole group |
| `<input>` (text, password, email, url, …) | `ClassicyInput` | the `type` prop passes through to the native `<input>` |
| `<input type="number">` | `ClassicySpinner` | `ClassicyLittleArrows` is the bare stepper without the field |
| `<input type="range">` | `ClassicySlider` | |
| `<input type="file">` | `ClassicyFileInput` | inline control (host files); to pick from the Classicy file system use `ClassicyFileOpenDialog` / `ClassicyFileSaveDialog` |
| `<input type="date">` | `ClassicyDatePicker` | |
| `<input type="time">` | `ClassicyTimePicker` | |
| `<input type="color">` | `ClassicyColorPicker` | swatch control that opens `ClassicyColorPickerDialog` |
| `<textarea>` | `ClassicyTextEditor` | renders a real `<textarea>`; markdown/rich editing: `ClassicyRichTextEditor` |
| `<select>` / `<option>` | `ClassicyPopUpMenu` | ARIA combobox + listbox (no native `<select>` under the hood); single-select |
| `<select multiple>` / `<select size>` | `ClassicyListBox` | Platinum List Manager scrolling list; `selectionMode "single" \| "multi"` with ⌘-toggle / Shift-range |
| `<datalist>` (combobox/autocomplete) | `ClassicyComboBox` | editable field + pop-up arrow; filters as you type (`startsWith` \| `contains` \| off), grouped entries supported, `freeText` off = may only hold an option label |
| `<optgroup>` | `ClassicyPopUpMenu` | pass `{ groupLabel, options }` entries in `options` — titled, non-selectable groups |
| `<form>` | `ClassicyForm` | real `<form>`; navigation always prevented, HIG row/dialog layout; `ClassicyFormButtonRow` is the right-aligned Cancel/OK row |
| `<label>` | `ClassicyControlLabel` | |
| `<fieldset>` / `<legend>` | `ClassicyControlGroup` | renders a real `<fieldset>` + `<legend>` |
| `<hr>` | `ClassicySeparator` | renders a real `<hr>`; also vertical |
| `<table>` (interactive data table) | `ClassicyTable` | Platinum list view: sortable/resizable columns, Mac selection conventions; purely presentational tables can stay raw `<table>` styled with theme variables |
| `<progress>` | `ClassicyProgressBar` | adds indeterminate barber-pole / chasing arrows |
| `<meter>` | `ClassicyMeter` | native gauge semantics (`low`/`high`/`optimum` zones), themed; optional LED `segments` |
| `<output>` | `ClassicyOutput` | renders a real `<output>`; `plain` static text or `inset` result well |
| `<kbd>` | `ClassicyKbd` | renders a real `<kbd>`; takes a `shortcut` string in `parseKeyboardShortcut` syntax; `inline` glyph run (what menu items render) or `keycaps` |
| `<details>` / `<summary>` | `ClassicyDisclosure` | `ClassicyTriangle` is the bare disclosure marker |
| nested `<ul>` / `<li>` (interactive) | `ClassicyTree` | for plain static lists keep raw `<ul>` / `<ol>` |
| `<dialog>` (modal) / `window.alert()` | `ClassicyAlert` | app-specific modal dialogs: `ClassicyWindow modal`; About boxes: `ClassicyAboutWindow` |
| `<dialog>` (non-modal) | `ClassicyWindow` | |
| `<menu>` / the old `contextmenu` attribute | `ClassicyMenu`, `ClassicyContextualMenuTarget` | menu-bar items: `ClassicyMenuBarExtension` |
| `title` attribute (tooltip) | `ClassicyBalloonHelp` | |
| `<video>` / `<audio>` | `QuickTimeVideoEmbed` | `type: "video" \| "audio"` |
| `<img>` (droppable image slot) | `ClassicyImageWell` | plain static images: keep raw `<img>` |
| `<img>` + caption (icon with label) | `ClassicyIcon` / `ClassicyDesktopIcon` | |
| `<nav>` (top-level chrome) | `ClassicyDesktopMenuBar` | mounted automatically by `ClassicyDesktop` |

**Classicy-only components with no HTML counterpart** (the desktop metaphor —
there is no raw element to replace): `ClassicyDesktop`, `ClassicyApp`,
`ClassicyWindowFrame`, `ClassicyTabs` (the ARIA `role="tablist"` pattern),
`ClassicySplitView` (nearest ancestor is the obsolete `<frameset>`),
`ClassicyButtonToolbar` / `ClassicyButtonToolbarGroup` (`role="toolbar"`),
`ClassicyPlacard`, `ClassicyPager`, `ClassicyAssistant`,
`ClassicyCrashScreen`, `ClassicyFileBrowser`, `ClassicyBoot` /
`ClassicyStartupScreen`, and the screen savers.

**HTML with no Classicy equivalent** — use the raw element, styled with the
theme CSS variables (§8) so it follows theme changes:

- `<canvas>`, `<svg>`
- `<iframe>` — the Web Viewer is a built-in app, not an embeddable component
- Prose & sectioning: `<h1>`–`<h6>`, `<p>`, `<blockquote>`, `<pre>` / `<code>`, plain `<ul>` / `<ol>`, `<header>` / `<footer>` / `<section>` / `<article>` / `<aside>`

### 4.1 Windows

**`ClassicyWindow`** — a full Platinum window, registered with the window
manager. Must be a descendant of `ClassicyApp`.

| Prop | Type | Default |
|---|---|---|
| `id` * | `string` | — |
| `appId` * | `string` | — |
| `title` | `string` | `""` |
| `icon` / `hideIcon` | `string` / `boolean` | file icon / `false` |
| `closable` / `zoomable` / `collapsable` / `resizable` / `scrollable` | `boolean` | all `true` |
| `modal` | `boolean` | `false` |
| `defaultWindow` | `boolean` | `false` |
| `initialSize` / `minimumSize` | `[w, h]`, each `number \| "\${number}%"` | `[350, 0]` / `[300, 0]` (0 = auto) |
| `initialPosition` | `[x, y]` — x: `number \| "left" \| "center" \| "right"`, y: `number \| "top" \| "center" \| "bottom"` | `[110, 110]` |
| `windowType` | `"document" \| "utility"` | `"document"` |
| `zoomMode` | `"full" \| "horizontal" \| "vertical"` | `"full"` |
| `headerVariant` | `"standard" \| "list"` | `"standard"` |
| `header` / `placard` | `ReactNode` | — |
| `appMenu` / `contextMenu` | `ClassicyMenuItem[]` | — |
| `alwaysOnTop` / `contentFrame` / `dimContents` | `boolean` | `false` / `false` / `true` |
| `analyticsPath` / `analyticsExclude` | `string` / `boolean` | derived / `false` (see §9) |
| `onCloseFunc` | `(id: string) => void` | — |
| `onBeforeClose` | `(id: string) => boolean \| Promise<boolean>` | — (close always proceeds) |
| `idealSize` | `[w, h]`, each `number \| "\${number}%"` | — (zoom fits the content) |
| `hidden` | `boolean` | `false` |
| `growable` | `boolean` | `false` |
| `type` | `"default" \| "error"` | `"default"` |
| `backgroundColor` | `string` | — |
| `initialFocusRef` | `RefObject<HTMLElement \| null>` | — (nothing focused) |

`initialFocusRef` names the element that takes keyboard focus whenever the
window *becomes* the focused window (the store's `focused` flag turning true
while open and expanded — not on every render, so of several restored
windows only the focused one takes it). It is skipped when focus is already
inside the window (an input the user clicked keeps it), re-applied on a
title-bar press in the already-focused window, and focused with
`preventScroll`. For a `modal` window it is the focus trap's initial target
instead. Finder passes its list view's list box (via
`ClassicyFileBrowser`'s `focusTargetRef` / `ClassicyTable`'s `containerRef`)
so arrows and Return work as soon as a folder opens.

`onBeforeClose` is a close veto. It runs before every close that goes through
the window (the close box, Escape or ⌘-period on a modal), ahead of
`onCloseFunc`, the close sound and the `ClassicyWindowClose` dispatch. Return
or resolve `false` to keep the window open; a promise is awaited, so it can
show a "Save changes before closing?" alert first. `idealSize` is the
content-box size of the zoomed ("standard") state for `zoomMode="full"`
(HIGOS8 p.104), clamped to the desktop; without it the zoom fits the content.
`hidden` registers the window closed, to be opened later with
`ClassicyWindowOpen`; only the first registration reads it, after which the
store record's `closed` flag wins. `growable` stretches the content area to the
window's full height instead of sizing it to its content. `type="error"` on a
`modal` window makes a fixed alert: it cannot be dragged, beeps when it opens,
and stacks in the red error band above other modals.

A scrollable window draws its scroll bars only while its content overflows
(or it has a `placard`, which lives in the bottom gutter), and then draws both
bars, as Mac OS 8 does — the non-scrolling axis shows an empty track so the
grow box keeps its corner. Content that fills the window and scrolls itself (a
full-window `<textarea>`, `ClassicySplitView` panes, a pan surface) must pass
`scrollable={false}`, or its inner scrolling counts as overflow and the window
shows a second set of bars beside the inner ones.

**`ClassicyWindowFrame`** — presentational chrome only (no store coupling;
usable pre-boot): `title?`, `children` *, `className?`, `width?`.

### 4.2 Buttons & toggles

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyButton` | `isDefault?`, `disabled?`, `depressed?` (draw it held down, e.g. while its menu is open), `onClickFunc?`, `buttonShape? ("rectangle"\|"square")`, `buttonSize? ("medium"\|"small")`, `buttonType?`, `padding?/margin? ("sm"\|"md"\|"lg"\|"xl")` | forwardRef to `<button>`; accepts remaining button HTML attrs |
| `ClassicyBevelButton` | `mode? ("push"\|"toggle"\|"radio"\|"popup")`, `bevelWidth? ("small"\|"medium"\|"large")`, `icon?`, `on?`, `mixed?`, `onChangeFunc?(on)`, `popupArrow? ("small"\|"large")`, `popupDirection? ("horizontal"\|"vertical")`, `menuItems?` (`ClassicyMenuItem[]`), `popupContent?`, `popupTrigger? ("click"\|"hold")`, `popupPlacement? ("below"\|"right")`, `popupAlign? ("start"\|"center")`, `popupAnchorInset?` (`{top?, bottom?, left?, right?}`), `popupHoldDelayMs? (500)`, `square?` (square bevel, as in a toolbar), `iconAlt?` (the icon's alt text; omit when the button has a text label), `className?` | auto-squares inside a toolbar. With `menuItems` (or `popupContent`, e.g. `ClassicyPopUpSlider`) it opens a Platinum menu below or to the right of itself (HIGOS8 p.32), flipping when there is no room. `click` trigger (default in `popup` mode): quick click = sticky menu, press held past the hold delay = standard press-drag-release menu. `hold` trigger (default in other modes): click keeps the button's own behaviour, a long press shows the options (tool palettes). Enter/Space or Down Arrow open it from the keyboard |
| `ClassicyHelpButton` | `onClickFunc?`, `label? ("Help")`, `disabled?`, `id?`, `className?` | HIG Help button (HIGOS8 p.86): 20 × 21 small-bevel button with the help glyph (system-art key `helpButton`); `label` is the accessible name. Place it lower left aligned with the push buttons (`margin-right: auto` in a right-aligned row), else upper right. `ClassicyAlert`'s `help` button role renders it |
| `ClassicyButtonToolbar` / `ClassicyButtonToolbarGroup` | `children` *, `size? ("large"\|"medium"\|"small")` (toolbar only; default `"large"`), `className?` | auto dividers between groups; roving-tabindex keyboard nav |
| `ClassicyCheckbox` | `id` *, `checked?`, `mixed?`, `disabled?`, `onClickFunc?(checked)`, `label?`, `labelPosition?`, `labelSize?`, `mark? ("check"\|"x")`, `isDefault?` | `mark="x"` draws an ✕ instead of the checkmark, for locales where a checkmark is not acceptable (HIGOS8 p.28); `isDefault` draws the checked box in the theme accent |
| `ClassicyRadioInput` | `name` *, `inputs` * (`{id, label?, checked?, disabled?}[]`), `onClickFunc?(id)`, `align? ("rows"\|"columns")`, `label?` | |
| `ClassicyDisclosure` | `direction?`, `label?`, `labelSize?`, `labelPosition? ("left"\|"right")`, `children` | collapsible section; `labelPosition="left"` puts the text before the triangle (default `"right"`) |
| `ClassicyTriangle` | `direction?`, `open?`, `defaultOpen?`, `onToggle?`, `interactive?` | disclosure triangle primitive |
| `ClassicyLink` | `href?`, `disposition? ("classicy"\|"browser"\|"browser-new")`, `event?`/`eventData?`, `onClickFunc?`, `disabled?` | real `<a>`; plain clicks dispatch `ClassicyDesktopOpenUrl`, modifier/middle clicks fall through to the browser; `event` form dispatches an internal action instead (anchor gets `role="button"`) |

### 4.3 Text & value inputs

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyInput` | `id` *, `onChangeFunc?`, `onEnterFunc?`, `labelTitle?`, `labelPosition?`, `placeholder?`, `prefillValue?`, `type?`, `disabled?` | forwardRef to `<input>` |
| `ClassicySpinner` | `id` *, `minValue? (0)`, `maxValue?`, `prefillValue?`, `onChangeFunc?`, `onEnterFunc?` (Return in the field), `labelTitle?` | number field with little arrows. Holding an arrow speeds up tenfold for every 3 s it stays held (steps of 1, 10, 100…) |
| `ClassicyLittleArrows` | `onStep(dir: 1\|-1, heldMs)` *, `disabled?`, `upLabel?`, `downLabel?`, `repeatIntervalMs? (120)`, `focusTarget?: RefObject<HTMLElement>` | standalone stepper, press-and-hold repeat; pair with its content inside a `classicyLittleArrowsGroup` element. A mouse press never takes focus from a focused sibling in the group (the ring and bevel are `:focus-within`); `focusTarget` makes it focus the field instead |
| `ClassicySlider` | `id` *, `value` *, `min?/max?/step?`, `orientation?`, `onChangeFunc?`, `onCommitFunc?(value)`, `tickInterval?`, `tickLabels?`, `snapToTicks?`, `ghost?`, `indicatorDirection? ("down"\|"up"\|"left"\|"right"\|"nondirectional")`, `highlighted?`, `valueLabel?`, `ariaLabel?` | the thumb points down (horizontal) or left (vertical) by default, or is rounded with `"nondirectional"`; `highlighted` fills the thumb with the theme accent; `valueLabel` is the readout and screen-reader value text (defaults to the number); `ariaLabel` names a slider with no visible label |
| `ClassicyTextEditor` | `content?`, `prefillValue?`, `onChangeFunc?`, `autoHeight?`, `border?`, `labelTitle?` | plain textarea |
| `ClassicyRichTextEditor` | `content` *, `onChangeFunc?(markdown)`, `editorRef?` | MDXEditor-backed markdown |
| `ClassicyFileInput` | `id` *, `accept?`, `multiple?`, `maxFiles?`, `maxFileSizeMb?`, `onChangeFunc?(files: File[])` | forwardRef handle `{ addFiles(File[]) }` |
| `ClassicyDatePicker` | `id` *, `onChangeFunc?(date)`, `prefillValue?`, `minValue?/maxValue?` | defaults to the Classicy virtual clock (`DateAndTime.dateTime`); re-syncs when `prefillValue` changes to a different moment |
| `ClassicyTimePicker` | `id` *, `onChangeFunc?(date)`, `prefillValue?`, `minValue?/maxValue?` | defaults to the Classicy virtual clock, like the date picker; re-syncs when `prefillValue` changes to a different moment |
| `ClassicyPopUpMenu` | `id` *, `options` * (`{value, label, icon?}` or `{groupLabel, options}` entries), `selected?`, `onChangeFunc?`, `size? (incl. "mini")`, `label?`, `disabled?` | Platinum select; group entries render `<optgroup>`-style titled, non-selectable runs |
| `ClassicyListBox` | `id` *, `options` * (`{value, label, icon?, disabled?}[]`), `selectionMode? ("single"\|"multi")`, `selected?: string[]`, `onChangeFunc?(values)`, `onActivateFunc?(value)` (double-click/Enter), `visibleRows?`, `label?`, `disabled?` | List Manager scrolling list; multi = plain-click replaces, ⌘/Ctrl-click toggles, Shift-click/Shift-arrows extend; selection follows the keyboard |
| `ClassicyComboBox` | `id` *, `options` * (flat options and/or `{groupLabel, options}` groups), `prefillValue?`, `filter? ("startsWith"\|"contains"\|false)`, `freeText? (true)`, `onChangeFunc?(text)`, `onSelectFunc?(value, option)`, `placeholder?`, `label?`, `disabled?` | editable field + arrow; suggestion menu reuses the PopUpMenu look/flip logic; focus stays in the input (`aria-activedescendant`) |

### 4.4 Labels, grouping, display

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyControlLabel` | `label?`, `labelFor?`, `id?` (the `<label>`'s id, for `aria-labelledby`), `labelSize?`, `icon?`, `direction?`, `disabled?`, `onClickFunc?` | renders nothing when label empty; the row is a focusable `role="button"` only with `onClickFunc` |
| `ClassicyControlGroup` | `children` *, `label?`, `title?` (`ReactNode`; overrides `label`), `backgroundColor?` (painted behind the title so it masks the frame line; match the surface the group sits on; default `var(--color-system-03)`), `variant? ("primary"\|"secondary")`, `checkboxTitle?`, `popUpMenuTitle?`, `columns?`, `layout? ("default"\|"form")` | fieldset-style group; title can be a checkbox or popup. `layout="form"` is the HIG two-column label/control grid (labels 5px from fields, rows 6px apart; give controls `labelPosition="left"`) |
| `ClassicyControlGroupFormRow` | `children` *, `justify? ("start"\|"end")` | full-width row inside a `layout="form"` group for anything that is not a label/control pair (checkbox, push button, text); `end` puts a button at the group's lower right |
| `ClassicyControlGroupStack` | `children` *, `className?` | column of group boxes 12px frame to frame (`--group-box-gap`); the content of a control panel that is a stack of groups |
| `ClassicyForm` | `onSubmitFunc?`, `layout? ("default"\|"dialog")`, children * | real `<form>`; always calls `preventDefault` (never navigates); make the confirming button `isDefault buttonType="submit"` so Enter submits |
| `ClassicyFormButtonRow` | `children` * | HIG dialog button row: right-aligned, `--button-gap`, group-gap above |
| `ClassicySeparator` | `orientation?` | |
| `ClassicyPlacard` | `menuItems?`, `onSelect?(id)`, `onClick?`, `disabled?` | window-corner placard |
| `ClassicyImageWell` | `src?`, `onDrop?(files, e)`, `selected?`, `enabled?` | drag-and-drop image slot |
| `ClassicyProgressBar` | `value?`, `max? (100)`, `indeterminate?`, `autoSwitch?`, `chasingArrows?`, `label?` | barber-pole when indeterminate; with `autoSwitch` an indeterminate bar becomes determinate as soon as it has a `value` |
| `ClassicyMeter` | `value` *, `min?/max? (0/100)`, `low?/high?/optimum?`, `segments?`, `showValue?`, `label?` | native `<meter>` zone semantics: the region holding `optimum` is optimal (theme accent), adjacent is suboptimal (`--color-alert`), two away is bad (`--color-error`); `meterZone()` exported |
| `ClassicyOutput` | `id` *, `value?` or children, `htmlFor?: string[]`, `variant? ("plain"\|"inset")`, `mono?`, `label?`, `disabled?` (dimmed) | real `<output>`; `inset` is the white beveled result well |
| `ClassicyKbd` | `shortcut?` (any `parseKeyboardShortcut` spelling) or children, `variant? ("inline"\|"keycaps")` | real `<kbd>` in canonical glyph order (⌃⌥⇧⌘ + key); menu items render their `keyboardShortcut` through it |
| `ClassicyTabs` | `tabs` * (`{title?, icon?, children}[]`), `size? ("small"\|"medium"\|"large")` | tab height and label type scale; small tabs suit dense panels |
| `ClassicyTree` | `nodes` *, `direction?` (closed triangles' direction; default right), `selectionMode? ("none"\|"single"\|"multi")`, `selectedIds?`, `onSelectNode?`, `onActivateNode?`, `onToggleNode?` | hierarchical list |
| `ClassicyTable` | `columns` * (`{id, title, accessor, render?, sortable?, resizable?, width?, align?}[]`), `rows` *, `getRowId` *, `selectionMode? ("none"\|"single"\|"multi")`, `selected?: string[]`, `onSelectionChange?`, `onActivateRow?`, `defaultSort?`, `stickyHeader? (true)`, `rowClassName?`; tree rows: `getSubRows?`, `rowCanExpand?`, `expanded?: string[]`, `onToggleRow?`; handles: `selectionApiRef?` (`{ selectAll }`), `containerRef?` (the focusable list box, e.g. for a window's `initialFocusRef`) | generic Platinum list view over `@tanstack/react-table` (already a peer dep); semantic `<table>` + `aria-sort`; Shift/⌘ selection over the current sorted order; arrows/Home/End/Enter/type-select keyboard. `render(row, expansion)` receives `{ depth, canExpand, isExpanded, toggle }` so a column can draw its own disclosure (this is how the Finder list view is built) |
| `ClassicyPager` | `page` *, `pageCount` *, `onPageChange` *, `pageClassName?` (extra class for the page-number cell) | Apple Guide page control |
| `ClassicySplitView` | `children` * (2–3 panes), `direction? ("horizontal"\|"vertical")`, `defaultSizes? (number[], pct, normalized)`, `minPaneSize? (48 px)`, `onResize?(sizes)`, `onResizeCommit?(sizes)` | resizable pane container; divider is draggable and keyboard-operable (ARIA separator, arrow keys). Max 3 panes — nest split views for grids. Uncontrolled after mount: persist via `onResizeCommit`, restore via `defaultSizes` |
| `ClassicySpinner` | see inputs | |
| `ClassicyIcon` | `appId` *, `name` *, `icon` *, `label?`, `labelPosition? (below)`, `size?` (px), `onClickFunc?` (open: double-click, Enter or Space), `initialPosition?`, `holder?`, `invisible?`, `snapTo?`/`snapOrigin?`, `positionLocked?`, `dropFolderPath?`, `filePath?`
(→ `data-classicy-file-path`), `onFileDrag?(target, point, outlineTopLeft) → handled` | draggable icon (non-desktop surfaces). With `onFileDrag` it drags as a file (dotted outline, can leave its window); return `false` to have it reposition in place instead. `dropFolderPath` makes it a drop target |

### 4.5 Menus

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyMenu` | `name` *, `menuItems` * | renders a menu list; items support submenus via `menuChildren`. `isSubmenu` is deprecated and ignored |
| `ClassicyMenuProvider` | `children` *, `onClose?`, `startActive?`, `idleTimeoutMs? (15000)` | menu interaction state; an open menu closes after `idleTimeoutMs` of inactivity (`0` disables the timeout) |
| `ClassicyContextualMenuTarget` | `menuItems` *, `children` | attach a right-click menu to any element |
| `ClassicyContextualMenu` | `name` *, `position` *, `menuItems` *, `onClose?` | low-level; usually not used directly |
| `useClassicyContextualMenu()` | → `{ showContextMenu(items, [x, y]), hideContextMenu() }` | imperative API |
| `ClassicyDesktopMenuBar` | (no props) | rendered by `ClassicyDesktop` |
| `ClassicyMenuBarExtension` | `id` *, `order?`, `icon?`, `title?`, `menuItems?`, `onClick?` | add a right-side menu bar item (like the clock) |

`ClassicyMenuItem.link` is analytics only: it is reported with the item's
analytics event, and choosing the item does not navigate. Open a URL with
`onClickFunc` or `event: "ClassicyDesktopOpenUrl"` (§13).

Contextual-menu resolution is target-based, innermost wins:
wrapped control > window `contextMenu` > app `contextMenu` > desktop default
(empty desktop only). Components with custom right-click behavior call
`e.preventDefault()`; every menu layer checks `e.defaultPrevented`.

Keyboard shortcut helpers: `parseKeyboardShortcut`, `formatKeyboardShortcut`,
`shortcutMatchesEvent`, `findMenuItemByShortcut`, `runMenuItemAction`,
`useKeyboardEquivalents`, `useFocusTrap`, `useClassicyShortcutDispatcher`.

### 4.6 Alerts & dialogs

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyAlert` | `label` *, `alertType? ("note"\|"caution"\|"stop")`, `title?`, `message?`, `buttons?` (max 4, `{id, label, role?, onClick?, disabled?}`), `defaultButtonId?`, `movable?`, `onClose?`, `id?`, `appId? ("ClassicyAlert")` | modal alert window; plays the alert sound. A `role: "help"` button renders as `ClassicyHelpButton`, far left. `defaultButtonId` picks the default (Return) button, overriding `role: "default"`; for a caution about losing data, make it the Cancel button's id. `id` is the window id, needed when two alerts can be open at once |
| `ClassicyInputDialog` | `onConfirm(value)` *, `onCancel?`, `id? ("inputDialog")`, `appId?`, `title?`, `prompt?`, `initialValue?`, `placeholder?`, `inputType? ("text")`, `confirmLabel? ("OK")`, `cancelLabel? ("Cancel")`, `validate?(value) → boolean`, `icon?` | movable-modal one-field prompt (HIGOS8 p.59), the "New Folder"/"Rename" shape; use it instead of `window.prompt()`. Field focused with its text selected; Return confirms, Escape/⌘-period cancels; the default button dims while `validate` fails (default: non-empty after trimming). Mount to show, unmount from the callbacks to dismiss; must sit inside a `ClassicyApp` |
| `ClassicyKeyboardEquivalentField` | `id` *, `onChange(shortcut)` *, `value?`, `label? ("Current keyboard equivalent")`, `buttonLabel?`, `appId?`, `inUse?` (`{shortcut, name}[]`), `requireCommandKey? (true)`, `validate?(shortcut) → string\|null`, `prompt?`, `description?`, `onHelp?`, `disabled?` | user-definable keyboard equivalent (HIGOS8 pp.120–122): group box showing the equivalent spelled out (`⌃ + ⌘ + S`) and a button opening `ClassicyKeyboardEquivalentDialog`, which captures the next combination. A combination without ⌘ (or a function key), or one in `inUse`, is refused with an alert naming the owner. Pass your app's `appId`. Emits the menu-item form (`"⌃⌘S"`) |
| `ClassicyKeyboardEquivalentDialog` | `onConfirm(shortcut)` *, `onCancel?`, `initialValue?`, plus the field's rule/text props | the capture dialog on its own |
| `ClassicyFileOpenDialog` | `id` *, `appId` *, `open` *, `volumes` *, `onOpenFunc(selections)` *, `selectionMode?`, `fileTypeFilters?`, `onCancelFunc?`, `title? ("Open")` | |
| `ClassicyFileSaveDialog` | `id` *, `appId` *, `open` *, `volumes` *, `formats` *, `onSaveFunc(saved)` *, `defaultFileName?`, `onErrorFunc?`, `onCancelFunc?`, `title? ("Save")` | |
| `ClassicyColorPickerDialog` | `id` *, `open` *, `initialColor?`, `onSelectFunc?(color: number)`, `onCancelFunc?`, `crayons?` | |
| `ClassicyColorPicker` | `id` *, `value?`/`defaultValue?` (int color), `onChangeFunc?(color)`, `labelTitle?` | swatch control that opens the dialog |
| `ClassicyAboutWindow` | `appId` *, `appName` *, `appIcon` *, `hideFunc` *, `appMenu?` (`ClassicyMenuItem[]`, the menu bar while it is focused) | standard About box |
| `ClassicyAssistant` | `pages` * (`{title, content, buttons?, canAdvance?, labelIcon?, accessoryIcon?, accessoryIconSize? ("sm"\|"md"\|"lg")}[]`), `buttons?`, `page?`/`onPageChange?`, `initialPage? (0)` | setup-assistant flow. `page` makes it controlled; `initialPage` is the zero-based starting page when uncontrolled. Per page, `labelIcon` is a small icon left of the title and `accessoryIcon` a decorative icon at the right of the header (default size `"sm"`; `"lg"` overflows the header) |

Keyboard-equivalent helpers: `checkKeyboardEquivalent(shortcut, {inUse,
requireCommandKey, current, validate})` (the HIG rules, `null` = OK),
`keyboardEquivalentsInUse(menuItems)` (collect an app's menu shortcuts for
`inUse`), `spellKeyboardEquivalent`, and `keyboardShortcutFromEvent(e)`
(record a keydown as `"⌃⌘S"`; Ctrl records as ⌘ off a Mac).

File dialog volumes: build with `desktopVolume(fs)` or
`fileSystemVolume(fs, drive)` (both exported), or implement
`ClassicyFileDialogVolume { id, label, icon?, list(path), write?(), mkDir?() }`.

Color sub-pickers are individually exported (`ClassicyColorPickerRGB`, `HSV`,
`HLS`, `CMYK`, `Crayon`, `ClassicyColorWheel`) along with conversion utils
(`intToRgb`, `rgbToHsv`, …) and the `MAC_OS_8_CRAYONS` palette. Colors are
plain integers (`0xRRGGBB`).

### 4.7 Desktop & shell

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyDesktop` | `children?`, `startupScreen? (true)`, `startupDuration? (4000)`, `startupLogo?`, `startupWordmark?`, `bootScreen?` (`ReactNode`), `preBootScreen?((powerOn) => ReactNode)`, `controlStrip?` (`ClassicyControlStripProps \| false`) | the desktop surface; mounts the menu bar, the contextual menu provider, the Control Strip and a `ClassicyCrashScreen`. `startupLogo`/`startupWordmark` replace the startup screen's art; `bootScreen` replaces the whole splash (pair it with `hasShownStartupScreenThisSession` / `markStartupScreenShownThisSession` to show it once per session); `controlStrip={false}` hides the strip |
| `ClassicyDesktopIcon` | `appId` *, `appName` *, `icon` *, `kind? ("icon")`, `label?`, `event?`/`eventData?`, `onClickFunc?`, `noLaunch?`, `contextMenu?`, `balloonHelp?`, `filePath?`, `onMoveFilePaths?`, `onOpenFilePath?` | usually created for you by `ClassicyApp`. With `filePath` (icon records carry it, `ClassicyDesktopIconAdd { filePath }`): drive/`directory`/`trash` icons are drop targets; other kinds drag as files — let go on the desktop they move, on a folder `onMoveFilePaths(paths, destination)` moves the selection's items. `ClassicyDesktop` wires both callbacks |
| `ClassicyCrashScreen` | `children?` | error boundary → Sad Mac screen. `ClassicyDesktop` already wraps itself in one, so don't add another around it; use it only for a shell you build without `ClassicyDesktop` |
| `ClassicyBoot` / `ClassicyBootSequence` / `ClassicyStartupScreen` | see source | boot parade; normally managed by `ClassicyDesktop` |
| `ClassicyDesktopMenuWidgetTime` | none | stock menu bar clock widget; the menu bar shows only Time |
| `ClassicyDesktopMenuWidgetSound` | `hide?` | **deprecated** — menu-bar mute toggle, no longer mounted. Use the Control Strip's built-in Sound module (`classicy-sound`, registered by `ClassicySoundManagerProvider`). Still exported; logs a one-time `classicyLog` warning in dev builds when mounted |
| `ClassicyControlStrip` | `disabledModules?` (module ids), `defaultCollapsed?`, `defaultWidth?`, `className?` | Mac OS 8 Control Strip (HIGOS8 p.125, Figure 6-15): floating strip at the desktop's lower left — collapse box, scroll arrows, modules, draggable tab; widths snap to whole modules. Control-dragging the collapse box moves it up or down and docks it to the left or right edge (the pointer's half of the desktop; mirrored when docked right), stored as `edge`/`bottom` via `ClassicyDesktopControlStripSetPosition {edge: "left"\|"right", bottom}` (px above the desktop's bottom; `computeClassicyControlStripPosition` is the pure placement). `ClassicyDesktop` mounts it (`controlStrip` prop: its props, or `false` to hide). Shows every registered module (below) not in `disabledModules` and not hidden by the user. Collapsed state, width, user-hidden ids and user order persist in `System.Manager.Desktop.controlStrip` (`ClassicyDesktopControlStripSetVisible {visible}`, `…SetCollapsed {collapsed}`, `…SetWidth {width\|null}`, `…SetModuleHidden {moduleId, hidden}`, `…SetModuleOrder {moduleOrder}`); the defaults apply until the user changes them. Its contextual menu: Hide Control Strip, Open Control Strip Control Panel |
| `registerClassicyControlStripModule(def)` | `id` *, `label` *, `icon` * (string or hook), `appId?`, `order? (100)`, `menuItems?` (array or hook), `content?` (component), `fileIcon?` | adds a module; call at module scope. Live (`useSyncExternalStore`). Same `appId` re-registering replaces; another `appId` is ignored with a warning. With `appId`, shown only while that `ClassicyApp` is mounted (`useClassicyMountedApps`). Each module also appears as a file in `System Folder:Control Strip Modules`. Also `unregisterClassicyControlStripModule(id)`, `getClassicyControlStripModule(id)`, `listClassicyControlStripModules()`, `arrangeClassicyControlStripModules(registrations, {disabledModules?, moduleOrder?, mountedApps})`, `classicyControlStripOpenControlPanelItem(dispatch, panelName, app)` (HIG p.125 "Open … Control Panel"). Built-in ids: `CLASSICY_CONTROL_STRIP_MODULE_IDS` (`sound` → `classicy-sound`, order 10; `screenSaver` → `classicy-screen-saver`, order 20, owned by `ScreenSaver.app`) |
| `ClassicyControlStripManager` | none | the Control Strip control panel (`ControlStripManager.app`, in `ClassicyControlPanels`): show/hide the strip; show/hide and reorder each module the host has not disabled |
| `ClassicyPopUpSlider` | `value` *, `onChange(value)` *, `ariaLabel` *, `min? (0)`, `max? (100)`, `step? (1)`, `disabled?` | HIGOS8 Figure 2-16's vertical slider (17 × 73) for a bevel button's `popupContent`; drag/click, arrows, Page Up/Down, Home/End |
| `ClassicyPixelArt` | `rows` * (`string[]` of palette tokens, `.` transparent), `className?` | themed, pixel-exact inline-SVG art (tokens `K W 1–7 b c d m n` map to theme colours) |

Desktop icon `kind` values (sort order): `drive`, `directory`, `app_shortcut`,
`shortcut`, `trash`, `file`, `icon`. Kinds `app_shortcut` and `shortcut` get
the Mac OS 8 alias arrow badge + italic label (`isAliasKind(kind)` predicate is
exported). Trash and drive icons carry stock balloon help automatically
(`defaultBalloonForKind(kind, title)`).

### 4.8 Balloon help

```tsx
<ClassicyBalloonHelp content="Click to open" title="Open File" position="top-left" delay={600}>
    <ClassicyButton>Open</ClassicyButton>
</ClassicyBalloonHelp>
```

- Positions: `top-left | top-center | top-right | bottom-left | bottom-center | bottom-right` (default `top-left`); `delay` default 600 ms.
- Rendered via portal into `#classicyDesktop`, so never clipped by overflow.
- The wrapper is `position: relative; display: inline-block`. If that breaks
  your layout, use the hook instead — zero added DOM:

```tsx
const { handlers, balloon } = useClassicyBalloonHelp(myRef, { content: 'Hi', position: 'top-right' })
return <div ref={myRef} {...handlers}>target{balloon}</div>
```

- Globally disabled via `dispatch({ type: 'ClassicyDesktopSetBalloonHelp', disableBalloonHelp: true })`.

### 4.9 QuickTime media primitives

`QuickTimeVideoEmbed` (required: `appId`, `name`, `url`, `type: "audio"|"video"`;
optional: `windowId` (the window whose focus enables the keyboard shortcuts;
default `${appId}_MoviePlayer_${url}`), `subtitlesUrl`, `autoPlay`,
`hideControls`, `controlsDocked`,
`muted`, `playing`/`onPlayingChange`, `volume`/`onVolumeChange`,
`captionsEnabled`/`onCaptionsEnabledChange`, `captionStyle`, `onMediaElement`,
`crossOrigin`, `playsInline`) plus the individual controls:
`QuickTimePlayPauseButton`, `QuickTimeFullscreenButton`, `QuickTimeSeekBar`,
`QuickTimeVolumeControl`, `QuickTimeCaptionsOverlay`, and hooks
`useQuickTimePlayback`, `useQuickTimeSubtitles`, `useControllableState`.

`QuickTimeVideoEmbed` also takes `options` (passed to `react-player` as its
`config`) and the media callbacks `onReady` (ready to play), `onWaiting`
(stalled, waiting for data) and `onPlaying` (playback started or resumed).

### 4.10 Built-in apps

**Do NOT mount these yourself** — `ClassicyDesktop` renders all of them
automatically (`FinderAboutThisComputer` is mounted by Finder). Mounting them
as children would double-mount every app. They are listed here so you know
what exists and what the `ClassicyAppManagerProvider` `disable*` props turn
off:

| Component | Purpose | Disable via provider prop |
|---|---|---|
| `Finder` | The Finder (file browsing, trash, Applications) | always on |
| `ClassicyControlPanels` | Appearance, Date & Time, Drive Setup, Sound panels | always on |
| `SimpleText` | Text editor | `disableSimpleText` |
| `HyperCard` | Stack player (+ `HyperCard/Editor/*` authoring UI) | `disableHyperCard` |
| `PDFViewer` | PDF viewer | `disablePDFViewer` |
| `MoviePlayer` | QuickTime movie player | `disableMoviePlayer` |
| `QuickTimePictureViewer` | Picture viewer | `disablePictureViewer` |
| `WebViewer` | Web browser | `disableWebViewer` |
| `AppleGuide` | Help system extension | always on |

The components are still individually exported (all take no props) for
advanced setups that build their own desktop shell. The four control panels
are also individually exported (`ClassicyAppearanceManager`,
`ClassicyDateAndTimeManager`, `ClassicyDriveSetup`, `ClassicySoundManager`),
and `PDFViewerDocument` (`{ url, data? }` — data = gzip+base64url bytes) is a
standalone PDF renderer with zoom/pan usable inside any consumer window.

#### Driving the built-in apps by dispatch

Each media app exports an `*AppInfo` constant (`{ id, name, icon }` — ready
for `ClassicyAppOpen`) and open/close actions. One dispatch opens a document:

```ts
import { MoviePlayerAppInfo } from 'classicy'
dispatch({
    type: 'ClassicyAppMoviePlayerOpenDocument',
    document: { url: 'https://example.com/clip.mp4', name: 'Clip', type: 'video' },
})
```

| App (`*AppInfo` id) | Action | Payload |
|---|---|---|
| Movie Player (`MoviePlayer.app`) | `ClassicyAppMoviePlayerOpenDocument` / `OpenDocuments` / `CloseDocument` | `document` (or `documents[]`): FS path string OR `{ url*, name?, type? ("audio"\|"video"\|"image"), icon?, subtitlesUrl? }`; deduped/matched by `url` |
| | `ClassicyAppMoviePlayerOpenFile` / `CloseFile` | `{ path: string }` (ClassicyFileSystem path) |
| Picture Viewer (`PictureViewer.app`) | `ClassicyAppPictureViewerOpenDocument` / `OpenDocuments` / `CloseDocument` | `document`: path string OR `{ url*, name?, icon? }` |
| | `ClassicyAppPictureViewerOpenFile` / `CloseFile` | `{ path: string }` |
| PDF Viewer (`PDFViewer.app`) | `ClassicyAppPDFViewerOpenFile` / `CloseFile` | `{ path: string }` (FS path only) |
| Web Viewer (`WebViewer.app`) | `ClassicyAppWebViewerOpenUrl` / `CloseUrl` | `{ url*: string, title?: string }`; `url` is the window identity — re-opening focuses the existing window |

Exported zod schemas / types / guards: `MoviePlayerOpenFileSchema`,
`MoviePlayerData`/`isMoviePlayerData`, `PictureViewerOpenFileSchema`,
`isPictureViewerData`, `PDFViewerData`/`isPDFViewerData`,
`WebViewerOpenUrlSchema`, `WebViewerData`/`isWebViewerData` (prefer
`parseAppData` for new code).

---

## 5. Asset registries

Every swappable image, cursor, wallpaper and font is registered under an
appearance **package id** and read back through one registry
(`src/Appearance/ClassicyAssetRegistry.ts`). Platinum registers everything it
ships as package `"platinum"` (`src/Appearance/Platinum/assets/platinumAssets.ts`
plus the icon tree in `ClassicyIcons.ts`); a host registers its own assets at
app entry, once, before rendering.

Five kinds (`ClassicyAssetKind`):

| Kind | Holds | Register with |
|---|---|---|
| `icons` | the nested icon tree (`ClassicyIcons`: `classicy`, `applications`, `controlPanels`, `system`, `ui`, and your own namespaces) | `registerClassicyIcons` |
| `cursors` | one cursor image per `ClassicyCursorRole` | `registerClassicyCursors` |
| `wallpapers` | desktop wallpapers by display name | `registerClassicyWallpapers` |
| `fonts` | font faces, `fonts.<family>.<weight>-<style>` | `registerClassicyFonts` |
| `systemArt` | named pieces of system artwork (`ClassicySystemArtKey`) | `registerClassicySystemArt` |

An asset is a `ClassicyAssetSource`, a plain string: an imported URL, a relative,
`http(s)` or `blob:` URL, a `data:` URI, or an absolute URL on the library
module's own protocol (`new URL(import.meta.url).protocol`) or the page's
(`location.protocol`), so `file:` (Electron), `app:`, `tauri:`, `capacitor:` and
extension hosts work. `isClassicyAssetSource` refuses any other scheme,
`javascript:` and `vbscript:` always (case-insensitive, after trimming), and any
string holding a `"`, `\`, CR or LF, which could break out of the quoted CSS
`url("…")` every emitter writes. Spaces and parentheses are fine.
`registerClassicyAssets` (so every `registerClassicy*` registrar) checks each
leaf with it: an invalid leaf is skipped with a `classicyLog` warning naming the
kind, package and dotted path, and the rest of the tree still registers. A
namespace whose every leaf is skipped is left out, so it never replaces an
existing asset with an empty namespace.

### Registering

```ts
import {
    registerClassicyAssets,   // (kind, packageId, tree) — the primitive
    registerClassicyIcons,    // <T extends ClassicyAssetTree>(icons: T, packageId = "platinum"): T
    registerClassicyCursors,  // (packageId, Partial<Record<ClassicyCursorRole, ClassicyAssetSource>>)
    registerClassicyWallpapers, // (packageId, Array<{ name: string; src: ClassicyAssetSource }>)
    registerClassicyFonts,    // (packageId, ClassicyFontFace[])
    registerClassicySystemArt, // (packageId, Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>)
} from 'classicy'

// ClassicyFontFace = { family: string; src: ClassicyAssetSource | ClassicyAssetSource[];
//   weight?: string ("normal"); style?: string ("normal") }   (an array = fallback sources in order)

// Module scope in your entry file, before the first render:
export const AppIcons = registerClassicyIcons({ myApp: { app: tvIcon } })  // returns its argument, typed
registerClassicySystemArt('platinum', { aliasBadge: myAliasArrow })       // replaces ONE key, nothing else
registerClassicyCursors('platinum', { hand: myHand })
registerClassicyWallpapers('platinum', [{ name: 'Bubbles', src: bubblesPng }])
registerClassicyFonts('platinum', [{ family: 'MyFace', src: [myWoff2, myTtf] }])
```

- **Deep merge.** Registration merges into the package's tree for that kind:
  new leaves are added, an existing leaf is replaced, and sibling entries are
  kept. `registerClassicyIcons({ system: { files: { document } } })` therefore
  replaces only `system.files.document`, not the rest of `system`. A leaf replaced by a namespace (or
  the reverse) logs a `classicyLog` warning and the new value wins. The keys
  `__proto__`, `constructor` and `prototype` are ignored.
- **Per-package namespaces and fallback.** Each package id has its own tree per
  kind. A read looks in the active package first, then in `"platinum"`, so a
  package only registers what it changes. (Until the appearance-package switch
  lands, the active package is always `"platinum"`; register overrides under
  `"platinum"`, or under your own id once packages are selectable.)
  `registerClassicyIcons(icons, packageId)` takes the id last, and defaults to
  `"platinum"`.
- **Fonts write CSS.** `registerClassicyFonts(packageId, faces)` also writes the
  `@font-face` rules into `<style id="classicy-fonts-<packageId>">` (placed
  after `classicy-styles`) and registers each face's primary source in the
  tree. A face with an unsafe family, descriptor or source is skipped with a
  warning. Platinum's thirteen faces are `.woff2` files in `dist/assets/`.
- **Wallpapers** register as `wallpapers.<name>`; the Appearance Manager's
  Desktop tab lists the merged tree. **Fonts** feed its Fonts tab the same way.

### Reading (the rule)

Read an asset when you render or when you act, never once at import time.

```tsx
import { useClassicyAsset, useClassicyAssetTree, resolveClassicyAsset } from 'classicy'

// In a component: re-renders when that path is (re)registered, even after mount.
const alias = useClassicyAsset('systemArt', 'aliasBadge') ?? ''
const icon = useClassicyAsset('icons', 'applications.myApp.app') ?? ''

// Outside React (event handlers, reducers, utilities): read at call time.
const url = resolveClassicyAsset('cursors', 'hand')   // string | undefined

// A whole merged kind (a stable COPY, platinum under the active package):
const wallpapers = useClassicyAssetTree('wallpapers')
```

- `resolveClassicyAsset(kind, dottedPath, packageId?)` returns the leaf from the
  given (or active) package, then `"platinum"`, else `undefined`. Components
  use `?? ""`.
- `useClassicyAsset(kind, path)` and `useClassicyAssetTree(kind)` subscribe via
  `useSyncExternalStore` (`subscribeClassicyAssets(listener)` is the raw
  subscription). The tree is a copy, stable until the next registration;
  never mutate it.
- **Never capture an asset in a module-scope constant**
  (`const arrow = ClassicyIcons.system.alias`). The value is frozen at import
  and misses later registrations and package switches. `ClassicyIcons` is only
  the Platinum icon tree that gets registered; components read through the
  registry.

### Migrating icon overrides (breaking change)

Two things changed for code that registered or read icons:

- **`ClassicyIcons` is a snapshot.** The constant is only the Platinum icon
  tree as shipped. It does not reflect later `registerClassicyIcons` calls
  (`ClassicyIcons['myApp']['icon']` is `undefined` at runtime). Read icons
  through `useClassicyAsset('icons', path)` or
  `resolveClassicyAsset('icons', path)`, not the constant; keep the typed value
  `registerClassicyIcons` returns if you want autocomplete.
- **System art and cursors moved out of the icon tree.** Platinum copies these
  icon paths into system art and cursors when `platinumAssets.ts` loads, and
  every consumer now reads the system-art key or cursor role, so registering
  the icon path no longer changes what is drawn:

| Icon path | Now drawn from | Register with |
|---|---|---|
| `system.alias` | system art `aliasBadge` | `registerClassicySystemArt(pkg, { aliasBadge })` |
| `system.apple` | system art `appleMenu` | `registerClassicySystemArt(pkg, { appleMenu })` |
| `system.desktop.trashEmpty` | system art `trashEmpty` | `registerClassicySystemArt(pkg, { trashEmpty })` |
| `system.desktop.trashFull` | system art `trashFull` | `registerClassicySystemArt(pkg, { trashFull })` |
| `ui.helpButton` | system art `helpButton` | `registerClassicySystemArt(pkg, { helpButton })` |
| `classicy.logo` | system art `aboutLogo` | `registerClassicySystemArt(pkg, { aboutLogo })` |
| `system.macosSvg` | system art `startupLogo` | `registerClassicySystemArt(pkg, { startupLogo })` |
| `ui.cursors.watch`, `hand`, `resizeLr`, `resizeUd`, `resizeU`, `resizeD`, `resizeL`, `resizeR` | the cursor role of the same name | `registerClassicyCursors(pkg, { watch, hand, … })` |

`pkg` is `"platinum"` until appearance packages are selectable. The icon
paths stay registered, so reading them still works: the PDF viewer's pan-tool
button, for one, still draws the `ui.cursors.hand` icon. The screen saver's
built-in logos copy `classicy.logo` and `system.macosSvg` too; replace those
with `registerClassicyScreenSaverLogo`.

### System art

`ClassicySystemArtKey` is a union of 44 keys. Platinum registers 21 of them;
the rest resolve to `undefined` and their consumers fall back to the stylesheet
default (or draw nothing).

| Registered by Platinum | Notes |
|---|---|
| `appleMenu`, `sadMac`, `startupLogo`, `trashEmpty`, `trashFull`, `aliasBadge`, `helpButton`, `aboutLogo` | read by the menu bar, crash screen, startup screen, Finder, desktop icons, `ClassicyHelpButton`, About This Computer |
| `windowStripes`, `windowStripesRed`, `windowGrip`, `windowDither`, `zoomGlyph`, `collapseGlyph` | window chrome art |
| `triangle`, `downArrow`, `submenuArrow`, `popupArrows`, `sliderThumb`, `sliderStrikes`, `tabOutline` | control art |

Unregistered by Platinum (23 keys): `aboutBackground`, `windowUtilityShade`,
`windowUtilityHighlight`, `titleBarCapLeft`, `titleBarCapRight`,
`titleBarCapLeftRed`, `titleBarCapRightRed`, `sliderThumbRect`, `halftone`,
`halftoneLarge`, `quickTimeThumbSlider`, `quickTimeVolumeSlider`,
`controlStripTab`, `controlStripCollapse`, `controlStripScrollLeft`,
`controlStripScrollLeftDisabled`, `controlStripScrollRight`,
`controlStripScrollRightDisabled`, `controlStripModuleArrow`, `popUpSliderTrack`,
`popUpSliderThumb`, `menuCheck`, `menuDash`. Why:

- The four title-bar caps and the two utility keys have SVGs under
  `src/Appearance/Platinum/assets/art/` (`title-bar-left.svg`, `-right.svg`,
  the red pair, `title-bar-utility.svg`) but stay unregistered until Part E
  wires them into the window chrome.
- `menuCheck` and `menuDash` are Unicode glyphs in `ClassicyMenu`, and the
  Control Strip and pop-up slider art is `ClassicyPixelArt` rows of theme
  tokens, so those keys have no file.
- The rest have no Platinum art today.

Platinum's own test (`platinumAssets.test.ts`) classifies every key in an
exhaustive `Record<ClassicySystemArtKey, boolean>`, so adding a key to the union
without deciding whether Platinum registers it is a type error.

### Cursor roles

`ClassicyCursorRole`: `arrow`, `watch`, `hand`, `ibeam`, `crosshair`,
`resizeLr`, `resizeUd`, `resizeNwse`, `resizeNesw`, `resizeU`, `resizeD`,
`resizeL`, `resizeR`. Platinum registers `arrow`, `watch`, `hand`, `resizeLr`,
`resizeUd`, `resizeU`, `resizeD`, `resizeL`, `resizeR`; `ibeam`, `crosshair`,
`resizeNwse` and `resizeNesw` have no Platinum file and stay unregistered, so
the browser's own cursor shows for them.

`useClassicyCursor()` returns a stable `setCursor(role?)` that reads the role
from the registry at call time and sets `document.body.style.cursor`; a role
with no registered cursor (or no argument) restores the default.

### CSS variables

`ClassicyDesktop` defines one custom property per registered cursor and system
art entry on its root element, as a `url("…")` value (`useClassicyAssetVars`
returns the same map; the names are camelCase keys turned kebab-case):

- `--classicy-cursor-<role>`: `--classicy-cursor-arrow`, `-watch`, `-hand`,
  `-ibeam`, `-crosshair`, `-resize-lr`, `-resize-ud`, `-resize-nwse`,
  `-resize-nesw`, `-resize-u`, `-resize-d`, `-resize-l`, `-resize-r`.
- `--classicy-art-<key>`: one per system-art key, e.g.
  `--classicy-art-alias-badge`, `--classicy-art-window-grip`,
  `--classicy-art-slider-thumb`.

Only registered entries are defined, and they update when a registration
changes. Use them in your own SCSS inside the desktop, with a fallback because
an undefined variable voids the whole declaration:

```scss
.myDivider { cursor: var(--classicy-cursor-resize-lr, url('data:,')) 8 8, col-resize; }
```

`ClassicySplitView` and the PDF viewer's pan tool use exactly this form. The
variables are scoped to the desktop root, so they do not exist outside it.

Platinum's base64 art variables in `assets.scss` are unchanged; the registry
changes how assets are exposed and swapped, not how Platinum draws.

---

## 6. Untrusted Actions (HyperCard script safety)

Actions dispatched with trust `"untrusted"` (e.g. effects from interpreted
HyperCard stack scripts) must pass **two kernel-enforced checks** before any
handler runs:

1. **Guarded floor** — types matching `ClassicyDesktop*` or `ClassicyWindow*`
   prefixes, plus `ClassicyAppFinderEmptyTrash` and
   `ClassicyAppHCEditSetScript`, are unconditionally unreachable. Nothing can
   opt back in — allowlisting a guarded type has **no effect**.
2. **Deny-by-default allowlist** — the type must also be allowlisted. The
   default allowlist contains exactly one entry: `ClassicyAppOpen` (so a stack
   can open apps with zero host configuration).

APIs:

```ts
import { isUntrustedActionAllowed, registerClassicyUntrustedActionAllowlist } from 'classicy'

registerClassicyUntrustedActionAllowlist('ClassicyAppMyCustomEffect')

// At a dispatch site handling script-authored action types:
if (!isUntrustedActionAllowed(actionType)) return  // drop quietly
dispatch(action, 'untrusted')                       // the kernel re-checks anyway
```

Prefer `scriptable: true` on a `registerApp` action entry — it allowlists the
type AND validates script args against the action's zod `params` before
dispatch. Also exported: `isActionTrustGuarded`, `isActionTrustPermitted`,
`isUntrustedActionAllowlisted`, `getClassicyUntrustedActionAllowlist`.

---

## 7. File System & Sync Adapters

`ClassicyFileSystem` is a browser-local, localStorage-primary file system using
colon-separated paths (`Macintosh HD:Documents:note.txt`). Access it with the
`useClassicyFileSystem()` hook; mutate ONLY through its methods (`writeFile`,
`mkDir`, `rmDir`, `move`, `load`, `setMetadata`) — never touch `fs.fs` or entries
directly.

All instances for one storage key share a single live tree: a mutation through
any of them is visible through every one, and is announced to
`subscribeClassicyFileSystem(storageKey, listener)` (snapshot:
`getClassicyFileSystemVersion(storageKey)`, a mutation counter). The hook
subscribes, so its component re-renders with a fresh `fs` on every change;
`useClassicyFileSystemAccessor()` returns a stable `() => fs` for event handlers
that shouldn't re-render. `System.Manager.Desktop.fsVersion`
(`ClassicyDesktopFileSystemVersionBump`) is only a reload token, for when the
*stored* tree is replaced behind the live one (adapter reconcile, Drive Setup).

`fs.move(path, toFolderPath, { name?, metadata? })` → `{ ok: true, path }` |
`{ ok: false, reason }` (`name` renames into the destination; `metadata` is
patched onto the entry in the same journaled move, `undefined` values removing
keys),
reason one of `missing`, `not-a-folder`, `same-folder`, `into-itself`, `locked`
(drive, `_system`, `_readOnly` item, or read-only source/target folder),
`exists` (never replaces). `moveClassicyFileSystemItems(fs, paths, destination,
dispatch, { desktopLocation? })` (`ClassicyFileMove.ts`) is the Finder's
wrapper: moves, dispatches `ClassicyAppFinderPathsMoved { moves: {from, to}[] }`
(Finder windows follow moved folders), places desktop icons, and shows an alert
for the first refusal.

**Trash** (`ClassicyTrash.ts`): a root-level folder `CLASSICY_TRASH_PATH`
(`"Trash"`), made by `ensureClassicyTrash(fs)`. `trashClassicyFileSystemItems(fs,
paths, locations?)` records `_trashed`/`_trashedFrom`/`_trashedName`/
`_trashedLocation` and numbers clashing names; `restoreClassicyFileSystemItems`
puts items back (refusals add `no-origin`); `emptyClassicyTrash`;
`listClassicyTrashItems`, `isInClassicyTrash`, `isClassicyTrashItem`. Finder
wrappers with alerts and icon handling: `moveClassicyItemsToTrash(fs, paths,
dispatch)`, `restoreClassicyTrashItems(fs, paths, dispatch)`. A drop on the
Trash routes through `moveClassicyFileSystemItems`. Special menu:
`ClassicyDesktopShowSystemDialog { dialog: "emptyTrash" | "resetPram" | null }`
(`Desktop.systemDialog`, never persisted); `classicySpecialMenuItems(dispatch,
idPrefix)` and `ClassicyEmptyTrashAlert` are the shared pieces.

### Entry format

An entry is a plain object: underscore-prefixed keys are metadata
(`ClassicyFileSystemEntryMetadata`), non-underscore keys are children.
`_type` is required; everything else optional:

| Field | Type | Meaning |
|---|---|---|
| `_type` * | `ClassicyFileSystemEntryFileType` | one of `file, shortcut, app_shortcut, extension, drive, directory, text_file, markdown, pdf, image, video, audio, stack` |
| `_mimeType` | `string` | MIME type |
| `_creator` / `_format` | `string` | select the opening application for the file |
| `_label` / `_comments` | `string` | standard Mac metadata fields |
| `_url` | `string` | URL to fetch content from; also the target of a `shortcut` |
| `_openIn` | `"classicy" \| "browser" \| "browser-new"` | how a shortcut's `_url` opens (absent = `"classicy"`, the in-desktop WebViewer window) |
| `_data` | `unknown` | file contents; a string read via `resolveFileSystemEntrySource` is gzip+base64url bytes and takes precedence over `_url` |
| `_icon` / `_badge` | `string` / `ReactNode` | icon URL / badge overlay |
| `_createdOn` / `_modifiedOn` | `Date` | timestamps |
| `_readOnly` / `_nameLocked` / `_trashed` / `_system` / `_invisible` | `boolean` | content locked / name locked / in Trash / system file / hidden |
| `_derived` | `boolean` | generated by a derived-folder overlay (Applications, Extensions, Control Strip Modules); dropped when the overlay is rebuilt |
| `_versions` | `ClassicyFileSystemEntry[]` | prior versions |

Content helpers: `useResolvedMediaSource(url, data, mimeType)` turns an
entry's `_url`/`_data` into a src usable by `<img>`/`<video>` (decompresses
`_data` into an object URL, revoked on unmount);
`resolveFileSystemEntrySource` is the non-hook equivalent;
`compressToBase64` / `decompressFromBase64` produce/consume the `_data`
format. Seed-tree helpers for the provider's `defaultFileSystem` prop:
`DefaultFSContent` (the stock tree) and `mergeClassicyFileSystemEntries`.

Browse UI: `ClassicyFileBrowser` (`fs` *, `path` *, `appId` *,
`display? ("icons"|"list")`, `dirOnClickFunc?`, `fileOnClickFunc?`,
`onMoveItems?(paths, destination, outlineTopLeft)`,
`showInvisible? (true)` — list `_invisible` entries (Finder passes false),
`onDeleteItems?(paths)` — Delete/⌃⌫ with a selection,
`itemContextMenu?(path, selectedPaths) → ClassicyMenuItem[] | undefined` —
right-click on an item, `commandsRef?` — `{ selectedPaths() }`), with
`ClassicyFileBrowserViewIcons` / `ClassicyFileBrowserViewTable` as the
individual views. With `onMoveItems`, items drag as Mac OS 8 Finder items: a
dotted outline (icon shape ∪ label box) follows the pointer; let go on a folder
or drive (`destination {kind:"folder", path}`) or the desktop (`{kind:"desktop"}`)
the callback moves them. Drop targets are any element marked
`data-classicy-drop-folder="<path>"` or `data-classicy-drop-desktop`
(`CLASSICY_DROP_FOLDER_ATTRIBUTE`/`…DESKTOP…`); windows, the menu bar, the
Control Strip and dialogs block drops. The drag engine is
`startClassicyFileDrag` (`ClassicyFileDrag.ts`). The desktop's files and
folders live in the invisible `Desktop Folder` on the startup disk; Finder
mirrors it as desktop icons (`kind` `file`/`directory`, `filePath` set).

### Mirroring to a backend

```ts
import { registerClassicyFileSystemAdapter } from 'classicy'

registerClassicyFileSystemAdapter({
    id: 'my-backend',
    // journal mode: every mutation, with a persisted monotonic seq (gap = missed delivery)
    onChange: (entry) => { /* { seq, op: "write"|"mkdir"|"rmdir"|"meta"|"load"|"move", path, to? (move), data?, metadata?, unsetMetadata? (move: removed keys), timestamp } */ },
    // snapshot mode: debounced full tree + sha256 hash
    onSnapshot: (snapshot) => { /* { tree, hash, seq, storageKey, timestamp } */ },
    // two-way boot sync; errors degrade to local-wins
    reconcile: async (local) => ({ action: 'useLocal' }),  // or { action: 'replace', tree }
}, { snapshotDebounceMs: 500 })
```

All hooks are optional (capability-based). Register at app entry before
rendering. Re-registering an id replaces it; `unregisterClassicyFileSystemAdapter(id)`
removes it. Adapter exceptions are isolated — a faulty adapter can never block
local operation. Derived folders (Applications, Extensions, Control Strip
Modules) never journal.

---

## 8. Theming

Themes are plain JSON objects (`ClassicyTheme`): 21 built-ins ship with ids
`default, azul, bondi, copper, crimson, emerald, frenchBlue, gold, ivy,
lavender, pistachio, magenta, nutmeg, poppy, plum, rose, sapphire, silver,
teal, turquoise, sunny`.

```ts
type ClassicyTheme = {
    id: string
    name: string
    color: { outline; select; highlight; black; white; alert; error;
             system: number[7]; theme: number[7];
             window: { border; borderOutset; borderInset; frame; title; document } }  // colors are ints
    typography: { ui; uiSize; header; headerSize; body; bodySize; mono; monoSize; digital; digitalSize }
    measurements: { window: { borderSize; controlSize; paddingSize; scrollbarSize } }
    desktop: { iconSize; iconFontSize; backgroundImage; backgroundColor;
               backgroundSize; backgroundRepeat; backgroundPosition }
    sound: { pack: string; disabled: string[] }
}
```

There is **no `registerTheme` function**. The registration seam is the store:

```ts
import { getAllThemes, getTheme, getThemeVars } from 'classicy'

// Add/replace themes (replaces the whole list — include the stock ones to keep them):
dispatch({ type: 'ClassicyDesktopLoadThemes', availableThemes: [...getAllThemes(), myTheme] })
dispatch({ type: 'ClassicyDesktopChangeTheme', activeTheme: 'myTheme' })  // no-op if id unknown
```

### Custom themes and colour edits

Built-in themes (`Appearance.availableThemes`) are never mutated. Every theme
edit — `ClassicyDesktopChangeColor`, `ChangeMetric`, `ChangeFont`,
`ChangeFontSize`, `ChangeBackground`, `ChangeBackgroundPosition`/`Repeat`/`Size`
— goes through
`editActiveClassicyTheme` (`ClassicyCustomTheme.ts`):

- **First edit while a built-in is active** deep-copies it into the single
  "Custom" slot (`id: "custom"`, `name: "Custom"`; constants
  `CLASSICY_CUSTOM_THEME_ID` / `CLASSICY_CUSTOM_THEME_NAME`) in
  `Appearance.customThemes`, overwriting any previous Custom, makes it active,
  and applies the edit there.
- **Edits while a custom theme is active** modify it in place (the active copy
  and its `customThemes` entry stay in sync).
- An edit that changes nothing (same value, unknown font slot) does not fork.
- `ClassicyDesktopChangeTheme` looks the id up in `availableThemes`, then
  `customThemes`, and activates a copy, so switching to a built-in and back to
  `"custom"` restores the edits. `ClassicyDesktopLoadThemes` leaves
  `customThemes` alone.

`customThemes` is persisted separately from `availableThemes` because persisted
arrays replace their defaults on load — a custom entry inside
`availableThemes` would freeze the built-in list. State saved before custom
themes existed loads with `customThemes: []`. Read helpers:
`listClassicyThemes(appearance)` (built-ins then customs, the theme menu's
order), `findClassicyTheme(appearance, id)`, `isCustomThemeActive(appearance)`.

`ClassicyDesktopChangeColor` addresses one of the 28 colour variables:

```ts
// Scalars: no index.
dispatch({ type: 'ClassicyDesktopChangeColor', colorKey: 'select', color: 0x3366cc })
// Palettes: index 0–6 maps to --color-system-01 … -07 / --color-theme-01 … -07.
dispatch({ type: 'ClassicyDesktopChangeColor', colorKey: 'theme', index: 2, color: 0x9999ff })
```

| `colorKey` | CSS variable |
|---|---|
| `black`, `white`, `alert`, `error`, `outline`, `select`, `highlight` | `--color-<key>` |
| `system` / `theme` + `index` 0–6 | `--color-system-0N` / `--color-theme-0N` |
| `windowBorder`, `windowBorderOutset`, `windowBorderInset`, `windowFrame`, `windowTitle`, `windowDocument` | `--color-window-border`, `-border-outset`, `-border-inset`, `-frame`, `-title`, `-document` |
| `desktopBackground` | `--desktop-background-color` |

`color` must be an integer 0x000000–0xFFFFFF; `index` is required for the
palettes and must be absent otherwise. Invalid payloads are ignored
(`hasThemeColorChange`). `CLASSICY_THEME_COLOR_TARGETS` lists all 28 targets
with their CSS variable, label and group; `getThemeColor(theme, target)` /
`setThemeColor(theme, target, color)` read and write one. The Appearance
Manager's Colors tab (`useColorsTab`) is built from that table. Like every
`ClassicyDesktop*` action, these are unreachable to untrusted (HyperCard)
dispatches.

`ClassicyDesktopChangeMetric` does the same for the 20 layout metrics, with
identical fork-on-first-edit semantics:

```ts
dispatch({ type: 'ClassicyDesktopChangeMetric', metricKey: 'buttonGap', value: 16 })
```

`metricKey` is one of `CLASSICY_THEME_METRIC_KEYS` — `windowBorderSize`,
`windowControlSize`, `windowPaddingSize`, `windowScrollbarSize`,
`windowTitleBarHeight`, `windowUtilityTitleBarHeight`, `controlHeight`,
`controlLabelGap`, `controlStaticTextHeight`, `buttonMinWidth`,
`buttonTextPadding`, `buttonGap`, `groupBoxMarginSide`, `groupBoxMarginTop`,
`groupBoxMarginBottom`, `groupBoxTitlePad`, `groupBoxGap`, `layoutItemGap`,
`layoutGroupGap`, `layoutDialogEdge` — the camelCase spelling of
`measurements.<family>.<key>`. `value` is whole pixels within the target's
`min`–`max` (0 or 1 to 512; the sizes a zero would collapse have `min` 1).
Invalid payloads are ignored (`hasThemeMetricChange`).
`CLASSICY_THEME_METRIC_TARGETS` (`ClassicyThemeMetricTargets.ts`) lists every
target with its CSS variable, label, group and bounds; `getThemeMetric` /
`setThemeMetric` read and write one. Derived variables (frames, bevels, the
edit-field height, …) have no target — change the input they derive from.

`getTheme(id, overrides?)` returns a deep-merged clone; `getThemeVars(theme)`
returns the CSS custom-property map. Raw SCSS partials are importable via
`classicy/scss/*`.

Theme-authoring helpers: `hexToInt` / `intToHex` convert between hex strings
and the integer colors themes use. `ClassicyWallpapers` is the stock
wallpaper catalog and `resolveWallpaper(name)` maps a wallpaper name (as used
in `desktop.backgroundImage` / `ClassicyDesktopChangeBackground`) to its URL;
`classicyWallpaperFilename(value)` is its inverse (bundled filename for a
filename or a resolved URL / inlined `data:` URI, else `undefined`).

### Theme files (save / load)

The Appearance Manager's Themes tab has **Save Theme…** (downloads the
*active* theme, built-in or custom) and **Load Theme…** (picks a `.json`
file, imports it, selects it). A load error shows a stop alert with the
reason. Helpers live in `ClassicyThemeFile.ts`; the schema in
`ClassicyThemeSchema.ts`.

File format — a versioned envelope, saved as `<theme-name>.classicy-theme.json`:

```json
{ "format": "classicy-theme", "version": 1, "theme": { "id": "azul", "name": "Azul", "color": {…}, … } }
```

- Loading also accepts a **bare theme object** (no envelope), e.g. an entry
  copied from `themes.json`. A `format` other than `"classicy-theme"`, a
  missing version, or a version other than `1` is rejected (a higher version
  reports "saved by a newer version of Classicy").
- `desktop.backgroundImage` is written as the bundled wallpaper's **filename**
  (`"azul_dark.png"`) — the URL a build resolves it to (dev path, inlined
  `data:` URI) is build-specific — and resolved back on load. A plain http(s)
  URL is kept; anything else (custom `data:`/`blob:` URL, relative path) is
  written as `""` (no image).

`ClassicyThemeSchema` (zod) mirrors `ClassicyTheme` (checked both ways at
compile time). Unknown keys are **stripped**, not rejected (a newer file with
an extra optional field still loads; nothing undeclared reaches the store).
Types are strict:

| Field | Rule |
|---|---|
| colours (incl. `desktop.backgroundColor`) | integer `0x000000`–`0xFFFFFF` |
| `color.system` / `color.theme` | exactly 7 colours |
| `name` | 1–64 chars after trimming |
| typography sizes, `desktop.iconSize`/`iconFontSize` | positive, ≤ 512 |
| `measurements.window.*` | ≥ 0, ≤ 512 |
| font stacks | letters, digits, spaces, `"` `'` `,` `.` `_` `-` only |
| `backgroundRepeat`, string `backgroundPosition`/`backgroundSize` | CSS keyword chars (`A-Za-z0-9 % . -`) |
| `desktop.backgroundImage` | `""`, a bundled wallpaper (filename or resolved URL), or an absolute http(s) URL with no whitespace, quotes, `()`, `\`, `;`, `<>`, `{}` — it is interpolated unquoted into `url(…)` (`isSafeClassicyThemeBackgroundImage`) |
| `sound.pack` | a registered sound pack id (e.g. `"platinum"`); see §10 |

```ts
import {
    exportClassicyTheme,      // (theme) => JSON string (envelope, portable wallpaper)
    downloadClassicyTheme,    // (theme) => { ok: true } | { ok: false, error } — round-trip checked first
    parseClassicyThemeFile,   // (text) => { ok: true, theme } | { ok: false, error }
    readClassicyTheme,        // (unknown) => same result; validate + make loadable (no envelope)
    classicyThemeFileName,    // ({ name }) => "french-blue.classicy-theme.json"
    assignImportedClassicyThemeIdentity, // (theme, existingThemes) => theme with unique id/name
} from 'classicy'

const result = parseClassicyThemeFile(await file.text())
if (result.ok) dispatch({ type: 'ClassicyDesktopImportTheme', theme: result.theme })
else showError(result.error)  // e.g. "This theme has invalid settings: color.system: …"
```

`ClassicyDesktopImportTheme { theme }` — the payload is untrusted:
`hasImportableTheme` validates it against the schema (invalid → ignored),
then the reducer strips undeclared keys, resolves the wallpaper, assigns a
fresh identity, **appends** it to `customThemes` and activates a copy (the
same copy-on-activate as `ChangeTheme`; the sound manager reloads itself when
the active theme's `sound.pack` changes).
Identity rules (`assignImportedClassicyThemeIdentity`):

- The file's `id` is ignored. The id is `custom-<slug of the name>`
  (`custom-theme` if the slug is empty), with `-2`, `-3`, … on collision with
  any built-in or custom id — and never `"custom"`, the fork slot the next
  edit on a built-in would overwrite. So an import can never overwrite an
  existing theme, and re-importing the same file adds a second entry.
- The name is kept unless a theme already has it (case-insensitive); then
  `" 2"`, `" 3"`, … is appended, counting up from an existing trailing number
  (`"Azul 2"` → `"Azul 3"`).

An imported theme is a custom theme, so edits modify it in place (no fork).
Like every `ClassicyDesktop*` action it is unreachable to untrusted
(HyperCard) dispatches.

### CSS custom properties

The active theme is materialized as CSS custom properties by
`getThemeVars(theme)` and applied inline on the desktop root by
`ClassicyDesktop` — so they are available to (and only to) elements rendered
inside the desktop. **Style your own components with these variables**, never
hard-coded colors/sizes, and they will follow theme changes automatically:

```css
.myPanel {
    background: var(--color-system-03);
    border: var(--control-frame-width) solid var(--color-window-border);
    font-family: var(--ui-font);
    font-size: var(--ui-font-size);
}
```

Theme-driven variables (values change per theme):

| Family | Variables |
|---|---|
| Core palette | `--color-black`, `--color-white`, `--color-alert`, `--color-error`, `--color-outline`, `--color-select`, `--color-highlight` |
| System grays | `--color-system-01` … `--color-system-07` (light → dark; `03` is the standard control-surface gray) |
| Theme accents | `--color-theme-01` … `--color-theme-07` (light → dark accent ramp) |
| Window chrome | `--color-window-border`, `--color-window-border-outset`, `--color-window-border-inset`, `--color-window-frame`, `--color-window-title`, `--color-window-document` |
| Window metrics | `--window-control-size`, `--window-border-size`, `--window-padding-size`, `--window-scrollbar-size`, `--window-scrollbar-arrow-size` |
| Typography | `--header-font`/`--header-font-size`, `--body-font`/`--body-font-size`, `--ui-font`/`--ui-font-size`, `--mono-font`/`--mono-font-size`, `--digital-font`/`--digital-font-size` |
| Desktop | `--desktop-icon-size`, `--desktop-icon-font-size`, `--desktop-background-image`, `--desktop-background-color`, `--desktop-background-repeat`, `--desktop-background-position`, `--desktop-background-size`; fixed: `--icon-small-size` (16px), `--icon-size-regular` (32px) |

**Layout metrics** are theme data too. The inputs live in the theme JSON under
`measurements.<family>` (Platinum defaults in `CLASSICY_DEFAULT_THEME_METRICS`,
`ClassicyThemeMetrics.ts`; they are Apple's HIG Ch. 3 values) and each is
emitted 1:1 as a variable:

| Theme JSON | Variable | Platinum |
|---|---|---|
| `measurements.window.borderSize` | `--window-border-size` | 1 |
| `measurements.window.controlSize` | `--window-control-size` | 12 |
| `measurements.window.paddingSize` | `--window-padding-size` | 6 |
| `measurements.window.scrollbarSize` | `--window-scrollbar-size` | 17 |
| `measurements.window.titleBarHeight` | `--window-title-bar-height` | 19 |
| `measurements.window.utilityTitleBarHeight` | `--window-utility-title-bar-height` | 10 |
| `measurements.control.height` | `--control-height` (also `--button-height`) | 20 |
| `measurements.control.labelGap` | `--control-label-gap` | 5 |
| `measurements.control.staticTextHeight` | `--control-static-text-height` | 16 |
| `measurements.button.minWidth` | `--button-min-width` (standard OK/Cancel) | 58 |
| `measurements.button.textPadding` | `--button-text-padding` | 8 |
| `measurements.button.gap` | `--button-gap` | 12 |
| `measurements.groupBox.marginSide` / `marginTop` / `marginBottom` | `--group-box-margin-side` / `-top` / `-bottom` | 10 / 12 / 10 |
| `measurements.groupBox.titlePad` | `--group-box-title-pad` | 3 |
| `measurements.groupBox.gap` | `--group-box-gap` (frame to frame, stacked) | 12 |
| `measurements.layout.itemGap` | `--layout-item-gap` | 4 |
| `measurements.layout.groupGap` | `--layout-group-gap` | 16 |
| `measurements.layout.dialogEdge` | `--layout-dialog-edge` | 12 |

**Derived metrics** are computed by `getThemeVars` from those inputs, so a
theme that changes an input gets them for free (never stored in JSON):

| Variable | Formula | Platinum |
|---|---|---|
| `--control-frame-width` | `borderSize × 2` | 2 |
| `--control-bevel-sm` / `-md` / `-lg` | `borderSize × 2 / 3 / 4` | 2 / 3 / 4 |
| `--button-default-ring` | `borderSize × 3` | 3 |
| `--control-row-height` | `controlSize × 1.5` (one-line control row: placard, list-box row) | 18 |
| `--edit-field-height` | `control.height + borderSize × 2` | 22 |
| `--progress-height` | `controlSize` | 12 |
| `--help-button-width` / `-height` | `control.height` / `control.height + borderSize` | 20 / 21 |
| `--layout-focus-gap` | `paddingSize` (preferred gap when focus rings show) | 6 |
| `--window-scrollbar-arrow-size` | `scrollbarSize / 4` | 4.25 |

There are no `--hig-*` variables (removed 2026-10-27, no aliases).

---

## 9. Analytics

```ts
import { useClassicyAnalytics, classicyWindowPagePath } from 'classicy'

const { track, page } = useClassicyAnalytics()  // referentially stable; silent no-ops without GA config
track('button_pressed', { which: 'ok' })         // event name gets the "classicy_" prefix
page('/myapp/settings', 'Settings')              // pageview paths are NOT prefixed
```

Configure via `ClassicyAppManagerProvider` (`gaMeasurementIds`,
`gtmContainerId`, `appName`, `eventPrefix`).

`ClassicyWindow` emits a pageview when it opens and again on each focus of an
already-open window. The path is derived as `/<app>/<window>`; window ids
containing `:` or `/` are treated as user data and collapse to `/file` or
`/folder`. That collapse is *syntactic* — **if your window id embeds user or
consumer data without a separator (e.g. a bare relative URL), pass
`analyticsPath` explicitly**, building it with
`classicyWindowPagePath(appId, "<safe-token>")` so the app segment stays in
sync. Use `analyticsExclude` to suppress a window's pageviews entirely. Window
*titles* go to GA verbatim (deliberate, for readable content reports).

---

## 10. Sound

`ClassicySoundManagerProvider` is mounted for you by
`ClassicyAppManagerProvider` (React context/useReducer, not Zustand). Sounds
are Howler sprite keys from the active sound pack (the bundled Platinum pack
by default).

```ts
import { useSoundDispatch, useClassicyAlertSound } from 'classicy'

const player = useSoundDispatch()
player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowOpen' })
player({ type: 'ClassicySoundPlayInterrupt', sound: 'ClassicyBeep' })  // stops current, then plays

const alert = useClassicyAlertSound()  // () => plays the configured alert sound
```

Action types (string enum `ClassicySoundActionTypes`): `ClassicySoundPlay`
(skipped if muted, per-sound disabled, or already playing),
`ClassicySoundPlayInterrupt`, `ClassicySoundPlayError`, `ClassicySoundStop`,
`ClassicySoundDisable` / `ClassicySoundDisableOne` / `ClassicySoundEnableOne`
(muting = the `"*"` wildcard in `disabled`; toggle just the mute with
`EnableOne`/`DisableOne` `"*"` to keep per-sound choices), `ClassicyVolumeSet`
(`{ volume }` 0–100, clamped and rounded; the player's gain, kept across
pack loads),
`ClassicyAlertSound`, `ClassicySoundSetAlertSound`, `ClassicySoundSetAlertVolume`
(`{ alertVolume }` 0–100, clamped and rounded). `useSound()` reads state.
**Alert volume**: the persisted `Appearance.alertVolume` (default 100, set by
`ClassicyDesktopChangeAlertVolume` from the Appearance Manager's Sound tab) is
mirrored into sound state by the provider. Alerts — `ClassicyAlertSound` and
the sound `ClassicySoundPlayError` plays — play at system volume × alert
volume (set on that Howler sound id only); every other sound plays at the
system volume.
Alert sound options: `CLASSICY_ALERT_SOUNDS` (Bonk, Growl, Indigo, Quack,
Sosumi, Tabitha, Wild Eep); default `DEFAULT_ALERT_SOUND = "ClassicyAlertSosumi"`.

**Sound packs**: a sound pack is one Howler audiosprite sheet registered under
a kebab-case id; a theme selects one with `sound.pack`. The earlier theme field
and the mutable sound-data record it keyed into no longer exist: persisted
state is healed on load, and a theme file that still uses the old field is
refused with a `sound.pack:` issue. Removed public symbols and their
replacements: `ClassicySounds` is now `registerClassicySoundPack` /
`getClassicySoundPack`; `loadSoundTheme` is a theme's `sound.pack`;
`ClassicySoundAction.file` is `ClassicySoundLoad { pack }`;
`ClassicyThemeSound.name` is `ClassicyThemeSound.pack`.

```ts
import { registerClassicySoundPack, CLASSICY_SOUND_SPRITE_IDS } from 'classicy'

registerClassicySoundPack({            // module scope, like the other registries
    id: 'my-pack',                     // /^[a-z0-9][a-z0-9-]{0,63}$/
    name: 'My Pack',                   // 1-64 chars
    packageId: 'my-package',           // optional provenance
    src: ['https://cdn.example/my-pack.ogg', 'https://cdn.example/my-pack.mp3'],
    sprite: { ClassicyBeep: [0, 600], ClassicyWindowMoveMoving: [700, 400, true] },
})
```

- `ClassicySoundPack` is `{ id, name, packageId?, src: string[], sprite }`
  (`ClassicySoundPackSchema` validates it; an invalid pack is rejected with a
  `classicyLog` warning). `sprite` is `Record<string, [offsetMs, durationMs, loop?]>`.
  `src` entries must be resolvable by the page: `http(s)` URLs or `data:`
  URIs. The registry stores them as given and Howler resolves them against the
  page, never against the pack JSON. A pack JSON written by `pnpm build:audio`
  holds paths relative to itself (`./platinum.ogg`), so resolve them first.
  The fetched JSON must carry `id`, `name` and `sprite` (plus `src`):

  ```ts
  const json = await (await fetch(jsonUrl)).json()
  registerClassicySoundPack({
      ...json,
      src: json.src.map((s: string) => new URL(s, jsonUrl).href),
  })
  ```

  A bundled pack does the same at build time with
  `new URL('./x.ogg', import.meta.url)`, as the Platinum pack does.
- Registry: `registerClassicySoundPack(pack)` (re-registering an id replaces
  the pack in place), `getClassicySoundPack(id)`, `listClassicySoundPacks()`
  (registration order), `subscribeClassicySoundPacks(listener)` and the live
  hook `useClassicySoundPacks()`. The stock `"platinum"` pack registers itself
  from `src/Appearance/Platinum/assets/sounds/platinum.ts`. Re-registering the
  id of the pack that is currently active updates the registry but does not
  rebuild the playing Howl: the provider only reloads when the active pack id
  changes.
- **Sprite-id contract**: `CLASSICY_SOUND_SPRITE_IDS` lists the 41 sprite ids
  Classicy dispatches (it equals the Platinum sprite sheet's key set). A pack
  should define all of them. When a pack is loaded and lacks some, the manager
  logs a `warn` (`Sound pack is missing sprites; falling back to platinum`, with
  the missing ids) and plays those sprites from the Platinum pack; a sprite
  missing from both is not played.
- **Single source of truth**: the active theme's `sound.pack` decides which
  pack plays. A host switches packs by activating, or importing, a theme that
  carries `sound.pack` (`ClassicyDesktopImportTheme`) until a dedicated
  appearance-option action ships. `ClassicySoundLoad` is the provider's
  internal action: dispatching it directly works only until the provider's next
  sync, which reverts the player to the active theme's pack.
- **Boot and switching**: `ClassicySoundManagerProvider` reads
  `System.Manager.Appearance.activeTheme.sound.pack` from the persisted store
  and boots with that pack's player already built (Platinum if the pack is not
  registered yet). It reloads when the id changes, and when a pack registers
  after mount under the id the theme already names, with no page reload.
  Editing any other part of the theme never reloads it. The system volume
  (`ClassicyVolumeSet`) and the mute (`"*"` in `disabled`) carry over each
  reload.
- The reload is the reducer action `ClassicySoundLoad { pack, disabled }`
  (`pack` is the `ClassicySoundPack` object, not an id; `disabled` replaces the
  disabled list and defaults to the current one). The provider builds its
  Howls through `ClassicySoundLoad` (which calls `createSoundPlayer`).
- `pnpm build:audio` (`bin/make_audio_sprites.sh`) runs audiosprite over each
  `assets/sounds/<name>/sprites/` directory and writes `<name>.json` plus the
  encoded files next to it; the JSON carries `id` (the directory name), `name`,
  relative `src` and `sprite`, ready to feed `registerClassicySoundPack` once
  `src` is resolved.

---

## 11. Other Extension Seams

| API | Purpose |
|---|---|
| `registerHyperCardPart` / `registerHyperCardCommand` / `registerHyperCardEffectHandler` / `registerHyperCardStack` / `registerHyperCardSaveProvider` (+ `registerHyperCardPartEditorMeta`, `registerHyperCardCommandEditorMeta`) | Extend HyperCard with custom parts, script commands, effects, preloaded stacks, and save backends |
| `registerAppleGuideTopic(topic: HelpTopic)` | Add help topics to Apple Guide; open one programmatically by dispatching the exported `APPLE_GUIDE_SHOW_TOPIC_EVENT` action type; `getAppleGuideTopic(id)` reads back |
| `registerClassicyScreenSaver(def)` | Add screensavers to the idle-activated Screen Saver extension (see "Screen savers" below) |
| `registerClassicyLogSink(sink)` | Receive Classicy's logs, errors, and crash reports in the host app (see "Logging & diagnostics" below) |
| `ClassicyMenuBarExtension` | Add menu bar items (see §4.5) |
| `classicyEditCommands`, `ensureEditTracker` | Programmatic Undo/Cut/Copy/Paste/Clear/Select All acting on the last-focused text field (native editing + Clipboard API); this is what `useClassicyEditMenu` uses — call directly from custom menus/toolbars |
| `useFinderFolderSize`, `FinderContext` | Finder integration points |
| `useClassicyCursor()` | Platinum cursor management |
| `mergeClassicyState(base, overrides)`, `DefaultAppManagerState`, `sanitizeStateForPersistence` | Building custom `defaultState` for the provider |
| `wasHydratedFromStorage()`, `startAppManagerPersistence()`, `stopAppManagerPersistence()` | Persistence lifecycle control (tests, SSR, demos) |
| `resetStartupScreenSession()` (+ `hasShownStartupScreenThisSession`, `markStartupScreenShownThisSession`) | The startup screen shows once per browser session; reset in tests/demos |

### Authoring HyperCard stacks

A stack is plain JSON (`HCStack`): `{ name*: string, version?: "1" | "2",
size?: [w, h] (default [512, 342]), variables?: Record<string, string | number>,
backgrounds?: HCBackground[], cards*: HCCard[] (non-empty), stackScript?: HCEventHandlers }`.
Event handler keys (`HC_EVENT_NAMES`): `onOpenStack`, `onCloseStack`,
`onOpenCard`, `onCloseCard`, `onOpenBackground`, `onMouseUp`, `onMouseDown`,
`onIdle` — each an `HCAction[]`, discriminated by `do`: `go, put, add,
subtract, multiply, divide, set, show, hide, beep, play, answer, ask, visual,
wait, if, repeat, openApp` (plus registered plugin commands).

Validate with `validateStack(raw)` →
`{ ok: true, stack } | { ok: false, errors: string[] }`, preload via
`registerHyperCardStack`, and study the exported `HyperCardWelcomeStack` /
`HyperCardBuiltInStacks` as references. Save-provider authors can reuse
`serializeStack`, `stackFileName`, `downloadStack`, or
`registerDownloadSaveProvider()`.

### Screen savers

`ClassicyDesktop` auto-mounts the `ScreenSaver.app` extension: after
`timeoutMinutes` of real-world inactivity (wall clock — independent of the
Date & Time virtual clock) it covers the desktop with the selected
screensaver; any input wakes it (the waking keystroke/click is swallowed).
Twelve After Dark-style savers ship built in (ids: `bouncing-ball`,
`fade-out`, `fish`, `flying-toasters`, `globe`, `hard-rain`, `logo`,
`messages`, `messages2`, `rainstorm`, `spotlight`, `warp`). The "Screen
Saver" control panel (part of `ClassicyControlPanels`) exposes saver choice,
timeout, on/off, and per-saver options.

Register your own at module scope (re-registering an id replaces it, so
built-ins can be swapped out):

```tsx
import { registerClassicyScreenSaver } from 'classicy'
import { z } from 'zod'

registerClassicyScreenSaver({
    id: 'matrix',
    name: 'Matrix Rain',
    component: MatrixRain,            // FC<{ config }>: full-viewport visuals
    configSchema: z.looseObject({     // fields drive the auto-generated options form
        columns: z.number().int().min(10).max(80).default(40)
            .describe('Number of falling columns.'),
    }),
    configComponent: MatrixOptions,   // optional custom options UI (FC<{ config, onChange }>)
    transparentBackground: false,     // true = reveal the live desktop (e.g. spotlight effects)
})
```

Options UI is two-tier: a saver's `configComponent` wins; otherwise a form is
derived from `configSchema` (number → spinner, boolean → checkbox, enum →
pop-up menu, string → input, `.describe()` text as labels). `onChange`
patches are dispatched as `ClassicyAppScreenSaverSetConfig` and validated
against the schema; saved configs persist in
`apps["ScreenSaver.app"].data.saverConfigs`.

Commands (all trusted-dispatch; `Activate` is also scriptable from HyperCard
stacks):

| Action | Payload | Effect |
|---|---|---|
| `ClassicyAppScreenSaverActivate` | — | start the saver now (ignored while disabled) |
| `ClassicyAppScreenSaverDeactivate` | — | dismiss it |
| `ClassicyAppScreenSaverSetSaver` | `{ saverId }` | choose a registered saver |
| `ClassicyAppScreenSaverSetTimeout` | `{ minutes }` | idle timeout (clamped 1–240) |
| `ClassicyAppScreenSaverSetEnabled` | `{ enabled }` | master switch (off also dismisses) |
| `ClassicyAppScreenSaverSetConfig` | `{ saverId, config }` | merge validated option values |

Registry read side: `getClassicyScreenSaver(id)`,
`listClassicyScreenSavers()` (name-sorted),
`resolveScreenSaverConfig(saver, saved?)`. The `active` flag is transient and
never persists — a reload always wakes up.

**Logo saver images.** The `logo` saver bounces one of a registry of images,
chosen in its options pop-up (config `{ logo: <id> }`). Three ship built in
(`CLASSICY_SCREEN_SAVER_LOGO_IDS`): `berkeley-systems` (the After Dark mark,
default), `classicy` (the Classicy wordmark) and `startup-screen` (the mark
the startup screen shows). Add your own at module scope; the pop-up is live,
and re-registering an id replaces that image in place:

```tsx
import { registerClassicyScreenSaverLogo } from 'classicy'
import logo from './acme-logo.png'

registerClassicyScreenSaverLogo({
    id: 'acme',
    name: 'Acme Corp',   // shown in the Logo pop-up
    src: logo,           // URL or data URI, drawn on black
    width: 160,          // optional px; omit both to use the natural size,
    height: 60,          // give one to scale with the aspect kept
})
```

Logos list in registration order (built-ins first). Read side:
`getClassicyScreenSaverLogo(id)`, `listClassicyScreenSaverLogos()`,
`resolveClassicyScreenSaverLogo(id)` (unknown → default),
`useClassicyScreenSaverLogos()` (live), `unregisterClassicyScreenSaverLogo(id)`.
A saved config naming a logo that is no longer registered draws the default.

### Logging & diagnostics

All of Classicy's internal diagnostics flow through one pipeline that hosts
can tap. Register a sink at app entry (capability-based — implement any
subset; re-registering an id replaces it):

```ts
import { registerClassicyLogSink } from 'classicy'

registerClassicyLogSink({
    id: 'my-telemetry',
    onLog: (entry) => {},               // every entry, all levels
    onError: (entry) => sendToSentry(entry),  // error-level only (also passed to onLog)
    onCrash: (error, componentStack) => {},   // desktop render crashes (Sad Mac)
})
```

`ClassicyLogEntry`: `{ level: "debug" | "info" | "warn" | "error", subsystem,
message, details: unknown[], timestamp }` — `subsystem` matches the bracket
prefix Classicy has always printed (`registerApp`, `ClassicyFileSystem`,
`ClassicyShortcut`, `ScreenSaver`, …).

Delivery rules, chosen deliberately:

- **Sinks receive every entry in production builds too** — that is the point
  of the facility. Only the *console mirror* stays quiet in production for
  `debug`/`info`/`warn`; `error` always prints, so a production console is
  never silent about real failures.
- A throwing sink is isolated (logged to the console, never re-entered
  through the pipeline) and cannot starve other sinks or break Classicy.
- Crash reports (`onCrash`) come from the desktop's error boundary; the Sad
  Mac screen still appears and the boundary keeps its own `console.error`.
- The `debug: true` action-dispatch dumps (`console.group` state diffs)
  remain console-only dev tooling and do not flow through sinks.

Also exported: `unregisterClassicyLogSink(id)`, `getClassicyLogSinks()`, and
`classicyLog(level, subsystem, message, ...details)` — the emitter itself,
usable by consumer apps that want their own diagnostics in the same pipeline
their sinks already collect.

---

## 12. Date & Time (Virtual Clock)

The desktop runs a virtual clock (pausable, offsettable, boundable —
persisted in `System.Manager.DateAndTime`). Read and control it with:

```ts
import { useClassicyDateTime } from 'classicy'

const { localDate, localHMS, tzOffset, paused, boundaryLocked,
        setDateTime, setTzOffset, pause, resume } = useClassicyDateTime({ tick: true })
```

`tick: true` (default `false`) makes `localDate` (TZ-adjusted `Date`) and
`localHMS` (`"HH:MM:SS"`) advance every second, drift-free. Actions (all
routed via the `ClassicyManagerDateTime*` prefix):

| Type | Payload | Effect |
|---|---|---|
| `ClassicyManagerDateTimeSet` | `{ dateTime: Date }` (a real `Date` instance) | set the clock; clamped into `[minDateTime, maxDateTime]` |
| `ClassicyManagerDateTimeTZSet` | `{ tzOffset: string }` (numeric, −12…14) | set timezone offset |
| `ClassicyManagerDateTimeSync` | — | adopt host machine time + offset (honors bounds) |
| `ClassicyManagerDateTimePause` / `Resume` | — | freeze/unfreeze (`Resume` is a no-op while `boundaryLocked`) |
| `ClassicyManagerDateTimeLock` / `Unlock` | — | lock the control panel UI |

Pure helpers: `toLocalDate(iso, tzOffsetHours)`, `toLocalHMS(iso, tzOffsetHours)`.

---

## 13. URL Opening & Web Shortcuts

File-system entries with `_type: "shortcut"` carry `_url` plus `_openIn`, a
`ClassicyShortcutDisposition`:

- `"classicy"` (default, and the fallback for any invalid value) — opens in an in-desktop WebViewer window; `isSameOriginUrl(url)` decides iframe sandboxing
- `"browser"` — replaces the current page
- `"browser-new"` — new tab (`noopener,noreferrer`)

Programmatic navigation dispatches
`{ type: 'ClassicyDesktopOpenUrl', url: string, disposition?: ClassicyShortcutDisposition }`.
Invalid/non-http URLs raise the desktop error dialog; browser dispositions
are executed exactly once by the auto-mounted `ClassicyOpenUrlController`.
Note the action is on the guarded `ClassicyDesktop*` floor — it can never be
dispatched untrusted (stack scripts cannot navigate the page), so dispatch it
trusted from your own code. `readShortcutDisposition(value)` normalizes
untrusted disposition strings.

---

## 14. Rules & Gotchas for Agents

1. **Always select** when reading the store: `useAppManager(s => s.System.Manager.Applications.apps[id])`. The app slice is `Applications`, not `App`.
2. **Never mutate app/file-system state directly.** Apps change state only by dispatching actions handled by their registered handler; file system changes only via `fs.writeFile`/`mkDir`/`rmDir`/`setMetadata`.
3. **Module-scope registration, render-time reads**: `registerClassicyIcons` (and the other `registerClassicy*` asset registrars, §5), `registerApp`, `registerClassicyFileSystemAdapter`, and HyperCard registrations must run before first render (top-level of an entry module). Registering is module scope; reading an asset is not: use `useClassicyAsset`/`resolveClassicyAsset`, never a module-scope capture of an icon or art URL.
4. **App state schemas are loose and optional**: `z.looseObject` with `.optional()` top-level fields, or the kernel's own writes will "fail" your schema in dev warnings.
5. **Plugin prefix routing is insertion-order first-match**, not longest-match. Register more specific prefixes before general ones, and pick prefixes that don't collide with the built-in `ClassicyWindow*`/`ClassicyDesktop*`/`ClassicyApp*` families except intentionally under `ClassicyApp<YourApp>*`.
6. **Guarded actions can never be scripted**: `ClassicyDesktop*`, `ClassicyWindow*`, `ClassicyAppFinderEmptyTrash`, `ClassicyAppHCEditSetScript`. Allowlisting them is a silent no-op by design.
7. **`defaultState` only applies on first boot** (nothing hydrated). During development, clear `localStorage["classicyDesktopState"]` to see provider default changes.
8. **Window ids are data**: they feed analytics paths and persistence. Keep them stable and free of user content, or set `analyticsPath` explicitly.
9. **Colors are integers** (`0xRRGGBB`), not hex strings, throughout themes and color pickers.
10. **Styles come with the import** — the bundle injects `classicy.css` into `<head>`; the fonts are files in `dist/assets/` registered by the Platinum package (`classicy/fonts` is a deprecated no-op). Link `classicy.css` yourself only if a CSP blocks inline `<style>`. Classicy's rules live in `@layer classicy.base`, declared first, so any unlayered host rule *and any host layer* (Tailwind's preflight in `@layer base`, for example) on the same element and property wins. Override in `@layer classicy.user` or with plain unlayered rules; put resets that must yield to Classicy in `classicy.base.host` (§1, Cascade layers).
11. Deprecated (still working, avoid in new code): `noDesktopIcon`, `inApplicationsFolder`, `registerAppEventHandler`, `registerClassicyUntrustedActionAllowlist` for app-owned actions, `isXData`-style hand-rolled guards (use `parseAppData`).
12. **Never mount the built-in apps yourself** (`Finder`, `SimpleText`, `HyperCard`, the viewers, `ClassicyControlPanels`, `AppleGuide`) — `ClassicyDesktop` renders them all automatically; mounting them as children double-mounts them. Use the provider's `disable*` props to remove the optional ones.
