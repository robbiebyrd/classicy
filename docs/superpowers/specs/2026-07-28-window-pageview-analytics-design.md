# ClassicyWindow Pageview Analytics

**Date:** 2026-07-28
**Status:** Approved

## Problem

Google Analytics receives exactly one pageview per session: the automatic `/`
hit fired by the GA snippet at load. `analytics.page()` is available on the
instance created in `ClassicyAppManagerContext.tsx` — and on the no-op fallback
in `useClassicyAnalytics` — but is never called anywhere in `src/`.

Classicy is a single-page windowing environment. Everything a user does happens
in windows that open, focus, and close without a navigation, so GA's
pageview-driven reports — landing pages, page flow, time on page, exits — have
nothing to work with. Custom `track()` events already exist on `ClassicyWindow`
(focus, close, move, resize, zoom, collapse), but events do not populate those
reports.

## Goals

1. Emit a GA pageview when a window opens and when an open window gains focus.
2. Derive a stable, low-cardinality path from the window, with a readable title.
3. Let apps override or suppress the pageview for a given window.

## Non-Goals

- Changing or removing any existing `track()` event.
- GA-property configuration (content grouping, filters, retention).
- Pageviews for non-window surfaces: dialogs, menus, desktop icons.

## Design

### 1. Trigger

A pageview fires when a window **becomes open** (`closed` goes true → false, or
it mounts already open) and when an **already-open window gains focus**
(`focused` goes false → true). Closing and blurring emit nothing.

Focus is included because in a windowing UI it is the analogue of a browser tab
switch. Without it, GA attributes the entire session to whichever window opened
first, and "which window was the user actually on" is unanswerable.

Opening a window normally focuses it, so both conditions fire in the same commit.
A per-window ref holds the last path this window emitted while continuously
active; an emission whose path matches it is skipped. The ref clears when the
window closes or blurs, so re-focusing after visiting another window emits again.

### 2. Path derivation

A new pure module, `ClassicyAnalyticsPath.ts`, owns all string handling and is
tested without React:

```ts
export const classicyWindowPagePath = (appId: string, windowId: string): string;
export const classicyWindowPageTitle = (
    appName: string | undefined,
    title: string | undefined,
    fallbackPath: string,
): string;
```

`slugify` lowercases, replaces every run of non-alphanumeric characters with a
single `-`, and trims leading and trailing `-`.

`classicyWindowPagePath` applies these rules in order:

1. **App segment** — `appId` with a trailing `.app` removed, slugified.
   `SimpleText.app` → `simpletext`. An empty result becomes `app`.
2. **Window id containing a filesystem separator (`:` or `/`)** — the id is user
   data, not a route. It collapses to a single generic segment: `file` when the
   id matches `<appId>_file_<path>`, otherwise `folder`.
3. **Otherwise** — slugify the window id, then strip a redundant leading app
   prefix: try the slugified *full* `appId` first (`simpletext-app`), then the
   app segment (`simpletext`), removing whichever matches and any leading `-`.
   Longest match first, so `SimpleText.app_debugger` yields `debugger` rather
   than `app-debugger`. If what remains is purely numeric, prefix it with
   `window-`. If it is empty, use `main`.

Result: `/<appSegment>/<windowSegment>`.

| `appId` | `windowId` | Path |
| --- | --- | --- |
| `SimpleText.app` | `SimpleText_1` | `/simpletext/window-1` |
| `SimpleText.app` | `SimpleText.app_file_Macintosh HD:Docs:budget.txt` | `/simpletext/file` |
| `SimpleText.app` | `SimpleText.app_debugger` | `/simpletext/debugger` |
| `Finder.app` | `Macintosh HD:Applications` | `/finder/folder` |
| `DriveSetup.app` | `DriveSetup_1` | `/drivesetup/window-1` |
| `MoviePlayer.app` | `player` | `/movieplayer/player` |

Rule 2 is the important one. Two distinct window-id shapes in this repo embed
user file paths: `ClassicyApp` builds file-window ids as
`` `${id}_file_${filePath}` `` (`ClassicyApp.tsx:312`), and Finder keys its
windows by folder path. Slugifying either would put user file and folder names
into GA paths and make path cardinality unbounded. Testing for a separator
catches both without special-casing individual apps, and catches any future app
that keys windows by path.

### 3. Title

`classicyWindowPageTitle` returns `"<appName> — <title>"` when both are present,
`title` alone when the app name is not, `appName` alone when the window has no
title, and the path when neither is available.

`appName` comes from `currentApp?.name`, already selected in `ClassicyWindow`
(`ClassicyWindow.tsx:208`) — no new store subscription.

The window title is sent to GA verbatim, including titles derived from user file
names. This is a deliberate accepted trade-off: it is what makes the content
report readable, and it matches ordinary web practice of sending document titles
as pageview titles. The *path* stays free of user data; the title does not.

### 4. `useClassicyAnalytics` gains a wrapped `page`

`page` currently passes through the `...analytics` spread untouched. It gets the
same treatment as `track` — a stable function inside the existing `useMemo`:

```ts
page: (path: string, title?: string) => analytics.page({ path, title }),
```

The path is **not** prefixed with `ClassicyAnalyticsPrefixContext`. That prefix
namespaces custom event names; a pageview path is a URL namespace, and prefixing
it would produce paths like `classicy_/simpletext/window-1`.

The no-op fallback already implements `page`, so provider-less usage stays safe
and silent.

### 5. New `ClassicyWindow` props

```tsx
/** Override the generated analytics pageview path for this window. */
analyticsPath?: string;
/** Suppress this window's analytics pageview entirely. */
analyticsExclude?: boolean;
```

`analyticsExclude` wins over `analyticsPath`. Neither affects existing `track()`
events.

## Files

**Added**

- `src/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath.ts`
- `src/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath.test.ts`
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.pageview.test.tsx`

**Modified**

- `src/SystemFolder/SystemResources/Analytics/useClassicyAnalytics.ts` — wrapped `page`
- `src/SystemFolder/SystemResources/Analytics/useClassicyAnalytics.test.tsx` — `page` coverage
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` — two props, emission effect
- `CLAUDE.md` — Analytics section

Barrel files are regenerated by `generate-barrels` and are not edited by hand.

## Testing

Test-driven, one failing test before each behavior.

**Path derivation** (`ClassicyAnalyticsPath.test.ts`) — every row of the table in
section 2, plus: an empty `appId` yields `/app/...`; an empty `windowId` yields
`.../main`; a windowId equal to the app segment yields `.../main`; slugging
collapses runs of punctuation and trims edges; a Windows-style `/` separator
collapses like `:` does.

**Title** — both parts present, title only, app name only, neither.

**Emission** (`ClassicyWindow.pageview.test.tsx`) — a window open and focused on
mount emits once with the derived path and title; a closed window emits nothing;
opening a closed window emits; gaining focus on an already-open window emits;
losing focus emits nothing; closing emits nothing; re-focusing after a blur emits
again; opening and focusing in one commit emits exactly once; `analyticsPath`
replaces the generated path; `analyticsExclude` suppresses emission even with
`analyticsPath` set; existing `track()` events still fire unchanged.

**Hook** (`useClassicyAnalytics.test.tsx`) — `page` forwards `{ path, title }` to
the instance; the path is not prefixed; the no-op fallback's `page` is callable
without a provider.

**Verification** — `pnpm test`, then `pnpm build:source` for type checking (the
test runner does not type-check), then the `/verify` skill to confirm in a
browser that opening and focusing windows produces the expected paths, asserted
against the analytics instance rather than the network.
