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

---

## 1. Installation & Setup

```bash
npm install classicy react react-dom zustand immer @tanstack/react-table react-player
```

Every export comes from the package root (a flat barrel). CSS must be imported
separately:

```ts
import 'classicy/dist/classicy.css'  // required styles
import 'classicy/dist/fonts.css'     // OPT-IN: bundled base64 fonts. Skip if you supply your own fonts.
```

Package `exports` map:

| Specifier | Resolves to |
|---|---|
| `classicy` | ES/UMD bundle + types |
| `classicy/dist/classicy.css` | Required stylesheet |
| `classicy/dist/fonts.css` | Opt-in bundled `@font-face` rules |
| `classicy/dist/*` | Anything in dist |
| `classicy/scss/*` | Raw SCSS partials (theme styles) |

### Minimal app

```tsx
import 'classicy/dist/classicy.css'
import 'classicy/dist/fonts.css'
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
| `defaultFileSystemMode` | `"merge" \| ...` | `"merge"` | How the seed combines with stored state |
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
            Appearance:   // availableThemes, activeTheme, alertSound
            DateAndTime:  // dateTime, timeZoneOffset, display flags, bounds
            Boot:         // paradeIcons
            Keyboard:     // app/system/global shortcut registries
        }
    }
}
```

Note: the app slice is `System.Manager.Applications` (not `.App`). Each app is
`{ id, name, icon, windows[], open, focused?, data?: Record<string, unknown>, ... }` —
`data` is your app's private state bag, written by your event handler.

### Dispatching

```tsx
import { useAppManagerDispatch } from 'classicy'

const dispatch = useAppManagerDispatch()
dispatch({ type: 'ClassicyAppOpen', app: { id: 'MyApp.app', name: 'My App', icon } })
```

`dispatch(action, trust?)` routes the action through
`classicyDesktopStateEventReducer` inside an immer `produce`. The optional
second argument is `"trusted"` (default) or `"untrusted"` (see §6).

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
| `ClassicyDesktopChangeTheme` | `{ activeTheme: "<themeId>" }` | Switch theme |
| `ClassicyDesktopLoadThemes` | `{ availableThemes: ClassicyTheme[] }` | Replace the theme list |
| `ClassicyDesktopChangeBackground` | `{ backgroundImage }` | Set wallpaper |
| `ClassicyDesktopSetBalloonHelp` | `{ disableBalloonHelp: boolean }` | Toggle balloon help globally |

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
| `initialSize` / `minimumSize` | `[w, h]` | `[350, 0]` / `[300, 0]` (0 = auto) |
| `initialPosition` | `[x, y]` | `[110, 110]` |
| `windowType` | `"document" \| "utility"` | `"document"` |
| `zoomMode` | `"full" \| "horizontal" \| "vertical"` | `"full"` |
| `headerVariant` | `"standard" \| "list"` | `"standard"` |
| `header` / `placard` | `ReactNode` | — |
| `appMenu` / `contextMenu` | `ClassicyMenuItem[]` | — |
| `alwaysOnTop` / `contentFrame` / `dimContents` | `boolean` | `false` / `false` / `true` |
| `analyticsPath` / `analyticsExclude` | `string` / `boolean` | derived / `false` (see §9) |
| `onCloseFunc` | `(id: string) => void` | — |
| `backgroundColor` | `string` | — |

**`ClassicyWindowFrame`** — presentational chrome only (no store coupling;
usable pre-boot): `title?`, `children` *, `className?`, `width?`.

### 4.2 Buttons & toggles

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyButton` | `isDefault?`, `disabled?`, `onClickFunc?`, `buttonShape? ("rectangle"\|"square")`, `buttonSize? ("medium"\|"small")`, `buttonType?`, `padding?/margin? ("sm"\|"md"\|"lg"\|"xl")` | forwardRef to `<button>`; accepts remaining button HTML attrs |
| `ClassicyBevelButton` | `mode? ("push"\|"toggle"\|"radio"\|"popup")`, `bevelWidth? ("small"\|"medium"\|"large")`, `icon?`, `on?`, `mixed?`, `onChangeFunc?(on)`, `popupArrow?`, `popupDirection?` | auto-squares inside a toolbar |
| `ClassicyButtonToolbar` / `ClassicyButtonToolbarGroup` | `children` *, `className?` | auto dividers between groups; roving-tabindex keyboard nav |
| `ClassicyCheckbox` | `id` *, `checked?`, `mixed?`, `disabled?`, `onClickFunc?(checked)`, `label?`, `labelPosition?` | |
| `ClassicyRadioInput` | `name` *, `inputs` * (`{id, label?, checked?, disabled?}[]`), `onClickFunc?(id)`, `align? ("rows"\|"columns")`, `label?` | |
| `ClassicyDisclosure` | `direction?`, `label?`, `children` | collapsible section |
| `ClassicyTriangle` | `direction?`, `open?`, `defaultOpen?`, `onToggle?`, `interactive?` | disclosure triangle primitive |

### 4.3 Text & value inputs

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyInput` | `id` *, `onChangeFunc?`, `onEnterFunc?`, `labelTitle?`, `labelPosition?`, `placeholder?`, `prefillValue?`, `type?`, `disabled?` | forwardRef to `<input>` |
| `ClassicySpinner` | `id` *, `minValue? (0)`, `maxValue?`, `prefillValue?`, `onChangeFunc?` | number field with little arrows |
| `ClassicyLittleArrows` | `onStep(dir: 1\|-1)` *, `disabled?` | standalone stepper, press-and-hold repeat |
| `ClassicySlider` | `id` *, `value` *, `min?/max?/step?`, `orientation?`, `onChangeFunc?`, `onCommitFunc?(value)`, `tickInterval?`, `tickLabels?`, `snapToTicks?`, `ghost?` | |
| `ClassicyTextEditor` | `content?`, `prefillValue?`, `onChangeFunc?`, `autoHeight?`, `border?`, `labelTitle?` | plain textarea |
| `ClassicyRichTextEditor` | `content` *, `onChangeFunc?(markdown)`, `editorRef?` | MDXEditor-backed markdown |
| `ClassicyFileInput` | `id` *, `accept?`, `multiple?`, `maxFiles?`, `maxFileSizeMb?`, `onChangeFunc?(files: File[])` | forwardRef handle `{ addFiles(File[]) }` |
| `ClassicyDatePicker` | `id` *, `onChangeFunc?(date)`, `prefillValue?`, `minValue?/maxValue?` | defaults to store date/time |
| `ClassicyTimePicker` | `id` *, `onChangeFunc?(date)`, `prefillValue?`, `minValue?/maxValue?` | |
| `ClassicyPopUpMenu` | `id` *, `options` * (`{value, label, icon?}[]`), `selected?`, `onChangeFunc?`, `size? (incl. "mini")`, `label?`, `disabled?` | Platinum select |

### 4.4 Labels, grouping, display

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyControlLabel` | `label?`, `labelFor?`, `labelSize?`, `icon?`, `direction?`, `disabled?` | renders nothing when label empty |
| `ClassicyControlGroup` | `children` *, `label?`, `variant? ("primary"\|"secondary")`, `checkboxTitle?`, `popUpMenuTitle?`, `columns?`, `layout? ("default"\|"form")` | fieldset-style group; title can be a checkbox or popup |
| `ClassicySeparator` | `orientation?` | |
| `ClassicyPlacard` | `menuItems?`, `onSelect?(id)`, `onClick?` | window-corner placard |
| `ClassicyImageWell` | `src?`, `onDrop?(files, e)`, `selected?`, `enabled?` | drag-and-drop image slot |
| `ClassicyProgressBar` | `value?`, `max? (100)`, `indeterminate?`, `chasingArrows?`, `label?` | barber-pole when indeterminate |
| `ClassicyTabs` | `tabs` * (`{title?, icon?, children}[]`) | |
| `ClassicyTree` | `nodes` *, `selectionMode? ("none"\|"single"\|"multi")`, `selectedIds?`, `onSelectNode?`, `onActivateNode?`, `onToggleNode?` | hierarchical list |
| `ClassicyPager` | `page` *, `pageCount` *, `onPageChange` * | Apple Guide page control |
| `ClassicySpinner` | see inputs | |
| `ClassicyIcon` | `appId` *, `name` *, `icon` *, `label?`, `initialPosition?`, `holder?`, `invisible?` | draggable icon (non-desktop surfaces) |

### 4.5 Menus

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyMenu` | `name` *, `menuItems` * | renders a menu list; items support submenus via `menuChildren` |
| `ClassicyMenuProvider` | `children` *, `onClose?`, `startActive?` | menu interaction state |
| `ClassicyContextualMenuTarget` | `menuItems` *, `children` | attach a right-click menu to any element |
| `ClassicyContextualMenu` | `name` *, `position` *, `menuItems` * | low-level; usually not used directly |
| `useClassicyContextualMenu()` | → `{ showContextMenu(items, [x, y]), hideContextMenu() }` | imperative API |
| `ClassicyDesktopMenuBar` | (no props) | rendered by `ClassicyDesktop` |
| `ClassicyMenuBarExtension` | `id` *, `order?`, `icon?`, `title?`, `menuItems?`, `onClick?` | add a right-side menu bar item (like the clock) |

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
| `ClassicyAlert` | `label` *, `alertType? ("note"\|"caution"\|"stop")`, `title?`, `message?`, `buttons?` (max 4, `{id, label, role?, onClick?}`), `movable?`, `onClose?` | modal alert window; plays the alert sound |
| `ClassicyFileOpenDialog` | `id` *, `appId` *, `open` *, `volumes` *, `onOpenFunc(selections)` *, `selectionMode?`, `fileTypeFilters?`, `onCancelFunc?` | |
| `ClassicyFileSaveDialog` | `id` *, `appId` *, `open` *, `volumes` *, `formats` *, `onSaveFunc(saved)` *, `defaultFileName?`, `onErrorFunc?` | |
| `ClassicyColorPickerDialog` | `id` *, `open` *, `initialColor?`, `onSelectFunc?(color: number)`, `onCancelFunc?`, `crayons?` | |
| `ClassicyColorPicker` | `id` *, `value?`/`defaultValue?` (int color), `onChangeFunc?(color)`, `labelTitle?` | swatch control that opens the dialog |
| `ClassicyAboutWindow` | `appId` *, `appName` *, `appIcon` *, `hideFunc` * | standard About box |
| `ClassicyAssistant` | `pages` * (`{title, content, buttons?, canAdvance?}[]`), `buttons?`, `page?`/`onPageChange?` | setup-assistant flow |

File dialog volumes: build with `desktopVolume()` or `fileSystemVolume()`
(both exported), or implement `ClassicyFileDialogVolume { id, label, icon?, list(path), write?(), mkDir?() }`.

Color sub-pickers are individually exported (`ClassicyColorPickerRGB`, `HSV`,
`HLS`, `CMYK`, `Crayon`, `ClassicyColorWheel`) along with conversion utils
(`intToRgb`, `rgbToHsv`, …) and the `MAC_OS_8_CRAYONS` palette. Colors are
plain integers (`0xRRGGBB`).

### 4.7 Desktop & shell

| Component | Key props (\* = required) | Notes |
|---|---|---|
| `ClassicyDesktop` | `children?`, `startupScreen? (true)`, `startupDuration? (4000)`, `preBootScreen?((powerOn) => ReactNode)` | the desktop surface; mounts menu bar + contextual menu provider |
| `ClassicyDesktopIcon` | `appId` *, `appName` *, `icon` *, `kind?`, `label?`, `event?`/`eventData?`, `onClickFunc?`, `noLaunch?`, `contextMenu?`, `balloonHelp?` | usually created for you by `ClassicyApp` |
| `ClassicyCrashScreen` | `children?` | error boundary → Sad Mac screen; wrap your desktop in it |
| `ClassicyBoot` / `ClassicyBootSequence` / `ClassicyStartupScreen` | see source | boot parade; normally managed by `ClassicyDesktop` |
| `ClassicyDesktopMenuWidgetSound` / `ClassicyDesktopMenuWidgetTime` | `hide?` / none | stock menu bar widgets |

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
optional: `subtitlesUrl`, `autoPlay`, `hideControls`, `controlsDocked`,
`muted`, `playing`/`onPlayingChange`, `volume`/`onVolumeChange`,
`captionsEnabled`/`onCaptionsEnabledChange`, `captionStyle`, `onMediaElement`,
`crossOrigin`, `playsInline`) plus the individual controls:
`QuickTimePlayPauseButton`, `QuickTimeFullscreenButton`, `QuickTimeSeekBar`,
`QuickTimeVolumeControl`, `QuickTimeCaptionsOverlay`, and hooks
`useQuickTimePlayback`, `useQuickTimeSubtitles`, `useControllableState`.

### 4.10 Built-in apps (mount as children of `ClassicyDesktop`)

| Component | Purpose | Props |
|---|---|---|
| `Finder` | The Finder (file browsing, trash, Applications) | none |
| `ClassicyControlPanels` | Mounts Appearance, Date & Time, Drive Setup, Sound panels | none |
| `SimpleText` | Text editor | none |
| `HyperCard` | Stack player (+ `HyperCard/Editor/*` authoring UI) | none |
| `PDFViewer` | PDF viewer | none |
| `MoviePlayer` | QuickTime movie player | none |
| `QuickTimePictureViewer` | Picture viewer | none |
| `WebViewer` | Web browser | none |
| `AppleGuide` | Help system extension | none |
| `FinderAboutThisComputer` | About This Computer window | none |

`ClassicyAppManagerProvider` mounts SimpleText, PDF Viewer, Movie Player,
Picture Viewer, HyperCard, and Web Viewer support automatically — the
`disable*` provider props turn them off.

---

## 5. Icon Registration

```ts
import { registerClassicyIcons, ClassicyIcons } from 'classicy'
import tvIcon from './tv.png'

// At app entry, ONCE, before rendering. Returns the argument fully typed.
export const AppIcons = registerClassicyIcons({
    myApp: { app: tvIcon },
})
// Later: AppIcons.myApp.app  — or ClassicyIcons.myApp.app (untyped)
```

- `registerClassicyIcons` merges into the shared `ClassicyIcons` object
  (`Object.assign`), so you can also **override** stock entries — e.g. register
  your own `system: { alias: myArrow }` to replace the alias badge artwork.
- Stock namespaces on `ClassicyIcons`: `classicy`, `applications`,
  `controlPanels`, `system` (incl. `system.alias`, trash, drives), `ui`.
- Icon values are URL strings (imports resolve via your bundler).

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
`mkDir`, `rmDir`, `load`, `setMetadata`) — never touch `fs.fs` or entries
directly.

Browse UI: `ClassicyFileBrowser` (`fs` *, `path` *, `appId` *,
`display? ("icons"|"list")`, `dirOnClickFunc?`, `fileOnClickFunc?`), with
`ClassicyFileBrowserViewIcons` / `ClassicyFileBrowserViewTable` as the
individual views.

### Mirroring to a backend

```ts
import { registerClassicyFileSystemAdapter } from 'classicy'

registerClassicyFileSystemAdapter({
    id: 'my-backend',
    // journal mode: every mutation, with a persisted monotonic seq (gap = missed delivery)
    onChange: (entry) => { /* { seq, op: "write"|"mkdir"|"rmdir"|"meta"|"load", path, data?, metadata?, timestamp } */ },
    // snapshot mode: debounced full tree + sha256 hash
    onSnapshot: (snapshot) => { /* { tree, hash, seq, storageKey, timestamp } */ },
    // two-way boot sync; errors degrade to local-wins
    reconcile: async (local) => ({ action: 'useLocal' }),  // or { action: 'replace', tree }
}, { snapshotDebounceMs: 500 })
```

All hooks are optional (capability-based). Register at app entry before
rendering. Re-registering an id replaces it; `unregisterClassicyFileSystemAdapter(id)`
removes it. Adapter exceptions are isolated — a faulty adapter can never block
local operation. Derived folders (Applications, Extensions) never journal.

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
    sound: { name: string; disabled: string[] }
}
```

There is **no `registerTheme` function**. The registration seam is the store:

```ts
import { getAllThemes, getTheme, getThemeVars } from 'classicy'

// Add/replace themes (replaces the whole list — include the stock ones to keep them):
dispatch({ type: 'ClassicyDesktopLoadThemes', availableThemes: [...getAllThemes(), myTheme] })
dispatch({ type: 'ClassicyDesktopChangeTheme', activeTheme: 'myTheme' })  // no-op if id unknown
```

`getTheme(id, overrides?)` returns a deep-merged clone; `getThemeVars(theme)`
returns the CSS custom-property map. Raw SCSS partials are importable via
`classicy/scss/*`.

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
are Howler sprite keys from the bundled Platinum sound theme.

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
(muting = the `"*"` wildcard in `disabled`), `ClassicyVolumeSet`,
`ClassicyAlertSound`, `ClassicySoundSetAlertSound`. `useSound()` reads state.
Alert sound options: `CLASSICY_ALERT_SOUNDS` (Bonk, Growl, Indigo, Quack,
Sosumi, Tabitha, Wild Eep); default `DEFAULT_ALERT_SOUND = "ClassicyAlertSosumi"`.

---

## 11. Other Extension Seams

| API | Purpose |
|---|---|
| `registerHyperCardPart` / `registerHyperCardCommand` / `registerHyperCardEffectHandler` / `registerHyperCardStack` / `registerHyperCardSaveProvider` (+ `*EditorMeta` variants) | Extend HyperCard with custom parts, script commands, effects, preloaded stacks, and save backends |
| `registerAppleGuideTopic(topic)` | Add help topics to the Apple Guide system |
| `ClassicyMenuBarExtension` | Add menu bar items (see §4.5) |
| `useFinderFolderSize`, `FinderContext` | Finder integration points |
| `useClassicyCursor()` | Platinum cursor management |
| `mergeClassicyState(base, overrides)`, `DefaultAppManagerState`, `sanitizeStateForPersistence` | Building custom `defaultState` for the provider |

---

## 12. Rules & Gotchas for Agents

1. **Always select** when reading the store: `useAppManager(s => s.System.Manager.Applications.apps[id])`. The app slice is `Applications`, not `App`.
2. **Never mutate app/file-system state directly.** Apps change state only by dispatching actions handled by their registered handler; file system changes only via `fs.writeFile`/`mkDir`/`rmDir`/`setMetadata`.
3. **Module-scope registration**: `registerClassicyIcons`, `registerApp`, `registerClassicyFileSystemAdapter`, and HyperCard registrations must run before first render (top-level of an entry module).
4. **App state schemas are loose and optional**: `z.looseObject` with `.optional()` top-level fields, or the kernel's own writes will "fail" your schema in dev warnings.
5. **Plugin prefix routing is insertion-order first-match**, not longest-match. Register more specific prefixes before general ones, and pick prefixes that don't collide with the built-in `ClassicyWindow*`/`ClassicyDesktop*`/`ClassicyApp*` families except intentionally under `ClassicyApp<YourApp>*`.
6. **Guarded actions can never be scripted**: `ClassicyDesktop*`, `ClassicyWindow*`, `ClassicyAppFinderEmptyTrash`, `ClassicyAppHCEditSetScript`. Allowlisting them is a silent no-op by design.
7. **`defaultState` only applies on first boot** (nothing hydrated). During development, clear `localStorage["classicyDesktopState"]` to see provider default changes.
8. **Window ids are data**: they feed analytics paths and persistence. Keep them stable and free of user content, or set `analyticsPath` explicitly.
9. **Colors are integers** (`0xRRGGBB`), not hex strings, throughout themes and color pickers.
10. **CSS is not auto-imported** — `classicy/dist/classicy.css` is required; `fonts.css` is opt-in.
11. Deprecated (still working, avoid in new code): `noDesktopIcon`, `inApplicationsFolder`, `registerAppEventHandler`, `registerClassicyUntrustedActionAllowlist` for app-owned actions, `isXData`-style hand-rolled guards (use `parseAppData`).
