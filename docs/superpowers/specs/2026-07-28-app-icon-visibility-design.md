# App Icon Visibility and Desktop Icon Balloon Help

**Date:** 2026-07-28
**Status:** Approved

## Problem

`ClassicyApp` cannot independently control where its icon appears.

The derived Applications folder is built from desktop icons: `buildApplicationsFolder()`
walks `System.Manager.Desktop.icons` and keeps every entry whose `kind` is
`app_shortcut`. Membership in Applications is therefore a side effect of having a
desktop icon record, not a decision an app can make.

The two existing props are coupled. `inApplicationsFolder` is only honored when
`noDesktopIcon` is also set, in which case `ClassicyApp` registers a `hidden: true`
icon that populates Applications without being drawn. Three of the four useful
states are reachable; the fourth — **a desktop icon that stays out of the
Applications folder** — is not expressible.

Separately, desktop icons have no balloon help. Mac OS 8 showed balloons for the
Trash and for disks, and apps had no way to describe their own icon.

## Goals

1. Independent control over the desktop icon and the Applications-folder entry.
2. App-supplied balloon help on a desktop icon.
3. Stock balloon help for the built-in Trash and drive icons.

## Non-Goals

- Balloon help inside Finder listings or on Applications-folder entries.
- A Control Panels folder, or any other derived folder.
- Changing how the Applications folder is derived or merged into the tree.

## Design

### 1. Public API

`ClassicyAppProps` gains three props and deprecates two:

```ts
/** Draw an icon on the desktop. Defaults to true. Ignored for `extension` apps. */
showDesktopIcon?: boolean;

/** List the app in the derived Applications folder. Defaults to true, and is
 *  independent of `showDesktopIcon`. Ignored for `extension` apps. */
showInApplicationsFolder?: boolean;

/** Balloon help for the app's desktop icon. A bare string supplies the content
 *  and titles the balloon with the app name. */
desktopIconBalloonHelp?: string | ClassicyIconBalloonHelp;

/** @deprecated Use `showDesktopIcon={false}`. */
noDesktopIcon?: boolean;

/** @deprecated Use `showInApplicationsFolder`. */
inApplicationsFolder?: boolean;
```

Resolution, computed once in `ClassicyApp`:

```ts
const drawDesktopIcon = showDesktopIcon ?? !noDesktopIcon;
const listInApplications = showInApplicationsFolder ?? inApplicationsFolder ?? true;
```

A new prop wins when both forms are passed. `extension` apps continue to force
both off; the existing `if (!extension)` guard is unchanged.

`ClassicyIconBalloonHelp` is declared in the BalloonHelp module, beside
`ClassicyBalloonPosition`, and imported by `ClassicyDesktopManager.tsx` for the
icon record. Declaring it there keeps the dependency pointing one way: Desktop
depends on BalloonHelp, never the reverse.

```ts
export interface ClassicyIconBalloonHelp {
    title?: string;
    content: string;
    position?: ClassicyBalloonPosition;
    delay?: number;
}
```

Every field is JSON-serializable, which the icon record requires — desktop icons
persist to localStorage under `classicyDesktopState`.

### 2. Behavior change

`showInApplicationsFolder` defaults to `true` on its own rather than mirroring
`showDesktopIcon`. Today `noDesktopIcon={true}` alone keeps an app out of
Applications; after this change it does not.

Four apps in this repo rely on the old coupling and are updated to pass
`showInApplicationsFolder={false}` explicitly:

- `src/SystemFolder/Finder/Finder.tsx`
- `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager.tsx`
- `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx`
- `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx`

`ClassicyDriveSetup.tsx` already passes `inApplicationsFolder={true}` and is
migrated to the new prop names with no behavior change.

Consumer apps outside this repo that pass `noDesktopIcon` without
`inApplicationsFolder` will start appearing in the Applications folder. This is a
breaking change and is called out in the release notes.

### 3. Store icon record

`ClassicyStoreSystemDesktopManagerIcon` keeps `hidden` and gains two fields:

```ts
/** When true, the icon is not drawn on the desktop. */
hidden?: boolean;

/** When false, the icon is excluded from the derived Applications folder.
 *  Undefined means included, so icons persisted before this field existed keep
 *  their current behavior. */
inApplications?: boolean;

/** Balloon help shown on hover, in normalized object form. */
balloonHelp?: ClassicyIconBalloonHelp;
```

`ClassicyApp` maps the two resolved booleans onto icon registration:

| `drawDesktopIcon` | `listInApplications` | Dispatch |
| --- | --- | --- |
| true | true | `ClassicyDesktopIconAdd` |
| false | true | `ClassicyDesktopIconAdd` with `hidden: true` |
| true | false | `ClassicyDesktopIconAdd` with `inApplications: false` |
| false | false | `ClassicyDesktopIconRemove` |

The last row dispatches a removal rather than doing nothing. Icons persist across
sessions, so an app that previously registered an icon and later opts out of both
surfaces would otherwise keep a stale entry forever.

`desktopIconBalloonHelp` is normalized to `ClassicyIconBalloonHelp` before
dispatch. The string form becomes `{ content, title: name }`.

### 4. Refreshing an existing icon record

`ClassicyDesktopIconAdd` writes the icon's fields only when no icon for that
`appId` exists yet. The one exception is `contextMenu`, which is refreshed on
re-add so a menu shipped after the icon was first persisted still attaches.

The same reasoning applies to the new fields: a returning user's localStorage
already holds an icon, so a changed `showDesktopIcon`, `showInApplicationsFolder`,
or balloon text would never take effect.

That refresh currently sits behind `else if (Array.isArray(action.contextMenu))`,
so it only runs when a context menu is supplied. It is restructured to run
whenever an icon already exists, re-applying `contextMenu` (as today) plus
`hidden`, `inApplications`, and `balloonHelp`.

Location and label stay untouched — those are user state, not code-derived.

Because `hidden` can change on refresh, the branch re-runs `cleanupDesktopIcons`
when the value actually changes: hidden icons do not consume a grid slot, so an
icon becoming visible (or hidden) must re-flow the desktop.

### 5. Applications folder derivation

`buildApplicationsFolder()` skips icons with `inApplications === false`.
`withApplicationsFolder()`'s early-return guard uses the same predicate, so a
desktop where every app-shortcut opts out passes the tree through unchanged
rather than merging an empty Applications folder.

A shared predicate keeps the two in sync:

```ts
const isApplicationsEntry = (icon: ClassicyStoreSystemDesktopManagerIcon) =>
    icon.kind === APP_SHORTCUT_ICON_KIND && icon.inApplications !== false;
```

### 6. Balloon help on desktop icons

`ClassicyBalloonHelp` renders a wrapper `<div class="classicyBalloonHelpAnchor">`
styled `position: relative; display: inline-block`. Desktop icons are
`position: absolute` with inline `top`/`left`. Wrapping an icon in that anchor
would re-anchor it to a collapsed 0x0 inline-block instead of the desktop,
scrambling icon layout, and would measure the wrong rect when placing the balloon.

So the balloon logic is extracted rather than wrapped. A new
`useClassicyBalloonHelp` hook in the BalloonHelp module owns the delay timer,
rect measurement, `disableBalloonHelp` check, and portal:

```ts
export const useClassicyBalloonHelp = (
    anchorRef: RefObject<HTMLElement | null>,
    config?: ClassicyIconBalloonHelp,
): { handlers: { onMouseEnter: () => void; onMouseLeave: () => void }; balloon: ReactNode };
```

`balloon` is `null` when `config` is undefined, when the balloon is not visible,
or when `disableBalloonHelp` is set.

`ClassicyBalloonHelp` is rewritten as a thin wrapper over the hook, keeping its
current props, DOM, and behavior — existing consumers are unaffected.

`ClassicyDesktopIcon` gains a `balloonHelp?: ClassicyIconBalloonHelp` prop, calls
the hook against its existing `iconRef`, spreads `handlers` onto its root, and
renders `{balloon}` inside it. No extra DOM node, so icon positioning, dragging,
and select-box hit testing are untouched.

`ClassicyDesktop` passes each icon record's `balloonHelp` through when mapping
`desktopIcons`.

### 7. Default system balloons

Stock copy lives in a new `ClassicyDesktopIconBalloons.ts` and is resolved at
render time by `kind`, inside `ClassicyDesktopIcon`:

```ts
const effectiveBalloonHelp = balloonHelp ?? defaultBalloonForKind(kind);
```

Resolving at render time rather than baking the text into the icon record means
copy changes ship with the library instead of being frozen in every existing
user's localStorage. An icon's own `balloonHelp` always wins.

| `kind` | Default content |
| --- | --- |
| `trash` | This is the Trash. Drag items here to get them out of the way. To remove them permanently, choose Empty Trash from the Special menu. |
| `drive` | This is a disk icon. To see what's on the disk, double-click the icon. |
| anything else | none |

Both defaults use the icon's own name as the balloon title, matching how the
string form of `desktopIconBalloonHelp` titles itself with the app name.

## Files

**Modified**

- `src/SystemFolder/SystemResources/App/ClassicyApp.tsx` — new props, resolution, registration matrix
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx` — `ClassicyIconBalloonHelp`, `inApplications`, `balloonHelp`
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx` — persist new fields, refresh on re-add
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx` — `balloonHelp` prop, hook wiring, kind defaults
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` — pass `balloonHelp` through
- `src/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.tsx` — extract hook, rewrite as wrapper
- `src/SystemFolder/SystemResources/File/ClassicyFileSystemApplications.ts` — `isApplicationsEntry` predicate
- `src/SystemFolder/Finder/Finder.tsx`, `ClassicySoundManager.tsx`, `ClassicyAppearanceManager.tsx`, `ClassicyDateAndTimeManager.tsx` — `showInApplicationsFolder={false}`
- `src/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetup.tsx` — migrate to new props
- `CLAUDE.md` — document the icon-visibility props

**Added**

- `src/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp.tsx` (`.tsx`
  because the hook returns the balloon portal as JSX)
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons.ts`

Barrel files are regenerated by `generate-barrels` and are not edited by hand.

## Testing

Test-driven, one failing test before each behavior.

**Visibility matrix** — extend `ClassicyApp.applicationsfolder.test.tsx`:

- all four `showDesktopIcon` / `showInApplicationsFolder` combinations produce the
  dispatch in the section 3 table
- `showDesktopIcon={true}` with `showInApplicationsFolder={false}` draws the icon
  and omits it from `buildApplicationsFolder()`
- deprecated `noDesktopIcon` / `inApplicationsFolder` still map as documented
- a new prop passed alongside its deprecated counterpart wins
- `extension` forces both off regardless of the new props

**Derivation** — extend `ClassicyFileSystemApplications.test.ts`:

- an icon with `inApplications: false` is excluded from the built folder
- a desktop where every app-shortcut opts out returns the tree unchanged

**Icon record** — extend `ClassicyDesktopIconEventHandler.test.ts`:

- `ClassicyDesktopIconAdd` persists `inApplications` and `balloonHelp`
- re-adding an existing icon refreshes those fields and `hidden`, and preserves
  location and label
- a `hidden` change on re-add re-flows the desktop grid

**Balloon help** — new `ClassicyDesktopIcon.balloonhelp.test.tsx`:

- an icon with `balloonHelp` shows the balloon after the delay and hides on leave
- the icon's root element gains no wrapper: it remains a direct child of its
  previous parent, with its inline `top`/`left` intact
- `disableBalloonHelp` suppresses it
- `trash` and `drive` icons show their default copy with no `balloonHelp` set
- an explicit `balloonHelp` overrides the `kind` default
- other kinds show nothing

**Regression** — the existing `ClassicyBalloonHelp` tests must pass unchanged
after the hook extraction.

**Verification** — `pnpm test`, then `pnpm build:source` for type checking, then
the `/verify` skill to confirm the Applications folder contents and a hovered
desktop icon balloon in a browser.
