# Shared App Menu Helpers (Close Window / Close All Windows / About)

## Problem

Movie Player is missing three menu items that Finder already has an equivalent
of:

- File → Close Window (close just the window the menu was invoked from)
- File → Close All Windows (close every window the app has open)
- Help → About (show the app's About window)

Finder's versions are hand-written inline in `Finder.tsx`. Sound Manager,
Appearance Manager, and Date & Time Manager each separately hand-roll the
exact same "About" boilerplate (`showAbout` state + `<ClassicyAboutWindow>`
JSX + a Help menu item that sets it). None of this is reusable — every new
app that wants these standard menu items has to re-derive them from scratch.

## Goals

- Give Movie Player, Picture Viewer, SimpleText, and PDFViewer the same
  Close Window / Close All Windows / About menu items Finder has. All four
  share the same shape (multiple windows open at once, one per file path),
  so all four get the full treatment.
- Extract the common parts into shared, documented helpers under
  `SystemResources/App/`, so any `ClassicyApp` can adopt them with minimal
  code.
- Retrofit Finder onto the shared Close Window/Close All Windows helper, and
  retrofit Finder, Sound Manager, Appearance Manager, and Date & Time Manager
  onto the shared About helper, so there is exactly one implementation of
  each pattern.

## Non-goals

- Close Window / Close All Windows are **not** added to Sound Manager,
  Appearance Manager, or Date & Time Manager — those are single-window
  control panels where the concept doesn't apply.
- No change to the underlying event-routing mechanism
  (`classicyAppEventHandler`, `ClassicyWindowClose`, per-app `*CloseFile`/
  `*CloseFolder`/`*CloseDocument` events) — the new helpers compose existing
  events, they don't add new ones.

## Design

### `closeWindowMenuItemHelper` / `closeAllWindowsMenuItemHelper`

New plain functions in `ClassicyAppUtils.tsx`, alongside the existing
`quitAppHelper`/`quitMenuItemHelper`:

```ts
export function closeWindowMenuItemHelper(
	id: string,
	onClickFunc: () => void,
): ClassicyMenuItem {
	return { id, title: "Close Window", onClickFunc };
}

export function closeAllWindowsMenuItemHelper(
	id: string,
	onClickFunc: () => void,
): ClassicyMenuItem {
	return { id, title: "Close All Windows", onClickFunc };
}
```

These are intentionally thin — they exist so every app's Close
Window/Close All Windows menu item has the same id convention, title text,
and shape, in one place. They do not know what "closing" means for a given
app; the caller supplies that as a closure.

### `useClassicyWindowClose(appId)`

New hook in a new file, `ClassicyAppMenuHooks.tsx` (same directory). Captures
the two-step close sequence every app needs: tell the window system the
window is gone, then tell the app to drop its own record of it.

```ts
export function useClassicyWindowClose(appId: string) {
	const dispatch = useAppManagerDispatch();
	return useCallback(
		(windowId: string, appCleanupAction: ActionMessage) => {
			dispatch({
				type: "ClassicyWindowClose",
				app: { id: appId },
				window: { id: windowId },
			});
			dispatch(appCleanupAction);
		},
		[dispatch, appId],
	);
}
```

Usage (Movie Player, per open document):

```tsx
const closeWindow = useClassicyWindowClose(appId);

// per-window "Close Window"
closeWindowMenuItemHelper(`${appId}_${doc.key}_close`, () =>
	closeWindow(
		doc.key,
		doc.path
			? { type: "ClassicyAppMoviePlayerCloseFile", app: { id: appId }, path: doc.path }
			: { type: "ClassicyAppMoviePlayerCloseDocument", document: { url: doc.url } },
	),
);

// "Close All Windows"
closeAllWindowsMenuItemHelper(`${appId}_close_all`, () => {
	openDocuments.forEach((d) =>
		closeWindow(
			d.key,
			d.path
				? { type: "ClassicyAppMoviePlayerCloseFile", app: { id: appId }, path: d.path }
				: { type: "ClassicyAppMoviePlayerCloseDocument", document: { url: d.url } },
		),
	);
});
```

**Behavior fix bundled in:** Finder's current single-window "Close Window"
menu item only dispatches `ClassicyAppFinderCloseFolder`, not
`ClassicyWindowClose` — unlike "Close All Windows", which already dispatches
both. `useClassicyWindowClose` always dispatches both, so adopting it in
Finder fixes this inconsistency (previously, closing one window via the menu
could leave a stale entry in `apps["Finder.app"].windows`).

### `useClassicyAboutMenu(appId, appName, appIcon)`

Second hook in `ClassicyAppMenuHooks.tsx`. Replaces the `showAbout` state +
`<ClassicyAboutWindow>` JSX + About menu item currently duplicated in
Finder, Sound Manager, Appearance Manager, and Date & Time Manager.

```ts
export function useClassicyAboutMenu(
	appId: string,
	appName: string,
	appIcon: string,
): { aboutMenuItem: ClassicyMenuItem; aboutWindow: ReactNode } {
	const [showAbout, setShowAbout] = useState(false);
	const aboutMenuItem: ClassicyMenuItem = {
		id: `${appId}_about`,
		title: "About",
		onClickFunc: () => setShowAbout(true),
	};
	const aboutWindow = showAbout ? (
		<ClassicyAboutWindow
			appId={appId}
			appName={appName}
			appIcon={appIcon}
			hideFunc={() => setShowAbout(false)}
		/>
	) : null;
	return { aboutMenuItem, aboutWindow };
}
```

Usage:

```tsx
const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(appId, appName, appIcon);
const appMenu = [
	{ id: `${appId}_file`, title: "File", menuChildren: [...] },
	{ id: `${appId}_help`, title: "Help", menuChildren: [aboutMenuItem] },
];
return <ClassicyApp>...{aboutWindow}</ClassicyApp>;
```

### Per-app changes

- **MoviePlayer.tsx**: `appMenu` moves from a single `useMemo` shared across
  all windows to a per-document menu (File → Close Window / Close All
  Windows / Quit, Help → About), mirroring how Finder gives each open
  folder's window its own menu today.
- **PictureViewer.tsx**: same treatment as MoviePlayer (it currently has no
  Help menu and no Close Window/Close All Windows items at all).
- **PDFViewer.tsx**: same treatment — currently a single static `appMenu`
  (File → Quit only) shared by every open PDF window; moves to a
  per-document menu the same way.
- **SimpleText.tsx**: already builds a per-file `appMenu` via
  `buildAppMenu(filePath, fileType)`, so this is the most direct fit — add
  Close Window/Close All Windows/About into that existing per-file menu
  rather than introducing a new mechanism. The always-present "Untitled"
  placeholder window (shown when no files are open) gets Help → About too,
  but no Close Window item — there's no file behind it to close.
- **Finder.tsx**: per-folder-window "Close Window" and the app-level "Close
  All Windows" switch to `closeWindowMenuItemHelper`/
  `closeAllWindowsMenuItemHelper` + `useClassicyWindowClose`. Finder gains a
  Help → About item (it already renders `ClassicyAboutWindow` but has no
  menu item that shows it) via `useClassicyAboutMenu`, added alongside the
  existing Show/Hide Balloon Help item.
- **ClassicySoundManager.tsx / ClassicyAppearanceManager.tsx /
  ClassicyDateAndTimeManager.tsx**: their existing `showAbout` state +
  About window JSX + About menu item are replaced by `useClassicyAboutMenu`.
  No other behavior changes.

## Testing

- `ClassicyAppUtils.test.ts`: add cases for `closeWindowMenuItemHelper` /
  `closeAllWindowsMenuItemHelper` (mirrors existing `quitMenuItemHelper`
  tests).
- New `ClassicyAppMenuHooks.test.tsx`: `renderHook`-based tests for
  `useClassicyWindowClose` (dispatches both events, in order) and
  `useClassicyAboutMenu` (menu item shape, toggling `showAbout` renders/hides
  the about window, `hideFunc` closes it).
- Existing test suites for Finder, Sound Manager, Appearance Manager, Date &
  Time Manager, Movie Player, Picture Viewer, PDFViewer, and SimpleText are
  re-run; any assertions that reach into the old inline menu/about shape get
  updated to match.
- Full project test suite, `tsc --noEmit`, and `pnpm build:source` must
  stay green.
