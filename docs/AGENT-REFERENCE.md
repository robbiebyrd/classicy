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

Under a Content-Security-Policy that forbids inline `<style>`, link the two
stylesheets yourself instead: `classicy/dist/classicy.css` (structure), then
`classicy/dist/classicy-platinum.css` (the Platinum look, which the Platinum
appearance package otherwise injects as `<style id="classicy-appearance-platinum">`;
see "Cascade layers" below). Importing them as well is harmless. Link
`classicy.css` **first in `<head>`**, before any other stylesheet, and
`classicy-platinum.css` right after it: each opens with the layer order
statement (below), which only fixes the order if no earlier sheet has named a
layer.

```html
<link rel="stylesheet" href="/node_modules/classicy/dist/classicy.css">
<link rel="stylesheet" href="/node_modules/classicy/dist/classicy-platinum.css">
```

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

**Where the look comes from.** `classicy.css` holds structure only (layout,
sizing, state rules). Every bevel, border, gradient and piece of art is the
active **Appearance Package**'s (§8, "Appearance Packages"). Registering a
package (`registerClassicyAppearancePackage`; Platinum registers itself when
`classicy` is imported) writes its compiled CSS into
`<style id="classicy-appearance-<id>">`: directly after `#classicy-styles`
when that element is already there, else at the end of `<head>` (the shipped
bundle registers Platinum before its own stylesheet injector runs, so in
practice it lands at the end; element order does not matter, because the
order statement decides precedence). That CSS is one `@layer classicy.package
{ … }` block, every rule scoped under
`.classicyDesktop[data-classicy-appearance="<id>"]`, and the desktop root
carries `data-classicy-appearance` with the resolved active package's id. So a
package's look applies only inside a desktop running it, and it beats
Classicy's own rules (`classicy.base`) whatever the specificity:

```css
@layer classicy.package {
  .classicyDesktop[data-classicy-appearance="platinum"] .classicyButton { … }
}
```

**Components outside a desktop are unstyled.** A `ClassicyButton` (or any
component) rendered on its own page, outside `ClassicyDesktop`, gets structure
but no look. Wrap such components in an element that names the package, and
spread the theme and asset variables the desktop root would publish:

```tsx
<div
    className="classicyDesktop"
    data-classicy-appearance="platinum"
    style={{ ...getThemeVars(getTheme('default')), ...useClassicyAssetVars() }}
>
    <ClassicyButton>OK</ClassicyButton>
</div>
```

(`useClassicyAssetVars` is a hook: call it in the wrapping component.)
Portals fall back to `document.body` when no `#classicyDesktop` element
exists, and such body-level portals are unstyled the same way; give the
wrapper `id="classicyDesktop"` to keep them inside it.

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
| `classicy/dist/classicy-platinum.css` | The Platinum package's stylesheet, which the package injects; link it after `classicy.css`, only under a strict CSP |
| `classicy/fonts` | Deprecated no-op kept so existing `import 'classicy/fonts'` lines keep resolving |
| `classicy/dist/*` | Anything in dist; the fonts ship as `dist/assets/*.woff2` |
| `classicy/scss/*` | Raw SCSS partials (the Classicy vocabulary: states, layout helpers, classicy-package): `classicy/scss/vocabulary` (`$classicy-states`, `classicy-state()`; §4.0.1), `classicy/scss/layout` (`classicy-px-rect()`, `classicy-no-select`), `classicy/scss/package` (`classicy-package($id)`, §8) |
| `classicy/appearance/platinum` | Kept for compatibility; registers nothing. Importing `classicy` registers the Platinum package, so you never need this specifier |
| `classicy/appearance/platinum/scss/*` | Platinum's SCSS partials for host `@use`: `mixins` (the `platinum-*` mixins), `scrollbars` (`platinum-scrollbars*`), `assets` (the `$` art variables). The package stylesheet itself (`platinum.scss` and its `components/` partials) is not for host compilation: it ships compiled, injected by the bundle and as `dist/classicy-platinum.css`, and one of its `url()`s points at an asset outside the published files |

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
| `ClassicyDesktopChangeTheme` | `{ activeTheme: "<themeId>" }` | Switch theme (the active package's loaded built-ins, then its defaults and presets, then custom themes, then other packages' built-ins) |
| `ClassicyDesktopChangeAppearancePackage` | `{ packageId: string }` | Switch the active Appearance Package (`System.Manager.Appearance.packageId`, persisted, default `"platinum"`); activates a copy of the package's default theme unless the active theme already belongs to it (`theme.package`). An unregistered id is a logged no-op; untrusted dispatches never reach it (`ClassicyDesktop*` floor) |
| `ClassicyDesktopChangeColor` | `{ colorKey, index?, color }` | Set one theme color (forks a built-in into "Custom"; see §8) |
| `ClassicyDesktopChangeMetric` | `{ metricKey, value }` or `{ family, key, value }` | Set one core layout metric, or one knob of the active package (forks a built-in into "Custom"; see §8) |
| `ClassicyDesktopChangeAppearanceOption` | `{ path, value }` | Set one other theme value by allowlisted dotted path, e.g. `"sound.pack"` (forks a built-in into "Custom"; see §8) |
| `ClassicyDesktopLoadThemes` | `{ availableThemes: ClassicyTheme[] }` | Replace the theme list (missing metric groups are filled, and a missing `package` becomes `"platinum"`) |
| `ClassicyDesktopImportTheme` | `{ theme: ClassicyTheme }` | Add a (schema-validated) theme to `customThemes` with a fresh id and activate it. A theme whose `package` is not registered (the default `"platinum"` always counts as installed) is refused with a `ClassicyAppearance` warning and `Desktop.errorDialog` `{ title: "Appearance", message }` (see §8 "Theme files") |
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
- `ClassicyMenuItem = { id, title?, icon?, disabled?, checked?, keyboardShortcut?, event?, eventData?, onClickFunc?, menuChildren?, part?, balloon?, ... }` (`part` renders as the item's `data-classicy-part`, never a DOM `part` attribute)
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

### 4.0.1 Vocabulary: state classes, part attributes, passthrough, layers

The class names and attributes below are the stable contract for styling
Classicy from outside (host CSS, appearance packages, end-to-end tests). They
are generated from `src/Appearance/vocabulary/ClassicyVocabulary.json` into
`ClassicyVocabulary.ts` and `_vocabulary.scss`; never hand-edit those two.

**State classes.** State is one of 15 bare classes set *beside* the
component's root class, never folded into a longer class name and never in a
`data-state` attribute (Classicy emits no `data-state` anywhere):

`active` `inactive` `disabled` `selected` `pressed` `focused` `hover`
`collapsed` `open` `dragging` `error` `default` `checked` `mixed` `expanded`

```css
.classicyButton.pressed { … }           /* not .classicyButtonPressed */
.classicyWindow.active { … }            /* .inactive, .collapsed, .dragging */
.classicyBevelButton.checked.pressed { … }
```

| Component (root class) | States it sets |
|---|---|
| `ClassicyWindow` (`classicyWindow`; its contents get `collapsed` too) | `active`, `inactive`, `collapsed`, `dragging` |
| `ClassicyButton` | `default` (`isDefault`), `pressed` (`depressed`) |
| `ClassicyBevelButton` | `checked`, `pressed`, `mixed`, `disabled`, `open` (its menu or panel is showing) |
| `ClassicyCheckbox`, `ClassicyRadioInput` | `checked`, `mixed`, `disabled`, `default` |
| `ClassicyPlacard` | `pressed` (also while its menu is open), `disabled` |
| `ClassicyImageWell` | `selected`, `disabled` |
| `ClassicyIcon` | `selected`, `dragging` |
| `ClassicyDesktopIcon` | `selected`, `open` (its app is open, or its folder is open in a Finder window), `dragging` |
| `ClassicyControlStrip` | `collapsed`, `dragging` |
| `ClassicyMenu` items | `disabled`, `open` |
| `ClassicyTabs` tab buttons; `ClassicyListBox` options, `ClassicyTree` nodes, `ClassicyTable` rows and sorted column header, Finder list rows, color picker crayons and modes | `selected` (plus `disabled` where an item can be disabled) |
| `ClassicyPopUpMenu` | `open`, `disabled` |
| `ClassicyDisclosure` (its content element) | `open` |
| `ClassicyFileInput` | `error` |
| `ClassicySlider`, `ClassicyPopUpSlider`, `ClassicyComboBox`, `ClassicyLink`, `ClassicyOutput`, `ClassicyControlLabel`, `ClassicyColorPicker` swatch | `disabled` |

Not every declared state has a component row above:

- `active` and `inactive` are set only by `ClassicyWindow`, from the window
  manager's focus rather than a prop: the focused window (and every modal) is
  `active`, every other open window `inactive`. No other component sets them.
- `hover`, `focused` and `expanded` are declared for appearance packages and
  hosts, but no Classicy component sets them and no Classicy rule reads them
  yet. Classicy styles hover and focus with the `:hover` and `:focus-visible`
  pseudo-classes, and an expanded disclosure or menu is `open`. A package or
  host may add them itself (through `className`), knowing Classicy never
  toggles them.

`aria-*` attributes are still emitted alongside (for example `aria-expanded`
on the Control Strip tab and `aria-pressed` where it applies); style the
class, not the ARIA attribute.

From TypeScript, build a state string with `classicyStateClasses`, keyed by
`CLASSICY_STATE` (type `ClassicyState`). It returns the true states in
vocabulary order, so the same input always yields the same string:

```ts
import { CLASSICY_STATE, classicyStateClasses } from 'classicy'

CLASSICY_STATE.pressed                                  // "pressed"
classicyStateClasses({ pressed: true, active: true })   // "active pressed"
```

`CLASSICY_COMPONENT` (type `ClassicyComponentName`) maps each component name
to its root class (`CLASSICY_COMPONENT.Button === "classicyButton"`,
`CLASSICY_COMPONENT.Tabs === "classicyTabContainer"`).

From SCSS, `@use "classicy/scss/vocabulary"` (the `./scss/*` export points at
`src/Appearance/vocabulary/`) and write state selectors through
`classicy-state()`, which returns `.<state>` and fails the Sass compile for any
name not in `$classicy-states`:

```scss
@use "classicy/scss/vocabulary" as v;

.classicyButton#{v.classicy-state(pressed)} { … }   // .classicyButton.pressed
.classicyButton#{v.classicy-state(bogus)} { … }     // compile error: "classicy-state: unknown state bogus"
```

Classicy's own single-state rules are written `:where(.classicyButton).pressed`,
so they weigh (0,1,0), the same as the root rule they modify; a size or shape
modifier declared later still wins over them.

Upgrading from the folded class names (`classicyWindowActive`,
`classicyButtonDepressed`, `data-state`, …)? See "Migrating to the shared
vocabulary" in §5 for the full old → new table.

**Part attributes.** Parts that a skin or a test must find without relying
on Classicy's internal class names carry one of three attributes
(`CLASSICY_PART_ATTRIBUTE` holds the names):

| Attribute | Values | On |
|---|---|---|
| `data-classicy-control` | `close`, `zoom`, `collapse` | the window title bar's control boxes |
| `data-classicy-role` | `default`, `cancel`, `other` | every `ClassicyAlert` button (the default button, the `role: "cancel"` button, any other including Help) |
| `data-classicy-part` | `apple`, `app`, `help`, `switcher`, `extensions`, `clock`, `window-menu-bar` | the menu bar's clusters: Apple menu, each app menu title, Help, the application switcher, the menu-bar extensions and the clock; and the root of a window's own menu bar (`ClassicyWindowMenuBar`) |

```ts
document.querySelector('.classicyWindow.active [data-classicy-control="close"]')
document.querySelector('[data-classicy-role="default"]')
document.querySelector('[data-classicy-part="clock"]')
```

These parts are flex items in explicit `order`, so an Appearance Package
rearranges them with CSS `order` alone; see "Layout declarations" in §8.

**`className` and `style` passthrough.** Every exported component that
renders an element of its own takes `className` and `style` and applies them
to its outermost element (the exceptions, which have none, are listed below).
They are
merged, never replacing anything: `className` is appended after the root and
state classes (`<ClassicyButton className="wide">` renders
`class="classicyButton … wide"`), and `style` is spread after the component's
own inline style, so a consumer key wins over the component's own — custom
properties included — except window geometry and `zIndex`, which the window
and icon states own:

- `ClassicyWindow` keeps its stored geometry over `style`, and drops
  `zIndex` from it (the stacking band belongs to the window manager;
  `ClassicyIcon` and `ClassicyDesktopIcon` drop `zIndex` likewise). The
  dragging, resizing and inactive paint is state-owned: style it through
  `.classicyWindow.dragging` / `.inactive`, not inline.
- Custom properties a component sets on its root (the desktop's theme
  variables, `ClassicyListBox`'s visible-rows count, `ClassicyWindowFrame`'s
  width, the Control Strip's position, an icon's size) are overridden by the
  same key in a consumer `style`, as is any other inline key. On `ClassicyIcon`
  and `ClassicyDesktopIcon` a `left`/`top` in `style` overrides the drag
  position, so the icon stops following its drag.
- The active Appearance Package's decoration (§8, "Package hooks") lands on
  the component's decoration root, the element that carries its state
  classes. Where that is also the passthrough root, the decoration sits
  between the two: its class follows the state classes and comes before the
  consumer's `className` (class order has no effect on the cascade); its
  `style` follows the component's own and loses to the consumer's; its
  `data-*` attributes come before the component's own. Where the decoration
  root is another element, the two never meet, so a consumer `style` cannot
  override a package's: `ClassicyCheckbox` (decoration on
  `input.classicyCheckbox`, passthrough on `.classicyCheckboxHolder`),
  `ClassicySlider` (`input.classicySlider`; `.classicySliderTrackGroup`),
  `ClassicyInput` (`input.classicyInput`; `.classicyInputHolder`),
  `ClassicyPlacard` (`.classicyPlacard`; `.classicyPlacardHolder`),
  `ClassicyComboBox` (`div.classicyComboBox`; `.classicyComboBoxWrapper`),
  `ClassicyRadioInput` and `ClassicyListBox` while a label is shown (the
  control; the label wrapper), `ClassicyMenu` (the list `<ul>`;
  `.classicyMenuWrapper`) and `ClassicyAlert` (`div.classicyAlert`; its
  window). The table in §8 names every decoration root.
- With a label wrapper (`ClassicyMeter`, `ClassicyOutput`,
  `ClassicyProgressBar`, `ClassicyRadioInput`, `ClassicySlider`,
  `ClassicyListBox`), the props land on the wrapper when a label is shown and
  on the control otherwise. Dialog components (`ClassicyAlert`,
  `ClassicyAboutWindow`, the file and input dialogs, `ClassicyEmptyTrashAlert`,
  `AppleGuideWindow`, `FinderAboutThisComputer`, `FinderPreferences`,
  `HyperCardDialog`) forward them to their `ClassicyWindow`.
- Components whose root changes with their phase apply them to whichever
  root is showing: `ClassicyBootSequence` (the power-on overlay, then the
  default startup screen; a custom `bootScreen` gets neither),
  `PDFViewerDocument` (the loading and error messages, then the viewer) and
  `ClassicyCrashScreen` (only the Sad Mac screen — the boundary has no element
  until a descendant throws). The built-in screen savers take them through
  `ClassicyScreenSaverProps`; the screen-saver overlay passes none, so they
  matter only to a host rendering a saver itself.
- No passthrough, because there is no root element of their own:
  `ClassicyApp` and every bundled app built on it (`Finder`, `SimpleText`,
  `HyperCard`, `MoviePlayer`, `QuickTimePictureViewer`, `PDFViewer`,
  `WebViewer`, `AppleGuide`, `ClassicyScreenSaver`, the control panels and
  `ClassicyControlPanels`); the providers (`ClassicyAppManagerProvider`,
  `ClassicySoundManagerProvider`, `ClassicyMenuProvider`,
  `ClassicyContextualMenuProvider`); the controllers that render nothing or
  only transient alerts (`ClassicyOpenUrlController`,
  `DriveSetupController`); and the components that render a run of sibling
  elements into their parent (`QuickTimeSeekBar`, `QuickTimeVolumeControl`,
  `ClassicySchemaForm`, `ClassicyScreenSaverConfigForm`). Style the elements
  those produce
  (windows, desktop icons, controls) instead.

**Cascade layers.** Every Classicy rule is compiled into `@layer classicy.base`
and ships no `!important` (a test enforces it). The order is declared once,
first in `<head>`:

```css
@layer classicy.base, classicy.package, classicy.user;
```

- Unlayered host CSS, and every host layer declared after this statement
  (all of them, Tailwind's included), beat every `classicy.*` layer whatever
  the specificity.
- An appearance package puts its rules in `classicy.package`, so they beat
  Classicy's base rules whatever the specificity.
- Host overrides placed in `classicy.user` beat base and package, but still
  lose to any later host layer and to unlayered host CSS.

The host-side details (the reserved `classicy.base.host` sublayer for resets
that must yield to Classicy, the granular Tailwind v4 import, CSP linking) are
in §1, Cascade layers.

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

The grow box sits in the corner the active Appearance Package's
`layout.window.growBoxCorner` names (Platinum: bottom-right), and a resize
drag keeps the opposite corner fixed (`computeClassicyWindowResize`); with
`layout.menuBar.placement: "window"` a window with an `appMenu` draws it in
its own menu bar under the title bar. See §8, "Layout declarations".

**`ClassicyWindowFrame`** — presentational chrome only (no store coupling;
usable pre-boot): `title?`, `children` *, `className?`, `width?`.

### 4.2 Buttons & toggles

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyButton` | `isDefault?`, `disabled?`, `depressed?` (draw it held down, e.g. while its menu is open), `onClickFunc?`, `buttonShape? ("rectangle"\|"square")`, `buttonSize? ("medium"\|"small")`, `buttonType?`, `padding?/margin? ("sm"\|"md"\|"lg"\|"xl")` | forwardRef to `<button>`; accepts remaining button HTML attrs |
| `ClassicyBevelButton` | `mode? ("push"\|"toggle"\|"radio"\|"popup")`, `bevelWidth? ("small"\|"medium"\|"large")`, `icon?`, `on?`, `mixed?`, `onChangeFunc?(on)`, `popupArrow? ("small"\|"large")`, `popupDirection? ("horizontal"\|"vertical")`, `menuItems?` (`ClassicyMenuItem[]`), `popupContent?`, `popupTrigger? ("click"\|"hold")`, `popupPlacement? ("below"\|"right")`, `popupAlign? ("start"\|"center")`, `popupAnchorInset?` (`{top?, bottom?, left?, right?}`), `popupHoldDelayMs? (500)`, `square?` (square bevel, as in a toolbar), `iconAlt?` (the icon's alt text; omit when the button has a text label), `className?` | auto-squares inside a toolbar. With `menuItems` (or `popupContent`, e.g. `ClassicyPopUpSlider`) it opens a Platinum menu below or to the right of itself (HIGOS8 p.32), flipping when there is no room. `click` trigger (default in `popup` mode): quick click = sticky menu, press held past the hold delay = standard press-drag-release menu. `hold` trigger (default in other modes): click keeps the button's own behavior, a long press shows the options (tool palettes). Enter/Space or Down Arrow open it from the keyboard |
| `ClassicyHelpButton` | `onClickFunc?`, `label? ("Help")`, `disabled?`, `id?`, `className?` | HIG Help button (HIGOS8 p.86): 20 × 21 small-bevel button with the help glyph (system-art key `helpButton`); `label` is the accessible name. Place it lower left aligned with the push buttons (`margin-right: auto` in a right-aligned row), else upper right. `ClassicyAlert`'s `help` button role renders it |
| `ClassicyButtonToolbar` / `ClassicyButtonToolbarGroup` | `children` *, `size? ("large"\|"medium"\|"small")` (toolbar only; default `"large"`), `className?` | auto dividers between groups; roving-tabindex keyboard nav |
| `ClassicyCheckbox` | `id` *, `checked?`, `mixed?`, `disabled?`, `onClickFunc?(checked)`, `label?`, `labelPosition?`, `labelSize?`, `mark? ("check"\|"x")`, `isDefault?` | `mark="x"` draws an ✕ instead of the checkmark, for locales where a checkmark is not acceptable (HIGOS8 p.28); `isDefault` draws the checked box in the theme accent |
| `ClassicyRadioInput` | `name` *, `inputs` * (`{id, label?, checked?, disabled?}[]`), `onClickFunc?(id)`, `align? ("rows"\|"columns")`, `label?` | `align` defaults to `"rows"` (side by side); `"columns"` stacks the buttons in one column |
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
| `ClassicySchemaForm` | `schema` * (a zod object), `values` *, `onChange(path, value)` *, `idPrefix` *, `path?` | the rows of a `ClassicyControlGroup layout="form"`, derived from a zod object: number → spinner, boolean → checkbox, enum → pop-up menu, string → text field (label above), a nested object → a titled group on a full-width row laying out its own fields; other types render nothing. A field's label is its `.describe()` text, else the humanized key (`speedSeconds` → "Speed seconds", `classicySchemaFieldLabel`); control ids are `<idPrefix>_<key>` for a top-level key and `<idPrefix>_<path…>.<key>` for a nested one, each segment with `%` and `.` percent-encoded so a key such as `a_b` can never take a nested field's id (`classicySchemaFieldId`); `unwrapClassicySchemaField(field)` peels `.optional()`/`.default()`/`.nullable()`/`.readonly()` and returns `{ schema, description }`, the outermost `.describe()` text winning, which is how the form reads a field's kind and label; `onChange` gets the field's full path. A number field reports its entry clamped to `.min()`/`.max()` (no `.min()`: 0, so a negative entry reports 0) and rounded for `.int()`; an empty or non-numeric entry reports nothing. Display gap (the shared spinner): an `.int()` field keeps showing the fraction typed, and an emptied field shows its minimum, until the next edit or a new value re-syncs it. No root of its own, so no `className`/`style`. The Screen Saver options and the Appearance Manager's Options tab use it |
| `ClassicyForm` | `onSubmitFunc?`, `layout? ("default"\|"dialog")`, children * | real `<form>`; always calls `preventDefault` (never navigates); make the confirming button `isDefault buttonType="submit"` so Enter submits |
| `ClassicyFormButtonRow` | `children` * | HIG dialog button row: right-aligned, `--button-gap`, group-gap above |
| `ClassicySeparator` | `orientation?` | |
| `ClassicyPlacard` | `menuItems?`, `onSelect?(id)`, `onClick?`, `disabled?` | window-corner placard |
| `ClassicyImageWell` | `src?`, `onDrop?(files, e)`, `selected?`, `enabled?` | drag-and-drop image slot |
| `ClassicyProgressBar` | `value?`, `max? (100)`, `indeterminate?`, `autoSwitch?`, `chasingArrows?`, `label?` | barber-pole when indeterminate; with `autoSwitch` an indeterminate bar becomes determinate as soon as it has a `value` |
| `ClassicyMeter` | `value` *, `min?/max? (0/100)`, `low?/high?/optimum?`, `segments?`, `showValue?`, `label?` | native `<meter>` zone semantics: the region holding `optimum` is optimal (theme accent), adjacent is suboptimal (`--color-alert`), two away is bad (`--color-error`); `meterZone()` exported |
| `ClassicyOutput` | `id` *, `value?` or children, `htmlFor?: string[]`, `variant? ("plain"\|"inset")`, `mono?`, `label?`, `disabled?` (dimmed) | real `<output>`; `inset` is the white beveled result well |
| `ClassicyKbd` | `shortcut?` (any `parseKeyboardShortcut` spelling) or children, `variant? ("inline"\|"keycaps")` | real `<kbd>` in canonical glyph order (⌃⌥⇧⌘ + key); menu items render their `keyboardShortcut` through it |
| `ClassicyTabs` | `tabs` * (`{title?, icon?, children}[]`), `size? ("small"\|"medium"\|"large")`, `stripPosition? ("top"\|"bottom")` | tab height and label type scale; small tabs suit dense panels. `stripPosition="bottom"` puts the strip under the panel (same DOM order; the stylesheet moves it with `order`, root class `classicyTabStripBottom`); the tabs' outline art still points up |
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
| `ClassicyDesktopMenuBar` | `className?`, `style?`, `placement? ("screen"\|"window")` | rendered by `ClassicyDesktop`; reads its menus from the store. `placement` defaults to the active package's `layout.menuBar.placement`; `"window"` renders nothing (the bar still runs the keyboard-equivalent dispatcher). The prop affects only this bar: windows draw a `ClassicyWindowMenuBar` when the package layout says `window`, whatever the prop says. So `placement="window"` under Platinum leaves no menus on screen (keyboard equivalents still fire), and `placement="screen"` under a window-placement package draws the screen bar and every window's bar (§8, "Layout declarations") |
| `ClassicyWindowMenuBar` | `appId` *, `windowId` *, `menuItems` *, `className?`, `style?` | a window's own menu bar, rendered by `ClassicyWindow` under its title bar when the package layout's placement is `"window"`; usually not used directly. Root carries `data-classicy-part="window-menu-bar"`; the window root carries `classicyWindowWithMenuBar` while it draws one |
| `useClassicyMenuCloseOnOutsideMouseDown(ref)` | `ref` * (`RefObject<HTMLElement \| null>`) | call inside a `ClassicyMenuProvider`: while its menu bar is active (a title was clicked open), a mouse-down outside `ref`'s element closes the provider's menus. Both menu bars use it; a null ref closes nothing |
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
| `ClassicyDesktopMenuWidgetSound` | `hide?` | **deprecated** — menu-bar mute toggle, no longer mounted. Use the Control Strip's built-in Sound module (`classicy-sound`, registered by `ClassicySoundManagerProvider`). Still exported; logs a one-time `classicyLog` warning in dev builds when mounted. It no longer floats right: the menu bar places its clusters by flex `order`, so mounted in a container that is not a flex row it floats left |
| `ClassicyControlStrip` | `disabledModules?` (module ids), `defaultCollapsed?`, `defaultWidth?`, `className?` | Mac OS 8 Control Strip (HIGOS8 p.125, Figure 6-15): floating strip at the desktop's lower left — collapse box, scroll arrows, modules, draggable tab; widths snap to whole modules. Control-dragging the collapse box moves it up or down and docks it to the left or right edge (the pointer's half of the desktop; mirrored when docked right), stored as `edge`/`bottom` via `ClassicyDesktopControlStripSetPosition {edge: "left"\|"right", bottom}` (px above the desktop's bottom; `computeClassicyControlStripPosition` is the pure placement). `ClassicyDesktop` mounts it (`controlStrip` prop: its props, or `false` to hide). Shows every registered module (below) not in `disabledModules` and not hidden by the user. Collapsed state, width, user-hidden ids and user order persist in `System.Manager.Desktop.controlStrip` (`ClassicyDesktopControlStripSetVisible {visible}`, `…SetCollapsed {collapsed}`, `…SetWidth {width\|null}`, `…SetModuleHidden {moduleId, hidden}`, `…SetModuleOrder {moduleOrder}`); the defaults apply until the user changes them. Its contextual menu: Hide Control Strip, Open Control Strip Control Panel |
| `registerClassicyControlStripModule(def)` | `id` *, `label` *, `icon` * (string or hook), `appId?`, `order? (100)`, `menuItems?` (array or hook), `content?` (component), `fileIcon?` | adds a module; call at module scope. Live (`useSyncExternalStore`). Same `appId` re-registering replaces; another `appId` is ignored with a warning. With `appId`, shown only while that `ClassicyApp` is mounted (`useClassicyMountedApps`). Each module also appears as a file in `System Folder:Control Strip Modules`. Also `unregisterClassicyControlStripModule(id)`, `getClassicyControlStripModule(id)`, `listClassicyControlStripModules()`, `arrangeClassicyControlStripModules(registrations, {disabledModules?, moduleOrder?, mountedApps})`, `classicyControlStripOpenControlPanelItem(dispatch, panelName, app)` (HIG p.125 "Open … Control Panel"). Built-in ids: `CLASSICY_CONTROL_STRIP_MODULE_IDS` (`sound` → `classicy-sound`, order 10; `screenSaver` → `classicy-screen-saver`, order 20, owned by `ScreenSaver.app`) |
| `ClassicyControlStripManager` | none | the Control Strip control panel (`ControlStripManager.app`, in `ClassicyControlPanels`): show/hide the strip; show/hide and reorder each module the host has not disabled |
| `ClassicyPopUpSlider` | `value` *, `onChange(value)` *, `ariaLabel` *, `min? (0)`, `max? (100)`, `step? (1)`, `disabled?` | HIGOS8 Figure 2-16's vertical slider (17 × 73) for a bevel button's `popupContent`; drag/click, arrows, Page Up/Down, Home/End |
| `ClassicyPixelArt` | `rows` * (`string[]` of palette tokens, `.` transparent), `className?` | themed, pixel-exact inline-SVG art (tokens `K W 1–7 b c d m n` map to theme colors) |

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
  package only registers what it changes. The active package is the store's
  `System.Manager.Appearance.packageId` resolved against the registered
  Appearance Packages, read at call time: an id whose package is not
  registered reads as `"platinum"`. `useClassicyAsset`, `useClassicyAssetTree`
  and `useClassicyAssetVars` re-render when it changes
  (`ClassicyDesktopChangeAppearancePackage`, or the stored package
  registering later). Register overrides of the stock art under `"platinum"`,
  and a package's own art under its id.
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

`pkg` is `"platinum"` to replace Platinum's art, or your own package's id for
art only that package uses (reads fall back to `"platinum"`). The icon
paths stay registered, so reading them still works: the PDF viewer's pan-tool
button, for one, still draws the `ui.cursors.hand` icon. The screen saver's
built-in logos copy `classicy.logo` and `system.macosSvg` too; replace those
with `registerClassicyScreenSaverLogo`.

### Migrating to the shared vocabulary (breaking change)

The vocabulary and cascade work (§4.0.1) renamed Classicy's state classes and
layered its stylesheet. Host CSS, end-to-end tests and code that read
Classicy's class names need these changes.

**Renamed and removed classes.** A component's state is now a bare class beside
its root, so every class that folded a state into its name is gone, and a few
strays were renamed. The table lists every class name Classicy's source
emitted before the change and no longer emits, generated from a diff of the
two source trees:

| Component | Old class | Now |
|---|---|---|
| ClassicyWindow | `classicyWindowActive` | `.classicyWindow.active` |
|  | `classicyWindowInactive` | `.classicyWindow.inactive` |
|  | `classicyWindowCollapsed` | `.classicyWindow.collapsed` |
|  | `classicyWindowDragging` | `.classicyWindow.dragging` |
|  | `classicyWindowZoomed` | none (it had no rule; a zoomed window carries no class) |
|  | `hidden` | `.classicyWindowContents.collapsed` / `.classicyWindowContentsModal.collapsed` (the window's contents while collapsed); the global `.hidden` utility is gone |
|  | `block` | none (the contents of an expanded window carry no extra class) |
| ClassicyButton | `classicyButtonDefault` | `.classicyButton.default` |
|  | `classicyButtonDepressed` | `.classicyButton.pressed` |
| ClassicyCheckbox | `classicyCheckboxDefault` | `.classicyCheckbox.default` |
|  | `classicyCheckboxMixed` | `.classicyCheckbox.mixed` |
| ClassicyRadioInput | `classicyRadioInputDefault` | `.classicyRadioInput.default` |
|  | `classicyRadioInputMixed` | `.classicyRadioInput.mixed` |
|  | `classicyRadioInputWrapperChecked` | `.classicyRadioInputWrapper.checked` |
|  | `classicyRadioInputWrapperDisabled` | `.classicyRadioInputWrapper.disabled` |
| ClassicyMenu, ClassicyBevelButton menus | `classicyMenuItemDisabled` | `.classicyMenuItem.disabled` |
|  | `classicyMenuItemOpen` | `.classicyMenuItem.open` |
| Menu bar | `classicyDesktopMenuAppleMenu` | `classicyDesktopMenuApple` (or `[data-classicy-part="apple"]`) |
| ClassicyPopUpMenu | `classicyPopUpMenuOpen` | `.classicyPopUpMenu.open` |
|  | `select--disabled` | `.classicyPopUpMenu.disabled` |
|  | `classicyPopUpMenuButtonDisabled` | `.classicyPopUpMenuButton.disabled` |
| ClassicyListBox | `classicyListBoxDisabled` | `.classicyListBox.disabled` |
|  | `classicyListBoxOptionSelected` | `.classicyListBoxOption.selected` |
|  | `classicyListBoxOptionDisabled` | `.classicyListBoxOption.disabled` |
| ClassicyTabs | `classicyTabButtonActive` | `.classicyTabButton.selected` (tabs are `selected`, not `active`) |
| ClassicyTree | `classicyTreeNodeSelected` | `.classicyTreeNodeLabelHolder.selected` |
|  | `classicyTreeNodeDisabled` | `.classicyTreeNodeLabelHolder.disabled` |
| ClassicyTable, Finder list view | `classicyTableRowSelected` | `.classicyTableRow.selected` |
|  | `classicyTableColumnHeaderSelected` | `.classicyTableColumnHeader.selected` (the sorted column) |
|  | `classicyFileBrowserViewTableRowSelected` | `.classicyFileBrowserViewTableRow.selected` |
| ClassicyIcon, ClassicyDesktopIcon | `classicyIconActive` | `.classicyIcon.selected` |
|  | `classicyIconDragging` | `.classicyIcon.dragging` |
|  | `classicyDesktopIconActive` | `.classicyDesktopIcon.selected` |
|  | `classicyDesktopIconOpen` | `.classicyDesktopIcon.open` |
|  | `classicyDesktopIconActiveAndOpen` | `.classicyDesktopIcon.selected.open` |
|  | `classicyDesktopIconDragging` | `.classicyDesktopIcon.dragging` |
| ClassicyControlStrip | `classicyControlStripCollapsed` | `.classicyControlStrip.collapsed` |
|  | `classicyControlStripMoving` | `.classicyControlStrip.dragging` |
| ClassicyPlacard, ClassicyImageWell | `classicyPlacardDisabled` | `.classicyPlacard.disabled` |
|  | `classicyImageWellDisabled` | `.classicyImageWell.disabled` |
|  | `classicyImageWellSelected` | `.classicyImageWell.selected` |
| Disabled-only controls | `classicyComboBoxDisabled` | `.classicyComboBox.disabled` |
|  | `classicyControlLabelDisabled` | `.classicyControlLabel.disabled` |
|  | `classicyLinkDisabled` | `.classicyLink.disabled` |
|  | `classicyOutputDisabled` | `.classicyOutput.disabled` |
|  | `classicyPopUpSliderDisabled` | `.classicyPopUpSlider.disabled` |
|  | `classicySliderDisabled` | `.classicySlider.disabled` |
|  | `classicySliderTicksDisabled` | `.classicySliderTicks.disabled` |
| ClassicyDisclosure, ClassicyFileInput | `classicyDisclosureInnerOpen` | `.classicyDisclosureInner.open` |
|  | `classicyFileInputError` | `.classicyFileInputMessage.error` |
| Color pickers | `classicyColorPickerSwatchDisabled` | `.classicyColorPickerSwatch.disabled` |
|  | `classicyColorPickerCrayonSelected` | `.classicyColorPickerCrayon.selected` |
|  | `classicyColorPickerModeListItemSelected` | `.classicyColorPickerModeListItem.selected` |
|  | `classicyColorPickerSlider--red` | `classicyColorPickerSliderRed` |
|  | `classicyColorPickerSlider--green` | `classicyColorPickerSliderGreen` |
|  | `classicyColorPickerSlider--blue` | `classicyColorPickerSliderBlue` |
|  | `classicyColorPickerSlider--cyan` | `classicyColorPickerSliderCyan` |
|  | `classicyColorPickerSlider--magenta` | `classicyColorPickerSliderMagenta` |
|  | `classicyColorPickerSlider--yellow` | `classicyColorPickerSliderYellow` |
|  | `classicyColorPickerSlider--black` | `classicyColorPickerSliderBlack` |
| Drive Setup | `driveSetupList` | `classicyDriveSetupList` |
|  | `driveSetupList__tableContainer` | `classicyDriveSetupListTable` |
|  | `driveSetupList__table` | `classicyDriveSetupListGrid` |
|  | `driveSetupList__head` | `classicyDriveSetupListHead` |
|  | `driveSetupList__row` | `classicyDriveSetupListRow` |
|  | `driveSetupList__row--selected` | `.classicyDriveSetupListRow.selected` |

Four selectors also left the stylesheets without ever being emitted
(`classicyIconOpen`, `classicyIconActiveAndOpen`,
`classicyRadioInputLabelDisabled` and the bare `classicyColorPickerSlider`).
A host rule on them never matched anything, so there is nothing to migrate.

**Other breaking changes:**

- **Radio groups default to rows.** `ClassicyRadioInput`'s `align` now
  defaults to `"rows"`, which is how every group already rendered (the old
  documented `"columns"` default never applied, because its rule lost the
  cascade). Two visible effects: an explicit `align="columns"` now really
  stacks, and default groups no longer carry the
  `classicyRadioInputGroupColumns` class, so a host selector on that class
  stops matching them.
- **No `data-state`.** `ClassicyBevelButton`, `ClassicyPlacard` and
  `ClassicyImageWell` no longer set a `data-state` attribute, and the exported
  type `ClassicyBevelButtonState` is deleted. Select the state classes instead:
  BevelButton `on` → `.checked`, `pressed-off`/`pressed-on` → `.pressed`,
  `mixed` → `.mixed`, `disabled-off`/`disabled-on` → `.disabled` (plus
  `.checked` for `disabled-on`), and `.open` while its menu or panel shows;
  Placard `pressed`/`disabled` → `.pressed`/`.disabled`; ImageWell
  `selected`/`disabled` → `.selected`/`.disabled`.
- **`classicy/scss/*` is the vocabulary.** It now resolves to
  `src/Appearance/vocabulary/` (`@use "classicy/scss/vocabulary"`). The old
  theme partials (`appearance`, the mixins) are now Platinum's, at
  `classicy/appearance/platinum/scss/*`, under new names: see "Migrating to
  Appearance Packages" below.
- **`.hidden` and `classicyWindowZoomed` are gone.** Classicy no longer ships
  a global `.hidden { visibility: hidden }` utility; a host that relied on it
  must define its own. A collapsed window's contents are
  `.classicyWindowContents.collapsed`.
- **A consumer `zIndex` is dropped** on `ClassicyWindow`, `ClassicyIcon` and
  `ClassicyDesktopIcon`: their state classes own stacking (§4.0.1).
- **Classicy's CSS is layered** (§1, "Cascade layers"). Unlayered host CSS and
  every host layer now beat every Classicy rule whatever the specificity, so a
  host `button { … }` or Tailwind v4's Preflight overrides Classicy's
  controls. Keep broad resets beneath Classicy in the reserved sublayer
  `classicy.base.host`, and for Tailwind v4 replace `@import "tailwindcss";`
  with the granular form shown in §1.
- **State classes are bare generic names** (`active`, `open`, `error`,
  `selected`, `disabled`, `checked`, …). A host's own global `.active { … }`
  or `.error { … }` now matches Classicy elements too and, being unlayered,
  wins. Scope such rules to your own markup (`.my-nav .active`).
- **The screen-saver cursor rule no longer uses `!important`.** It is a
  layered rule with id-level specificity, so an unlayered host
  `* { cursor: … }` now shows a pointer over a running screen saver. Scope
  host cursor rules, or put them in the reserved `classicy.base.host`
  sublayer (§1); any other host layer still outranks Classicy.

### Migrating to Appearance Packages (breaking change)

Classicy's look is now the Platinum **Appearance Package** (§8, "Appearance
Packages"): structure stays in `classicy.css` (`classicy.base`), and every
bevel, border, gradient and piece of art moved into Platinum's own stylesheet
(`classicy.package`, scoped under
`.classicyDesktop[data-classicy-appearance="platinum"]`). Rendering inside
`ClassicyDesktop` looks exactly as before. What changes for hosts:

- **The theme partials moved and were renamed.** Through 2.1.x, Platinum's
  SCSS was `classicy/scss/appearance`, `classicy/scss/scrollbars` and
  `classicy/scss/assets` (with the theme list at `classicy/scss/themes.json`
  and the fonts at `classicy/scss/fonts`); `classicy/scss/*` is now the
  vocabulary. Platinum's SCSS is at `classicy/appearance/platinum/scss/*`
  (`mixins`, `scrollbars`, `assets`), and the mixins are renamed to
  kebab-case with a `platinum-` prefix. The helpers that are not Platinum's
  moved to the vocabulary, `classicy/scss/layout`. (Pre-release builds
  exposed the same partials as `classicy/scss-platinum/*`; that bridge is
  gone too, and the table applies to it unchanged.)

  ```scss
  // before (2.1.x)
  @use 'classicy/scss/appearance';
  .bar { @include appearance.platinumWindowControlBoxBorder; }
  // after
  @use 'classicy/appearance/platinum/scss/mixins';
  .bar { @include mixins.platinum-window-control-box-border; }
  ```

  | Before (`classicy/scss/appearance`, `scrollbars`, `assets`) | Now |
  |---|---|
  | `appearance.platinumMenuFrame`, `platinumMenuDivider` | `mixins.platinum-menu-frame`, `platinum-menu-divider` |
  | `appearance.platinumBoxShadow`, `platinumWindowBoxShadow` | `mixins.platinum-box-shadow`, `platinum-window-box-shadow` |
  | `appearance.platinumWindowBorder` | `mixins.platinum-window-border` |
  | `appearance.platinumWindowHeaderBorder`, `platinumWindowHeaderBorderDepressed` | `mixins.platinum-window-header-border`, `platinum-window-header-border-depressed` |
  | `appearance.platinumWindowInnerBoxShadow`, `platinumWindowInnerBoxShadowOuter`, `platinumWindowInnerBorder` | `mixins.platinum-window-inner-box-shadow`, `platinum-window-inner-box-shadow-outer`, `platinum-window-inner-border` |
  | `appearance.platinumWindowControlBox`, `platinumWindowControlBoxBorder`, `platinumWindowControlBoxDepressable` | `mixins.platinum-window-control-box`, `platinum-window-control-box-border`, `platinum-window-control-box-depressable` |
  | `appearance.platinumWindowUndepressable`, `platinumWindowDepressable`, `platinumWindowDepressed` | `mixins.platinum-window-undepressable`, `platinum-window-depressable`, `platinum-window-depressed` |
  | `appearance.platinumDepressableDefault`, `platinumDepressableBoxShadowActive` | `mixins.platinum-depressable-default`, `platinum-depressable-box-shadow-active` |
  | `appearance.theme-halftone($color, $size)` | `mixins.platinum-halftone($token, $size)`: `$token` is a color custom-property name (`"--color-black"`), not a color, and the dots are painted on the element's `::before` (the element gets `position: relative`) |
  | `appearance.encode-color($string)` | Nothing: removed, since `platinum-halftone` no longer bakes a color into its data URI |
  | `appearance.px-rect(…)` | `layout.classicy-px-rect(…)` (`@use 'classicy/scss/layout'`) |
  | `appearance.no-select` | `layout.classicy-no-select` |
  | `scrollbars.scrollbars`, `scrollbars-split-arrows`, `scrollbars-inactive`, `scrollbars-themed` | `scrollbars.platinum-scrollbars`, `platinum-scrollbars-split-arrows`, `platinum-scrollbars-inactive`, `platinum-scrollbars-themed` |
  | `scrollbars.sb-glyph-up`/`-down`/`-left`/`-right`, `sb-btn-box`, `sb-btn-pressed` | `scrollbars.platinum-scrollbar-glyph-up`/`-down`/`-left`/`-right`, `platinum-scrollbar-button-box`, `platinum-scrollbar-button-pressed` |
  | `assets.$…` (the art variables) | `assets.$…`, same names (`classicy/appearance/platinum/scss/assets`) |
  | `classicy/scss/themes.json` (the theme list) | `getAllThemes()` (the `presets` of `src/Appearance/Platinum/platinum.json`) |
  | `classicy/scss/fonts` (the `@font-face` rules) | Nothing: the Platinum package registers its fonts at runtime |
- **Components outside a desktop lose their look.** The package's rules only
  match inside an element carrying `class="classicyDesktop"` and
  `data-classicy-appearance="platinum"`; wrap standalone components in one,
  with the theme and asset variables spread on it (§1, "Cascade layers"). A
  portal that falls back to `document.body` (no `#classicyDesktop` mounted) is
  unstyled the same way.
- **Strict-CSP hosts link a second file.** `dist/classicy.css` no longer
  carries the look; link `dist/classicy-platinum.css` right after it (§1).
- **Host overrides keep working.** Unlayered host CSS, host layers and
  `classicy.user` outrank `classicy.package` just as they outrank
  `classicy.base`, and resets in the reserved `classicy.base.host` sublayer
  still yield to both.
- **Appearance Manager and Screen Saver behavior changes.** The Screen
  Saver's schema-derived options form is now `ClassicySchemaForm` (§4.4), so
  an undescribed field shows its humanized key ("Speed seconds") instead of
  the raw key, and a number entry is clamped to the field's `.min()`/`.max()`
  and rounded for `.int()`, with an implicit floor of 0 when there is no
  `.min()` ("Screen savers", the two behavior changes). Custom themes are now
  one slot per package: a non-Platinum theme persisted under the legacy
  `"custom"` id (an import made before its package registered) is moved aside
  to `custom-2` (or the next free number), keeping its name and data, the
  first time a Platinum built-in forks (§8, "Custom themes and color edits").
- **Fixed: Firefox and the tab strip's scroll bar.** In the shipped
  `dist/classicy.css` the tabs stylesheet came before the desktop's, so the
  desktop's Firefox scroll-bar fallback beat `.classicyTabScroller
  { scrollbar-width: none }` and Firefox users of the built library saw a
  scroll bar under tab strips. The package re-asserts the tab scroller's rule
  after the desktop's, so it is hidden everywhere.

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

Platinum's base64 art variables (`src/Appearance/Platinum/styles/_assets.scss`)
are unchanged; the registry changes how assets are exposed and swapped, not
how Platinum draws.

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

Themes are JSON presets of an Appearance Package (`ClassicyTheme` objects;
see "Appearance Packages" below). Platinum's 21 built-ins, the `presets` of
`src/Appearance/Platinum/platinum.json`, ship with ids
`default, azul, bondi, copper, crimson, emerald, frenchBlue, gold, ivy,
lavender, pistachio, magenta, nutmeg, poppy, plum, rose, sapphire, silver,
teal, turquoise, sunny`.

```ts
type ClassicyTheme = {
    id: string
    name: string
    package: string   // the Appearance Package it belongs to ("platinum")
    color: { outline; select; highlight; black; white; alert; error;
             system: number[7]; theme: number[7];
             window: { border; borderOutset; borderInset; frame; title; document } }  // colors are ints
    typography: { ui; uiSize; header; headerSize; body; bodySize; mono; monoSize; digital; digitalSize }
    measurements: { window; control; button; groupBox; layout;  // the 20 core metrics (below)
                    [family: string]: Record<string, number> }   // plus a package's own families
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

### Custom themes and color edits

Built-in themes (`Appearance.availableThemes` and every package's `presets`)
are never mutated. Every theme edit — `ClassicyDesktopChangeColor`,
`ChangeMetric` (both forms), `ChangeAppearanceOption`, `ChangeFont`,
`ChangeFontSize`, `ChangeBackground`, `ChangeBackgroundPosition`/`Repeat`/`Size`
— goes through
`editActiveClassicyTheme` (`ClassicyCustomTheme.ts`):

- **First edit while a built-in is active** deep-copies it into its
  package's "Custom" slot, `classicyCustomThemeSlotId(theme.package)`:
  `"custom"` for the default package (`CLASSICY_CUSTOM_THEME_ID`, so state
  saved before packages existed keeps its Custom theme) and
  `custom-<packageId>` for any other. Every slot is named "Custom"
  (`CLASSICY_CUSTOM_THEME_NAME`). The fork lands in `Appearance.customThemes`,
  overwriting only that package's previous Custom, becomes active, and takes
  the edit.
- **A slot held by another package's theme is moved aside, not
  overwritten.** A fork whose package's slot id is held by a theme of another
  package (an import made before that package was registered, or a legacy
  non-Platinum `"custom"` theme, which moves to `custom-2` on a Platinum fork)
  first renames that theme to `<slotId>-<n>`. The moved theme keeps its name
  and data, and the new id avoids every theme id, that theme's package's
  presets and every registered package's Custom slot.
- **Edits while a custom theme is active** modify it in place (the active copy
  and its `customThemes` entry stay in sync).
- An edit that changes nothing (same value, unknown font slot) does not fork.
- `ClassicyDesktopChangeTheme` looks the id up in the active package's
  `availableThemes` entries (the registered package for `packageId`, else
  the default), then that package's own themes (its `defaults`, unless a
  preset has their id, and its `presets`), then `customThemes`, and last the
  other packages' `availableThemes` entries. So a preset whose id another
  package's built-in also uses (`default`, say) activates the active
  package's own theme, and the next edit forks into that package's Custom
  slot. It activates a copy, so switching to a built-in and back to the
  Custom theme restores the edits; a package's own theme is completed the
  way a package switch completes its defaults (missing metric groups filled
  in, a bundled wallpaper filename resolved to its asset URL). It never
  changes `packageId`: it can activate another package's `availableThemes`
  entry, which the Appearance Manager never offers. `ClassicyDesktopLoadThemes`
  leaves `customThemes` alone.

`customThemes` is persisted separately from `availableThemes` because persisted
arrays replace their defaults on load — a custom entry inside
`availableThemes` would freeze the built-in list. State saved before custom
themes existed loads with `customThemes: []`. Read helpers:
`listClassicyThemes(appearance)` (built-ins then customs),
`listClassicyPackageBuiltInThemes(pkg)` (a package's own themes: its
`defaults` first unless a preset has their id, then its `presets`),
`listClassicyPackageThemes(appearance, pkg)` (the theme menu's list for one
package: its own themes and its host-loaded `availableThemes`, once per id
with a loaded theme replacing the built-in it shares an id with, then its
custom themes), `findClassicyTheme(appearance, id, pkg?)` (ChangeTheme's
order above, `pkg` being the active package; without it, `availableThemes`
then `customThemes`), `isCustomThemeActive(appearance)`
and `classicyCustomThemeSlotId(packageId)`.

`ClassicyDesktopChangeColor` addresses one of the 28 color variables:

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

`ClassicyDesktopChangeMetric` also takes a **family form** for an Appearance
Package's knobs (`ClassicyAppearancePackage.knobs`):

```ts
dispatch({ type: 'ClassicyDesktopChangeMetric', family: 'controlStrip', key: 'cellHeight', value: 30 })
```

`family` and `key` are lowercase-first camelCase names (`CLASSICY_MEASUREMENT_NAME`;
never `constructor`/`prototype`, never one of the five core groups — those use
`metricKey`). The knob must be declared by the **active** package, resolved
as `resolveClassicyAppearancePackage` resolves it (the registered package for
`Appearance.packageId`, else the registered default package; see "The active
package" below). `value` must be within the knob's bounds,
`getThemeMetricFamilyBounds(knob)`: its declared `min`–`max` intersected with
0–512, or `undefined` when the two do not meet — such a knob is not editable
at all (the reducer refuses every value; the Options tab leaves it out). The
Options tab also leaves out a knob whose family or key fails
`isThemeMetricFamilyTarget`, which the reducer refuses too, and logs one
`ClassicyAppearance` warning per package naming every knob it left out. A
declared knob the theme does not carry yet is created; a family the theme
carries as something other than an object is left alone. Undeclared knobs,
out-of-range values and unwritable families are refused with a
`ClassicyDesktopManager` warning; none forks. Helpers:
`isThemeMetricFamilyTarget`, `isValidThemeMetricFamily`,
`getThemeMetricFamily` (NaN when absent), `setThemeMetricFamily`,
`getThemeMetricFamilyKnob`, `getThemeMetricFamilyBounds`
(`ClassicyThemeMetricTargets.ts`); predicate `hasThemeMetricFamilyChange`.

`ClassicyDesktopChangeAppearanceOption { path, value }` sets one theme value by
dotted path, with the same fork-on-first-edit semantics:

```ts
dispatch({ type: 'ClassicyDesktopChangeAppearanceOption', path: 'sound.pack', value: 'platinum' })
```

`path` is 2–4 segments matching `CLASSICY_APPEARANCE_OPTION_SEGMENT`
(`/^[A-Za-z][A-Za-z0-9]*$/`), never `__proto__`/`constructor`/`prototype`, and
never rooted at `id`, `name`, `package` or `measurements` (metrics go through
`ClassicyDesktopChangeMetric`). It must name an existing field the theme
schema declares — no key is ever created — and `value` is validated against
that field's own `ClassicyThemeSchema` sub-schema only (an unrelated invalid
field never blocks the write). The field may be a scalar (`desktop.iconSize`)
or an object or tuple (`color.window`, `sound.disabled`), which is replaced
whole by the re-validated value (zod strips unknown keys). Refusals (`path` |
`missing` | `schema`) log a `ClassicyDesktopManager` warning and do not fork.
`sound.pack` is also refused, with the same warning, when the pack belongs to
a package other than the active one (a pack's `packageId`; shared packs have
none), the packs the Sound tab offers. Helpers in
`ClassicyAppearanceOptions.ts`: `parseClassicyAppearanceOptionPath`,
`getClassicyAppearanceOption`, `applyClassicyAppearanceOption`. Like every
`ClassicyDesktop*` action, both are unreachable to untrusted (HyperCard)
dispatches.

`getTheme(id, overrides?)` returns a deep-merged clone; `getThemeVars(theme)`
returns the CSS custom-property map. Platinum's SCSS is importable via
`classicy/appearance/platinum/scss/*` (`mixins`, `scrollbars`, `assets`; the
`platinum-*` mixins), the state vocabulary via `classicy/scss/vocabulary`
(§4.0.1), and the layout helpers and package wrapper via
`classicy/scss/layout` and `classicy/scss/package`.

Theme-authoring helpers: `hexToInt` / `intToHex` convert between hex strings
and the integer colors themes use. `ClassicyWallpapers` is the stock
wallpaper catalog and `resolveWallpaper(name)` maps a wallpaper name (as used
in `desktop.backgroundImage` / `ClassicyDesktopChangeBackground`) to its URL;
`classicyWallpaperFilename(value)` is its inverse (bundled filename for a
filename or a resolved URL / inlined `data:` URI, else `undefined`).

### Appearance Packages

An **Appearance Package** is a complete look the desktop switches to as a
unit: its CSS, its default theme and presets, its arrangement, and the assets,
sound packs and hooks that go with it. Classicy ships one, Platinum
(`src/Appearance/Platinum/`), registered when `classicy` is imported; themes
are presets of a package, and every theme names its package in
`theme.package`.

```ts
import { registerClassicyAppearancePackage, classicyKnobsToSchema, getTheme } from 'classicy'
import irixCss from './irix.scss?inline'   // one @layer classicy.package block (below)

registerClassicyAppearancePackage({
    id: 'irix',                       // kebab-case
    name: 'IRIX',
    css: irixCss,
    defaults: { ...getTheme('default'), id: 'irix', name: 'IRIX', package: 'irix' },
    presets: [/* more ClassicyTheme objects, package: 'irix' */],
    knobs: { controlStrip: { cellHeight: { label: 'Cell height', min: 16, max: 40, default: 22 } } },
    options: classicyKnobsToSchema({ /* the same knobs */ }),
    layout: {
        window: { growBoxCorner: 'bottom-right' },
        menuBar: { placement: 'screen' },
        desktop: { iconGridOrigin: 'top-right' },
    },
    sounds: [/* ClassicySoundPack objects, registered with registerClassicySoundPack */],
})
```

`ClassicyAppearancePackage` fields:

| Field | Meaning |
|---|---|
| `id`, `name` | Kebab-case id (`"platinum"`); display name, 1–64 chars |
| `css` | The compiled stylesheet: exactly one `@layer classicy.package { … }` block, every rule scoped under `.classicyDesktop[data-classicy-appearance="<id>"]` |
| `defaults` | The theme a switch to the package activates; `defaults.package` must be the package's `id` |
| `presets` | Built-in themes offered with the package (Platinum's 21) |
| `knobs` / `options` | Tunable measurement families (`family → key → { label, min, max, default }`, values under `theme.measurements.<family>`, emitted as `--<family>-<key>`), and the zod schema `classicyKnobsToSchema(knobs)` builds from them |
| `layout` | `{ window.growBoxCorner, menuBar.placement, desktop.iconGridOrigin }`; read with `useClassicyAppearanceLayout()` / `getClassicyAppearanceLayout(packageId?)`, as CSS variables with `classicyLayoutVars(layout)`. See "Layout declarations" below |
| `assets`, `sounds` | Descriptive: register the package's art with the asset registries under its id (§5) and its sound packs with `registerClassicySoundPack` (§10) |
| `hooks` | `{ decorate?, on? }`: what the package adds to each component's root, and its handlers per component and event; components call them through `useClassicyAppearance` ("Package hooks", below) |

**Registering.** `registerClassicyAppearancePackage(pkg)` runs at module
scope. It validates the package against `ClassicyAppearancePackageSchema`
(everything but `css`, `options` and `hooks`); an invalid package is logged
as a `ClassicyAppearance` error and not registered. A valid one has its CSS
written to `<style id="classicy-appearance-<id>">` (§1, "Cascade layers") and
is stored; re-registering an id replaces the package and its stylesheet in
place. `unregisterClassicyAppearancePackage(id)` removes a package and its
stylesheet (it returns whether one was removed); a store whose
`packageId` still names it resolves as for any unregistered id until it
switches. The default package, `"platinum"`, is refused (a `ClassicyAppearance`
warning, and `false`), since every unregistered id resolves to it; replace
it by re-registering its id. Read the registry with `getClassicyAppearancePackage(id)`,
`listClassicyAppearancePackages()` (registration order),
`subscribeClassicyAppearancePackages(listener)`, or the hook
`useClassicyAppearancePackages()`.

**Writing the CSS.** Wrap the rules in the vocabulary's package mixin, which
adds the layer and the scope; Platinum's mixins are there to reuse:

```scss
@use "classicy/scss/package";
@use "classicy/appearance/platinum/scss/mixins";

@include package.classicy-package("irix") {
  .classicyButton { @include mixins.platinum-window-depressable; }
}
```

Compile it to a string (`?inline` in Vite) and pass it as `css`; Classicy
never wraps it.

**The active package.** `System.Manager.Appearance.packageId` (persisted,
default `CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`, `"platinum"`; state saved
before packages existed loads as Platinum) names it. It resolves to that
package when registered, else Platinum, else
`CLASSICY_FALLBACK_APPEARANCE_PACKAGE` (Platinum's defaults, presets and
layout with no CSS or hooks, used only while no package is registered at
all). Components read it with `useActiveClassicyAppearancePackage()`;
reducers, effects and other non-hook code with
`resolveClassicyAppearancePackage(packageId?)` (the store's id at call time
when omitted). Code that must not import the store (the desktop reducer)
uses the store-free `getRegisteredClassicyAppearancePackageOrDefault(id)`
from `ClassicyAppearancePackageRegistry.ts`: the same chain without the
fallback, which `resolveClassicyAppearancePackage` adds
(`resolveClassicyAppearancePackage` is built on it). The desktop reducer reads
the active package through it for the family form's knobs, ChangeTheme's
search and ImportTheme's reserved ids, so the reducer and the Appearance
Manager agree on the active package; `theme.package` is provenance only (which
package's Custom slot a fork lands in, which themes a package lists). The desktop root carries the **resolved** id as
`data-classicy-appearance`, so CSS and JS agree while a persisted id's package
has not registered yet; the attribute follows when it does.

**Switching.** `dispatch({ type: 'ClassicyDesktopChangeAppearancePackage',
packageId: 'irix' })` sets `packageId` and activates a copy of the package's
`defaults`, unless the active theme already belongs to it (`theme.package`).
An unregistered id is a logged no-op, and like every `ClassicyDesktop*` action
it is unreachable to untrusted (HyperCard) dispatches.

**`theme.package`.** Every theme names its package. A theme without one is
Platinum's: persisted state is migrated on load (`migrateClassicyState`),
`ClassicyDesktopLoadThemes` fills it in, and theme files default it (below).
Loading a theme file or dispatching `ClassicyDesktopImportTheme` for a package
that is not registered is refused (`This theme needs the "<id>" appearance
package, which is not installed.`, shown as `Desktop.errorDialog`); the
default package always counts as installed.

#### Package hooks

A package's `hooks` are its behavior: what it adds to a component's root
element (`decorate`), and what it does when a component emits an event (`on`):
play a feedback sound, or decorate the root for a moment (Platinum's menu-item
flash). Every wired component calls `useClassicyAppearance` on its root;
feedback sounds and the menu flash live in the package, never in component
code.

```ts
import { playClassicyAppearanceSound, registerClassicyAppearancePackage } from 'classicy'

registerClassicyAppearancePackage({
    // … id, name, css, defaults, layout (above)
    hooks: {
        decorate: (component, state) =>
            component === 'Button' ? { attrs: { 'data-irix-bevel': state.pressed ? 'in' : 'out' } } : undefined,
        on: {
            Button: {
                press: () => { playClassicyAppearanceSound('ClassicyButtonClickDown') },
                release: (ctx) => {
                    if ((ctx.detail as { input?: string })?.input !== 'keyboard')
                        playClassicyAppearanceSound('ClassicyButtonClickUp')
                },
            },
            MenuItem: {
                press: () => ({ className: 'irixMenuItemBlink' }),  // decorate until…
                release: () => ({}),                                 // …the action runs
            },
        },
    },
})
```

`decorate` must be a pure function of `(component, state)`: its result is
memoized on the component's state classes and the package, so anything else
it reads (the active theme, the store, the time) goes stale until one of
those changes.

**The hook.** `useClassicyAppearance(component, state, ref?)` returns
`{ className, style?, attrs, emit }`:

- `component` is the PascalCase name, a `ClassicyComponentName` (a key of
  `CLASSICY_COMPONENT`); `state` is the object the component passes
  `classicyStateClasses`; `ref` is its root element.
- `className` is the state classes, then the class `decorate()` returned,
  then the class of the last decoration a handler returned. `style` and
  `attrs` are decorate's, then the emitted one's.
- `emit(event, detail?)` runs `hooks.on[component][event]` synchronously
  with `{ component, event, element, state, detail }` (the latest state and
  `ref.current`).
- With no package hooks the result is a pure function of `state`
  (`classicyStateClasses(state)`, no `style`, `attrs` `{}`), so a component
  renders exactly as before.

The active package is read without the store (it follows the store's
`Appearance.packageId` through the asset registry's package source), so a
component rendered with a mocked or partial store, or none, resolves to
Platinum.

**The 16 events.** `mount`, `unmount`, `press`, `release`, `click`, `open`,
`close`, `focus`, `blur`, `collapse`, `expand`, `zoom`, `select`, `change`,
`dragStart`, `dragEnd` (`ClassicyAppearanceEvent`, derived from the frozen
`CLASSICY_APPEARANCE_EVENTS` list). Which component emits which, with what
`detail`, is in the table below.

**Decorations.** A handler that returns a decoration (even `{}`) replaces the
emitted one; returning nothing (`void`) keeps it. So `press` can return a
class and `release` can return `{}` to clear it, while a handler that only
plays a sound leaves the decoration alone. Further:

- The emitted decoration belongs to the package whose handler returned it:
  switching packages drops it (switching back does not bring it back).
  Re-registering the same id keeps it.
- `attrs` may only add `data-*` attributes outside `data-classicy-*`
  (compared case-insensitively). Anything else (`id`, `role`, `aria-*`, part
  attributes) is dropped and, in development, reported once per package and
  key.
- Package code never breaks a component. A handler or `decorate()` that
  throws is logged as a `ClassicyAppearance` error and counts as returning
  nothing.
- `mount` is emitted once after the first commit, and `unmount` on unmount,
  with `element: null` (React has detached refs by then). In development
  StrictMode a handler sees `mount`, `unmount`, `mount`.

**Precedence on the root.** Components merge a decoration with their own
attributes and the consumer's passthrough props (§4.0.1):

- **className:** the package's class directly follows the state classes
  (the hook returns them together), and the consumer's `className` comes
  last. The component's own modifier classes sit before or after that pair
  depending on the component (a window's type class and the Slider's
  `classicySliderHighlighted` come before it); class order has no effect on
  the cascade. `MenuItem` keeps its old slot, after the item's own
  `className`.
- **style:** the component's own, then the package's, then the consumer's
  `style`. For `ClassicyWindow`, `ClassicyIcon`, `ClassicyDesktopIcon` and
  `ClassicyControlStrip`, position, geometry and stacking stay the
  component's: the window protects exactly `width`, `height`, `left`,
  `top`, `minWidth` and `minHeight` and drops `zIndex`; a package's
  `transform`, `margin`, `right`, `bottom`, `maxWidth` and the like do apply.
  The control strip's two position custom properties
  (`--classicy-control-strip-bottom` and `--classicy-control-strip-top-inset`)
  are its own: a package's style never sets them, in the default position
  included (a consumer `style` still may), but a package's inline
  `bottom`/`left` does apply and beats the SCSS.
- **attrs:** the package's `data-*` first, so the component's own attributes
  always win.

**Sounds.** A handler plays a sprite with
`playClassicyAppearanceSound(sound, { interrupt? })`. It goes through the
emitting component's own sound dispatch (`ClassicySoundPlay`, or
`ClassicySoundPlayInterrupt` with `{ interrupt: true }`), so mute, volume and
the active sound pack apply as for any other sound. It works only inside a
handler; called anywhere else it logs a `ClassicyAppearance` warning and does
nothing.

**`detail.input`.** `"pointer" | "keyboard"` (the `ClassicyAppearanceInput`
type): how the press behind the event was made. It is present only on events a component emits from both a pointer
path and a keyboard path, merged into the detail (or `{ input }` where the
event has no other detail), so a package can react to one path only. Every
user gesture with a keyboard path emits from it. Rules:

- Events from one path only carry no `input`.
- A `change` produced by text entry (Input) or by file selection or drop
  (FileInput) never carries `input`. A context-menu paste or a text drop is
  still text entry.
- It comes from the last press or release: pointer down or up, mouse down
  or up, or a key down other than a bare modifier (Shift, Control, Alt,
  Meta, CapsLock and the like), through five passive capture listeners on
  `document`, installed once per realm by the hook. So a key pressed while
  the mouse is held does not make the release read as keyboard input, and a
  Shift- or Control-click reads as pointer input. A `close` with no press
  behind it reports the latest press. Handlers that only a pointer can reach
  (Placard's mouse down and up, MenuItem's hover) pass `"pointer"` outright.

**Events per component.** The decoration lands on the root listed. "States"
are exactly the state classes the component already emitted; states shown on
inner elements (rows, tab buttons, items) stay there.

| Component | Decoration root | States | Events (detail) |
|---|---|---|---|
| Button | `button.classicyButton` | default, pressed | press `{ input }`, release `{ input }` (mouse, Return/Space), click `{ input }` |
| BevelButton | `button.classicyBevelButton` | disabled, mixed, pressed, checked, open | press, release (mouse only), click `{ input }`, open `{ trigger: "click" \| "hold", input }`, close `{ input }` |
| Checkbox | `input.classicyCheckbox` | default, mixed, checked, disabled | change `{ checked, input }` |
| RadioInput | `div.classicyRadioInputGroup` | none (item states stay on `.classicyRadioInputWrapper`) | press/release `{ itemId }` (mouse only, on the input or label), change `{ itemId, input }` (click, arrow keys) |
| PopUpMenu | `div.classicyPopUpMenu` | disabled, open | open `{ input }`, change `{ value, input }`, close `{ input }` |
| ComboBox | `div.classicyComboBox` | disabled | open `{ input }` (typing, an arrow key, the arrow button), change `{ value, input }` (a pick from the list), close `{ input }` |
| Input | `input.classicyInput` | none (`isDefault` keeps `classicyInputDefault`) | focus `{ input }`, blur `{ input }`, change `{ value }` (text entry: no `input`) |
| ListBox | `div.classicyListBox` | disabled | select `{ value, selected, input }` (click, Space, arrows, Home/End, type-select; `selected: false` for a Ctrl/⌘-click deselect), focus/blur `{ input }` when focus enters or leaves the list |
| Slider | `input.classicySlider` | disabled (`highlighted` keeps its modifier class) | change `{ value, input }` (drag, click, arrow keys); dragStart/dragEnd `{ value }` bracket every pointer press, a plain track click included (pointer only; one dragEnd per dragStart, even when released outside the input) |
| Placard | `.classicyPlacard` (`button` when interactive, else `div`) | disabled, pressed (also while its menu is open) | press/release `{ input }` (mouse, Return/Space), click `{ menu, input }`, open `{ input }`, close `{ input }` |
| Tabs | `div.classicyTabContainer` | none (`selected` stays on `.classicyTabButton`) | press `{ tabId, input }` (mousedown, or the tab an arrow/Home/End key lands on), select `{ tabId, input }` (mouseup, or that key); change `{ scroll: -1 \| 1 }` from the scroll arrows (pointer only: they are not focusable) |
| Disclosure | `div.classicyDisclosure` | none (`open` stays on `.classicyDisclosureInner`) | expand `{ input }`, collapse `{ input }` (click, Enter, Space, ⌘/Ctrl+→/←) |
| Tree | `ul.classicyTree` | none (row states stay on rows) | expand/collapse `{ nodeId, open, input }`, select `{ nodeId, input }` |
| Table | `div.classicyTableContainer` | none (`selected` stays on rows and headers) | select `{ rowId, selected, input }` (⌘A emits nothing); change `{ columnId, desc }` from a sortable header (pointer only: headers are not focusable) |
| Link | `a.classicyLink` | disabled | click `{ input }` (never while disabled) |
| FileInput | `div.classicyFileInputHolder` | none (`error` stays on `.classicyFileInputMessage`) | change `{ fileName }` for an accepted addition (the button or `addFiles`): the first file only of a batch, nothing on a refusal or removal, no `input` |
| Window | `div.classicyWindow` | collapsed, active, inactive, dragging (active: a modal or the front window; dragging: the store's `moving`) | focus `{ input }` (became focused); collapse/expand `{ input }`, or `{ all: true, input }` once for an Option-click collapse-all; zoom `{ zoomed, input, cause }`; close `{ input }`; dragStart/change/dragEnd `{ kind: "move" \| "resize" }` (pointer only) |
| Alert | `div.classicyAlert` (the body inside the alert's window) | none | open (once per mount); close `{ buttonId, input }` (the button that dismissed it: click, Return, Escape, ⌘.) |
| Menu | the menu's root `<ul>` (its classes come from `navClass`; a submenu is its own Menu) | none | open/close `{ itemId, input }` when its open submenu changes |
| MenuItem | `li.classicyMenuItem` | disabled, open | press `{ itemId, input }` (a leaf chosen: click or Return), release `{ itemId, input }` (that leaf's flash ends), open `{ itemId, input }` (a submenu opened by click or Return), focus `{ itemId, input }`, blur `{ itemId, input }` |
| DesktopIcon | `div.classicyDesktopIcon` | selected, open, dragging | select `{ input }` (a press or click on the icon; the desktop's arrow keys and type-ahead), open `{ input }` (double-click, Enter/Space), dragStart/dragEnd (pointer only) |
| Icon | `div.classicyIcon` | dragging, selected | select `{ selected }` (a click toggle), open `{ input }` (double-click, Enter/Space; only with an open action), dragStart/dragEnd (pointer only) |
| ControlStrip | `div.classicyControlStrip` | collapsed, dragging | collapse/expand `{ input }` (tab or collapse box, click or keys, a drag on a collapsed tab); dragStart/dragEnd `{ kind: "resize" }` (tab drag) or `{ kind: "move" }` (Control-drag of the collapse box), pointer only |
| Assistant | `div.classicyAssistant` | none | change `{ page, input }` (pager arrows, ←/→; not for a refused or no-op move) |

Every wired component also emits `mount` and `unmount` (no `input`).

Notes on timing and repeats:

- **`close` timing** (BevelButton, PopUpMenu, ComboBox, Placard): it is
  emitted from a passive effect after the commit that hides the surface, so
  it arrives after paint and after a pick's `change`, about a frame later than
  `open`, which the opening handler emits synchronously. A Menu's `open` and
  `close` both come from a passive effect on its open submenu, a commit
  after the change.
- **`select` is per gesture**, not per change (ListBox, Table, DesktopIcon). A
  repeat re-emits `select { selected: true }` though nothing changed:
  re-clicking the selected row, Space on it, or an arrow, Home or End press at
  a boundary, auto-repeat included. A Shift range selection reports only the
  pivot row.
- **RadioInput `change`** fires on user selection only. A parent that passes a
  new `inputs` array emits nothing.

Window:

- `zoom { zoomed, input, cause }`: `cause` is `"zoom"` (the zoom box, a click
  or a key), `"collapse"` or `"resize"`. Collapse and a resize start fire
  `zoom { zoomed: false }` wherever the zoom sound plays; a package that
  wants only zoom-box toggles filters on `cause === "zoom"`.
- `change { kind }` fires while the pointer moves over the window. A fast
  move whose pointer leaves the window reports no `change` until the pointer
  is back over it.
- A move's `dragStart` arrives at the drag threshold. A resize's arrives on
  mousedown, preceded by `zoom { zoomed: false, cause: "resize" }`. There is
  exactly one `dragEnd` per gesture, released on the window or anywhere on the
  document.
- `close` means the window's own close box, or a modal's Escape. Closes
  dispatched straight to the store emit no `close`: `useClassicyWindowClose`,
  SimpleText, HyperCard, and any `ClassicyWindowClose` dispatch.

Alert: `open` fires once per mount. Under development StrictMode a package
sees `open, open` with no `close` between, because the effect has no cleanup
to pair it.

Menu and MenuItem:

- A `Menu` decoration lands on the list's `<ul>`. `CLASSICY_COMPONENT.Menu`
  names the root class `classicyMenu`, but the `<ul>` carries the caller's
  `navClass` (`classicyDesktopMenu`, `classicyContextMenu`, or a submenu's
  class) instead.
- Menu `open`/`close`: `input` is how the submenu was opened (a hover is
  `"pointer"`), and that open's input also tags the close it causes. A close
  by the menus closing reads the last press.
- MenuItem `focus` is emitted for the item's own keyboard focus, or a pointer
  hover over the item or its own content (not over a submenu's items). It may
  repeat while hovered and is not paired one to one with `blur`, which is
  emitted when the item's own focus leaves or the pointer leaves the item.
- MenuItem `release` is emitted once, when this item's own flash ends: an
  `animationend` of any name on the item itself, or the 400 ms fallback,
  whichever comes first. Then the item's action runs, exactly once.
- A divider is not a MenuItem: it emits nothing and is not decorated.

DesktopIcon and Icon:

- DesktopIcon `select` is emitted when a gesture changes the selection to
  this icon (it becomes selected, or a multiple selection collapses to it),
  once per gesture: a press or click on the icon (`input` from that press),
  or a key press that selects it (the desktop's arrow keys and type-ahead,
  `input: "keyboard"`), which the icon reports after the selection commits:
  the desktop marks the id it selects, and the icon reports only a marked
  change, never inferring it from the last key. A click that re-selects an
  icon an arrow key deselected mid-press reports again. A click on the icon
  that already is the whole selection emits nothing, so a double-click is
  `select, …, open`. A selection rectangle and a selection set in code emit
  nothing, even right after a key press; the `selected` state class is
  authoritative.
- Icon `select { selected }` is emitted only by a click toggle. Selection
  set programmatically (after a positional or file drag) emits nothing; the
  `selected` state class is authoritative.
- `dragStart`/`dragEnd` bracket every pointer press that can move the icon, a
  plain click included, mirroring the `dragging` state (as on the Slider).
  Finder outline drags of file-backed desktop icons, and `ClassicyIcon` file
  drags (`onFileDrag`), emit no drag events, and the `dragging` class stays
  off.

**Platinum's hooks.** `platinumAppearanceHooks`
(`src/Appearance/Platinum/hooks.ts`, exported) holds Platinum's feedback
sounds and its menu-item flash. It is the very object Platinum registers, so
it is deeply frozen and read-only to the type checker; a package that builds
on it composes a new object:
`on: { ...platinumAppearanceHooks.on, Button: { ...platinumAppearanceHooks.on?.Button, press } }`. They play for exactly the causes and inputs
that played them before the sounds moved out of the components. Sprite names
are `ClassicySoundSpriteId`s, so a misspelled sprite fails the type check.

| Component | Event | Platinum |
|---|---|---|
| Button | press / release | `ClassicyButtonClickDown` / `ClassicyButtonClickUp` (mouse and Return/Space) |
| BevelButton | press / release | `ClassicyButtonClickDown` / `ClassicyButtonClickUp` (mouse only, as emitted) |
| BevelButton | open | `ClassicyMenuOpen` |
| Placard | press / release | `ClassicyButtonClickDown` / `ClassicyButtonClickUp`, pointer only (Return/Space are silent) |
| RadioInput | press / release | `ClassicyInputRadioClickDown` / `ClassicyInputRadioClickUp` |
| Tabs | press | `ClassicyTabClickDown`, pointer only |
| Tabs | select | `ClassicyTabClickUp` (mouseup, and the tab an arrow, Home or End lands on) |
| Tabs | change | `ClassicyTabClickUp` (the scroll arrows) |
| Assistant | change | `ClassicyTabClickUp` |
| Window | focus | `ClassicyWindowFocus` |
| Window | collapse / expand | `ClassicyWindowCollapse` / `ClassicyWindowExpand` |
| Window | zoom | `ClassicyWindowZoomMaximize` when `zoomed`, else `ClassicyWindowZoomMinimize` (any `cause`) |
| Window | close | `ClassicyWindowClose` |
| Window | dragStart | `ClassicyWindowMoveIdle` for a move; a resize start is silent |
| Window | change | `ClassicyWindowMoveMoving` for a move |
| Window | dragEnd | `ClassicyWindowMoveStop`, as an interrupt |
| MenuItem | press | `ClassicyMenuItemClick`, and returns `{ className: "classicyMenuItemFlash" }` (the flash) |
| MenuItem | release | returns `{}`: clears the flash |
| MenuItem | open / focus | `ClassicyMenuOpen` / `ClassicyMenuItemHover` |

Everything else is unmapped (silent): MenuItem `blur` (no pack has a blur
sprite), the Menu list's own `open`/`close` (a submenu opened by hover was
silent before too), Placard `click`/`open`/`close`, RadioInput `change`, and
every event the table above does not list. The flash class and its keyframes
(`classicyMenuItemFlashKeyframes`) are in Platinum's `_Menu.scss`, in
`classicy.package`.

Behavior that follows from the move:

- **A component with no package hooks is silent.** A component rendered while
  only `CLASSICY_FALLBACK_APPEARANCE_PACKAGE` applies (no package registered:
  a lone-component test that never imports `@/Appearance/Platinum`, or a host
  that never loads Platinum), or under a package whose hooks map nothing,
  plays no feedback sounds. Importing `classicy` or rendering
  `ClassicyDesktop` registers Platinum.
- **A menu with no package flash does not flash.** Under a package whose
  MenuItem `press` returns no decoration (or with no package hooks), a chosen
  item gets no flash class. In a body-level portal outside every
  `.classicyDesktop`, Platinum's class is set but no package CSS animates it.
  Either way the item's action runs, once, through the 400 ms fallback.
- **Error beeps and the boot sound stay in Classicy.** `ClassicySoundPlayError`
  (Window, Alert, Assistant) follows the alert sound preference, and the
  startup screen plays `ClassicyBoot`; both are behavior, not look, and no
  package can change them.

Storybook shows the hook surface: every wired component's
**AppearanceHooks** story renders it under the `storybook-probe` package
(`storybook/.storybook/ClassicyAppearanceProbe.tsx`), which the probe
registers on mount and unregisters on unmount, so no other story (the
Appearance Manager's Packages tab included) lists it. Platinum's CSS is off
there, every decorated root is outlined, and every event is logged in the
Actions panel. Under the probe the window control boxes, menu dividers and
the depressable `::after` geometry collapse, because that structure still
lives in Platinum's look mixins (Part B ruling R10; follow-up story
0088-sz9).

### Layout declarations

A package's **arrangement** (where the parts of a surface go, as opposed to
how they look) has two halves:

1. **CSS `order` and flex direction** on the parts that carry a part
   attribute or part class (table below). The base stylesheet gives each
   part an explicit `order`; a package overrides the numbers in its own CSS.
   Which parts exist is behavior and never changes: a package may only
   reorder or hide them.
2. **The package's `layout` block**, for the three arrangements that need
   JavaScript as well as CSS.

| Key | Values (Platinum's first) | Drives |
|---|---|---|
| `window.growBoxCorner` | `bottom-right`, `bottom-left`, `top-right`, `top-left` | the grow box's corner (base CSS keyed on `[data-classicy-grow-box]`, the grip's two drawn edges included, which stay on its content side) and which corner a resize drag keeps fixed (`computeClassicyWindowResize`, below) |
| `menuBar.placement` | `screen`, `window` | `screen`: the one menu bar across the top. `window`: the screen bar renders nothing (it stays mounted and still dispatches and registers keyboard equivalents), and each window with an `appMenu` draws it in a `ClassicyWindowMenuBar` under its title bar |
| `desktop.iconGridOrigin` | `top-right`, `top-left`, `bottom-right`, `bottom-left` | the corner desktop icons are laid out from, by Clean Up (`ClassicyDesktopIconCleanup`) and when an icon is added. Switching packages does not move existing icons; the next Clean Up does |

**Reading it.** `useClassicyAppearanceLayout()` (components; re-renders on a
package switch) and `getClassicyAppearanceLayout(packageId?)` (reducers and
effects; store-free, so a reducer may import it; with no id it reads the
active package at call time) resolve the active package from
`System.Manager.Appearance.packageId`, never from `activeTheme.package`: a
registered package's layout, else Platinum's, else
`CLASSICY_DEFAULT_APPEARANCE_LAYOUT`.

**On the desktop root.** `ClassicyDesktop` publishes the resolved layout on
its root element, beside `data-classicy-appearance`, as two attributes and
three custom properties (spread by `ClassicyDesktop` from
`classicyLayoutVars(layout)`; `getThemeVars` only sees the theme and emits
none of them):

| Root attribute | Custom property |
|---|---|
| `data-classicy-grow-box` | `--classicy-layout-grow-box-corner` |
| `data-classicy-menu-bar` | `--classicy-layout-menu-bar-placement` |
| — | `--classicy-layout-icon-grid-origin` |

Values are the bare keywords (`bottom-right`, `screen`, …). The attributes
are on the desktop root only: a component rendered outside a
`ClassicyDesktop` (a Storybook Controls story's frame, say) sees neither, so
`[data-classicy-grow-box="…"] .classicyWindow …` rules do not reach it.

**Parts a package may `order`:**

| Surface | Flex items (base `order`) | Notes |
|---|---|---|
| Window title bar | `[data-classicy-control="close"]` 10, `.classicyWindowTitle` 20, `[data-classicy-control="zoom"]` 30, `[data-classicy-control="collapse"]` 40 | the stripes are `.classicyWindowTitleLeft`/`Center`/`Right`, which a package may hide (`display: none`) |
| Alert top row (`.classicyAlertTop`) | `.classicyAlertIcon` 10, `.classicyAlertBody` 20 | |
| Alert buttons (`.classicyAlertButtons`) | each button by `[data-classicy-role="default\|cancel\|other"]` | no base `order`: the button list's order, default last; flip with `flex-direction`. Help keeps `margin-right: auto` |
| Menu bar (`.classicyDesktopMenu`) | `[data-classicy-part]` `apple` 10, `app` 20, `help` 30, `extensions` 40, `clock` 50, `switcher` 60 | `extensions` carries `margin-left: auto`, which pushes the right-hand cluster over. A title with balloon help is wrapped in an anchor; that anchor is the flex item, ordered by the part it wraps (`:has()`), and sized by its title. Window menu bars use the same rules |
| Tabs (`.classicyTabContainer`, a flex column) | `.classicyTabButtonsRow` (strip), `.classicyTabsHolder` (panel) | `stripPosition="bottom"` (`.classicyTabStripBottom`) moves the strip below with `order: 1` and moves its 1 px overhang to the top edge |
| Disclosure header (`.classicyDisclosureHeader`) | the triangle, then `.classicyControlLabelHolder` | `labelPosition="left"` (`.classicyDisclosureLabelLeft`) sets the label's `order: -1` |

**Window menu bars.** With `menuBar.placement: "window"`, `ClassicyWindow`
renders a `ClassicyWindowMenuBar` (root `.classicyWindowMenuBar`,
`data-classicy-part="window-menu-bar"`) with the window's `appMenu` directly
under the title bar. Utility windows, modals, collapsed windows and windows
with an empty `appMenu` get none. It has its own `ClassicyMenuProvider`:
menus stick as the screen bar's do and close on a selection, a re-click of
the open title, a mouse-down outside the bar
(`useClassicyMenuCloseOnOutsideMouseDown`), or the 15 s idle timeout. Another
window's bar counts as outside, so only one window's menu is open at a time.
A switch to window placement closes any menu open on the screen bar. Its
height is `--classicy-window-menu-bar-height` when a host or package sets it
(it inherits), else `control size × 1.75`, and the window's contents shrink
by it. While it draws the bar, the window root carries
`classicyWindowWithMenuBar`, which keys that sizing; a separate
`:has(> .classicyWindowMenuBar)` rule repeats it, so a browser without
`:has()` still fits the window together. Limits of this placement: the Apple, Help
and App Switcher menus, the clock and menu bar extensions have no home in a
window bar and are not shown. A `ClassicyMenuBarExtension` renders nothing
while the placement is `window` and reappears in the screen bar's new
extensions region when it returns to `screen`. It follows the package
layout only: a bar forced to `placement="screen"` under a window-placement
package is not re-queried. Window geometry still reserves the screen bar's
30 px band at the top.

`ClassicyDesktopMenuBar`'s `placement` prop affects only that bar; windows
follow the package layout, never the prop. `placement="window"` under
Platinum makes the screen bar headless while no window draws a bar, so no
menus are on screen (keyboard equivalents still fire). `placement="screen"`
under a window-placement package draws the screen bar and, in each window
with an `appMenu`, a window bar as well.

**`computeClassicyWindowResize(corner, rect, pointer, chrome, fudge?,
minimum?, floor?)`** → `{ size: [w, h], position: [left, top] }`. Pure; the
size and position for a resize drag whose grow box is in `corner`. The
corner opposite the grow box is the anchor: the size is the pointer's
distance from it plus `fudge` (default 5, which keeps the grow box under the
pointer; `ClassicyWindow` passes the same value), and the position keeps the
anchor fixed.
`rect` is the window's bounding rect when the drag started (left, top,
right, bottom) and `chrome` its frame padding plus border, which the rect
includes and the applied size does not. Two optional limits apply only on an
axis whose grow box moves the left or top edge:

- `minimum` (`[w, h]`, default `[0, 0]`): the window's minimum content size.
  CSS draws the window at least that size, so the moved edge stops there;
  the returned size stays raw.
- `floor` (`[x, y]`, default `[0, 0]`): the lowest left/top the window may
  take; past it the size shrinks so the edge stops at the floor.
  `ClassicyWindow` passes its viewport floor, `windowViewportFloor` (`[0,
  30]`: the screen's left edge and the menu bar's underside), a constant
  module-private to `ClassicyWindow.tsx` and shared there with
  `clampWindowPositionToViewport`, which re-applies it after every move and
  resize.

`bottom-right` moves no edge, ignores both limits, and gives the numbers
Classicy always used. `ClassicyWindow` writes `size` as the window's width
and height during the drag and, for any other corner, `position` as its
left and top.

Types: `ClassicyWindowRect` is the `rect` argument (`{ left, top, right,
bottom }`, viewport pixels, frame included); `ClassicyWindowResizeResult` is
the return value (`{ size, position }`, both `[number, number]`).

**Icon grid.** Clean Up walks the grid one grid step (icon cell plus
padding) at a time (`iconSize × 2 + iconSize / 4` on both axes), down each
column from the origin's edge, then to the next column. Every counted column
fits the viewport, and a bottom origin also keeps its last row clear of the
menu bar, so no cleaned-up icon lands off-screen. In a viewport too short
for even one row below that band, a bottom origin's one row is clamped to
the top origins' first-row height (`4 × padding`).
`classicyDesktopIconGridPosition(iconSize, padding, col, row, origin?)` is
the grid-position-to-location function; `origin` defaults to
`CLASSICY_DEFAULT_APPEARANCE_LAYOUT.desktop.iconGridOrigin`.

**A package that rearranges.** The Storybook-only `mirrored` package
(`storybook/.storybook/MirroredPackage.ts` and `mirrored.scss`) is the proof
that every slot works and the template for a new package: Platinum's look,
rescoped by including Platinum's component mixins inside
`classicy-package("mirrored")`, then the flips (close box right, zoom and
collapse left, stripes hidden, the alert's icon right and default button
leftmost, the App Switcher leading the menu bar, the tab strip and its
outlines under the panel, the disclosure label first), plus a `layout` with
all three keys flipped. Its six `Mirrored` stories (`desktop-window`,
`dialogs-alert`, `desktop-desktop`, `desktop-menubar`, `controls-tabs`,
`controls-disclosure`) are rendered with `mirroredParameters`, from
`storybook/.storybook/mirrored.ts`. Importing that module registers the
package, and only those six story files import it (never `preview.tsx`), so
the package is registered only in an iframe that has loaded one of those
files. A fresh load of any other story never sees it, but Storybook keeps
one preview iframe across sidebar navigation, so a story visited after a
`Mirrored` one in the same session lists it too.

**Changes from earlier builds** (Platinum's pixels are unchanged):

- The menu bar's clusters are flex items placed by `order`, not floats.
  The deprecated `ClassicyDesktopMenuWidgetSound`, mounted outside the menu
  bar in a container that is not a flex row, now floats left (it floated
  right).
- A balloon-wrapped top-level menu title is as wide as its title, not the
  whole bar.
- `ClassicyDisclosure` renders one DOM order, triangle then label, for both
  label positions; a left label is moved first by CSS. Code that read a
  left-label header's `firstElementChild` as the label now gets the
  triangle. A non-interactive `ClassicyTriangle`'s `<svg>` is
  `aria-hidden`, so the header's accessible name is its label alone in both
  positions (it was "More info Toggle" or "Toggle More info").
- Clean Up counts columns by the icon cell, not `iconSize + padding`, so on a
  desktop with more icons than fit the icons wrap to the first column
  instead of running off-screen.

### Theme files (save / load)

The Appearance Manager's Themes tab has **Save Theme…** (downloads the
*active* theme, built-in or custom) and **Load Theme…** (picks a `.json`
file, imports it, selects it). A load error shows a stop alert with the
reason; a theme for a package that is not installed is refused this way
before anything is dispatched. A theme for another *installed* package
switches to that package first (`ClassicyDesktopChangeAppearancePackage`),
then imports, so the active theme and the active look agree. That switch is
the panel's: a programmatic `ClassicyDesktopImportTheme` leaves `packageId`
alone. Helpers live in `ClassicyThemeFile.ts`; the schema in
`ClassicyThemeSchema.ts`.

File format — a versioned envelope, saved as `<theme-name>.classicy-theme.json`:

```json
{ "format": "classicy-theme", "version": 1, "theme": { "id": "azul", "name": "Azul", "color": {…}, … } }
```

- Loading also accepts a **bare theme object** (no envelope), e.g. an entry
  copied from the `presets` of `src/Appearance/Platinum/platinum.json`. A `format` other than `"classicy-theme"`, a
  missing version, or a version other than `1` is rejected (a higher version
  reports "saved by a newer version of Classicy").
- `theme.package` names the theme's Appearance Package (`"platinum"` when
  absent, so older files load as Platinum). Loading refuses a theme whose
  package is not registered with `This theme needs the "<id>" appearance
  package, which is not installed.` The default package
  (`CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`, `"platinum"`) always counts as
  installed, registered or not, because the desktop falls back to it.
- `desktop.backgroundImage` is written as the bundled wallpaper's **filename**
  (`"azul_dark.png"`) — the URL a build resolves it to (dev path, inlined
  `data:` URI) is build-specific — and resolved back on load. A plain http(s)
  URL is kept; anything else (custom `data:`/`blob:` URL, relative path) is
  written as `""` (no image).

`ClassicyThemeSchema` (zod) mirrors `ClassicyTheme` (checked both ways at
compile time). Unknown keys are **stripped**, not rejected (a newer file with
an extra optional field still loads; nothing undeclared reaches the store),
except in `measurements`, where an unknown family is an Appearance Package's
and is kept. Types are strict:

| Field | Rule |
|---|---|
| colors (incl. `desktop.backgroundColor`) | integer `0x000000`–`0xFFFFFF` |
| `color.system` / `color.theme` | exactly 7 colors |
| `name` | 1–64 chars after trimming |
| typography sizes, `desktop.iconSize`/`iconFontSize` | positive, ≤ 512 |
| `package` | ≤ 64 chars; defaults to `"platinum"` |
| `measurements.<family>.*` (core and package families) | ≥ 0, ≤ 512 |
| package family and key names (`measurements.controlStrip.cellHeight`) | lowercase-first camelCase (`CLASSICY_MEASUREMENT_NAME`, `/^[a-z][A-Za-z0-9]*$/`) |
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
    assignImportedClassicyThemeIdentity, // (theme, existingThemes, reservedIds?) => theme with unique id/name
} from 'classicy'

const result = parseClassicyThemeFile(await file.text())
if (result.ok) dispatch({ type: 'ClassicyDesktopImportTheme', theme: result.theme })
else showError(result.error)  // e.g. "This theme has invalid settings: color.system: …"
```

`ClassicyDesktopImportTheme { theme }` — the payload is untrusted:
`hasImportableTheme` validates it against the schema (invalid → ignored),
then the reducer refuses a theme for an uninstalled package (above) with a
`ClassicyAppearance` warning and `Desktop.errorDialog`
`{ title: "Appearance", message }`, else strips undeclared keys, resolves the wallpaper, assigns a
fresh identity, **appends** it to `customThemes` and activates a copy (the
same copy-on-activate as `ChangeTheme`; the sound manager reloads itself when
the active theme's `sound.pack` changes).
Identity rules (`assignImportedClassicyThemeIdentity`):

- The file's `id` is ignored. The id is `custom-<slug of the name>`
  (`custom-theme` if the slug is empty), with `-2`, `-3`, … on collision with
  any built-in, custom or active-package theme id (its defaults and presets) — and never a Custom fork
  slot the next edit on a built-in would overwrite: `"custom"`, the theme's
  own package's slot, or any id in `reservedIds` (ImportTheme passes every
  registered package's `classicyCustomThemeSlotId`). So an import can never
  overwrite an existing theme or hide behind a preset ChangeTheme finds
  first, and re-importing the same file adds a second entry.
- The name is kept unless a theme already has it (case-insensitive, the
  active package's presets included); then
  `" 2"`, `" 3"`, … is appended, counting up from an existing trailing number
  (`"Azul 2"` → `"Azul 3"`).

An imported theme is a custom theme, so edits modify it in place (no fork).
Like every `ClassicyDesktop*` action it is unreachable to untrusted
(HyperCard) dispatches.

### Appearance Manager tabs

`ClassicyAppearanceManager` (mounted by `ClassicyDesktop` with the other
control panels) is one 480 px window with eight tabs in the compact strip,
which scrolls sideways when they overflow. Each tab is a hook in
`ControlPanels/AppearanceManager/ClassicyAppearanceManager.<Tab>.tsx` that
takes its values and callbacks as props and returns a `TabIndividual`
(`{ title, children }`), so a host can render one tab in its own window
(Storybook's `System/AppearanceManager` stories do). Measurements write through
`ClassicyDesktopChangeMetric` (`metricKey` or `{ family, key }`); everything
else through its own action or `ClassicyDesktopChangeAppearanceOption`. Every
edit on a built-in theme forks its package's Custom theme (above).

| Tab | Hook (props) | What it shows and dispatches |
|---|---|---|
| Themes | `useThemesTab({ packageId, packageName, themesList, switchTheme, activeThemeId, smartScrolling, toggleSmartScrolling, doubleClickTitleToCollapse, toggleDoubleClickTitleToCollapse, saveTheme, loadThemeFile })` | "The current Appearance Package is <name>" (Platinum's icon only for `platinum`); the theme pop-up, `listClassicyPackageThemes` for the active package plus the active theme when it is not among them, so the pop-up is never blank (`ClassicyDesktopChangeTheme`); Save Theme… / Load Theme… (above); the scrolling and collapse checkboxes |
| Packages | `usePackagesTab({ packages, activePackageId, changePackage })` | A `ClassicyRadioInput` (`name="appearance_package"`, input ids `appearancePackageInputId(id)` → `appearance_package_<id>`) titled "Appearance Package" (which names its `radiogroup`) and listing every registered package as "<name> (<n> themes)" ("(1 theme)" for one), counting its selectable built-ins (`listClassicyPackageBuiltInThemes`: its defaults and presets, once per id), the active one on, and under it each package's seven `defaults.color.theme` swatches (`li[data-package-id]`, `aria-label` "<name> colors"); in the Colors tab's 210 px scroll region. Picking one dispatches `ClassicyDesktopChangeAppearancePackage { packageId }`, which keeps `customThemes` |
| Options | `useOptionsTab({ pkg, theme, editingCustomTheme, changeMetric })` | The active package's `knobs`: one group per family (humanized family name), one spinner per knob (its `label`), showing `measurements.<family>.<key>` or the knob's default when the theme lacks it; ids `appearanceOptionInputId({ family, key })` → `appearance_option_measurements_<family>_<key>`. Built with `ClassicySchemaForm`; entries are whole pixels clamped to `getThemeMetricFamilyBounds` and dispatched as `ClassicyDesktopChangeMetric { family, key, value }` (never `ChangeAppearanceOption`). Carries the fork notice ("Changing an option creates a Custom theme from “<name>”." / "Editing the “<name>” theme."). Knobs the reducer would refuse are left out: a family or key failing `isThemeMetricFamilyTarget` (a core group such as `window`, or a name that is not lower camel case) or bounds that are `undefined`; the left-out knobs are reported in one `ClassicyAppearance` warning per package. A package with no editable knob shows "The <name> package has no options." |
| Desktop | `useDesktopTab({ bg, bgPosition, bgRepeat, bgSize, changeBackground, setBackgroundURL, alignBackground, repeatBackground, backgroundSize })` | The wallpaper picker (the wallpaper registry, §5), a picture URL field, and position, tiling and size (`ClassicyDesktopChangeBackground*`) |
| Colors | `useColorsTab({ theme, editingCustomTheme, changeColor, appId })` | The 28 `CLASSICY_THEME_COLOR_TARGETS` swatches in groups (`appearanceColorPickerId(target)`), dispatching `ClassicyDesktopChangeColor`, with the fork notice |
| Fonts | `useFontsTab({ typography, changeFont, changeFontSize })` | A family pop-up (the font registry, §5) and a size per typography slot (`ClassicyDesktopChangeFont`, `ClassicyDesktopChangeFontSize`) |
| Metrics | `useMetricsTab({ theme, editingCustomTheme, changeMetric })` | One spinner per `CLASSICY_THEME_METRIC_TARGETS` entry, grouped by `CLASSICY_THEME_METRIC_GROUPS` (Window, Controls, Buttons, Group Boxes, Layout), ids `appearanceMetricSpinnerId({ metricKey })` → `appearance_metric_<metricKey>`. Entries are rounded to whole pixels and clamped to the target's bounds, then dispatched as `ClassicyDesktopChangeMetric { metricKey, value }`; an empty entry dispatches nothing (the field shows its minimum until the next edit). Fork notice: "Changing a metric creates a Custom theme from “<name>”." |
| Sound | `useSoundTab({ soundPacks, soundPack, changeSoundPack, alertSound, changeAlertSound, alertVolume, changeAlertVolume, previewAlertVolume })` | The Sound Pack pop-up (`#soundPack`): `useClassicySoundPacks()` packs with no `packageId` or the active package's, plus the active theme's pack when another package owns it, written by `ClassicyDesktopChangeAppearanceOption { path: "sound.pack", value }`; Alert Sound and Alert Volume (§10) |

`appearanceThemeEditNotice(themeName, editingCustomTheme, change)` returns
the shared notice string (Colors passes "a color", Metrics "a metric",
Options "an option").
Testing note: `ClassicyTabs` keeps every panel mounted, so panel tests scope
text queries to the visible `tabpanel`.

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
`ClassicyThemeMetrics.ts`; they are Apple's HIG Ch. 3 values).
`classicyMeasurementVars` (same file) emits every numeric input as
`--<family>-<key>`, kebab-cased. An Appearance Package may add families of its
own (`measurements.controlStrip.cellHeight` → `--control-strip-cell-height`).
Family and key names must be lowercase-first camelCase; other names are
refused by the schema and skipped by the walker. When two inputs kebab-case to
the same variable (`windowTitle.barHeight` and `window.titleBarHeight`), the
first wins: core inputs always win, then package families in key order. Each
collision is logged once as a `ClassicyAppearance` warning. The core inputs:

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

Control, window and menu **feedback sounds** (clicks, the window sounds, the
menu sounds) are not played by the components: the active Appearance
Package's hooks play them with `playClassicyAppearanceSound` (§8, "Package
hooks"), through the emitting component's dispatch. The error beep
(`ClassicySoundPlayError`) and the boot sound stay in the components.

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
pop-up menu, string → input, nested object → titled group, `.describe()`
text as labels), drawn by `ClassicySchemaForm` (§4.4). `onChange`
patches are dispatched as `ClassicyAppScreenSaverSetConfig` and validated
against the schema; saved configs persist in
`apps["ScreenSaver.app"].data.saverConfigs`.

Two behavior changes in the derived form, now that `ClassicySchemaForm`
draws it:

- **Labels of undescribed fields.** A field with `.describe()` is labeled
  with that text, as before. A field without one used to show its raw key
  (`speedSeconds`); it now shows the humanized key ("Speed seconds": split on
  camel-case humps, first letter upper-cased, acronyms kept). The bundled
  savers describe every field and are unchanged; a third-party saver that
  relied on the raw key should add `.describe("…")` to keep its exact text.
- **Number entries are clamped.** A number field sends the value it shows:
  clamped to the field's `.min()`/`.max()` and rounded for `.int()` (typing
  99 in Warp's 3–9 `layers` saves 9, where it used to send 99), and an
  empty entry sends nothing. A field with no `.min()` is floored at 0, the
  spinner's own minimum: a `z.number()` meant to allow negatives now sends 0
  for −5, where it used to send −5 (the spinner showed 0 either way). Give
  such a field a custom `configComponent`.

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
10. **Styles come with the import** — the bundle injects `classicy.css` into `<head>`; the fonts are files in `dist/assets/` registered by the Platinum package (`classicy/fonts` is a deprecated no-op). The Platinum package injects its look the same way. Only if a CSP blocks inline `<style>`, link `classicy.css`, then `classicy-platinum.css`, first in `<head>` (§1); linking `classicy.css` alone gives a desktop with structure but no look. Structure lives in `@layer classicy.base` and the look in `@layer classicy.package`, both declared first, so any unlayered host rule *and any host layer* (Tailwind's preflight in `@layer base`, for example) on the same element and property beats either. Override in `@layer classicy.user` or with plain unlayered rules; put resets that must yield to Classicy in `classicy.base.host` (§1, Cascade layers).
11. Deprecated (still working, avoid in new code): `noDesktopIcon`, `inApplicationsFolder`, `registerAppEventHandler`, `registerClassicyUntrustedActionAllowlist` for app-owned actions, `isXData`-style hand-rolled guards (use `parseAppData`).
12. **Never mount the built-in apps yourself** (`Finder`, `SimpleText`, `HyperCard`, the viewers, `ClassicyControlPanels`, `AppleGuide`) — `ClassicyDesktop` renders them all automatically; mounting them as children double-mounts them. Use the provider's `disable*` props to remove the optional ones.
