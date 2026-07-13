# Window/App Focus Coordination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce a global focus invariant (at most one focused window, exactly one focused app) and make the app switcher restore an app's last-accessed window.

**Architecture:** All focus writes route through two canonical helpers in `ClassicyAppHelpers.ts` — a new `focusWindow(ds, appId, windowId, menuBar?)` (global defocus + focus one window + stamp recency) and a rewritten `focusApp(ds, appId)` (activate app + restore a window via a fallback chain: `lastAccessedWindowId` → highest `zOrder` → `default` → last-in-array, all non-closed; none if all closed). The window event reducer and two components are adjusted so no code path can create focus state outside these helpers. Spec: `docs/superpowers/specs/2026-07-13-window-app-focus-coordination-design.md`.

**Tech Stack:** TypeScript, React, Zustand (state written inside reducer-style handlers that mutate a draft store), Vitest + @testing-library/react (jsdom).

## Global Constraints

- Package manager is **pnpm** (`corepack enable` if missing). Test runner is **vitest**: full suite `pnpm test`, single file `pnpm vitest run <path>`.
- Indentation is **tabs** in all `src/` files. Match surrounding style exactly.
- Never edit `index.ts` barrel files — barrelsby regenerates them during `pnpm build:source`.
- Do not add new event types; do not change the localStorage persistence key or shape beyond the one optional field `lastAccessedWindowId`.
- Keep `activateApp` exported (as an alias of `focusApp`) — it is public npm-package API.
- The store handlers mutate `ds` in place and return it; follow that pattern (no immer, no spreads of the whole store).

---

### Task 1: Global `deFocusApps` sweep, new `focusWindow` helper, `lastAccessedWindowId` field

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` (interface field + re-export)
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`

**Interfaces:**
- Consumes: existing `ClassicyStore`, `ClassicyStoreSystemApp`, `ClassicyStoreSystemAppWindow`, `ClassicyMenuItem` types.
- Produces (later tasks rely on these exact signatures):
  - `deFocusApps(ds: ClassicyStore): ClassicyStore` — now sweeps **all** apps/windows.
  - `focusWindow(ds: ClassicyStore, appId: string, windowId: string, menuBar?: ClassicyMenuItem[]): ClassicyStore`
  - `ClassicyStoreSystemApp.lastAccessedWindowId?: string`

- [ ] **Step 1: Write the failing tests**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`:

Add `focusWindow` to the existing import block at the top of the file:

```ts
import {
	activateApp,
	classicyAppEventHandler,
	classicyDesktopStateEventReducer,
	closeApp,
	deFocusApps,
	focusApp,
	focusWindow,
	loadApp,
	mergeClassicyState,
	openApp,
	registerAppEventHandler,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
```

Append these describe blocks at the end of the file:

```ts
function makeWindow(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		closed: false,
		focused: false,
		size: [400, 300] as [number, number],
		position: [0, 0] as [number, number],
		minimumSize: [100, 100] as [number, number],
		...overrides,
	};
}

describe("deFocusApps — global sweep", () => {
	it("clears focus flags on ALL apps and windows, even when focusedAppId is stale", () => {
		const ds = makeStore();
		// Corrupted state: two apps and two windows focused, pointer already cleared
		ds.System.Manager.Applications.focusedAppId = undefined;
		ds.System.Manager.Applications.apps["Finder.app"].focused = true;
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			makeWindow("fw", { focused: true }),
		];
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: true,
			windows: [makeWindow("nw", { focused: true })],
			data: {},
		};

		deFocusApps(ds);

		const apps = ds.System.Manager.Applications.apps;
		expect(apps["Finder.app"].focused).toBe(false);
		expect(apps["Finder.app"].windows[0].focused).toBe(false);
		expect(apps["Notes.app"].focused).toBe(false);
		expect(apps["Notes.app"].windows[0].focused).toBe(false);
		expect(ds.System.Manager.Applications.focusedAppId).toBeUndefined();
	});
});

describe("focusWindow", () => {
	function makeTwoAppStore() {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			makeWindow("fw1", { focused: true }),
		];
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [makeWindow("nw1"), makeWindow("nw2")],
			data: {},
		};
		return ds;
	}

	it("focuses the target window and app and defocuses everything else globally", () => {
		const ds = makeTwoAppStore();

		focusWindow(ds, "Notes.app", "nw2");

		const apps = ds.System.Manager.Applications.apps;
		expect(apps["Notes.app"].focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Notes.app");
		expect(apps["Notes.app"].windows.find((w) => w.id === "nw2")?.focused).toBe(
			true,
		);
		expect(apps["Notes.app"].windows.find((w) => w.id === "nw1")?.focused).toBe(
			false,
		);
		expect(apps["Finder.app"].focused).toBe(false);
		expect(apps["Finder.app"].windows[0].focused).toBe(false);
		// Global invariant: exactly one focused window across the whole store
		const focusedCount = Object.values(apps)
			.flatMap((a) => a.windows)
			.filter((w) => w.focused).length;
		expect(focusedCount).toBe(1);
	});

	it("stamps zOrder on the window and lastAccessedWindowId on the app", () => {
		const ds = makeTwoAppStore();

		focusWindow(ds, "Notes.app", "nw1");

		const app = ds.System.Manager.Applications.apps["Notes.app"];
		expect(app.lastAccessedWindowId).toBe("nw1");
		expect(app.windows.find((w) => w.id === "nw1")?.zOrder).toBeTypeOf("number");
	});

	it("prefers the provided menuBar over the window's stored menuBar", () => {
		const ds = makeTwoAppStore();
		const storedMenu = [{ id: "stored", title: "Stored" }];
		const freshMenu = [{ id: "fresh", title: "Fresh" }];
		ds.System.Manager.Applications.apps["Notes.app"].windows[0].menuBar =
			storedMenu;

		focusWindow(ds, "Notes.app", "nw1", freshMenu);

		expect(ds.System.Manager.Desktop.appMenu).toBe(freshMenu);
	});

	it("falls back to the window's stored menuBar when no menuBar is provided", () => {
		const ds = makeTwoAppStore();
		const storedMenu = [{ id: "stored", title: "Stored" }];
		ds.System.Manager.Applications.apps["Notes.app"].windows[0].menuBar =
			storedMenu;

		focusWindow(ds, "Notes.app", "nw1");

		expect(ds.System.Manager.Desktop.appMenu).toBe(storedMenu);
	});

	it("leaves Desktop.appMenu unchanged when neither menu is available", () => {
		const ds = makeTwoAppStore();
		const existingMenu = [{ id: "existing", title: "Existing" }];
		ds.System.Manager.Desktop.appMenu = existingMenu;

		focusWindow(ds, "Notes.app", "nw1");

		expect(ds.System.Manager.Desktop.appMenu).toBe(existingMenu);
	});

	it("does not change closed or collapsed flags", () => {
		const ds = makeTwoAppStore();
		ds.System.Manager.Applications.apps["Notes.app"].windows[0].collapsed =
			true;

		focusWindow(ds, "Notes.app", "nw1");

		const nw1 = ds.System.Manager.Applications.apps["Notes.app"].windows[0];
		expect(nw1.collapsed).toBe(true);
		expect(nw1.closed).toBe(false);
		expect(nw1.focused).toBe(true);
	});

	it("still focuses the app when the window id is unknown", () => {
		const ds = makeTwoAppStore();

		focusWindow(ds, "Notes.app", "does-not-exist");

		expect(ds.System.Manager.Applications.apps["Notes.app"].focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Notes.app");
		const anyWindowFocused = Object.values(
			ds.System.Manager.Applications.apps,
		)
			.flatMap((a) => a.windows)
			.some((w) => w.focused);
		expect(anyWindowFocused).toBe(false);
		expect(
			ds.System.Manager.Applications.apps["Notes.app"].lastAccessedWindowId,
		).toBeUndefined();
	});

	it("does not throw and changes nothing when the app does not exist", () => {
		const ds = makeTwoAppStore();

		expect(() => focusWindow(ds, "Nope.app", "w")).not.toThrow();

		// Pre-existing focus is untouched
		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			true,
		);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
	});
});
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: FAIL — `focusWindow` is not exported (SyntaxError/undefined import), and the `deFocusApps — global sweep` test fails because the current implementation only clears the app pointed to by `focusedAppId`.

- [ ] **Step 3: Implement**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts`, replace the imports and `deFocusApps`, and add `focusWindow` directly after `deFocusApps`:

```ts
import type {
	ClassicyStore,
	ClassicyStoreSystemApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
```

(`ClassicyStoreSystemApp` is used by Task 2's `pickWindowToRestore`; importing it now is harmless — if lint flags it as unused, add it in Task 2 instead.)

```ts
export function deFocusApps(ds: ClassicyStore) {
	for (const app of Object.values(ds.System.Manager.Applications.apps)) {
		app.focused = false;
		app.windows.forEach((w) => {
			w.focused = false;
		});
	}
	ds.System.Manager.Applications.focusedAppId = undefined;
	return ds;
}

export function focusWindow(
	ds: ClassicyStore,
	appId: string,
	windowId: string,
	menuBar?: ClassicyMenuItem[],
) {
	const app = ds.System.Manager.Applications.apps[appId];
	if (!app) return ds;
	deFocusApps(ds);
	app.focused = true;
	ds.System.Manager.Applications.focusedAppId = appId;
	const win = app.windows.find((w) => w.id === windowId);
	if (win) {
		win.focused = true;
		win.zOrder = Date.now();
		app.lastAccessedWindowId = windowId;
		const menu = menuBar ?? win.menuBar;
		if (menu) {
			ds.System.Manager.Desktop.appMenu = menu;
		}
	}
	return ds;
}
```

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`:

1. Add the field to `ClassicyStoreSystemApp` (after `focused?: boolean;`):

```ts
	focused?: boolean;
	lastAccessedWindowId?: string;
```

2. Add `focusWindow` to BOTH the import from `ClassicyAppHelpers` (lines 7–15) and the re-export block (lines 126–134):

```ts
import {
	activateApp,
	closeApp,
	deFocusApps,
	focusApp,
	focusWindow,
	getDefaultAppForFileType,
	loadApp,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
```

```ts
export {
	activateApp,
	closeApp,
	deFocusApps,
	focusApp,
	focusWindow,
	getDefaultAppForFileType,
	loadApp,
	openApp,
};
```

- [ ] **Step 4: Run the test file to verify everything passes**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: PASS — including all pre-existing `deFocusApps` tests (they only assert flags that the sweep also clears; the "no-op when focusedAppId is undefined" test passes because its only focused app has `focused: false` already).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts
git commit -m "feat: add focusWindow helper and global deFocusApps sweep"
```

---

### Task 2: Rewrite `focusApp` with the restoration chain; `activateApp` becomes an alias

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts:223-228` (`ClassicyAppActivate` case)
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`

**Interfaces:**
- Consumes: `focusWindow`, `deFocusApps` from Task 1.
- Produces: `focusApp(ds: ClassicyStore, appId: string): void` with new semantics (never reopens closed windows; restores last-accessed); `activateApp` as `export const activateApp = focusApp;`.

- [ ] **Step 1: Update existing tests that assert the OLD semantics, and add new ones**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`:

**(a)** Replace the test `"opens and focuses the default window when one exists"` (in `describe("focusApp")`) with these two tests:

```ts
	it("focuses the default non-closed window and does NOT reopen closed windows", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [
				{
					id: "main",
					closed: false,
					default: true,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
				{
					id: "secondary",
					closed: true,
					default: false,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		focusApp(ds, "Notes.app");

		const windows = ds.System.Manager.Applications.apps["Notes.app"].windows;
		expect(windows.find((w) => w.id === "main")?.focused).toBe(true);
		// Closed windows are never reopened by activation
		expect(windows.find((w) => w.id === "secondary")?.closed).toBe(true);
		expect(windows.find((w) => w.id === "secondary")?.focused).toBeFalsy();
	});

	it("activates the app with NO focused window when all its windows are closed", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [
				{
					id: "main",
					closed: true,
					default: true,
					size: [400, 300],
					position: [0, 0],
					minimumSize: [100, 100],
				},
			],
			data: {},
		};

		focusApp(ds, "Notes.app");

		expect(ds.System.Manager.Applications.apps["Notes.app"].focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Notes.app");
		const windows = ds.System.Manager.Applications.apps["Notes.app"].windows;
		expect(windows.every((w) => !w.focused)).toBe(true);
		expect(windows.every((w) => w.closed)).toBe(true);
	});
```

**(b)** In the test `"focuses the last window when no default window exists and multiple windows are present"`, change all three windows from `closed: true` to `closed: false`, and change the two final assertions to:

```ts
		expect(lastWindow?.closed).toBe(false);
		expect(lastWindow?.focused).toBe(true);
```

**(c)** In `describe("activateApp")`:
- DELETE the test `"does NOT change the windows of the target app (unlike focusApp)"` (that behavior is intentionally gone).
- In the test `"only defocuses windows of the previously-focused app"`, rename it to `"defocuses windows of other apps"` and delete the trailing comment line `// Third app's windows are unchanged (not iterated)` (the sweep now iterates all apps; the assertion itself still holds).
- Add one test at the end of the describe:

```ts
	it("is an alias of focusApp", () => {
		expect(activateApp).toBe(focusApp);
	});
```

**(d)** Append a new describe block at the end of the file:

```ts
describe("focusApp — restoration chain", () => {
	function makeChainStore() {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [
				makeWindow("older", { zOrder: 1000 }),
				makeWindow("newer", { zOrder: 2000 }),
				makeWindow("untouched", { default: true }),
			],
			data: {},
		};
		return ds;
	}

	it("prefers lastAccessedWindowId over zOrder and default", () => {
		const ds = makeChainStore();
		ds.System.Manager.Applications.apps["Notes.app"].lastAccessedWindowId =
			"older";

		focusApp(ds, "Notes.app");

		const windows = ds.System.Manager.Applications.apps["Notes.app"].windows;
		expect(windows.find((w) => w.id === "older")?.focused).toBe(true);
	});

	it("falls back to the highest-zOrder non-closed window when lastAccessedWindowId is stale", () => {
		const ds = makeChainStore();
		ds.System.Manager.Applications.apps["Notes.app"].lastAccessedWindowId =
			"gone-window";

		focusApp(ds, "Notes.app");

		const windows = ds.System.Manager.Applications.apps["Notes.app"].windows;
		expect(windows.find((w) => w.id === "newer")?.focused).toBe(true);
	});

	it("skips a closed lastAccessedWindowId and falls back to zOrder", () => {
		const ds = makeChainStore();
		const app = ds.System.Manager.Applications.apps["Notes.app"];
		app.lastAccessedWindowId = "older";
		const older = app.windows.find((w) => w.id === "older");
		if (older) older.closed = true;

		focusApp(ds, "Notes.app");

		expect(app.windows.find((w) => w.id === "newer")?.focused).toBe(true);
		expect(app.windows.find((w) => w.id === "older")?.closed).toBe(true);
	});

	it("falls back to the default window when no window has a zOrder", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps["Notes.app"] = {
			id: "Notes.app",
			name: "Notes",
			icon: "",
			open: true,
			focused: false,
			windows: [makeWindow("plain"), makeWindow("main", { default: true })],
			data: {},
		};

		focusApp(ds, "Notes.app");

		const windows = ds.System.Manager.Applications.apps["Notes.app"].windows;
		expect(windows.find((w) => w.id === "main")?.focused).toBe(true);
	});

	it("focuses a collapsed last-accessed window without expanding it", () => {
		const ds = makeChainStore();
		const app = ds.System.Manager.Applications.apps["Notes.app"];
		app.lastAccessedWindowId = "older";
		const older = app.windows.find((w) => w.id === "older");
		if (older) older.collapsed = true;

		focusApp(ds, "Notes.app");

		expect(app.windows.find((w) => w.id === "older")?.focused).toBe(true);
		expect(app.windows.find((w) => w.id === "older")?.collapsed).toBe(true);
	});

	it("updates lastAccessedWindowId to the restored window", () => {
		const ds = makeChainStore();

		focusApp(ds, "Notes.app");

		// "newer" wins via zOrder, and becomes the new last-accessed window
		expect(
			ds.System.Manager.Applications.apps["Notes.app"].lastAccessedWindowId,
		).toBe("newer");
	});
});
```

- [ ] **Step 2: Run tests to verify the new/changed ones fail**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: FAIL — the restoration-chain tests fail (current `focusApp` prefers the `default` window and reopens closed ones); `"is an alias of focusApp"` fails (separate functions); `"activates the app with NO focused window..."` fails (current code reopens+focuses).

- [ ] **Step 3: Implement**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts`, replace the entire existing `focusApp` function with:

```ts
function pickWindowToRestore(app: ClassicyStoreSystemApp) {
	const candidates = app.windows.filter((w) => !w.closed);
	if (candidates.length === 0) return undefined;
	const lastAccessed = candidates.find(
		(w) => w.id === app.lastAccessedWindowId,
	);
	if (lastAccessed) return lastAccessed;
	const withZOrder = candidates.filter((w) => w.zOrder !== undefined);
	if (withZOrder.length > 0) {
		return withZOrder.reduce((best, w) =>
			(w.zOrder ?? 0) > (best.zOrder ?? 0) ? w : best,
		);
	}
	return (
		candidates.find((w) => w.default) ?? candidates[candidates.length - 1]
	);
}

export function focusApp(ds: ClassicyStore, appId: string) {
	const app = ds.System.Manager.Applications.apps[appId];
	if (!app) return;
	const restore = pickWindowToRestore(app);
	if (restore) {
		focusWindow(ds, appId, restore.id);
	} else {
		deFocusApps(ds);
		app.focused = true;
		ds.System.Manager.Applications.focusedAppId = appId;
	}
}
```

Then replace the entire existing `activateApp` function with:

```ts
/**
 * @deprecated Alias of focusApp, kept for public API compatibility.
 */
export const activateApp = focusApp;
```

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`, the `ClassicyAppActivate` case needs no code change (it calls `activateApp`, which is now the alias) — leave it as is.

- [ ] **Step 4: Run the full app-manager and routing test files**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/`
Expected: PASS. Notes on pre-existing tests that must still pass:
- `"sets ds.System.Manager.Desktop.appMenu when the focused window has menuBar and is the default window"` — passes because the chain reaches the `default` fallback and `focusWindow` swaps the stored `menuBar`.
- `"ClassicyAppClose — focus transfer"` — passes; Finder has no windows, so `focusApp` takes the no-window branch.
- `"routes ClassicyWindowFocus..."` — untouched until Task 3.

If any test fails, fix the implementation (not the test) unless the test encodes the old reopen/default-first semantics — those were all rewritten in Step 1.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts
git commit -m "feat: focusApp restores last-accessed window; activateApp aliases focusApp"
```

---

### Task 3: Route the window event reducer through `focusWindow`

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx` (cases `ClassicyWindowFocus`, `ClassicyWindowOpen`, `ClassicyWindowClose`)
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`

**Interfaces:**
- Consumes: `focusWindow(ds, appId, windowId, menuBar?)` from Task 1.
- Produces: reducer behavior relied on by Tasks 4–5: a genuinely new window is focused by `ClassicyWindowOpen` itself; `ClassicyWindowFocus` is globally self-sufficient.

- [ ] **Step 1: Write the failing tests**

In `src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`, append at the end of the file:

```ts
describe("ClassicyWindowFocus — global invariant", () => {
	it("defocuses other apps and their windows in a single action", () => {
		const ds = makeStoreWithWindows();
		// Finder starts focused with a focused window (cross-app state)
		ds.System.Manager.Applications.focusedAppId = "Finder.app";
		ds.System.Manager.Applications.apps["Finder.app"].windows = [
			{
				id: "finder-w",
				closed: false,
				collapsed: false,
				dragging: false,
				moving: false,
				resizing: false,
				zoomed: false,
				focused: true,
				size: [400, 300],
				position: [0, 0],
				minimumSize: [100, 100],
			},
		];

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowFocus",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});

		const apps = ds.System.Manager.Applications.apps;
		expect(apps["Finder.app"].focused).toBe(false);
		expect(apps["Finder.app"].windows[0].focused).toBe(false);
		expect(apps.TestApp.focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
		const focusedWindows = Object.values(apps)
			.flatMap((a) => a.windows)
			.filter((w) => w.focused);
		expect(focusedWindows).toHaveLength(1);
		expect(focusedWindows[0].id).toBe("w1");
	});

	it("records lastAccessedWindowId on the app", () => {
		const ds = makeStoreWithWindows();

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowFocus",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});

		expect(
			ds.System.Manager.Applications.apps.TestApp.lastAccessedWindowId,
		).toBe("w1");
	});
});

describe("ClassicyWindowOpen — focus of new windows", () => {
	it("focuses a genuinely new window and defocuses everything else", () => {
		const ds = makeStoreWithWindows();
		ds.System.Manager.Applications.apps["Finder.app"].focused = true;
		ds.System.Manager.Applications.focusedAppId = "Finder.app";

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "w3",
				minimumSize: [100, 100],
				size: [500, 350],
				position: [150, 150],
			},
		});

		const apps = ds.System.Manager.Applications.apps;
		expect(apps.TestApp.windows.find((w) => w.id === "w3")?.focused).toBe(true);
		expect(apps.TestApp.focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
		expect(apps["Finder.app"].focused).toBe(false);
		// w2 was focused in the fixture; the new window took over
		expect(apps.TestApp.windows.find((w) => w.id === "w2")?.focused).toBe(
			false,
		);
	});

	it("does NOT steal focus when re-registering an existing window", () => {
		const ds = makeStoreWithWindows();
		ds.System.Manager.Applications.focusedAppId = "Finder.app";

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "w1",
				minimumSize: [100, 100],
				size: [999, 999],
				position: [50, 50],
			},
		});

		// w2 keeps its focus from the fixture; focusedAppId untouched
		expect(
			ds.System.Manager.Applications.apps.TestApp.windows.find(
				(w) => w.id === "w2",
			)?.focused,
		).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
	});
});

describe("ClassicyWindowClose — focus promotion", () => {
	function makeCloseStore() {
		const ds = makeStoreWithWindows();
		const testApp = ds.System.Manager.Applications.apps.TestApp;
		testApp.focused = true;
		testApp.windows[0].zOrder = 1000; // w1
		testApp.windows[1].zOrder = 2000; // w2 (focused in fixture)
		ds.System.Manager.Applications.apps["Finder.app"].focused = false;
		ds.System.Manager.Applications.focusedAppId = "TestApp";
		return ds;
	}

	it("promotes the highest-zOrder sibling via focusWindow when the focused app closes a window", () => {
		const ds = makeCloseStore();

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});

		const testApp = ds.System.Manager.Applications.apps.TestApp;
		expect(testApp.windows.find((w) => w.id === "w2")?.closed).toBe(true);
		expect(testApp.windows.find((w) => w.id === "w1")?.focused).toBe(true);
		// Promotion goes through focusWindow, so recency bookkeeping updates too
		expect(testApp.lastAccessedWindowId).toBe("w1");
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
	});

	it("does NOT steal global focus when a background app's window closes", () => {
		const ds = makeStoreWithWindows();
		// Finder is the focused app; TestApp is in the background
		ds.System.Manager.Applications.focusedAppId = "Finder.app";
		ds.System.Manager.Applications.apps["Finder.app"].focused = true;
		ds.System.Manager.Applications.apps.TestApp.focused = false;

		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});

		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
		expect(ds.System.Manager.Applications.apps["Finder.app"].focused).toBe(
			true,
		);
		// No TestApp window was promoted to focused
		expect(
			ds.System.Manager.Applications.apps.TestApp.windows.some(
				(w) => w.focused,
			),
		).toBe(false);
	});
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`
Expected: FAIL — cross-app defocus, lastAccessedWindowId, new-window focus, and the background-close guard are all unimplemented.

- [ ] **Step 3: Implement**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx`:

1. Add the import (after the existing `ClassicyActionPredicates` import):

```ts
import { focusWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
```

2. In case `ClassicyWindowOpen`, add one line after the `windows.push({...})` call (inside the `if (window < 0)` branch, after the push):

```ts
				// A genuinely new window opens focused (Mac behavior); re-registered
				// persisted windows must not steal focus.
				ds = focusWindow(ds, action.app.id, win.id);
```

3. Replace the entire body of case `ClassicyWindowFocus` with:

```ts
		case "ClassicyWindowFocus": {
			if (!hasAppAndWindow(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			// Prefer fresh appMenu from component props (has closures) over stored menuBar
			const appObj = action.app as Record<string, unknown>;
			const winObj = action.window as Record<string, unknown>;
			const freshMenu = (Array.isArray(appObj.appMenu) ? appObj.appMenu : null) ||
				(Array.isArray(winObj.menuBar) ? winObj.menuBar : null);
			ds = focusWindow(
				ds,
				action.app.id,
				action.window.id,
				(freshMenu as ClassicyMenuItem[] | null) ?? undefined,
			);
			break;
		}
```

4. Replace the entire body of case `ClassicyWindowClose` with:

```ts
		case "ClassicyWindowClose": {
			if (!hasAppAndWindow(action)) break;
			ds = updateWindow(action.app.id, action.window.id, {
				closed: true,
				focused: false,
			});
			// Promote a sibling only when this app holds focus — closing a
			// background app's window must not steal global focus.
			if (ds.System.Manager.Applications.focusedAppId !== action.app.id) {
				break;
			}
			const openWindows = ds.System.Manager.Applications.apps[
				action.app.id
			]?.windows.filter((w) => !w.closed && w.id !== action.window.id);
			if (openWindows?.length) {
				const nextFocus = openWindows.reduce((best, w) =>
					(w.zOrder ?? 0) > (best.zOrder ?? 0) ? w : best,
				);
				ds = focusWindow(ds, action.app.id, nextFocus.id);
			}
			break;
		}
```

- [ ] **Step 4: Run the desktop and app-manager test files**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ src/SystemFolder/ControlPanels/AppManager/`
Expected: PASS. Pre-existing tests worth watching:
- `ClassicyWindowOpen "adds a new window to the app"` — still passes (asserts only window count/presence; the new focus side-effect is additive).
- `ClassicyWindowFocus "updates appMenu when menuBar is provided on the window"` / `"...appMenu on the app action"` — pass via the `freshMenu` path preserved above.
- `ClassicyWindowClose` tests in `ClassicyWindowEventHandler.test.ts` and `ClassicyReducerRouting.test.ts` — pass: their fixtures have no `focusedAppId` matching the acting app, so the new guard skips promotion, and they only assert `closed` flags.

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts
git commit -m "feat: enforce global focus invariant in window event reducer"
```

---

### Task 4: Remove the mount-time focus dispatch from `ClassicyWindow`

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx:292-316`
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindow.mountfocus.test.tsx`

**Interfaces:**
- Consumes: Task 3's guarantee that `ClassicyWindowOpen` focuses genuinely-new windows (so removing the mount-time `ClassicyWindowFocus` loses nothing for new windows).
- Produces: mounting a persisted window never dispatches `ClassicyWindowFocus` (so reload cannot clobber `lastAccessedWindowId` or global focus).

- [ ] **Step 1: Write the failing component test**

Create `src/SystemFolder/SystemResources/Window/ClassicyWindow.mountfocus.test.tsx` (mock pattern copied from `ClassicyWindow.titlebar.test.tsx`):

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Applications: {
							apps: {
								TestApp: {
									focused: false,
									windows: [
										{
											id: "TestWindow",
											appId: "TestApp",
											collapsed: false,
											focused: false,
											dragging: false,
											moving: false,
											resizing: false,
											zoomed: false,
											closed: false,
											size: [350, 200] as [number, number],
											position: [110, 110] as [number, number],
											minimumSize: [0, 0] as [number, number],
											menuBar: [] as unknown[],
											showContextMenu: false,
											default: false,
										},
									],
								},
							},
						},
					},
				},
			};
			return selector(mockState);
		},
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => mockPlayer,
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Cursor/useClassicyCursor", () => ({
	useClassicyCursor: () => vi.fn(),
}));

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { files: { file: "file.png" } } },
}));

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);

describe("ClassicyWindow mount", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	it("registers via ClassicyWindowOpen but never dispatches ClassicyWindowFocus on mount", () => {
		render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Test"
				appMenu={[{ id: "file", title: "File" }]}
			>
				<p>content</p>
			</ClassicyWindow>,
		);

		const types = mockDispatch.mock.calls.map(
			(call) => (call[0] as { type: string }).type,
		);
		expect(types).toContain("ClassicyWindowOpen");
		expect(types).not.toContain("ClassicyWindowFocus");
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.mountfocus.test.tsx`
Expected: FAIL — the current mount effect dispatches `ClassicyWindowFocus` whenever `appMenu` is set.

- [ ] **Step 3: Implement**

In `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`, replace the mount-registration effect (currently lines 292–316):

```ts
	const windowRegistered = useRef(false);
	useEffect(() => {
		if (!windowRegistered.current) {
			windowRegistered.current = true;
			desktopEventDispatch({
				type: "ClassicyWindowOpen",
				window: ws,
				app: {
					id: appId,
				},
			});
			// Refresh the desktop menu bar with fresh closures from the component
			// props, since onClickFunc cannot survive JSON serialization to localStorage.
			if (appMenu) {
				desktopEventDispatch({
					type: "ClassicyWindowFocus",
					app: {
						id: appId,
						appMenu: appMenu,
					},
					window: ws,
				});
			}
		}
	}, [appId, ws, appMenu, desktopEventDispatch]);
```

with:

```ts
	const windowRegistered = useRef(false);
	useEffect(() => {
		if (!windowRegistered.current) {
			windowRegistered.current = true;
			// A genuinely new window is focused by the ClassicyWindowOpen handler;
			// a persisted window re-registering must not steal focus. Menu-closure
			// refresh for the focused window happens in the ws.focused effect below.
			desktopEventDispatch({
				type: "ClassicyWindowOpen",
				window: ws,
				app: {
					id: appId,
				},
			});
		}
	}, [appId, ws, desktopEventDispatch]);
```

- [ ] **Step 4: Run the window tests**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/`
Expected: PASS (both the new file and `ClassicyWindow.titlebar.test.tsx` if present in the working tree).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx src/SystemFolder/SystemResources/Window/ClassicyWindow.mountfocus.test.tsx
git commit -m "fix: stop stealing focus on window mount; new windows focus via reducer"
```

---

### Task 5: Guard `ClassicyApp`'s default-window effect against closed windows

**Files:**
- Modify: `src/SystemFolder/SystemResources/App/ClassicyApp.tsx:131-155`
- Create: `src/SystemFolder/SystemResources/App/ClassicyApp.defaultwindow.test.tsx`

**Interfaces:**
- Consumes: nothing new — pure guard on the existing effect.
- Produces: the effect only dispatches `ClassicyWindowFocus` for a `defaultWindow` that exists AND is not closed.

- [ ] **Step 1: Write the failing component test**

Create `src/SystemFolder/SystemResources/App/ClassicyApp.defaultwindow.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockAppState = vi.hoisted(() => ({
	defaultWindowClosed: true,
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Applications: {
							apps: {
								TestApp: {
									id: "TestApp",
									name: "Test",
									icon: "",
									open: true,
									focused: true,
									windows: [
										{
											id: "main",
											closed: mockAppState.defaultWindowClosed,
											focused: false,
											size: [350, 200] as [number, number],
											position: [110, 110] as [number, number],
											minimumSize: [0, 0] as [number, number],
										},
									],
									data: {},
								},
							},
						},
						Appearance: {
							activeTheme: {
								color: {
									white: 0xffffff,
									black: 0x000000,
									error: 0xff0000,
									system: [0, 0, 0, 0, 0, 0, 0, 0],
									theme: [0, 0, 0, 0, 0, 0, 0, 0],
								},
							},
						},
					},
				},
			};
			return selector(mockState);
		},
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: () => null,
}));

function renderApp() {
	return render(
		<ClassicyApp id="TestApp" name="Test" icon="" defaultWindow="main" />,
	);
}

const focusDispatches = () =>
	mockDispatch.mock.calls
		.map((call) => call[0] as { type: string })
		.filter((e) => e.type === "ClassicyWindowFocus");

describe("ClassicyApp default-window focus effect", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("does NOT focus the default window when it is closed", () => {
		mockAppState.defaultWindowClosed = true;
		renderApp();
		expect(focusDispatches()).toHaveLength(0);
	});

	it("focuses the default window when it is open and nothing else is focused", () => {
		mockAppState.defaultWindowClosed = false;
		renderApp();
		expect(focusDispatches().length).toBeGreaterThan(0);
	});
});
```

- [ ] **Step 2: Run to verify the first test fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyApp.defaultwindow.test.tsx`
Expected: FAIL on `"does NOT focus the default window when it is closed"` (current effect only checks existence, not `closed`). The second test passes already.

- [ ] **Step 3: Implement**

In `src/SystemFolder/SystemResources/App/ClassicyApp.tsx`, in the effect at lines 131–155, replace:

```ts
			const defaultWindowExists = appContext?.windows?.some(
				(w) => w.id === defaultWindow,
			);
			if (!anyWindowFocused && defaultWindowExists) {
```

with:

```ts
			const defaultWin = appContext?.windows?.find(
				(w) => w.id === defaultWindow,
			);
			if (!anyWindowFocused && defaultWin && !defaultWin.closed) {
```

- [ ] **Step 4: Run the app component tests**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/SystemResources/App/ClassicyApp.tsx src/SystemFolder/SystemResources/App/ClassicyApp.defaultwindow.test.tsx
git commit -m "fix: never auto-focus a closed default window"
```

---

### Task 6: Full-repo verification

**Files:**
- No new files. Fix-ups only if verification fails.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: green suite, clean lint, successful library build.

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS, 0 failures. (~800 tests; the suites touched are `ClassicyAppManager.test.ts`, `ClassicyReducerRouting.test.ts`, `ClassicyWindowEventHandler.test.ts`, plus the two new component test files.)

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: exit 0. If `ClassicyStoreSystemApp` was imported in Task 1 but flagged unused there, it is used by Task 2's `pickWindowToRestore` — this passes now; any other new warnings must be fixed in the touched files.

- [ ] **Step 3: Build the library**

Run: `pnpm build:source`
Expected: TypeScript + Vite build completes; barrels regenerate (do not hand-edit any generated `index.ts`; if barrels changed, include them in the commit below).

- [ ] **Step 4: Commit any build/lint fix-ups**

```bash
git status --short
# only if there are changes:
git add -A src/
git commit -m "chore: focus coordination verification fix-ups"
```

---

## Self-Review Notes (already applied)

- **Spec coverage:** invariant enforcement → Tasks 1+3; last-accessed restoration → Task 2; app-switcher path (`ClassicyAppFocus` → `focusApp`) needs no menu-bar change (Task 2 covers it); collapsed-stays-collapsed → Task 2 test; no-reopen + no-window activation → Task 2; mount-focus removal → Task 4; default-window guard → Task 5; `ClassicyAppClose` fallback inherits Task 2; `ClassicyWindowClose` promotion via `focusWindow` + background guard → Task 3.
- **Chain refinement vs spec:** the spec's chain ends "default → none", which would leave an open, never-focused, non-default window unfocused on app switch. The plan adds a final `candidates[candidates.length - 1]` fallback (preserves the pre-existing "last window in array order" behavior). The "none" outcome still applies exactly when all windows are closed, as the spec intends.
- **Background-close guard:** the spec routes `ClassicyWindowClose` promotion through `focusWindow`; doing that unconditionally would let a background app steal focus, so promotion is guarded on `focusedAppId === action.app.id`. This strengthens the spec's invariant rather than deviating from it.
- **`activateApp` deletion vs API:** spec says delete; the plan deletes the duplicate *logic* but keeps the exported name as a deprecated alias because it is published npm API (`ClassicyAppActivate` behavior matches the spec either way).
