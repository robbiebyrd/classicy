# Auto-Register Default Apps on `ClassicyAppManagerProvider`

**Date:** 2026-07-01
**Status:** Approved design, pending implementation
**Repo:** `github.com/robbiebyrd/classicy`

## Problem

A consumer of the `classicy` package currently has to manually import and mount
`<SimpleText />`, `<PDFViewer />`, `<MoviePlayer />`, and `<PictureViewer />`
inside their tree to make them available. In practice this is easy to miss:
today `example/src/app.tsx` only mounts `SimpleText` and `PDFViewer` —
`MoviePlayer` and `PictureViewer` aren't wired up anywhere in the example app.

`ClassicyDesktop.tsx:430` already unconditionally renders `<Finder />` inside
the `div#classicyDesktop` container, with no opt-out. Mounting a
`ClassicyApp`-wrapped component *is* how an app registers itself — there is no
separate registry data structure. The mount triggers a `useEffect`
(`ClassicyApp.tsx:81-129`) that dispatches `ClassicyAppLoad`,
`ClassicyDesktopIconAdd`, `ClassicyDesktopAppMenuAdd`, and
`ClassicyAppRegisterFileTypes`. Finder gets its desktop icon, Apple-menu entry,
and file-type associations purely as a consequence of being rendered.

This feature makes SimpleText, PDFViewer, MoviePlayer, and PictureViewer behave
the same way as Finder already does — auto-mounted by default — while adding a
per-app opt-out that Finder itself doesn't have.

## Chosen approach: new context, consumed by `ClassicyDesktop`

`ClassicyAppManagerProvider` gains four boolean props, all defaulting to
`false` (apps load unless explicitly disabled):

```ts
disableSimpleText?: boolean;
disablePDFViewer?: boolean;
disableMoviePlayer?: boolean;
disablePictureViewer?: boolean;
```

`ClassicyAppManagerProvider` itself only wraps `{children}` in context
providers (Analytics, Sound, FileSystem defaults) — it renders no DOM of its
own, and does not render `ClassicyDesktop` (the consumer does, as a child).
Since the four apps must land in the same `div#classicyDesktop` container as
`Finder` (for consistent CSS scoping and DOM structure), the actual
`<SimpleText />` / `<PDFViewer />` / `<MoviePlayer />` /
`<QuickTimePictureViewer />` mounting happens inside `ClassicyDesktop.tsx`,
right next to `<Finder />` — not inside the Provider.

To bridge the config from Provider down to Desktop, this introduces a new
context, `ClassicyDefaultAppsContext`, following the exact pattern already
used for `ClassicyDefaultFileSystemContext`
(see `2026-06-30-default-filesystem-design.md`): Provider memoizes the four
booleans into a context value; `ClassicyDesktop` reads it via `useContext` and
conditionally renders each app.

### Rejected alternatives

- **Single `disableDefaultApps: boolean` prop (all-or-nothing).** Simplest
  surface area, but a consumer wanting only 3 of the 4 default apps would have
  no way to express that short of falling back to full manual mounting.
  Rejected for insufficient flexibility.
- **Single `disableDefaultApps: Array<"SimpleText" | "PDF Viewer" | ...>`
  prop.** One prop instead of four, but requires the consumer to know and spell
  the exact string literals, with no editor autocomplete guiding them to valid
  values the way named boolean props do. Rejected in favor of discoverability.
- **Mount the four apps inside `ClassicyAppManagerProvider` itself.** Would
  keep the config and the mounting in the same component, avoiding a new
  context. Rejected because Provider does not render `ClassicyDesktop`, and
  rendering the apps outside `div#classicyDesktop` would make them
  structurally inconsistent with `Finder` (different DOM container than every
  other app), an unnecessary divergence from the existing pattern.

## Changes

All changes are in the classicy library.

### 1. New file: `ClassicyDefaultAppsContext.tsx`

Location: `src/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext.tsx`
(alongside `ClassicyApp.tsx`, since this context configures which built-in
`ClassicyApp`s are mounted, not filesystem or analytics behavior).

```ts
export type ClassicyDefaultAppsContextValue = {
  disableSimpleText: boolean;
  disablePDFViewer: boolean;
  disableMoviePlayer: boolean;
  disablePictureViewer: boolean;
};

export const ClassicyDefaultAppsContext =
  createContext<ClassicyDefaultAppsContextValue>({
    disableSimpleText: false,
    disablePDFViewer: false,
    disableMoviePlayer: false,
    disablePictureViewer: false,
  });
```

### 2. `ClassicyAppManagerContext.tsx` — props + context provider

```ts
type ClassicyAppManagerProviderProps = {
  // ...existing props...
  disableSimpleText?: boolean;
  disablePDFViewer?: boolean;
  disableMoviePlayer?: boolean;
  disablePictureViewer?: boolean;
};

// inside the component body:
const defaultAppsContextValue = useMemo(
  () => ({
    disableSimpleText: disableSimpleText ?? false,
    disablePDFViewer: disablePDFViewer ?? false,
    disableMoviePlayer: disableMoviePlayer ?? false,
    disablePictureViewer: disablePictureViewer ?? false,
  }),
  [disableSimpleText, disablePDFViewer, disableMoviePlayer, disablePictureViewer],
);

// in the render tree, alongside the existing ClassicyDefaultFileSystemContext.Provider:
<ClassicyDefaultAppsContext.Provider value={defaultAppsContextValue}>
  {/* ...existing providers... */}
</ClassicyDefaultAppsContext.Provider>
```

### 3. `ClassicyDesktop.tsx` — mount the four apps

```diff
+ import { SimpleText } from "@/SystemFolder/SimpleText/SimpleText";
+ import { PDFViewer } from "@/SystemFolder/PDFViewer/PDFViewer";
+ import { MoviePlayer } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayer";
+ import { QuickTimePictureViewer } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewer";
+ import { ClassicyDefaultAppsContext } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";
```

```diff
+ const {
+   disableSimpleText,
+   disablePDFViewer,
+   disableMoviePlayer,
+   disablePictureViewer,
+ } = useContext(ClassicyDefaultAppsContext);
```

```diff
  <Finder />
+ {!disableSimpleText && <SimpleText />}
+ {!disablePDFViewer && <PDFViewer />}
+ {!disableMoviePlayer && <MoviePlayer />}
+ {!disablePictureViewer && <QuickTimePictureViewer />}
  <ClassicyControlPanels />
```

Note: the `PictureViewer.tsx` barrel export's actual component name is
`QuickTimePictureViewer`, not `PictureViewer` — this design keeps that name
as-is rather than renaming it, to avoid an unrelated breaking change to the
package's public exports.

## Data flow

Consumer passes `disableX` props to `ClassicyAppManagerProvider` → Provider
memoizes them into `ClassicyDefaultAppsContext` → `ClassicyDesktop` mounts,
reads the context, and conditionally renders each app component next to
`<Finder />` → each rendered app's own `ClassicyApp` wrapper `useEffect` fires
exactly as it does for Finder today, registering its desktop icon, Apple-menu
entry, and file-type associations.

No changes are needed to `ClassicyAppManager.ts` (the reducer), to
`ClassicyApp.tsx`, or to the four app components themselves — disabling an app
is simply not rendering it, so none of its registration side effects fire.

## Error handling / edge cases

- No `ClassicyAppManagerProvider` in the tree → `useContext` returns the
  context's default value (all four `disableX` = `false`) → all four apps load
  by default, consistent with "load by default unless disabled" even for a
  consumer who (incorrectly) renders `ClassicyDesktop` without wrapping it in
  the Provider.
- Any `disableX` omitted → treated as `false` (app loads), matching the
  "on by default" requirement.
- All four disabled → `ClassicyDesktop` behaves exactly as it does today
  before this feature, plus `Finder` (which has no opt-out).
- Disabling an app does not remove it from the package's exports — a consumer
  who disables the default `PDFViewer` mount can still manually import and
  render their own `<PDFViewer />` elsewhere in their tree if they want custom
  placement or props.

## Testing (vitest, alongside existing `*.test.tsx`)

`ClassicyDesktop.test.tsx` (extend existing suite, rendering under
`ClassicyAppManagerProvider`):
- default render (no `disableX` props) → desktop icons for SimpleText,
  PDFViewer, MoviePlayer, and PictureViewer all appear alongside Finder's
- each `disableX` prop set individually → the corresponding app's desktop icon
  is absent; the other three (plus Finder) are still present
- all four `disableX` props set → only Finder's desktop icon appears

`ClassicyAppManagerContext.test.tsx` (extend existing suite):
- `disableX` props are correctly threaded into `ClassicyDefaultAppsContext`
  (omitted prop → context value `false`; explicit `true` → context value
  `true`)

## Consumer usage

```tsx
<ClassicyAppManagerProvider
  disablePictureViewer
  disableMoviePlayer
>
  <ClassicyDesktop />
</ClassicyAppManagerProvider>
```

SimpleText and PDFViewer load automatically; MoviePlayer and PictureViewer do
not.

## Rollout

classicy is a published package consumed via pnpm. Land the library change on
this branch, update `README.md` with the new props (following the
`defaultFileSystem`/`defaultFileSystemMode` documentation precedent), bump the
package version, and publish per the maintainer's usual process.
