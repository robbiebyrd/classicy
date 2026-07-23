# Non-Utility Window Focus Succession Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make automatic focus succession (window close, app quit, app-focus-with-no-window) always land on a non-Utility window, never a floating tool palette.

**Architecture:** Persist each window's `windowType` in the store record, then add a single `windowType !== "utility"` filter at the two succession pick-sites: the `ClassicyWindowClose` sibling-promotion and `pickWindowToRestore` (which `focusApp` uses for both app-quit succession and the focus-with-no-window case). The approved "only Utility windows remain ⇒ app focused, no window focused" fallback needs no new code — `pickWindowToRestore` returning `undefined` already triggers `focusApp`'s existing else-branch.

**Tech Stack:** React + TypeScript, Zustand + event reducer, Vitest, Biome.

## Global Constraints

- Test runner: `pnpm test <path>` runs a single file (`vitest run`); run full `pnpm test` once before committing.
- Lint is Biome; repo-wide `biome check .` reformats ~70 untouched files. Lint ONLY touched files: `pnpm exec biome check <path> ...`.
- TDD: failing test first, watch it fail for the right reason, minimal implementation, watch it pass.
- The exclusion rule is exactly `w.windowType !== "utility"`. A window record with no `windowType` (legacy/persisted or plain document) is treated as `"document"` and stays fully focus-eligible (backward compatible).
- `windowType` values are the string union `"document" | "utility"`, matching the existing `ClassicyWindow` prop.
- No change to manual Utility-window focus, to `lastFocusedAt` / `lastAccessedWindowId` writing, or to `pickSuccessorApp`.
- Reducers mutate the passed `ds` in place and return it; tests dispatch against a plain store object built by the file's `makeStore*` helpers.

## File Structure

- `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` — add `windowType?` to the `ClassicyStoreSystemAppWindow` interface.
- `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` — carry `windowType` on the window object it dispatches in `ClassicyWindowOpen`.
- `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx` — persist `windowType` on window creation (`ClassicyWindowOpen`); filter Utility from the `ClassicyWindowClose` sibling promotion.
- `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts` — filter Utility from `pickWindowToRestore`.
- Tests: `src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts` (Tasks 1, 2) and `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts` (Task 3).

---

## Task 1: Persist `windowType` in the store window record

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts:79-99`
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx:303-341`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx:136-173`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`

**Interfaces:**
- Consumes: existing `ClassicyStoreSystemAppWindow`, the `ClassicyWindow` `windowType` prop (default `"document"`), the `ClassicyWindowOpen` reducer, and the test helpers `makeStoreWithWindows()` + `classicyWindowEventHandler(ds, action)`.
- Produces: window records carry `windowType?: "document" | "utility"`; a window opened with `windowType: "utility"` persists that value. Tasks 2 and 3 rely on this field being present.

- [ ] **Step 1: Write the failing test**

Append to `src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts` (it already imports `describe/it/expect` and `classicyWindowEventHandler`, and defines `makeStoreWithWindows`):

```ts
describe("ClassicyWindowOpen persists windowType", () => {
	it("stores windowType on a newly opened utility window", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "palette",
				minimumSize: [100, 100],
				size: [180, 220],
				position: [150, 150],
				windowType: "utility",
			},
		});
		const win = ds.System.Manager.Applications.apps.TestApp.windows.find(
			(w) => w.id === "palette",
		);
		expect(win?.windowType).toBe("utility");
	});

	it("leaves windowType undefined for a plain document window", () => {
		const ds = makeStoreWithWindows();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowOpen",
			app: { id: "TestApp" },
			window: {
				id: "doc",
				minimumSize: [100, 100],
				size: [400, 300],
				position: [150, 150],
			},
		});
		const win = ds.System.Manager.Applications.apps.TestApp.windows.find(
			(w) => w.id === "doc",
		);
		expect(win?.windowType).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`
Expected: the utility case FAILS (`win.windowType` is `undefined`, not `"utility"`); the document case passes.

- [ ] **Step 3: Add the field to the store window model**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`, the interface currently ends:

```ts
	zOrder?: number;
	options?: Record<string, JsonValue>[];
}
```

Add the field (before `options`):

```ts
	zOrder?: number;
	// Platinum window class (#205). Utility (tool-palette) windows are excluded
	// from automatic focus succession; absent ⇒ treated as "document".
	windowType?: "document" | "utility";
	options?: Record<string, JsonValue>[];
}
```

- [ ] **Step 4: Persist windowType in the ClassicyWindowOpen reducer**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx`, the `ClassicyWindowOpen` case casts the incoming window and pushes a record. Update the cast (currently `const win = action.window as { id; position; minimumSize; size; menuBar? }`) to include `windowType`:

```ts
			const win = action.window as {
				id: string;
				position: [number, number];
				minimumSize: [number, number];
				size: [number, number];
				menuBar?: ClassicyMenuItem[];
				windowType?: "document" | "utility";
			};
```

Then in the `window < 0` push block, add `windowType` to the pushed record (right after `menuBar: win.menuBar,`):

```ts
				ds.System.Manager.Applications.apps[action.app.id].windows.push({
					...initialWindowState,
					id: win.id,
					minimumSize: win.minimumSize,
					size: win.size,
					position: paddedPosition,
					closed: false,
					hidden: false,
					menuBar: win.menuBar,
					windowType: win.windowType,
				} as ClassicyStoreSystemAppWindow);
```

- [ ] **Step 5: Carry windowType on the window ClassicyWindow dispatches**

In `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`, the `ws` memo builds `initialWindowState` (lines 304-319). Add `windowType` so the dispatched `ws` carries it, and add `windowType` to the memo dependency array (lines 331-341):

```ts
		const initialWindowState: ClassicyStoreSystemAppWindow = {
			collapsed: false,
			focused: false,
			dragging: false,
			moving: false,
			resizing: false,
			zoomed: false,
			size: resolvedSize,
			position: resolvedPosition,
			closed: hidden,
			menuBar: appMenu || [],
			default: defaultWindow,
			id: id,
			appId: appId,
			minimumSize: [0, 0],
			windowType: windowType,
		};
```

Add `windowType` to the dependency array:

```ts
	}, [
		appId,
		appMenu,
		currentWindow,
		defaultWindow,
		hidden,
		id,
		resolvedPosition,
		resolvedSize,
		resolvedMinimumSize,
		windowType,
	]);
```

(The `windowType` prop is already destructured at line 191 with default `"document"`, and the existing `ClassicyWindowOpen` dispatch already sends `window: ws`, so no dispatch-site change is needed.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`
Expected: PASS — both new cases plus the pre-existing `ClassicyWindowOpen` tests.

- [ ] **Step 7: Full suite + lint**

Run: `pnpm test`
Expected: all pass (no regressions).
Run: `pnpm exec biome check src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`
Expected: clean on touched files.

- [ ] **Step 8: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts \
        src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx \
        src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx \
        src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts
git commit -m "feat(window): persist windowType in the store window record"
```

---

## Task 2: Exclude Utility windows from window-close sibling promotion (R1, R4)

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx:192-213`
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`

**Interfaces:**
- Consumes: the `windowType` field persisted in Task 1; `classicyWindowEventHandler`, `makeStore` (with `Finder.app` focused by default).
- Produces: on `ClassicyWindowClose` in the focused app, focus moves to the highest-`zOrder` open **non-Utility** sibling; if none, no window is focused.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`. These build a focused app (`focusedAppId` set) with a document + a utility sibling:

```ts
describe("ClassicyWindowClose skips utility windows when promoting a sibling", () => {
	function makeFocusedAppWithUtility() {
		const ds = makeStore();
		ds.System.Manager.Applications.focusedAppId = "TestApp";
		ds.System.Manager.Applications.apps.TestApp = {
			id: "TestApp",
			name: "Test",
			icon: "",
			open: true,
			focused: true,
			windows: [
				{
					id: "doc",
					closed: false,
					collapsed: false,
					dragging: false,
					moving: false,
					resizing: false,
					zoomed: false,
					focused: true,
					size: [400, 300],
					position: [100, 100],
					minimumSize: [100, 100],
					zOrder: 10,
				},
				{
					id: "doc2",
					closed: false,
					collapsed: false,
					dragging: false,
					moving: false,
					resizing: false,
					zoomed: false,
					focused: false,
					size: [400, 300],
					position: [120, 120],
					minimumSize: [100, 100],
					zOrder: 20,
				},
				{
					id: "palette",
					closed: false,
					collapsed: false,
					dragging: false,
					moving: false,
					resizing: false,
					zoomed: false,
					focused: false,
					size: [180, 220],
					position: [300, 100],
					minimumSize: [100, 100],
					zOrder: 99,
					windowType: "utility",
				},
			],
			data: {},
		};
		return ds;
	}

	it("promotes the highest-zOrder non-utility sibling, not the utility window", () => {
		const ds = makeFocusedAppWithUtility();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "doc" },
		});
		const wins = ds.System.Manager.Applications.apps.TestApp.windows;
		// "palette" has the highest zOrder but is utility → "doc2" wins.
		expect(wins.find((w) => w.id === "doc2")?.focused).toBe(true);
		expect(wins.find((w) => w.id === "palette")?.focused).toBe(false);
	});

	it("leaves no window focused when only a utility window remains", () => {
		const ds = makeFocusedAppWithUtility();
		// Close both document windows; only the utility palette stays open.
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "doc" },
		});
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowClose",
			app: { id: "TestApp" },
			window: { id: "doc2" },
		});
		const wins = ds.System.Manager.Applications.apps.TestApp.windows;
		expect(wins.some((w) => w.focused === true)).toBe(false);
		// App keeps focus / menu-bar ownership.
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`
Expected: the first test FAILS — the current code picks the highest `zOrder` (`palette`) and focuses it. The second FAILS — closing `doc` currently promotes `palette`, so a window ends up focused.

- [ ] **Step 3: Add the utility filter to the sibling promotion**

In `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx`, the `ClassicyWindowClose` case currently filters:

```ts
			const openWindows = ds.System.Manager.Applications.apps[
				action.app.id
			]?.windows.filter((w) => !w.closed && w.id !== action.window.id);
```

Add the non-Utility condition:

```ts
			const openWindows = ds.System.Manager.Applications.apps[
				action.app.id
			]?.windows.filter(
				(w) =>
					!w.closed &&
					w.id !== action.window.id &&
					w.windowType !== "utility",
			);
```

The `if (openWindows?.length) { … focusWindow … }` block is unchanged: when the filter yields nothing, no `focusWindow` runs, so the app stays focused with no focused window (R4).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`
Expected: PASS — both new cases plus the pre-existing `ClassicyWindowClose` tests (which use only document windows and are unaffected).

- [ ] **Step 5: Full suite + lint**

Run: `pnpm test`
Expected: all pass.
Run: `pnpm exec biome check src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx \
        src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts
git commit -m "feat(window): close promotes next non-utility window"
```

---

## Task 3: Exclude Utility windows from `pickWindowToRestore` (R2, R3, R4)

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts:51-65`
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`

**Interfaces:**
- Consumes: the `windowType` field from Task 1; exported `focusApp`, `closeApp`, `classicyAppEventHandler` (re-exported from `ClassicyAppManager`); the app-manager test's `makeStore`.
- Produces: `focusApp` (and therefore app-quit succession via `ClassicyAppClose` and app-focus via `ClassicyAppFocus`) restores only non-Utility windows; when only Utility windows remain the app is focused with no focused window.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts` (it already imports `focusApp` and `classicyAppEventHandler` and defines `makeStore`):

```ts
describe("focus succession skips utility windows", () => {
	function addApp(
		ds: ReturnType<typeof makeStore>,
		id: string,
		windows: Array<Record<string, unknown>>,
		extra: Record<string, unknown> = {},
	) {
		ds.System.Manager.Applications.apps[id] = {
			id,
			name: id,
			icon: "",
			open: true,
			focused: false,
			windows: windows.map((w) => ({
				closed: false,
				collapsed: false,
				dragging: false,
				moving: false,
				resizing: false,
				zoomed: false,
				focused: false,
				size: [400, 300],
				position: [100, 100],
				minimumSize: [100, 100],
				...w,
			})),
			data: {},
			...extra,
		};
	}

	it("focusApp restores the most-recent non-utility window, not the utility lastAccessed", () => {
		const ds = makeStore();
		addApp(
			ds,
			"TestApp",
			[
				{ id: "doc", zOrder: 5 },
				{ id: "palette", zOrder: 50, windowType: "utility" },
			],
			// lastAccessed points at the utility palette; it must be ignored.
			{ lastAccessedWindowId: "palette" },
		);
		focusApp(ds, "TestApp");
		const wins = ds.System.Manager.Applications.apps.TestApp.windows;
		expect(wins.find((w) => w.id === "doc")?.focused).toBe(true);
		expect(wins.find((w) => w.id === "palette")?.focused).toBe(false);
	});

	it("focusApp focuses no window when only utility windows are open", () => {
		const ds = makeStore();
		addApp(ds, "TestApp", [
			{ id: "palette", zOrder: 50, windowType: "utility" },
		]);
		focusApp(ds, "TestApp");
		const app = ds.System.Manager.Applications.apps.TestApp;
		expect(app.focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
		expect(app.windows.some((w) => w.focused === true)).toBe(false);
	});

	it("quitting an app focuses the successor app's non-utility window", () => {
		const ds = makeStore();
		// Successor app: a utility palette with a higher zOrder than its document.
		addApp(
			ds,
			"Successor",
			[
				{ id: "s-doc", zOrder: 5 },
				{ id: "s-palette", zOrder: 80, windowType: "utility" },
			],
			{ lastFocusedAt: 1000 },
		);
		// Front app that is quitting.
		addApp(ds, "Front", [{ id: "f-doc", zOrder: 9 }], {
			focused: true,
			lastFocusedAt: 2000,
		});
		ds.System.Manager.Applications.focusedAppId = "Front";

		classicyAppEventHandler(ds, {
			type: "ClassicyAppClose",
			app: { id: "Front" },
		});

		expect(ds.System.Manager.Applications.focusedAppId).toBe("Successor");
		const sWins = ds.System.Manager.Applications.apps.Successor.windows;
		expect(sWins.find((w) => w.id === "s-doc")?.focused).toBe(true);
		expect(sWins.find((w) => w.id === "s-palette")?.focused).toBe(false);
	});

	it("regression: focusApp still restores lastAccessed for a document-only app", () => {
		const ds = makeStore();
		addApp(
			ds,
			"TestApp",
			[
				{ id: "a", zOrder: 5 },
				{ id: "b", zOrder: 50 },
			],
			{ lastAccessedWindowId: "a" },
		);
		focusApp(ds, "TestApp");
		const wins = ds.System.Manager.Applications.apps.TestApp.windows;
		expect(wins.find((w) => w.id === "a")?.focused).toBe(true);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: the first three FAIL (current `pickWindowToRestore` returns the utility `lastAccessed`/highest-`zOrder` window and focuses it; only-utility focuses the palette instead of nothing). The regression case passes.

- [ ] **Step 3: Add the utility filter to `pickWindowToRestore`**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts`, the function starts:

```ts
function pickWindowToRestore(app: ClassicyStoreSystemApp) {
	const candidates = app.windows.filter((w) => !w.closed);
```

Change the candidate filter to exclude Utility windows:

```ts
function pickWindowToRestore(app: ClassicyStoreSystemApp) {
	// Utility (tool-palette) windows float and never become the active document
	// window, so they are never a succession target. When only utility windows
	// remain, candidates is empty and focusApp keeps the app focused with no
	// focused window.
	const candidates = app.windows.filter(
		(w) => !w.closed && w.windowType !== "utility",
	);
```

The rest of the function (lastAccessed → zOrder → default → last) is unchanged; because `candidates` is pre-filtered, a `lastAccessedWindowId` that names a utility window no longer matches and the pick falls through to the most-recent non-Utility window.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: PASS — all four new cases plus the pre-existing app-manager tests.

- [ ] **Step 5: Full suite + lint**

Run: `pnpm test`
Expected: all pass.
Run: `pnpm exec biome check src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts \
        src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts
git commit -m "feat(window): app-focus and quit succession skip utility windows"
```

---

## Self-Review

**Spec coverage:**
- Spec §1 (persist windowType) → Task 1 (interface field, reducer persist, component threading, persistence test).
- R1 (window close → next non-Utility) → Task 2.
- R2 (app quit → successor app's non-Utility window) → Task 3 (the `ClassicyAppClose` succession test) + existing `pickSuccessorApp` (unchanged).
- R3 (app focused, no window → most-recent non-Utility) → Task 3 (`focusApp` lastAccessed-is-utility test).
- R4 (only Utility remain → app focused, no window) → Task 2 (close path) + Task 3 (`focusApp` only-utility test); no new fallback code, per spec.
- R5 (backward compatible; absent windowType = document) → Task 1 document-window test (undefined windowType) + Task 2/3 regression cases (document-only apps unaffected).

**Placeholder scan:** none — every step has exact code and commands.

**Type consistency:** `windowType?: "document" | "utility"` is spelled identically in the interface (Task 1 Step 3), the reducer cast/push (Task 1 Step 4), the component `initialWindowState` (Task 1 Step 5), and both filters (`w.windowType !== "utility"`, Tasks 2/3). Test window records set `windowType: "utility"` as a literal. `focusApp`, `classicyWindowEventHandler`, and `classicyAppEventHandler` match their exported signatures. Task 2's filter runs on records that Task 1 guarantees carry `windowType`; the reducer path for legacy/document windows leaves it `undefined`, which the `!== "utility"` comparison treats as eligible.
