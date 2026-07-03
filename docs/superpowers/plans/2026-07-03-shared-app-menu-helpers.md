# Shared App Menu Helpers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract reusable Close Window / Close All Windows / About menu-item helpers, apply them to Movie Player, Picture Viewer, PDFViewer, and SimpleText (all four currently missing some or all of these), and retrofit Finder, Sound Manager, Appearance Manager, and Date & Time Manager onto the shared helpers so there's exactly one implementation of each pattern.

**Architecture:** Two categories of shared code in `SystemResources/App/`: (1) plain menu-item-factory functions (`closeWindowMenuItemHelper`, `closeAllWindowsMenuItemHelper`) added to the existing `ClassicyAppUtils.tsx`, matching the style of the existing `quitMenuItemHelper`; (2) two new hooks in a new `ClassicyAppMenuHooks.tsx` (`useClassicyWindowClose` for the dispatch logic, `useClassicyAboutMenu` for the About state/menu-item/window bundle). Each app composes these with its own existing per-app cleanup events (`ClassicyAppFinderCloseFolder`, `ClassicyAppMoviePlayerCloseFile`, etc.) — the shared code doesn't know what "closing" means for a given app, only how to package it into a menu item and dispatch it correctly.

**Tech Stack:** React 18, TypeScript, Zustand (global `useAppManager` store), Vitest + `@testing-library/react` (`renderHook`).

## Global Constraints

- Every new/modified `.ts`/`.tsx` file must pass `npx tsc --noEmit -p .` with zero errors.
- Full suite (`pnpm vitest run`) must stay green after every task.
- Don't manually edit barrel `index.ts` files — `pnpm build:source` regenerates them via `generate-barrels`.
- Match existing code style: tabs for indentation, no semicolon-free style changes, no added comments beyond what's already in this plan.
- Close Window / Close All Windows are added ONLY to multi-window apps (Finder, Movie Player, Picture Viewer, PDFViewer, SimpleText) — never to the single-window control panels (Sound Manager, Appearance Manager, Date & Time Manager).

---

### Task 1: `closeWindowMenuItemHelper` / `closeAllWindowsMenuItemHelper`

**Files:**
- Modify: `src/SystemFolder/SystemResources/App/ClassicyAppUtils.tsx`
- Test: `src/SystemFolder/SystemResources/App/ClassicyAppUtils.test.ts`

**Interfaces:**
- Consumes: `ClassicyMenuItem` type from `@/SystemFolder/SystemResources/Menu/ClassicyMenu`.
- Produces: `closeWindowMenuItemHelper(id: string, onClickFunc: () => void): ClassicyMenuItem` and `closeAllWindowsMenuItemHelper(id: string, onClickFunc: () => void): ClassicyMenuItem`, both used by Tasks 4-11.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/SystemResources/App/ClassicyAppUtils.test.ts`:

```ts
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

(replace the existing import block with the one above), then add at the end of the file:

```ts
describe("closeWindowMenuItemHelper", () => {
	it("uses the given id", () => {
		const onClickFunc = () => {};
		const result = closeWindowMenuItemHelper("my-app_win-1_close", onClickFunc);
		expect(result.id).toBe("my-app_win-1_close");
	});

	it("sets the title to 'Close Window'", () => {
		const result = closeWindowMenuItemHelper("id", () => {});
		expect(result.title).toBe("Close Window");
	});

	it("wires onClickFunc to the given callback", () => {
		let called = false;
		const result = closeWindowMenuItemHelper("id", () => {
			called = true;
		});
		result.onClickFunc?.();
		expect(called).toBe(true);
	});
});

describe("closeAllWindowsMenuItemHelper", () => {
	it("uses the given id", () => {
		const result = closeAllWindowsMenuItemHelper("my-app_close_all", () => {});
		expect(result.id).toBe("my-app_close_all");
	});

	it("sets the title to 'Close All Windows'", () => {
		const result = closeAllWindowsMenuItemHelper("id", () => {});
		expect(result.title).toBe("Close All Windows");
	});

	it("wires onClickFunc to the given callback", () => {
		let called = false;
		const result = closeAllWindowsMenuItemHelper("id", () => {
			called = true;
		});
		result.onClickFunc?.();
		expect(called).toBe(true);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyAppUtils.test.ts`
Expected: FAIL — `closeWindowMenuItemHelper`/`closeAllWindowsMenuItemHelper` are not exported.

- [ ] **Step 3: Implement**

In `src/SystemFolder/SystemResources/App/ClassicyAppUtils.tsx`, add this import at the top and these two functions at the end of the file:

```ts
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
```

```ts
export const closeWindowMenuItemHelper = (
	id: string,
	onClickFunc: () => void,
): ClassicyMenuItem => {
	return {
		id,
		title: "Close Window",
		onClickFunc,
	};
};

export const closeAllWindowsMenuItemHelper = (
	id: string,
	onClickFunc: () => void,
): ClassicyMenuItem => {
	return {
		id,
		title: "Close All Windows",
		onClickFunc,
	};
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyAppUtils.test.ts`
Expected: PASS (12 tests: 6 existing + 6 new)

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit -p .` — expect no output.

```bash
git add src/SystemFolder/SystemResources/App/ClassicyAppUtils.tsx src/SystemFolder/SystemResources/App/ClassicyAppUtils.test.ts
git commit -m "feat(app-utils): add closeWindowMenuItemHelper and closeAllWindowsMenuItemHelper"
```

---

### Task 2: `useClassicyWindowClose` hook

**Files:**
- Create: `src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.tsx`
- Test: `src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.test.tsx`

**Interfaces:**
- Consumes: `useAppManagerDispatch`, `useAppManager` from `@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils`; `ActionMessage`, `DefaultAppManagerState` from `@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager`.
- Produces: `useClassicyWindowClose(appId: string): (windowId: string, appCleanupAction: ActionMessage) => void`, used by Tasks 4-11.

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyWindowClose } from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";

function seedTestApp() {
	useAppManager.setState(DefaultAppManagerState, true);
	useAppManager.setState((state) => ({
		...state,
		System: {
			...state.System,
			Manager: {
				...state.System.Manager,
				Applications: {
					...state.System.Manager.Applications,
					apps: {
						...state.System.Manager.Applications.apps,
						"TestApp.app": {
							id: "TestApp.app",
							name: "Test App",
							icon: "",
							open: true,
							focused: true,
							windows: [
								{
									id: "win-1",
									closed: false,
									focused: true,
									zOrder: 0,
									size: [100, 100],
									position: [0, 0],
									minimumSize: [50, 50],
								},
							],
							data: { openFiles: ["test-path"] },
						},
					},
				},
			},
		},
	}));
}

describe("useClassicyWindowClose", () => {
	beforeEach(() => {
		seedTestApp();
	});

	it("marks the given window as closed", () => {
		const { result } = renderHook(() => useClassicyWindowClose("TestApp.app"));

		act(() => {
			result.current("win-1", {
				type: "ClassicyAppTestAppCloseFile",
				app: { id: "TestApp.app" },
				path: "test-path",
			});
		});

		const app =
			useAppManager.getState().System.Manager.Applications.apps["TestApp.app"];
		expect(app.windows[0].closed).toBe(true);
	});

	it("also dispatches the app cleanup action", () => {
		const { result } = renderHook(() => useClassicyWindowClose("TestApp.app"));

		act(() => {
			result.current("win-1", {
				type: "ClassicyAppTestAppCloseFile",
				app: { id: "TestApp.app" },
				path: "test-path",
			});
		});

		const app =
			useAppManager.getState().System.Manager.Applications.apps["TestApp.app"];
		expect(app.data?.openFiles).toEqual([]);
	});

	it("returns a stable function reference across re-renders with the same appId", () => {
		const { result, rerender } = renderHook(
			({ appId }) => useClassicyWindowClose(appId),
			{ initialProps: { appId: "TestApp.app" } },
		);
		const first = result.current;
		rerender({ appId: "TestApp.app" });
		expect(result.current).toBe(first);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.test.tsx`
Expected: FAIL — cannot find module `ClassicyAppMenuHooks`.

- [ ] **Step 3: Implement**

Create `src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.tsx`:

```tsx
import { useCallback } from "react";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

/**
 * Menu-triggered window closes bypass ClassicyWindow's own close box, which
 * normally dispatches ClassicyWindowClose itself before calling onCloseFunc.
 * This hook packages both steps together for use from a menu item.
 */
export function useClassicyWindowClose(
	appId: string,
): (windowId: string, appCleanupAction: ActionMessage) => void {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit -p .` — expect no output.

```bash
git add src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.tsx src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.test.tsx
git commit -m "feat(app-utils): add useClassicyWindowClose hook"
```

---

### Task 3: `useClassicyAboutMenu` hook

**Files:**
- Modify: `src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.tsx`
- Modify: `src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.test.tsx`

**Interfaces:**
- Consumes: `ClassicyAboutWindow` component from `@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow` (props: `appId`, `appName`, `appIcon`, `hideFunc: MouseEventHandler<HTMLButtonElement>`); `ClassicyMenuItem` type from `@/SystemFolder/SystemResources/Menu/ClassicyMenu`.
- Produces: `useClassicyAboutMenu(appId: string, appName: string, appIcon: string): { aboutMenuItem: ClassicyMenuItem; aboutWindow: ReactNode }`, used by Tasks 4-11.

- [ ] **Step 1: Write the failing test**

Append to `src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.test.tsx`, adding this import at the top:

```tsx
import { useClassicyAboutMenu } from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
```

and this describe block at the end of the file:

```tsx
describe("useClassicyAboutMenu", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("builds an About menu item with the expected id and title", () => {
		const { result } = renderHook(() =>
			useClassicyAboutMenu("TestApp.app", "Test App", "icon.png"),
		);
		expect(result.current.aboutMenuItem.id).toBe("TestApp.app_about");
		expect(result.current.aboutMenuItem.title).toBe("About");
	});

	it("starts with no about window rendered", () => {
		const { result } = renderHook(() =>
			useClassicyAboutMenu("TestApp.app", "Test App", "icon.png"),
		);
		expect(result.current.aboutWindow).toBeNull();
	});

	it("renders the about window after the menu item is clicked", () => {
		const { result } = renderHook(() =>
			useClassicyAboutMenu("TestApp.app", "Test App", "icon.png"),
		);
		act(() => {
			result.current.aboutMenuItem.onClickFunc?.();
		});
		expect(result.current.aboutWindow).not.toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.test.tsx`
Expected: FAIL — `useClassicyAboutMenu` is not exported.

- [ ] **Step 3: Implement**

In `src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.tsx`, add these imports:

```tsx
import { type ReactNode, useCallback, useState } from "react";
import { ClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
```

(the existing `import { useCallback } from "react";` becomes the combined import above)

and append this to the file:

```tsx
export type ClassicyAboutMenu = {
	aboutMenuItem: ClassicyMenuItem;
	aboutWindow: ReactNode;
};

/**
 * Bundles the showAbout state + About menu item + About window that every
 * app previously hand-rolled (Finder, Sound Manager, Appearance Manager,
 * Date & Time Manager all duplicated this exact pattern).
 */
export function useClassicyAboutMenu(
	appId: string,
	appName: string,
	appIcon: string,
): ClassicyAboutMenu {
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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.test.tsx`
Expected: PASS (6 tests total)

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit -p .` — expect no output.

```bash
git add src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.tsx src/SystemFolder/SystemResources/App/ClassicyAppMenuHooks.test.tsx
git commit -m "feat(app-utils): add useClassicyAboutMenu hook"
```

---

### Task 4: Wire Movie Player

**Files:**
- Modify: `src/SystemFolder/QuickTime/MoviePlayer/MoviePlayer.tsx`

**Interfaces:**
- Consumes: `closeWindowMenuItemHelper`, `closeAllWindowsMenuItemHelper` (Task 1); `useClassicyWindowClose`, `useClassicyAboutMenu` (Tasks 2-3); existing `ClassicyAppMoviePlayerCloseFile`/`ClassicyAppMoviePlayerCloseDocument` events (already handled by `MoviePlayerContext.tsx`, unchanged).
- Produces: nothing new consumed elsewhere — this is a leaf app.

- [ ] **Step 1: Update imports**

In `src/SystemFolder/QuickTime/MoviePlayer/MoviePlayer.tsx`, replace:

```tsx
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

with:

```tsx
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

- [ ] **Step 2: Replace the static `appMenu` with a per-window menu builder**

Replace:

```tsx
	const closeFile = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: `ClassicyApp${appName.replace(/\s+/g, "")}CloseFile`,
				app: { id: appId },
				path,
			});
		},
		[desktopEventDispatch, appId, appName],
	);

	const appMenu = useMemo(
		() => [
			{
				id: "file",
				title: "File",
				menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
			},
		],
		[],
	);
```

with:

```tsx
	const closeFile = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: `ClassicyApp${appName.replace(/\s+/g, "")}CloseFile`,
				app: { id: appId },
				path,
			});
		},
		[desktopEventDispatch, appId, appName],
	);

	const windowEntries = useMemo(
		() =>
			openDocuments.map((doc) => ({
				doc,
				windowId: `${appId}_MoviePlayer_${doc.key}`,
			})),
		[openDocuments, appId],
	);

	const closeWindow = useClassicyWindowClose(appId);
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		appId,
		appName,
		appIcon,
	);

	const closeDocAction = useCallback(
		(doc: ResolvedMovieDocument) =>
			doc.path
				? {
						type: "ClassicyAppMoviePlayerCloseFile",
						app: { id: appId },
						path: doc.path,
					}
				: {
						type: "ClassicyAppMoviePlayerCloseDocument",
						document: { url: doc.url, name: doc.title, icon: doc.icon },
					},
		[appId],
	);

	const buildAppMenu = useCallback(
		(windowId: string, doc: ResolvedMovieDocument) => [
			{
				id: `${windowId}_file`,
				title: "File",
				menuChildren: [
					closeWindowMenuItemHelper(`${windowId}_close_window`, () =>
						closeWindow(windowId, closeDocAction(doc)),
					),
					closeAllWindowsMenuItemHelper(`${appId}_close_all_windows`, () => {
						windowEntries.forEach((entry) =>
							closeWindow(entry.windowId, closeDocAction(entry.doc)),
						);
					}),
					quitMenuItemHelper(appId, appName, appIcon),
				],
			},
			{
				id: `${windowId}_help`,
				title: "Help",
				menuChildren: [aboutMenuItem],
			},
		],
		[appId, appName, appIcon, closeWindow, closeDocAction, windowEntries, aboutMenuItem],
	);
```

Note: `ActionMessage` doesn't need an explicit import here — `closeDocAction`'s return type is inferred, and `closeWindow` (from `useClassicyWindowClose`) already types its second parameter as `ActionMessage`.

- [ ] **Step 3: Use the per-window menu and add the About window to the render**

Replace:

```tsx
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			handlesFileTypes={[
				ClassicyFileSystemEntryFileType.Video,
				ClassicyFileSystemEntryFileType.Audio,
			]}
			handlesOwnFiles={true}
		>
			{openDocuments.map((doc) => (
				<ClassicyWindow
					key={`${appId}_MoviePlayer_${doc.key}`}
					id={`${appId}_MoviePlayer_${doc.key}`}
					title={doc.title}
					icon={doc.icon || undefined}
					minimumSize={[300, 60]}
					appId={appId}
					closable={true}
					resizable={true}
					zoomable={true}
					scrollable={true}
					collapsable={false}
					initialSize={[400, 100]}
					initialPosition={[300, 50]}
					modal={true}
					appMenu={appMenu}
					onCloseFunc={() =>
						doc.path
							? closeFile(doc.path)
							: desktopEventDispatch({
									type: "ClassicyAppMoviePlayerCloseDocument",
									document: { url: doc.url, name: doc.title, icon: doc.icon },
								})
					}
				>
					<MoviePlayerVideo
						appId={appId}
						name={doc.title}
						url={doc.url}
						data={doc.data}
						mimeType={doc.mimeType}
						type={doc.type}
						options={doc.options}
						subtitlesUrl={doc.subtitlesUrl}
					/>
				</ClassicyWindow>
			))}
		</ClassicyApp>
```

with:

```tsx
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			handlesFileTypes={[
				ClassicyFileSystemEntryFileType.Video,
				ClassicyFileSystemEntryFileType.Audio,
			]}
			handlesOwnFiles={true}
		>
			{windowEntries.map(({ doc, windowId }) => (
				<ClassicyWindow
					key={windowId}
					id={windowId}
					title={doc.title}
					icon={doc.icon || undefined}
					minimumSize={[300, 60]}
					appId={appId}
					closable={true}
					resizable={true}
					zoomable={true}
					scrollable={true}
					collapsable={false}
					initialSize={[400, 100]}
					initialPosition={[300, 50]}
					modal={true}
					appMenu={buildAppMenu(windowId, doc)}
					onCloseFunc={() =>
						doc.path
							? closeFile(doc.path)
							: desktopEventDispatch({
									type: "ClassicyAppMoviePlayerCloseDocument",
									document: { url: doc.url, name: doc.title, icon: doc.icon },
								})
					}
				>
					<MoviePlayerVideo
						appId={appId}
						name={doc.title}
						url={doc.url}
						data={doc.data}
						mimeType={doc.mimeType}
						type={doc.type}
						options={doc.options}
						subtitlesUrl={doc.subtitlesUrl}
					/>
				</ClassicyWindow>
			))}
			{aboutWindow}
		</ClassicyApp>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p .` — expect no output.
Run: `pnpm vitest run src/SystemFolder/QuickTime/MoviePlayer` — expect all existing tests to still pass (menu construction isn't covered by these reducer tests, so none should need changes).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/QuickTime/MoviePlayer/MoviePlayer.tsx
git commit -m "feat(movie-player): add Close Window, Close All Windows, and About menu items"
```

---

### Task 5: Wire Picture Viewer

**Files:**
- Modify: `src/SystemFolder/QuickTime/PictureViewer/PictureViewer.tsx`

**Interfaces:** Same as Task 4, using `ClassicyAppPictureViewerCloseFile`/`ClassicyAppPictureViewerCloseDocument` (already handled by `PictureViewerContext.tsx`, unchanged).

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

with:

```tsx
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

- [ ] **Step 2: Replace the static `appMenu` with a per-window menu builder**

Replace:

```tsx
	const closeFile = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: `ClassicyApp${appName.replace(/\s+/g, "")}CloseFile`,
				app: { id: appId },
				path,
			});
		},
		[desktopEventDispatch, appId, appName],
	);

	const appMenu = useMemo(
		() => [
			{
				id: "file",
				title: "File",
				menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
			},
		],
		[],
	);
```

with:

```tsx
	const closeFile = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: `ClassicyApp${appName.replace(/\s+/g, "")}CloseFile`,
				app: { id: appId },
				path,
			});
		},
		[desktopEventDispatch, appId, appName],
	);

	const windowEntries = useMemo(
		() =>
			openDocuments.map((doc) => ({
				doc,
				windowId: `${appId}_PictureViewer_${doc.key}`,
			})),
		[openDocuments, appId],
	);

	const closeWindow = useClassicyWindowClose(appId);
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		appId,
		appName,
		appIcon,
	);

	const closeDocAction = useCallback(
		(doc: ResolvedPictureDocument) =>
			doc.path
				? {
						type: "ClassicyAppPictureViewerCloseFile",
						app: { id: appId },
						path: doc.path,
					}
				: {
						type: "ClassicyAppPictureViewerCloseDocument",
						document: { url: doc.url, name: doc.title, icon: doc.icon },
					},
		[appId],
	);

	const buildAppMenu = useCallback(
		(windowId: string, doc: ResolvedPictureDocument) => [
			{
				id: `${windowId}_file`,
				title: "File",
				menuChildren: [
					closeWindowMenuItemHelper(`${windowId}_close_window`, () =>
						closeWindow(windowId, closeDocAction(doc)),
					),
					closeAllWindowsMenuItemHelper(`${appId}_close_all_windows`, () => {
						windowEntries.forEach((entry) =>
							closeWindow(entry.windowId, closeDocAction(entry.doc)),
						);
					}),
					quitMenuItemHelper(appId, appName, appIcon),
				],
			},
			{
				id: `${windowId}_help`,
				title: "Help",
				menuChildren: [aboutMenuItem],
			},
		],
		[appId, appName, appIcon, closeWindow, closeDocAction, windowEntries, aboutMenuItem],
	);
```

- [ ] **Step 3: Use the per-window menu and add the About window to the render**

Replace:

```tsx
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			handlesFileTypes={[ClassicyFileSystemEntryFileType.Image]}
			handlesOwnFiles={true}
		>
			{openDocuments.map((doc) => (
				<ClassicyWindow
					key={`${appId}_PictureViewer_${doc.key}`}
					id={`${appId}_PictureViewer_${doc.key}`}
					title={doc.title}
					icon={doc.icon || undefined}
					minimumSize={[300, 60]}
					appId={appId}
					closable={true}
					resizable={true}
					zoomable={true}
					scrollable={true}
					collapsable={false}
					initialSize={[400, 100]}
					initialPosition={[300, 50]}
					modal={false}
					appMenu={appMenu}
					onCloseFunc={() =>
						doc.path
							? closeFile(doc.path)
							: desktopEventDispatch({
									type: "ClassicyAppPictureViewerCloseDocument",
									document: { url: doc.url, name: doc.title, icon: doc.icon },
								})
					}
				>
					<PictureViewerImage
						url={doc.url}
						data={doc.data}
						mimeType={doc.mimeType}
						alt={doc.title}
					/>
				</ClassicyWindow>
			))}
		</ClassicyApp>
```

with:

```tsx
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			handlesFileTypes={[ClassicyFileSystemEntryFileType.Image]}
			handlesOwnFiles={true}
		>
			{windowEntries.map(({ doc, windowId }) => (
				<ClassicyWindow
					key={windowId}
					id={windowId}
					title={doc.title}
					icon={doc.icon || undefined}
					minimumSize={[300, 60]}
					appId={appId}
					closable={true}
					resizable={true}
					zoomable={true}
					scrollable={true}
					collapsable={false}
					initialSize={[400, 100]}
					initialPosition={[300, 50]}
					modal={false}
					appMenu={buildAppMenu(windowId, doc)}
					onCloseFunc={() =>
						doc.path
							? closeFile(doc.path)
							: desktopEventDispatch({
									type: "ClassicyAppPictureViewerCloseDocument",
									document: { url: doc.url, name: doc.title, icon: doc.icon },
								})
					}
				>
					<PictureViewerImage
						url={doc.url}
						data={doc.data}
						mimeType={doc.mimeType}
						alt={doc.title}
					/>
				</ClassicyWindow>
			))}
			{aboutWindow}
		</ClassicyApp>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p .` — expect no output.
Run: `pnpm vitest run src/SystemFolder/QuickTime/PictureViewer` — expect all existing tests to still pass.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/QuickTime/PictureViewer/PictureViewer.tsx
git commit -m "feat(picture-viewer): add Close Window, Close All Windows, and About menu items"
```

---

### Task 6: Wire PDFViewer

**Files:**
- Modify: `src/SystemFolder/PDFViewer/PDFViewer.tsx`

**Interfaces:** Same shared helpers/hooks. PDFViewer's `openFiles` is already `string[]` (raw paths, no doc-object variant), so `closeDocAction` isn't needed — the cleanup action is always `ClassicyAppPDFViewerCloseFile`.

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

with:

```tsx
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

- [ ] **Step 2: Replace the module-level static `appMenu` with a per-window builder inside the component**

Replace:

```tsx
const { name: appName, id: appId, icon: appIcon } = PDFViewerAppInfo;

const appMenu = [
	{
		id: "file",
		title: "File",
		menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
	},
];

export const PDFViewer: FunctionalComponent = () => {
	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	const fs = useMemo(() => new ClassicyFileSystem(), []);

	const rawOpenFiles = appState?.data?.openFiles;
	const openFiles: string[] = Array.isArray(rawOpenFiles) ? rawOpenFiles : [];

	const closeFile = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: `ClassicyApp${appName}CloseFile`,
				app: { id: appId },
				path,
			});
		},
		[desktopEventDispatch],
	);
```

with:

```tsx
const { name: appName, id: appId, icon: appIcon } = PDFViewerAppInfo;

export const PDFViewer: FunctionalComponent = () => {
	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	const fs = useMemo(() => new ClassicyFileSystem(), []);

	const rawOpenFiles = appState?.data?.openFiles;
	const openFiles: string[] = Array.isArray(rawOpenFiles) ? rawOpenFiles : [];

	const closeFile = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: `ClassicyApp${appName}CloseFile`,
				app: { id: appId },
				path,
			});
		},
		[desktopEventDispatch],
	);

	const closeWindow = useClassicyWindowClose(appId);
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		appId,
		appName,
		appIcon,
	);

	const buildAppMenu = useCallback(
		(windowId: string, path: string) => [
			{
				id: `${windowId}_file`,
				title: "File",
				menuChildren: [
					closeWindowMenuItemHelper(`${windowId}_close_window`, () =>
						closeWindow(windowId, {
							type: `ClassicyApp${appName}CloseFile`,
							app: { id: appId },
							path,
						}),
					),
					closeAllWindowsMenuItemHelper(`${appId}_close_all_windows`, () => {
						openFiles.forEach((p) =>
							closeWindow(`${appId}_file_${p}`, {
								type: `ClassicyApp${appName}CloseFile`,
								app: { id: appId },
								path: p,
							}),
						);
					}),
					quitMenuItemHelper(appId, appName, appIcon),
				],
			},
			{
				id: `${windowId}_help`,
				title: "Help",
				menuChildren: [aboutMenuItem],
			},
		],
		[appId, appName, appIcon, closeWindow, openFiles, aboutMenuItem],
	);
```

- [ ] **Step 3: Use the per-window menu and add the About window to the render**

Replace:

```tsx
			{openFiles.map((filePath: string, idx: number) => {
				const entry = fs.resolve(filePath);
				const source = resolveFileSystemEntrySource(entry);
				const fileName = filePath.split(":").pop() || filePath;

				return (
					<ClassicyWindow
						key={`${appId}_file_${filePath}`}
						id={`${appId}_file_${filePath}`}
						title={fileName}
						appId={appId}
						initialSize={[500, 600]}
						initialPosition={[200 + idx * 30, 80 + idx * 30]}
						appMenu={appMenu}
						onCloseFunc={() => closeFile(filePath)}
					>
						<PDFViewerDocument
							url={source.kind === "url" ? source.url : ""}
							data={source.kind === "data" ? source.data : undefined}
						/>
					</ClassicyWindow>
				);
			})}
		</ClassicyApp>
	);
};
```

with:

```tsx
			{openFiles.map((filePath: string, idx: number) => {
				const entry = fs.resolve(filePath);
				const source = resolveFileSystemEntrySource(entry);
				const fileName = filePath.split(":").pop() || filePath;
				const windowId = `${appId}_file_${filePath}`;

				return (
					<ClassicyWindow
						key={windowId}
						id={windowId}
						title={fileName}
						appId={appId}
						initialSize={[500, 600]}
						initialPosition={[200 + idx * 30, 80 + idx * 30]}
						appMenu={buildAppMenu(windowId, filePath)}
						onCloseFunc={() => closeFile(filePath)}
					>
						<PDFViewerDocument
							url={source.kind === "url" ? source.url : ""}
							data={source.kind === "data" ? source.data : undefined}
						/>
					</ClassicyWindow>
				);
			})}
			{aboutWindow}
		</ClassicyApp>
	);
};
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p .` — expect no output.
Run: `pnpm vitest run src/SystemFolder/PDFViewer` — expect all existing tests to still pass.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/PDFViewer/PDFViewer.tsx
git commit -m "feat(pdf-viewer): add Close Window, Close All Windows, and About menu items"
```

---

### Task 7: Wire SimpleText

**Files:**
- Modify: `src/SystemFolder/SimpleText/SimpleText.tsx`

**Interfaces:** Same shared helpers/hooks. SimpleText already has a per-file `buildAppMenu(filePath, fileType)` — extend it rather than introduce a second builder. Its `openFiles` is also plain `string[]`.

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

with:

```tsx
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

- [ ] **Step 2: Extend `buildAppMenu` and add the hooks**

Replace:

```tsx
	const buildAppMenu = useCallback(
		(filePath: string, currentType: ClassicyFileSystemEntryFileType) => {
			const isMarkdown =
				currentType === ClassicyFileSystemEntryFileType.Markdown;
			return [
				...baseMenu,
				{
					id: "format",
					title: "Format",
					menuChildren: [
						{
							id: "toggle-format",
							title: isMarkdown
								? "View as Plain Text"
								: "View as Rich Text",
							onClickFunc: () => toggleFileType(filePath, currentType),
						},
					],
				},
			];
		},
		[toggleFileType],
	);
```

with:

```tsx
	const closeWindow = useClassicyWindowClose(appId);
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		appId,
		appName,
		appIcon,
	);

	const buildAppMenu = useCallback(
		(filePath: string, currentType: ClassicyFileSystemEntryFileType) => {
			const isMarkdown =
				currentType === ClassicyFileSystemEntryFileType.Markdown;
			const windowId = `${appId}_file_${filePath}`;
			return [
				{
					id: `${windowId}_file`,
					title: "File",
					menuChildren: [
						closeWindowMenuItemHelper(`${windowId}_close_window`, () =>
							closeWindow(windowId, {
								type: `ClassicyApp${appName}CloseFile`,
								app: { id: appId },
								path: filePath,
							}),
						),
						closeAllWindowsMenuItemHelper(`${appId}_close_all_windows`, () => {
							openFiles.forEach((p) =>
								closeWindow(`${appId}_file_${p}`, {
									type: `ClassicyApp${appName}CloseFile`,
									app: { id: appId },
									path: p,
								}),
							);
						}),
						quitMenuItemHelper(appId, appName, appIcon),
					],
				},
				{
					id: `${windowId}_format`,
					title: "Format",
					menuChildren: [
						{
							id: "toggle-format",
							title: isMarkdown
								? "View as Plain Text"
								: "View as Rich Text",
							onClickFunc: () => toggleFileType(filePath, currentType),
						},
					],
				},
				{
					id: `${windowId}_help`,
					title: "Help",
					menuChildren: [aboutMenuItem],
				},
			];
		},
		[toggleFileType, appId, appName, appIcon, closeWindow, openFiles, aboutMenuItem],
	);
```

- [ ] **Step 3: Add About to the "Untitled" placeholder window's menu and render the About window**

Replace:

```tsx
const baseMenu = [
	{
		id: "file",
		title: "File",
		menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
	},
];

export const SimpleText = () => {
```

with:

```tsx
export const SimpleText = () => {
```

Replace:

```tsx
			{openFiles.length === 0 && (
				<ClassicyWindow
					id={"simple-text-demo"}
					title={"Untitled"}
					appId={appId}
					initialSize={[100, 500]}
					initialPosition={[350, 100]}
					appMenu={baseMenu}
				>
					<ClassicyRichTextEditor content={defaultText} />
				</ClassicyWindow>
			)}
```

with:

```tsx
			{openFiles.length === 0 && (
				<ClassicyWindow
					id={"simple-text-demo"}
					title={"Untitled"}
					appId={appId}
					initialSize={[100, 500]}
					initialPosition={[350, 100]}
					appMenu={[
						{
							id: "file",
							title: "File",
							menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
						},
						{
							id: "help",
							title: "Help",
							menuChildren: [aboutMenuItem],
						},
					]}
				>
					<ClassicyRichTextEditor content={defaultText} />
				</ClassicyWindow>
			)}
```

Finally, add `{aboutWindow}` just before the closing `</ClassicyApp>` tag at the end of the component's return statement.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p .` — expect no output.
Run: `pnpm vitest run src/SystemFolder/SimpleText` — expect all existing tests to still pass.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SimpleText/SimpleText.tsx
git commit -m "feat(simple-text): add Close Window, Close All Windows, and About menu items"
```

---

### Task 8: Retrofit Finder

**Files:**
- Modify: `src/SystemFolder/Finder/Finder.tsx`

**Interfaces:** Same shared helpers/hooks. Fixes the existing inconsistency where the single-window "Close Window" menu item didn't dispatch `ClassicyWindowClose` (only "Close All Windows" did) — `useClassicyWindowClose` always dispatches both.

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { FinderAboutThisComputer } from "@/SystemFolder/Finder/FinderAboutThisComputer";
import { useFinderFolderSize } from "@/SystemFolder/Finder/useFinderFolderSize";
import { ClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
```

with:

```tsx
import { FinderAboutThisComputer } from "@/SystemFolder/Finder/FinderAboutThisComputer";
import { useFinderFolderSize } from "@/SystemFolder/Finder/useFinderFolderSize";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
```

- [ ] **Step 2: Thread `closeWindow` and `aboutMenuItem` into `FinderWindowProps`**

Replace:

```tsx
type FinderWindowProps = {
	appId: string;
	op: string;
	dir: ClassicyFileSystemEntry;
	idx: number;
	closeFolder: (path: string) => void;
	closeAllFolders: () => void;
	handlePathSettingsChange: (path: string, settings: PathSettingsProps) => void;
	openFolder: (path: string) => void;
	openFile: (path: string) => void;
	pathSettings: Record<string, PathSettingsProps>;
	getHeaderString: (dir: ClassicyFileSystemEntryMetadata) => string;
	fs: ClassicyFileSystem;
	disableBalloonHelp: boolean;
	toggleBalloonHelp: () => void;
};
```

with:

```tsx
type FinderWindowProps = {
	appId: string;
	op: string;
	dir: ClassicyFileSystemEntry;
	idx: number;
	closeFolder: (path: string) => void;
	closeAllFolders: () => void;
	closeWindow: (windowId: string, appCleanupAction: ActionMessage) => void;
	handlePathSettingsChange: (path: string, settings: PathSettingsProps) => void;
	openFolder: (path: string) => void;
	openFile: (path: string) => void;
	pathSettings: Record<string, PathSettingsProps>;
	getHeaderString: (dir: ClassicyFileSystemEntryMetadata) => string;
	fs: ClassicyFileSystem;
	disableBalloonHelp: boolean;
	toggleBalloonHelp: () => void;
	aboutMenuItem: ClassicyMenuItem;
};
```

- [ ] **Step 3: Update `FinderWindow`'s menu construction**

Replace:

```tsx
const FinderWindow: FunctionalComponent<FinderWindowProps> = ({
	appId,
	op,
	dir,
	idx,
	closeFolder,
	closeAllFolders,
	handlePathSettingsChange,
	openFolder,
	openFile,
	pathSettings,
	getHeaderString,
	fs,
	disableBalloonHelp,
	toggleBalloonHelp,
}) => {
	const appMenu = useMemo(
		() => [
			{
				id: `${appId}_${op}_file`,
				title: "File",
				menuChildren: [
					{
						id: `${appId}_${op}_file_closew`,
						title: "Close Window",
						onClickFunc: () => closeFolder(op),
					},
					{
						id: `${appId}_${op}_file_closews`,
						title: "Close All Windows",
						onClickFunc: closeAllFolders,
					},
				],
			},
			{
				id: `${appId}_view`,
				title: "View",
				menuChildren: [
					{
						id: `${appId}_${op}_view_as_icons`,
						title: "View as Icons",
						onClickFunc: () =>
							handlePathSettingsChange(op, { _viewType: "icons" }),
					},
					{
						id: `${appId}_${op}_view_as_list`,
						title: "View as List",
						onClickFunc: () =>
							handlePathSettingsChange(op, { _viewType: "list" }),
					},
				],
			},
			{
				id: `${appId}_${op}_help`,
				title: "Help",
				menuChildren: [
					{
						id: `${appId}_${op}_help_balloon`,
						title: disableBalloonHelp
							? "Show Balloon Help"
							: "Hide Balloon Help",
						onClickFunc: toggleBalloonHelp,
					},
				],
			},
		],
		[
			appId,
			op,
			closeFolder,
			closeAllFolders,
			handlePathSettingsChange,
			disableBalloonHelp,
			toggleBalloonHelp,
		],
	);
```

with:

```tsx
const FinderWindow: FunctionalComponent<FinderWindowProps> = ({
	appId,
	op,
	dir,
	idx,
	closeFolder,
	closeAllFolders,
	closeWindow,
	handlePathSettingsChange,
	openFolder,
	openFile,
	pathSettings,
	getHeaderString,
	fs,
	disableBalloonHelp,
	toggleBalloonHelp,
	aboutMenuItem,
}) => {
	const appMenu = useMemo(
		() => [
			{
				id: `${appId}_${op}_file`,
				title: "File",
				menuChildren: [
					closeWindowMenuItemHelper(`${appId}_${op}_file_closew`, () =>
						closeWindow(op, { type: "ClassicyAppFinderCloseFolder", path: op }),
					),
					closeAllWindowsMenuItemHelper(
						`${appId}_${op}_file_closews`,
						closeAllFolders,
					),
				],
			},
			{
				id: `${appId}_view`,
				title: "View",
				menuChildren: [
					{
						id: `${appId}_${op}_view_as_icons`,
						title: "View as Icons",
						onClickFunc: () =>
							handlePathSettingsChange(op, { _viewType: "icons" }),
					},
					{
						id: `${appId}_${op}_view_as_list`,
						title: "View as List",
						onClickFunc: () =>
							handlePathSettingsChange(op, { _viewType: "list" }),
					},
				],
			},
			{
				id: `${appId}_${op}_help`,
				title: "Help",
				menuChildren: [
					{
						id: `${appId}_${op}_help_balloon`,
						title: disableBalloonHelp
							? "Show Balloon Help"
							: "Hide Balloon Help",
						onClickFunc: toggleBalloonHelp,
					},
					aboutMenuItem,
				],
			},
		],
		[
			appId,
			op,
			closeWindow,
			closeAllFolders,
			handlePathSettingsChange,
			disableBalloonHelp,
			toggleBalloonHelp,
			aboutMenuItem,
		],
	);
```

Note `closeFolder` stays a required prop (still used below at `onCloseFunc={closeFolder}`, unchanged); it's just no longer referenced inside `appMenu`.

- [ ] **Step 4: Update `Finder`'s state, `closeAllFolders`, and the About wiring**

Replace:

```tsx
	const [pathSettings, setPathSettings] = useState<
		Record<string, PathSettingsProps>
	>({});
	const [showAbout, setShowAbout] = useState(false);

	const fs = useClassicyFileSystem();
```

with:

```tsx
	const [pathSettings, setPathSettings] = useState<
		Record<string, PathSettingsProps>
	>({});

	const fs = useClassicyFileSystem();
	const closeWindow = useClassicyWindowClose(appId);
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		appId,
		appName,
		appIcon,
	);
```

Replace:

```tsx
	const closeAllFolders = useCallback(() => {
		const paths: string[] = finderData.openPaths ?? [];
		paths.forEach((path) => {
			desktopEventDispatch({
				type: "ClassicyWindowClose",
				app: { id: appId },
				window: { id: path },
			});
			desktopEventDispatch({
				type: "ClassicyAppFinderCloseFolder",
				path,
			});
		});
	}, [desktopEventDispatch, finderData.openPaths]);
```

with:

```tsx
	const closeAllFolders = useCallback(() => {
		const paths: string[] = finderData.openPaths ?? [];
		paths.forEach((path) => {
			closeWindow(path, { type: "ClassicyAppFinderCloseFolder", path });
		});
	}, [closeWindow, finderData.openPaths]);
```

- [ ] **Step 5: Pass the new props down and render the About window**

Replace:

```tsx
			{finderData.openPaths && finderData.openPaths.length > 0
				? finderData.openPaths.map((p: string, idx: number) => (
						<FinderFolderWindowMemo
							key={`${appName}_${p}`}
							path={p}
							appId={appId}
							idx={idx}
							closeFolder={closeFolder}
							closeAllFolders={closeAllFolders}
							handlePathSettingsChange={handlePathSettingsChange}
							openFolder={openFolder}
							openFile={openFile}
							pathSettings={pathSettings}
							getHeaderString={getHeaderString}
							fs={fs}
							disableBalloonHelp={disableBalloonHelp}
							toggleBalloonHelp={toggleBalloonHelp}
						/>
					))
				: null}
			{showAbout ? (
				<ClassicyAboutWindow
					appId={appId}
					appIcon={appIcon}
					appName={appName}
					hideFunc={() => setShowAbout(false)}
				/>
			) : null}
			{appState.data?.showAboutThisComputer ? (
				<FinderAboutThisComputer />
			) : null}
		</ClassicyApp>
	);
};
```

with:

```tsx
			{finderData.openPaths && finderData.openPaths.length > 0
				? finderData.openPaths.map((p: string, idx: number) => (
						<FinderFolderWindowMemo
							key={`${appName}_${p}`}
							path={p}
							appId={appId}
							idx={idx}
							closeFolder={closeFolder}
							closeAllFolders={closeAllFolders}
							closeWindow={closeWindow}
							handlePathSettingsChange={handlePathSettingsChange}
							openFolder={openFolder}
							openFile={openFile}
							pathSettings={pathSettings}
							getHeaderString={getHeaderString}
							fs={fs}
							disableBalloonHelp={disableBalloonHelp}
							toggleBalloonHelp={toggleBalloonHelp}
							aboutMenuItem={aboutMenuItem}
						/>
					))
				: null}
			{aboutWindow}
			{appState.data?.showAboutThisComputer ? (
				<FinderAboutThisComputer />
			) : null}
		</ClassicyApp>
	);
};
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit -p .` — expect no output. `FinderFolderWindowProps` is defined as `Omit<FinderWindowProps, "dir" | "op"> & { path: string }`, so it automatically picks up the two new required props — no separate edit needed there.

Run: `pnpm vitest run src/SystemFolder/Finder` — expect all existing tests to still pass (they exercise `classicyFinderEventHandler`, not the `Finder`/`FinderWindow` components).

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/Finder/Finder.tsx
git commit -m "refactor(finder): adopt shared Close Window/Close All Windows/About helpers"
```

---

### Task 9: Retrofit Sound Manager

**Files:**
- Modify: `src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager.tsx`

**Interfaces:** `useClassicyAboutMenu` only (single-window app, no Close Window/Close All Windows).

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { getClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindowUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

with:

```tsx
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { useClassicyAboutMenu } from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

- [ ] **Step 2: Replace `showAbout` state and the inline About menu item**

Replace:

```tsx
	const [showAbout, setShowAbout] = useState(false);
```

with:

```tsx
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
```

Replace:

```tsx
	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			menuChildren: [quitMenuItemHelper(APP_ID, APP_NAME, appIcon)],
		},
		{
			id: `${APP_ID}_help`,
			title: "Help",
			menuChildren: [
				{
					id: `${APP_ID}_about`,
					title: "About",
					onClickFunc: () => {
						setShowAbout(true);
					},
				},
			],
		},
	];
```

with:

```tsx
	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			menuChildren: [quitMenuItemHelper(APP_ID, APP_NAME, appIcon)],
		},
		{
			id: `${APP_ID}_help`,
			title: "Help",
			menuChildren: [aboutMenuItem],
		},
	];
```

- [ ] **Step 3: Replace the About window render**

Replace:

```tsx
			{showAbout
				? getClassicyAboutWindow({
						appId: APP_ID,
						appName: APP_NAME,
						appIcon,
						hideFunc: () => setShowAbout(false),
					})
				: null}
		</ClassicyApp>
	);
};
```

with:

```tsx
			{aboutWindow}
		</ClassicyApp>
	);
};
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p .` — expect no output.
Run: `pnpm vitest run src/SystemFolder/ControlPanels/SoundManager` — expect all existing tests to still pass.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager.tsx
git commit -m "refactor(sound-manager): adopt shared useClassicyAboutMenu helper"
```

---

### Task 10: Retrofit Appearance Manager

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx`

**Interfaces:** `useClassicyAboutMenu` only. Same three-step replacement pattern as Task 9, with `APP_ID = "AppearanceManager.app"` / `APP_NAME = "Appearance Manager"`.

- [ ] **Step 1: Update imports**

Find the import of `getClassicyAboutWindow` from `@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindowUtils` and remove it. Add:

```tsx
import { useClassicyAboutMenu } from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
```

alongside the existing `ClassicyApp`/`ClassicyAppUtils` imports.

- [ ] **Step 2: Replace `showAbout` state and the inline About menu item**

Replace:

```tsx
	const [showAbout, setShowAbout] = useState(false);
```

with:

```tsx
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
```

Replace:

```tsx
	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			menuChildren: [quitMenuItemHelper(APP_ID, APP_NAME, appIcon)],
		},
		{
			id: `${APP_ID}_help`,
			title: "Help",
			menuChildren: [
				{
					id: `${APP_ID}_about`,
					title: "About",
					onClickFunc: () => {
						setShowAbout(true);
					},
				},
			],
		},
	];
```

with:

```tsx
	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			menuChildren: [quitMenuItemHelper(APP_ID, APP_NAME, appIcon)],
		},
		{
			id: `${APP_ID}_help`,
			title: "Help",
			menuChildren: [aboutMenuItem],
		},
	];
```

- [ ] **Step 3: Replace the About window render**

Replace:

```tsx
			{showAbout
				? getClassicyAboutWindow({
						appId: APP_ID,
						appName: APP_NAME,
						appIcon,
						hideFunc: () => setShowAbout(false),
					})
				: null}
		</ClassicyApp>
	);
};
```

with:

```tsx
			{aboutWindow}
		</ClassicyApp>
	);
};
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p .` — expect no output.
Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppearanceManager` — expect all existing tests to still pass.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.tsx
git commit -m "refactor(appearance-manager): adopt shared useClassicyAboutMenu helper"
```

---

### Task 11: Retrofit Date & Time Manager

**Files:**
- Modify: `src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx`

**Interfaces:** `useClassicyAboutMenu` only. Same pattern as Tasks 9-10, with `APP_ID = "DateAndTimeManager.app"` / `APP_NAME = "Date and Time Manager"`.

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { getClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindowUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

with:

```tsx
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { useClassicyAboutMenu } from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
```

- [ ] **Step 2: Replace `showAbout` state and the inline About menu item**

Replace:

```tsx
	const [showAbout, setShowAbout] = useState(false);
```

with:

```tsx
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
```

Replace:

```tsx
	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			menuChildren: [quitMenuItemHelper(APP_ID, APP_NAME, appIcon)],
		},
		{
			id: `${APP_ID}_help`,
			title: "Help",
			menuChildren: [
				{
					id: `${APP_ID}_about`,
					title: "About",
					onClickFunc: () => {
						setShowAbout(true);
					},
				},
			],
		},
	];
```

with:

```tsx
	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			menuChildren: [quitMenuItemHelper(APP_ID, APP_NAME, appIcon)],
		},
		{
			id: `${APP_ID}_help`,
			title: "Help",
			menuChildren: [aboutMenuItem],
		},
	];
```

- [ ] **Step 3: Replace the About window render**

Replace:

```tsx
			{showAbout
				? getClassicyAboutWindow({
						appId: APP_ID,
						appName: APP_NAME,
						appIcon,
						hideFunc: () => setShowAbout(false),
					})
				: null}
		</ClassicyApp>
	);
};
```

with:

```tsx
			{aboutWindow}
		</ClassicyApp>
	);
};
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit -p .` — expect no output.
Run: `pnpm vitest run src/SystemFolder/ControlPanels/DateAndTimeManager` — expect all existing tests to still pass.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager.tsx
git commit -m "refactor(date-time-manager): adopt shared useClassicyAboutMenu helper"
```

---

### Task 12: Full verification

**Files:** None (verification only).

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no output.

- [ ] **Step 2: Full test suite**

Run: `pnpm vitest run`
Expected: all test files pass (baseline was 778 tests across 60 files before this plan; this plan adds roughly 21 new tests across 2 files).

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no new errors introduced in any file touched by this plan (pre-existing SVG-asset lint errors are out of scope and unrelated).

- [ ] **Step 4: Full build**

Run: `pnpm build:source`
Expected: builds successfully, no TypeScript errors, barrels regenerate cleanly.

- [ ] **Step 5: Manual verification in the browser**

Use the project's `run` capability (or `pnpm preview`) to launch the example app. Open Movie Player, open its demo video, and confirm:
- The File menu shows Close Window, Close All Windows, and Quit, in that order.
- The Help menu shows About, and clicking it shows the About window with the app's name and icon.
- Close Window closes just that window; opening it again and clicking Close All Windows (with the window open) closes it too.

Repeat the same check for Picture Viewer's demo image.

- [ ] **Step 6: Final commit (only if Step 5 surfaced fixes)**

If manual verification required any fix, commit it separately with a clear message describing what was wrong and what changed. If no fixes were needed, this step is a no-op — do not create an empty commit.
