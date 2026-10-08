# Building a Classicy App

This guide shows how to write an application for a Classicy desktop. It starts
with the smallest app that runs, then documents every feature an app can use.

For a flat, machine-oriented dump of the whole public API, see
[`AGENT-REFERENCE.md`](AGENT-REFERENCE.md). This document is the narrative
version, aimed at a person writing an app for the first time.

**Contents**

1. [What an app is](#1-what-an-app-is)
2. [Hello, world](#2-hello-world)
3. [The four-file pattern](#3-the-four-file-pattern)
4. [`ClassicyApp` reference](#4-classicyapp-reference)
5. [`ClassicyWindow` reference](#5-classicywindow-reference)
6. [State: the store, selectors, dispatch](#6-state-the-store-selectors-dispatch)
7. [Manifests: `registerApp`](#7-manifests-registerapp)
8. [Reducers](#8-reducers)
9. [Menus](#9-menus)
10. [Icons](#10-icons)
11. [Files](#11-files)
12. [Dialogs and alerts](#12-dialogs-and-alerts)
13. [Balloon help](#13-balloon-help)
14. [Sound](#14-sound)
15. [Analytics](#15-analytics)
16. [Extensions and global shortcuts](#16-extensions-and-global-shortcuts)
17. [Persistence](#17-persistence)
18. [Testing](#18-testing)
19. [Checklist and known traps](#19-checklist-and-known-traps)

---

## 1. What an app is

A Classicy app is three things at once:

| Layer | What it is | Where it lives |
|---|---|---|
| **Component** | A React component that renders `<ClassicyApp>` and some `<ClassicyWindow>` children. | `MyApp.tsx` |
| **Store entry** | A record at `System.Manager.Applications.apps["MyApp.app"]` holding window list, open/focus flags, and a free-form `data` bag. | Zustand store |
| **Manifest** | A `registerApp({ … })` call that declares the app's description, its action prefix, its reducer, its actions, and the schema of its `data`. | `MyAppContext.ts` |

You always write the component and the manifest. You write a reducer only when
the app needs to keep state that must survive a reload.

An app mounts as a child of `<ClassicyDesktop>`, which itself mounts inside
`<ClassicyAppManagerProvider>`:

```tsx
<ClassicyAppManagerProvider>
    <ClassicyDesktop>
        <MyApp />
    </ClassicyDesktop>
</ClassicyAppManagerProvider>
```

`ClassicyDesktop` renders your children after the menu bar, the bundled apps,
and the desktop icons. Nothing else is required to make the app appear — mounting
`<ClassicyApp>` registers the app, adds its desktop icon, and adds it to the
Applications folder.

> **Mount `ClassicyDesktop` eagerly.** Lazy-loading it so that it mounts a tick
> after `ClassicyAppManagerProvider` corrupts manager state: early dispatches
> reach a reducer whose state the desktop has not seeded yet, and every later
> dispatch throws.

---

## 2. Hello, world

Four things: an id, a name, an icon, and a window.

```tsx
import { ClassicyApp, ClassicyWindow, ClassicyButton } from 'classicy'
import appIcon from './my-app.png'

export default function MyApp() {
    return (
        <ClassicyApp id="MyApp.app" name="MyApp" icon={appIcon} defaultWindow="myapp_main">
            <ClassicyWindow
                id="myapp_main"
                appId="MyApp.app"
                title="My App"
                icon={appIcon}
                initialSize={[400, 300]}
                initialPosition={["center", "center"]}
            >
                <ClassicyButton onClickFunc={() => alert('Hi')}>Click me</ClassicyButton>
            </ClassicyWindow>
        </ClassicyApp>
    )
}
```

That app already has: a desktop icon, an Applications-folder entry, an Apple-menu
entry, a draggable and resizable window with close/zoom/collapse boxes, window
sounds, theming, and persistence of its window position across reloads.

### App id and app name

- **The id ends in `.app`.** Every bundled app follows this (`Finder.app`,
  `SimpleText.app`), a test pins it, and `"Finder.app"` is hard-coded as the
  menu-bar fallback.
- **The name is load-bearing, not decoration.** Finder builds the action type
  `` `ClassicyApp${app.name}OpenFile` `` from the stored name, verbatim. A name
  with a space produces an action type with a space in it, which will not match
  your registered prefix. **Prefer a single word for `name`.**

---

## 3. The four-file pattern

A non-trivial app is normally four files:

```
src/Applications/MyApp/
├── MyApp.tsx          # component: ClassicyApp + windows + menus
├── MyAppContext.ts    # reducer + zod schemas + registerApp (module side effect)
├── MyApp.module.scss  # styles
└── my-app.png         # icon
```

`MyApp.tsx` imports `MyAppContext.ts` for its side effect:

```tsx
import './MyAppContext'   // runs registerApp() at module load
```

**Register the manifest at module load, not at mount.** `registerApp` must run
as a module side effect. If the module is never pulled into the import graph,
`dispatchToPlugin` logs `No handler registered for prefix` and every action for
the app silently falls through.

---

## 4. `ClassicyApp` reference

```ts
interface ClassicyAppProps {
    id: string
    name: string
    icon: string
    defaultWindow?: string
    showDesktopIcon?: boolean
    showInApplicationsFolder?: boolean
    desktopIconBalloonHelp?: string | ClassicyIconBalloonHelp
    noDesktopIcon?: boolean          // @deprecated → showDesktopIcon={false}
    inApplicationsFolder?: boolean   // @deprecated → showInApplicationsFolder
    addSystemMenu?: boolean
    extension?: boolean
    globalShortcuts?: ClassicyGlobalShortcut[]
    bootIcon?: boolean | string
    debug?: boolean
    handlesFileTypes?: ClassicyFileSystemEntryFileType[]
    handlesOwnFiles?: boolean
    contextMenu?: ClassicyMenuItem[]
    children?: ReactNode
}
```

| Prop | Default | Purpose |
|---|---|---|
| `id` | — | Unique app id. Convention: `MyApp.app`. |
| `name` | — | Display name. Also builds file-open action types — prefer one word. |
| `icon` | — | Icon URL. Required even for extensions, which never render it. |
| `defaultWindow` | — | Enables focus restore: when the app is focused but none of its open windows is, the most recently focused one is refocused (this window if none has been). |
| `showDesktopIcon` | `true` | Draw an icon on the desktop. |
| `showInApplicationsFolder` | `true` | List the app in the derived Applications folder. Independent of the above. |
| `desktopIconBalloonHelp` | manifest `description` | Balloon help for the desktop icon. A bare string is titled with the app name. |
| `addSystemMenu` | — | Add an Apple-menu entry. Forced off for extensions. |
| `extension` | `false` | Background app: always open, no icon, no focus, no Apple-menu entry. |
| `globalShortcuts` | — | Honored **only** when `extension` is set. |
| `bootIcon` | — | Show an icon in the startup parade. `true` uses the app icon; a string uses that icon. |
| `debug` | `false` | Render a JSON-tree debugger window over the app's store entry. |
| `handlesFileTypes` | — | File types Finder should route to this app. |
| `handlesOwnFiles` | `false` | Suppress the automatic file windows and render your own. |
| `contextMenu` | — | Right-click menu for every window of this app, unless a window overrides it. |

Children render only when the app is open.

### Three canonical shapes

**Standard app** — desktop icon, Applications entry, its own File menu:

```tsx
<ClassicyApp
    id={appId}
    name={appName}
    icon={appIcon}
    defaultWindow="myapp_main"
    addSystemMenu={false}
    desktopIconBalloonHelp={getAppManifest(appId)?.description}
>
```

**Control panel** — Apple menu only, no desktop icon:

```tsx
<ClassicyApp
    id={APP_ID}
    name={APP_NAME}
    icon={appIcon}
    defaultWindow={WINDOW_ID}
    showDesktopIcon={false}
    addSystemMenu={true}
>
```

**Background extension** — no window, no icon, runs from boot:

```tsx
<ClassicyApp id={appId} name={appName} icon={appIcon} extension addSystemMenu={false}>
```

### What mounting does

On mount, `ClassicyApp` dispatches, in order:

1. `ClassicyAppLoad` — creates or refreshes `apps[id]`, storing `contextMenu`.
2. `ClassicyDesktopAppMenuAdd` / `…Remove` — per `addSystemMenu`.
3. `ClassicyDesktopIconAdd` with `kind: "app_shortcut"`, or `ClassicyDesktopIconRemove`
   when both icon surfaces are off. (The removal matters: icons persist to
   `localStorage`, so a stale icon would otherwise survive.)
4. `ClassicyBootParadeIconAdd` — when `bootIcon` is set.
5. `ClassicyAppRegisterFileTypes` — when `handlesFileTypes` is set.
6. `ClassicyShortcutRegister` per entry — extensions only.

`contextMenu` is deliberately **excluded** from the effect's dependencies, so an
inline array literal does not re-fire the effect.

### Alias badging

Every icon `ClassicyApp` registers has kind `app_shortcut`, so it renders the
Mac OS 8 alias arrow over its bottom-left corner and italicizes its label. System
kinds (`drive`, `trash`, `directory`, `file`, `icon`) get neither.

---

## 5. `ClassicyWindow` reference

Every prop, with its default:

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `id` | `string` | — | Window id, unique **across the whole store**. |
| `appId` | `string` | — | Owning app id. |
| `title` | `string` | `""` | Title-bar text. Sent to analytics verbatim. |
| `icon` | `string` | file icon | Title-bar icon. |
| `hideIcon` | `boolean` | `false` | Hide the title-bar icon. |
| `hidden` | `boolean` | `false` | Render but do not show. |
| `closable` | `boolean` | `true` | Draw the close box. |
| `zoomable` | `boolean` | `true` | Draw the zoom box. |
| `collapsable` | `boolean` | `true` | Draw the collapse (windowshade) box. |
| `resizable` | `boolean` | `true` | Draw the grow box. |
| `scrollable` | `boolean` | `true` | Give the content region scroll bars. |
| `growable` | `boolean` | — | Let content drive the window size. |
| `modal` | `boolean` | `false` | Modal dialog. Destroyed on unmount, so each open takes focus. |
| `defaultWindow` | `boolean` | `false` | Mark this as the app's default window. |
| `initialSize` | `[dim, dim]` | `[350, 0]` | `number`, `"50%"`, or `0` for auto. |
| `initialPosition` | `[x, y]` | `[110, 110]` | `number`, or `"left"`/`"center"`/`"right"` and `"top"`/`"center"`/`"bottom"`. |
| `minimumSize` | `[dim, dim]` | `[300, 0]` | Resize floor. |
| `header` | `ReactNode` | — | Fixed header strip above the content region. |
| `headerVariant` | `"standard" \| "list"` | `"standard"` | `"list"` drops the header's bottom separator. |
| `placard` | `ReactNode` | — | Status region at the bottom-left, left of the horizontal scroll bar. |
| `appMenu` | `ClassicyMenuItem[]` | — | Menu bar published when this window is focused. **Memoize it.** |
| `contextMenu` | `ClassicyMenuItem[]` | app's menu | Right-click menu for this window. |
| `windowType` | `"document" \| "utility"` | `"document"` | `"utility"` renders a tool-palette crosshatch drag region. |
| `alwaysOnTop` | `boolean` | `false` | Utility only. Float above every app's windows. |
| `zoomMode` | `"full" \| "horizontal" \| "vertical"` | `"full"` | Which axes the zoom box affects. |
| `contentFrame` | `boolean` | `false` | 2px active/inactive frame — marks a modeless dialog. |
| `backgroundColor` | `string` | theme | Any CSS color, including `var(--…)`. |
| `dimContents` | `boolean` | `true` | Dim contents when the window is inactive. |
| `analyticsPath` | `string` | derived | Override the generated pageview path. |
| `analyticsExclude` | `boolean` | — | Emit no pageview at all. |
| `onCloseFunc` | `(id) => void` | — | Runs after a close is allowed. |
| `onBeforeClose` | `(id) => boolean \| Promise<boolean>` | — | Close veto. Return `false` to cancel. |
| `type` | `string` | `"default"` | Free-form class hook. |

### Sizing idioms

```tsx
initialSize={[400, 300]}        // fixed
initialSize={["75%", "75%"]}    // proportional to the viewport
initialSize={["45%", 0]}        // proportional width, height from content
initialSize={[0, 0]}            // both from content (tool palettes)
initialPosition={["center", "center"]}
```

Persisted windows are re-clamped to the viewport on load, so a window saved off
the edge of a large screen comes back on a small one.

### Vetoing a close

`onBeforeClose` runs before `onCloseFunc`, before the close sound, before the
analytics event, and before the `ClassicyWindowClose` dispatch. None of those
fire when the veto cancels. The callback may return a promise, so an app can
show a save-changes alert and then decide:

```tsx
<ClassicyWindow
    id={winId}
    appId={appId}
    onBeforeClose={async () => {
        if (!dirty) return true
        return await confirmDiscard()   // your own alert
    }}
>
```

### Window order and focus

Windows stack by when they were last opened or focused, and focus follows the
same history, so a dialog an app shows and hides needs no focus bookkeeping:

- **Opening a window brings it to the front.** That applies to a brand-new
  window and to one reopened after being closed earlier in the session,
  whether it was closed with its close box or by the app no longer rendering
  it. A persisted window re-registering after a page reload does not steal
  focus.
- **Unmounting a window closes it.** A non-modal window the app stops
  rendering (e.g. a Settings dialog's Cancel button) is marked closed, exactly
  as if its close box had been clicked.
- **Closing a window refocuses the one focused before it.** Focus passes to
  the app's most recently focused open window (utility palettes excluded).

To raise a window that is already open but sitting behind others, for example
when its menu command is chosen again, dispatch `ClassicyWindowFocus` for it.
That is safe in the same click that first renders the window.

### Opening a window programmatically

`ClassicyWindowFocus` does not clear a window's `closed` flag, so focusing a
closed window does nothing visible. Open, then focus:

```tsx
dispatch({ type: "ClassicyWindowOpen",  app: { id: appId }, window: { id: windowId } })
dispatch({ type: "ClassicyWindowFocus", app: { id: appId }, window: { id: windowId } })
```

### Window ids must be unique per instance

If a component that renders a window is itself rendered more than once, derive
the window id from the instance. A shared id lets two instances collide in the
store, and the first to unmount destroys the other's entry.

```tsx
id={`myapp_rename_${documentId}`}   // not "myapp_rename"
```

---

## 6. State: the store, selectors, dispatch

The store is Zustand. The app slice is **`System.Manager.Applications`** — not
`.App`.

```ts
interface ClassicyStoreSystemApp {
    id: string
    name: string
    icon: string
    windows: ClassicyStoreSystemAppWindow[]
    open: boolean
    data?: Record<string, unknown>     // your app's state lives here
    focused?: boolean
    lastFocusedAt?: number
    lastAccessedWindowId?: string
    extension?: boolean
    debug?: boolean
    appMenu?: ClassicyMenuItem[]
    contextMenu?: ClassicyMenuItem[]
    handlesFileTypes?: ClassicyFileSystemEntryFileType[]
}
```

### Reading

Always read through a selector. Selecting the whole app record makes the
component re-render on every window interaction.

```tsx
// whole record — use only when you genuinely need windows + data + flags
const appState = useAppManager((s) => s.System.Manager.Applications.apps[appId])

// just the data bag
const appData = useAppManager((s) => s.System.Manager.Applications.apps[appId]?.data)

// a boolean — cheapest, and stable across unrelated store writes
const isOpen = useAppManager((s) => s.System.Manager.Applications.apps[appId]?.open ?? false)

// "is running" for an extension, which has no windows
const isRunning = useAppManager((s) => appId in (s.System.Manager.Applications.apps ?? {}))
```

Other useful slices:

```tsx
useAppManager((s) => s.System.Manager.Applications.focusedAppId === appId)
useAppManager((s) => s.System.Manager.DateAndTime.dateTime)
useAppManager((s) => s.System.Manager.Appearance.activeTheme.measurements.window.paddingSize)
useAppManager((s) => s.System.Manager.Desktop.disableBalloonHelp)
```

Outside React, read imperatively with `useAppManager.getState()`.

### Dispatching

```tsx
const dispatch = useAppManagerDispatch()
dispatch({ type: "ClassicyAppMyAppSetMode", mode: "grid" })
```

`useAppManagerDispatch()` returns a module-level function, so it is referentially
stable and safe in dependency arrays. Outside React, import `dispatch` directly
from `classicy`.

Dispatch takes an optional second argument, the trust level
(`"trusted"` by default). See
[AGENT-REFERENCE §6](AGENT-REFERENCE.md#6-untrusted-actions-hypercard-script-safety)
for the untrusted-action rules.

### Action creators

Export action creators next to the reducer. They keep action types in one place
and give the call site a typed signature.

```ts
export const myAppSetMode = (mode: string): ActionMessage =>
    ({ type: "ClassicyAppMyAppSetMode", mode })
```

### The one-shot command idiom

To let one app drive another (a remote control, a deep link), do not dispatch a
transient event — the receiving app may not be mounted yet. Write a command with
a monotonic sequence number into `data`, and have the receiver run it once per
new `seq`:

```ts
const nextSeq = (d: Record<string, unknown>) =>
    ((d.command as MyCommand | undefined)?.seq ?? 0) + 1

case "ClassicyAppMyAppTune":
    apps[appId].data = {
        ...appData,
        command: { seq: nextSeq(appData), kind: "tune", station: action.station },
    }
    return ds
```

---

## 7. Manifests: `registerApp`

One call declares everything the rest of the system needs to know about the app.

```ts
registerApp({
    id: "MyApp.app",
    description: "One sentence saying what this app is for.",
    prefix: "ClassicyAppMyApp",
    handler: classicyMyAppEventHandler,
    actions: { /* … */ },
    state: MyAppDataSchema,
})
```

| Field | Required | Purpose |
|---|---|---|
| `id` | yes | The app id. |
| `description` | yes | Human sentence. Becomes the desktop icon's balloon help by default, and feeds every discovery surface. |
| `prefix` | with `handler` | Action-type prefix routed to `handler`. |
| `handler` | with `prefix` | The reducer. |
| `actions` | no | Per-type `{ description, params?, scriptable? }`. |
| `state` | no | Zod schema of `apps[id].data`. Must be `z.looseObject`. |

Declaring `prefix` without `handler` (or the reverse) logs a dev warning and
registers **no** routing.

### Description-only manifests

An app with no reducer still registers a manifest. The description is the balloon
help for its desktop icon, and there is no other place to put it:

```ts
import { registerApp } from 'classicy'

registerApp({
    id: "MarketWatch.app",
    description: "Follow stock, index and bond markets.",
})
```

### Actions

```ts
actions: {
    ClassicyAppMyAppSetMode: {
        description: "Switch between list and grid presentation.",
        params: z.object({
            mode: z.enum(["list", "grid"]).describe("Presentation mode."),
        }),
    },
    ClassicyAppMyAppReset: {
        description: "Return every setting to its default.",
    },
}
```

- `params` is a zod schema for everything except `type`. It is optional — an
  action with no payload just omits it.
- `.describe()` on each field is what makes the action self-documenting.
- `scriptable: true` exposes the action to HyperCard stack scripts. It delegates
  to the untrusted-action allowlist and can never grant access past the kernel's
  guarded-route floor.

### State schema

```ts
export const MyAppDataSchema = z.looseObject({
    mode: z.enum(["list", "grid"]).optional().describe("Presentation mode."),
    selected: z.array(z.string()).optional().describe("Selected item ids."),
})
export type MyAppData = z.infer<typeof MyAppDataSchema>
```

Two hard rules:

- **`z.looseObject`, never `z.object`.** The kernel writes undeclared keys into
  `data` — the `openFiles` queue, for one — and a strict schema would reject
  legitimate state.
- **Every top-level field `.optional()`.** `data` is legitimately empty before
  the app's first action.

In development, every dispatch runs the owning app's data through its schema and
logs a warning on failure. It is **warn-only**: state is never rejected or rolled
back.

### Reading the registry

```ts
getAppManifest(appId)                    // the merged manifest, or undefined
listAppManifests()                       // every registered manifest
listScriptableActions()                  // every script-exposed action
getScriptableAction(type)
describeAppAction(appId, type)           // → { title, content }, balloon-ready
describeAppState(appId, "settings.skip") // dot-path into the state schema
parseAppData<MyAppData>(appId, raw)      // typed guard; undefined on failure
```

`parseAppData` replaces hand-rolled `isMyAppData()` functions:

```ts
const data = parseAppData<MyAppData>(appId, appState?.data) ?? {}
```

### Merging and prefix collisions

Re-registering the same id **merges additively**: a new prefix and handler are
appended, the same prefix twice is a no-op, actions merge first-wins, and the
first `state` schema wins. This is how one app can span two modules.

> **The prefix trap.** Classicy routes an action to exactly one handler — the
> **first registered prefix** that `action.type.startsWith()`. If module A
> registers `ClassicyAppPlaylist` and module B registers
> `ClassicyAppPlaylistEditor`, every `ClassicyAppPlaylistEditor…` action goes to
> A's handler, because A's prefix is a prefix of B's. Registering the same
> prefix twice does not help either: the registry keeps the first and drops the
> second without complaint. Pick prefixes that are not prefixes of each other,
> and add a test:
>
> ```ts
> it("registers no prefix that is a prefix of another", () => {
>     const overlaps = prefixes.flatMap((a) =>
>         prefixes.filter((b) => b !== a && b.startsWith(a)).map((b) => `${a} swallows ${b}`))
>     expect(overlaps).toEqual([])
> })
> ```

When one app spans two modules, only the primary module declares `state`:

```ts
// flightTrackerCommands.ts — secondary module
registerApp({
    id: "FlightTracker.app",
    description: "…",
    prefix: "ClassicyAppFlightRemote",
    handler: flightRemoteHandler,
    actions: { /* … */ },
    // State schema intentionally omitted: flightMapSettings.ts is the primary
    // module and its schema covers this data. First state schema wins.
})
```

`registerAppEventHandler` and `registerClassicyUntrustedActionAllowlist` still
work but are deprecated. Use `registerApp`.

---

## 8. Reducers

A reducer takes the store and an action and returns the store. It runs inside
Immer, so mutate the draft in place.

```ts
import type { ActionMessage, ClassicyStore } from 'classicy'

export const classicyMyAppEventHandler = (ds: ClassicyStore, action: ActionMessage) => {
    const apps = ds.System.Manager.Applications.apps
    if (!apps[appId]) return ds
    const appData = apps[appId].data ?? {}

    switch (action.type) {
        case "ClassicyAppMyAppSetMode":
            apps[appId].data = { ...appData, mode: action.mode }
            return ds

        case "ClassicyAppMyAppReset":
            apps[appId].data = {}
            return ds

        default:
            return ds
    }
}
```

Notes:

- **Return `ds` from every branch,** including `default`. A reducer that returns
  nothing wipes the store.
- **Guard on the app existing.** The reducer can run before the component mounts.
  A reducer that must work before mount can call `loadApp(ds, id, name, icon)`
  itself — that is what the bundled Picture Viewer does.
- A reducer may write into **another** app's `data`. That is a legitimate way to
  build a cross-app bridge; just omit `state` from that manifest, since the
  handler does not own its own app's data.

### Action routing order

`classicyDesktopStateEventReducer` routes by prefix, in this order:

1. Trust gate (untrusted actions are filtered here)
2. `ClassicyWindow*`
3. `ClassicyDesktopIcon*`
4. `ClassicyDesktop*`
5. `ClassicyBootParadeIcon*`
6. `ClassicyManagerDateTime*`
7. `ClassicyShortcut*`
8. **First registered plugin prefix** that the type starts with — your reducer
9. The generic `ClassicyApp*` handler (app open/close/focus, and the
   `…OpenFile` / `…CloseFile` fallbacks)
10. A `Unhandled action type` warning

---

## 9. Menus

Menu items are **plain data**, not components.

```ts
interface ClassicyMenuItem {
    id: string
    title?: string
    image?: string
    icon?: string
    disabled?: boolean
    checked?: boolean               // renders ✓ in the left gutter
    keyboardShortcut?: string
    nativeShortcut?: boolean        // browser handles it; do not intercept
    titleWidthSamples?: string[]    // reserve width for a title that changes
    link?: string
    event?: string
    eventData?: Record<string, unknown>
    onClickFunc?: () => void
    menuChildren?: ClassicyMenuItem[]
    className?: string
    balloon?: { title?: string; content: string; position?: ClassicyBalloonPosition }
}
```

`{ id: "spacer" }` is the separator.

### An app menu

```tsx
const appMenu = useMemo(() => [{
    id: `${appId}_file`,
    title: "File",
    menuChildren: [
        { ...aboutMenuItem, title: `About ${appName}` },
        { id: "spacer" },
        {
            id: `${appId}_save`,
            title: "Save",
            keyboardShortcut: "S",
            disabled: !dirty,
            onClickFunc: save,
        },
        {
            id: `${appId}_status`,
            title: "Status",
            menuChildren: [
                { id: "st_draft", title: "Draft", checked: status === "draft",
                  onClickFunc: () => setStatus("draft") },
                { id: "st_pub", title: "Published", checked: status === "published",
                  onClickFunc: () => setStatus("published") },
            ],
        },
        { id: "spacer" },
        quitMenuItemHelper(appId, appName, appIcon),
    ],
}], [aboutMenuItem, dirty, status])

<ClassicyWindow appMenu={appMenu} /* … */ >
```

> **Memoize `appMenu`.** `ClassicyWindow` writes it to the store behind a
> structural signature guard. An inline array literal defeats the guard and has
> previously caused render loops. The same applies to `contextMenu` and
> help-menu arrays.

> **Omitting `appMenu` does not clear the menu bar.** The focus reducer falls
> back to the window's stored `menuBar`. A window that should have no app menu
> must pass an explicit empty structure, not nothing.

### Menu helpers

```ts
quitAppHelper(appId, appName, appIcon)                    // → ActionMessage
quitMenuItemHelper(appId, appName, appIcon)               // → ClassicyMenuItem
closeWindowMenuItemHelper(id, onClickFunc)
closeAllWindowsMenuItemHelper(id, onClickFunc)
```

### Menu hooks

```ts
useClassicyAboutMenu(appId, appName, appIcon)  // → { aboutMenuItem, aboutWindow }
useClassicyWindowClose(appId)                  // → (windowId, appCleanupAction) => void
useClassicyHelpMenu(appId, items)              // items MUST be memoized
useClassicyEditMenu(idPrefix)                  // → a standard Edit menu item
```

`useClassicyAboutMenu` returns both a menu item and the window that renders it.
Put the item in your File menu and render `aboutWindow` as a `ClassicyApp` child:

```tsx
const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(appId, appName, appIcon)
// …
<ClassicyApp /* … */>
    <ClassicyWindow appMenu={appMenu} /* … */>{/* … */}</ClassicyWindow>
    {aboutWindow}
</ClassicyApp>
```

`ClassicyDesktopMenuBar` hoists the About entry into the Apple menu and strips it
from your File menu before rendering, so listing it in File is correct.

### Balloon help on menu items

Menu items are data, so balloon help rides along as the `balloon` field rather
than a `<ClassicyBalloonHelp>` wrapper. Wrappers are for JSX controls.

```ts
{
    id: `${appId}_copy_link`,
    title: "Copy Link",
    disabled: status !== "published",
    balloon: { title: "Copy Link", content: "Publish the document first." },
    onClickFunc: copyLink,
}
```

Layer help onto a helper-built item by spreading it:

```ts
const quitMenuItem = {
    ...quitMenuItemHelper(appId, appName, appIcon),
    balloon: { title: "Quit", content: `Close ${appName}.` },
}
```

### Contextual menus

Right-click menus resolve innermost-first:

`ClassicyContextualMenuTarget` → window `contextMenu` → app `contextMenu` →
desktop default (empty desktop only).

```tsx
<ClassicyContextualMenuTarget menuItems={[{ id: "copy", title: "Copy" }]}>
    <ClassicyButton>Copy</ClassicyButton>
</ClassicyContextualMenuTarget>
```

Every layer checks `e.defaultPrevented`, so a control with its own right-click
behavior calls `e.preventDefault()` and stays silent. Right-clicking a window
focuses it first, so the menu always tracks focus.

To open a menu at an arbitrary point yourself:

```tsx
<ClassicyContextualMenu
    name="myapp_dropdown"
    position={[x, y]}
    menuItems={items}
    onClose={close}
/>
```

### Menu bar extensions

Put an icon in the right-hand menu-bar tray:

```tsx
<ClassicyMenuBarExtension id="myapp_menu" order={1} title={appName} menuItems={items}>
    <img src={appIcon} alt={appName} />
</ClassicyMenuBarExtension>
```

Props: `id`, `order` (default `0`), `icon`, `title`, `menuItems`, `onClick`,
`children`.

---

## 10. Icons

Register icons **once, at module scope**, before anything renders.

```tsx
import { ClassicyIcons, registerClassicyIcons } from 'classicy'
import appIconPng from './my-app.png'

// registerClassicyIcons assigns shallowly, so spread the existing namespace to
// keep the bundled app icons (and other apps' registrations) intact.
const ICONS = registerClassicyIcons({
    applications: {
        ...ClassicyIcons.applications,
        myApp: { app: appIconPng, doc: docPng },
    },
})

const appIcon = ICONS.applications.myApp.app
```

Bundled icons are available directly:

```ts
ClassicyIcons.system.files.document
ClassicyIcons.system.folders.directory
ClassicyIcons.system.drives.disk
ClassicyIcons.system.macos
```

Override the alias-badge artwork by registering your own `system.alias` entry.

---

## 11. Files

### Letting Finder open files with your app

Declare the types you handle:

```tsx
<ClassicyApp
    id={appId}
    name="MyApp"
    icon={appIcon}
    handlesFileTypes={[ClassicyFileSystemEntryFileType.Markdown]}
>
```

When the user opens a matching file, Finder dispatches
`` `ClassicyApp${name}OpenFile` ``. Unless you registered a reducer for that
type, it lands in the generic handler, which appends the path to
`apps[id].data.openFiles` and opens the app.

By default `ClassicyApp` then renders one plain window per queued path. To render
your own windows instead, set `handlesOwnFiles` and read the queue:

```tsx
<ClassicyApp id={appId} name="MyApp" icon={appIcon} handlesOwnFiles={true}>
    {openFiles.map((path, idx) => (
        <ClassicyWindow
            key={`${appId}_file_${path}`}
            id={`${appId}_file_${path}`}
            appId={appId}
            title={path.split(":").pop() || path}
            onCloseFunc={() => dispatch({
                type: `ClassicyAppMyAppCloseFile`, app: { id: appId }, path,
            })}
        >
            {/* your renderer */}
        </ClassicyWindow>
    ))}
</ClassicyApp>
```

Keep the `` `${appId}_file_${filePath}` `` id convention. Window ids containing a
filesystem separator (`:` or `/`) collapse to `/file` in analytics, which is what
keeps user file names out of pageview paths.

### The file system API

```ts
const fs = useClassicyFileSystem()     // default key "classicyStorage", separator ":"
```

Paths use colons: `"Macintosh HD:Documents:Read Me"`.

| Method | Purpose |
|---|---|
| `readFile(path)` | Contents, or `undefined`. |
| `writeFile(path, data, metadata?)` | Returns `false` on a rejected path. |
| `mkDir(path)` / `rmDir(path)` | Create / remove a folder. |
| `setMetadata(path, patch)` | The **only** way to change metadata. Returns `false` if the path does not resolve. |
| `resolve(path)` | The entry. Returns `undefined` on a miss despite its declared type. |
| `statFile(path)` / `statDir(path)` | Async entry info. |
| `size(path)` / `calculateSizeDir(path)` | Async byte counts. |
| `hash(path)` | Content hash. |
| `filterByType(path, types, showInvisible, notCreatedAfter)` | Filtered listing. |
| `countVisibleFiles(path)` / `countInvisibleFilesInDir(path)` | Counts. |
| `formatSize(bytes, measure, decimals)` | Human-readable size. |
| `snapshot()` / `load(json)` / `persist()` | Whole-tree serialization. |
| `flushNow()` / `flushNowAsync()` | Force a write. |
| `buildSnapshot()` / `reconcileWithAdapters()` | Sync-adapter plumbing. |

**Never mutate `fs.fs` or an entry directly.** Every mutation must flow through
these methods, or sync adapters will not see it. `writeFile` and `mkDir` reject
any path containing `__proto__`, `constructor`, or `prototype`.

### Seeding a file system

```tsx
<ClassicyAppManagerProvider
    defaultFileSystem={{
        "Macintosh HD": {
            _type: "drive",
            _icon: ClassicyIcons.system.drives.disk,
            Documents: {
                _type: "directory",
                "Read Me.txt": { _type: "text_file", _mimeType: "text/plain", _data: "Hi" },
            },
        },
    }}
    defaultFileSystemMode="exclusive"   // or "merge" (default)
>
```

`"merge"` deep-merges onto the library's default tree; `"exclusive"` replaces it.
Both are seed-only — they apply when nothing is stored under
`localStorage["classicyStorage"]`. `defaultFileSystemSeedMigrations` applies
one-time corrections to a **returning** visitor's persisted tree.

### Mirroring to a backend

```ts
registerClassicyFileSystemAdapter({
    id: 'my-backend',
    onChange: (entry) => {},        // journal mode: every mutation, sequenced
    onSnapshot: (snapshot) => {},   // snapshot mode: debounced tree + sha256
    reconcile: async (local) => ({ action: 'useLocal' }),   // or { action: 'replace', tree }
}, { snapshotDebounceMs: 500 })
```

All methods are optional. Errors always degrade to local-wins. Derived folders
(Applications, Extensions) are applied through `applyDerivedTree()` and never
journal.

---

## 12. Dialogs and alerts

### Alerts

An alert contains **only** an icon, text, and buttons. Anything with a text field
or a control is a window, not an alert.

```tsx
<ClassicyAlert
    id="myapp_confirm"
    appId={appId}
    alertType="caution"          // "note" | "caution" | "stop"
    title="My App"
    label="Discard changes?"
    message="Your edits will be lost."
    buttons={[
        { id: "cancel", label: "Cancel", role: "cancel", onClick: keep },
        { id: "discard", label: "Discard", role: "default", onClick: discard },
    ]}
    defaultButtonId="cancel"
    movable={false}
    onClose={close}
/>
```

Button roles: `default` (Return triggers it, gets the ring), `cancel`
(Escape / Command-period), `help` (far left), `normal`. Omit `buttons` and a
sensible set is generated from `alertType`.

> **`onClose` fires after *every* button**, in addition to that button's own
> `onClick`. A handler pair that undoes itself is a real failure mode here.

### File dialogs

```tsx
const volumes = useMemo(() => [desktopVolume(fs), fileSystemVolume(fs, "Macintosh HD")], [fs])

<ClassicyFileOpenDialog
    id="myapp_open"
    appId={appId}
    open={dialogOpen}
    title="Open"
    volumes={volumes}
    selectionMode="single"        // or "multi"
    fileTypeFilters={[{ label: "Text", types: ["text_file", "markdown"] }]}
    onOpenFunc={handleOpen}
    onCancelFunc={() => setDialogOpen(false)}
/>
```

### Forms

```tsx
<ClassicyForm layout="dialog" onSubmitFunc={submit}>
    <ClassicyInput id="title" labelTitle="Title" labelPosition="left"
                   prefillValue={title} onChangeFunc={(e) => setTitle(e.target.value)} />
    <ClassicyFormButtonRow>
        <ClassicyButton onClickFunc={cancel}>Cancel</ClassicyButton>
        <ClassicyButton buttonType="submit" isDefault disabled={!title}>OK</ClassicyButton>
    </ClassicyFormButtonRow>
</ClassicyForm>
```

Submitting never navigates.

---

## 13. Balloon help

Wrap any element:

```tsx
<ClassicyBalloonHelp content="Click to open" title="Open File" position="top-left">
    <ClassicyButton>Open</ClassicyButton>
</ClassicyBalloonHelp>
```

`position` is one of `top-left | top-center | top-right | bottom-left |
bottom-center | bottom-right` (default `top-left`); `delay` is the hover delay in
ms (default `600`). The balloon renders through a portal into `#classicyDesktop`,
so no parent can clip it.

The wrapper is `position: relative; display: inline-block`. When that breaks the
layout — an absolutely positioned element, for one — use the hook instead, which
adds no DOM:

```tsx
const { handlers, balloon } = useClassicyBalloonHelp(anchorRef, { content: "…" })
return <div ref={anchorRef} {...handlers}>{children}{balloon}</div>
```

Balloon help is globally switchable with
`dispatch({ type: 'ClassicyDesktopSetBalloonHelp', disableBalloonHelp: true })`.

For the app's desktop icon, do nothing: the manifest `description` is the balloon.

---

## 14. Sound

Route sound through the dispatcher, not a raw `Audio` element. The dispatcher
honors the Sound control panel's volume, the global mute, and the per-sound
disable list.

```tsx
import { ClassicySoundActionTypes, useSoundDispatch } from 'classicy'

const player = useSoundDispatch()
player({ type: ClassicySoundActionTypes.ClassicySoundPlay, sound: "ClassicyBeep" })
```

`ClassicySoundPlay` is skipped when something is already playing;
`ClassicySoundPlayInterrupt` stops the current sound first. `sound` is a sprite
key from the active sound theme.

For the user's chosen alert sound, use `useClassicyAlertSound()`, which returns a
zero-argument function.

---

## 15. Analytics

```tsx
const { track, page } = useClassicyAnalytics()
track('document_saved', { size })
```

Both functions are referentially stable and become silent no-ops without an
`AnalyticsProvider`. Event names get the `eventPrefix` (default `classicy_`);
pageview paths do not.

`ClassicyWindow` emits a pageview when a window becomes open and when an open
window gains focus. Paths are derived as `/<app>/<window>`. A window id
containing `:` or `/` collapses to `/file` or `/folder`, because those are
assumed to be user data.

**That collapse is syntactic.** If your app builds a window id from user or
consumer data with no separator in it, pass `analyticsPath` explicitly — only the
app knows a segment is user data. Build it with the helper so the app segment
stays in sync:

```tsx
<ClassicyWindow analyticsPath={classicyWindowPagePath(appId, "document")} />
<ClassicyWindow analyticsExclude />
```

The window **title** is sent verbatim, user file names included. That is a
deliberate trade for readable content reports; the path is what stays clean.

---

## 16. Extensions and global shortcuts

An extension is a background app: always open, no desktop icon, no Applications
entry, no Apple-menu entry, never focused, usually no window. Use one for a
bridge, a listener, or a poller.

```tsx
<ClassicyApp id="MyBridge.app" name="MyBridge" icon={appIcon} extension addSystemMenu={false}>
    {/* usually nothing, or an alert */}
</ClassicyApp>
```

`icon` is still required even though nothing renders it. Reuse a bundled icon
rather than shipping an asset that is never shown.

Select on a boolean for an extension. The full `apps[appId]` object changes
reference on unrelated window interactions, and an extension has no windows to
care about:

```tsx
const isRunning = useAppManager((s) => appId in (s.System.Manager.Applications.apps ?? {}))
```

Global keyboard shortcuts are honored **only** for extensions:

```tsx
<ClassicyApp
    id="MyBridge.app" name="MyBridge" icon={appIcon} extension
    globalShortcuts={[
        { shortcut: "⌘⇧K", event: "ClassicyAppMyBridgeToggle", eventData: { source: "key" } },
    ]}
>
```

Each is canonicalized and registered on mount (first registrant wins) and
unregistered on unmount.

---

## 17. Persistence

The store is written to `localStorage["classicyDesktopState"]`, debounced 500 ms,
on every change. The file system is written to `localStorage["classicyStorage"]`.

Consequences for an app author:

- **Everything under `apps[id].data` must survive a JSON round-trip.** No
  functions, no class instances, no `Date` objects. The same applies to desktop
  icon records.
- **Menu `onClickFunc` handlers do not survive persistence.** That is why
  `loadApp` overwrites `contextMenu` on every remount.
- **Session-only or sensitive data needs stripping.**
  `sanitizeStateForPersistence` is the single place that knows which keys to drop
  before the write. There is no per-app opt-out hook — if your app stores
  ephemeral or private data under `apps[id].data`, that function has to learn
  about it.
- **Persisted state beats `defaultState`.** To reset during development, clear
  `localStorage["classicyDesktopState"]` — or drag the desktop's Trash icon,
  which does exactly that and reloads.

---

## 18. Testing

### Never mock the manifest registry when testing it

```ts
// Deliberately NO vi.mock("classicy"): these tests exercise the real registry
// that each context module writes into at import time.
import { getAppManifest, listScriptableActions } from 'classicy'
import './Applications/MyApp/MyAppContext'    // runs registerApp()

it("registers a description", () => {
    expect(getAppManifest("MyApp.app")?.description).toBeTruthy()
})
```

A table-driven test over `[appId, prefixes, action types, hasState]` catches a
renamed action or a dropped schema cheaply. Add the prefix-overlap guard from
[§7](#7-manifests-registerapp).

### Prefer partial mocks

A full-replacement `vi.mock("classicy")` must stub every registration side effect
the import graph touches — `registerApp`, `registerClassicyIcons`,
`getAppManifest`, `describeAppState` — and breaks whenever an import is added.
Spread the original instead:

```tsx
vi.mock("classicy", async (importOriginal) => ({
    ...(await importOriginal<typeof import("classicy")>()),
    useAppManagerDispatch: () => dispatchMock,
    ClassicyWindow: ({ children, id, appMenu, onCloseFunc, title }) => {
        if (appMenu) menus.current = appMenu       // capture the menu for assertions
        if (id && onCloseFunc) closeFns.current[id] = onCloseFunc
        return <div data-testid={`win-${id}`} data-title={title}>{children}</div>
    },
}))
```

When a full replacement is unavoidable, the reusable `useAppManager` stub is
`(sel) => sel(fakeStore)`:

```tsx
useAppManager: (sel: (s: unknown) => unknown) =>
    sel({ System: { Manager: { DateAndTime: { dateTimeLocked: false } } } }),
registerApp: () => {},
```

### End-to-end selectors

Classicy chrome exposes stable hooks:

```ts
page.locator(".classicyDesktop")
page.getByRole("button", { name: "My App" }).dblclick()   // desktop icon
page.getByRole("application", { name: "My App" })          // a window
expect(win).toHaveClass(/classicyWindowActive\b/)          // vs classicyWindowInactive
page.locator(".classicyWindowCloseBox").click()
```

> ARIA name computation folds every descendant `menuitem`'s text into the
> top-level item's own name, so a substring match on a menu title matches both
> the parent and the child. Use `{ exact: true }`.

jsdom needs `IntersectionObserver`, `ResizeObserver`, and `localStorage` stubs in
the vitest setup file — Classicy uses all three.

---

## 19. Checklist and known traps

**Before you ship an app:**

- [ ] The id ends in `.app` and the `name` is a single word.
- [ ] A manifest is registered at module load, with a `description`.
- [ ] The `state` schema is a `z.looseObject` with `.optional()` top-level fields.
- [ ] The action prefix is not a prefix of another registered prefix.
- [ ] `appMenu`, `contextMenu`, and help-menu arrays are memoized.
- [ ] Window ids are unique per instance, not per component.
- [ ] Everything written to `apps[id].data` is JSON-safe.
- [ ] Store reads go through narrow selectors.
- [ ] Ephemeral or private `data` keys are handled in `sanitizeStateForPersistence`.

**Traps, in one place:**

| Symptom | Cause |
|---|---|
| Every dispatch throws after boot | `ClassicyDesktop` was lazy-loaded a tick after the provider. Import it eagerly. |
| `No handler registered for prefix` | The manifest module is not in the import graph. Import it for its side effect. |
| Actions reach the wrong reducer | A registered prefix is a prefix of yours. First match wins. |
| Registering the same prefix twice does nothing | The registry keeps the first and drops the second silently. |
| Render loop when a window mounts | `appMenu` is an inline array literal. Memoize it. |
| The menu bar shows a stale menu | Omitting `appMenu` falls back to the window's stored `menuBar`. |
| A file-open action never reaches the reducer | The app `name` contains a space, so the derived action type does too. |
| Focusing a window does nothing | The window is closed. Dispatch `ClassicyWindowOpen` first. |
| Two windows fight over one store entry | A shared window id across component instances. |
| An icon persists after the app is removed | Icons persist to `localStorage`; turning both icon surfaces off dispatches the removal. |
| State change is ignored after reload | Persisted state beats `defaultState`. Clear `classicyDesktopState`. |
| A desktop icon has no balloon help | The manifest has no `description`. |
| Schema warnings in the console | Dev-only manifest validation. Warn-only — state is never rejected. |
