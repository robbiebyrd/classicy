# Modal Window Focus Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a modal window take focus every time it opens and hand focus back to a surviving sibling when it closes.

**Architecture:** Two changes. `ClassicyWindowDestroy` gains focus succession, reusing the existing `focusApp` helper. `ClassicyWindow` gains an unmount cleanup that dispatches `ClassicyWindowDestroy` — **guarded on `modal`**, so document windows keep their persisted geometry. Removing the stale store record makes the next open a genuinely-new id, which the existing `ClassicyWindowOpen` handler already focuses.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest + Testing Library, Biome.

**Spec:** `docs/superpowers/specs/2026-08-05-modal-window-focus-lifecycle-design.md`
**Issues:** #222, #223

## Global Constraints

- Package manager is **pnpm**. Full suite: `pnpm test`. Single file: `pnpm vitest run <path>`.
- `pnpm test` (vitest) **does not type-check**. Run `pnpm build:source` (which runs `tsc -b`) before considering the work done.
- Lint with `biome check <specific paths>`. **Do not run `pnpm lint:fix` repo-wide** — it reformats ~70 untouched files.
- Tabs for indentation; the repo uses tab-indented TypeScript throughout.
- All styling is SCSS co-located with components. No Tailwind, no inline styles for layout.
- Do not edit `index.ts` barrel files — `pnpm build:source` regenerates them via barrelsby.
- Document (non-modal) window behavior must not change. Persisted position, size, `zOrder`, and localStorage session restore are regression-critical.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx` | Window event reducer | Modify `ClassicyWindowDestroy` (~:221-230); add `focusApp` import (~:11) |
| `src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts` | Reducer tests | Add `ClassicyWindowDestroy` describe block |
| `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` | Window component | Add modal-guarded unmount effect after the registration effect (~:433) |
| `src/SystemFolder/SystemResources/Window/ClassicyWindow.modal.test.tsx` | Component tests | Create |

---

### Task 1: Focus succession in `ClassicyWindowDestroy`

Today the handler removes the window record but never reassigns focus, so destroying the focused window leaves the app with no focused window and a dangling menu bar.

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx:11` (import), `:221-230` (handler)
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`

**Interfaces:**
- Consumes: `focusApp(ds: ClassicyStore, appId: string): void` from `@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers` — mutates `ds` in place, returns nothing. Early-returns when the app is missing or `!app.open`.
- Produces: `ClassicyWindowDestroy` now restores focus. Task 2 relies on this.

**Background the implementer needs:**

The reducer **mutates `ds` in place** and returns it. Tests call `classicyWindowEventHandler(ds, action)` and then assert on `ds` directly.

`focusApp` internally calls `pickWindowToRestore`, which skips `closed` and `windowType === "utility"` windows, and prefers `lastAccessedWindowId`, then highest `zOrder`, then the `default` window. Reusing it means modal succession matches the rules users already experience elsewhere.

The existing test helper `makeStoreWithWindows()` (`:76`) builds `TestApp` with windows `w1` (unfocused) and `w2` (focused), and **`TestApp.focused` is `false` with `Finder.app` holding `focusedAppId`**. Tests that exercise succession must therefore set `focusedAppId` and `TestApp.focused` explicitly — this is the easiest thing to get wrong in this task.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`:

```ts
describe("ClassicyWindowDestroy", () => {
	function makeFocusedApp() {
		const ds = makeStoreWithWindows();
		// makeStoreWithWindows leaves Finder holding global focus; modal
		// succession only runs for the app that actually owns focus.
		ds.System.Manager.Applications.focusedAppId = "TestApp";
		ds.System.Manager.Applications.apps.TestApp.focused = true;
		ds.System.Manager.Applications.apps["Finder.app"].focused = false;
		return ds;
	}

	it("removes the window record", () => {
		const ds = makeFocusedApp();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});
		const windows = ds.System.Manager.Applications.apps.TestApp.windows;
		expect(windows).toHaveLength(1);
		expect(windows.find((w) => w.id === "w2")).toBeUndefined();
	});

	it("focuses a surviving sibling when the destroyed window held focus", () => {
		const ds = makeFocusedApp();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});
		const w1 = ds.System.Manager.Applications.apps.TestApp.windows.find(
			(w) => w.id === "w1",
		);
		expect(w1?.focused).toBe(true);
		expect(ds.System.Manager.Applications.focusedAppId).toBe("TestApp");
	});

	it("leaves focus alone when the destroyed window did not hold it", () => {
		const ds = makeFocusedApp();
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w1" },
		});
		const w2 = ds.System.Manager.Applications.apps.TestApp.windows.find(
			(w) => w.id === "w2",
		);
		expect(w2?.focused).toBe(true);
	});

	it("does not steal focus when the app is not the focused app", () => {
		const ds = makeStoreWithWindows(); // Finder holds focus
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});
		expect(ds.System.Manager.Applications.focusedAppId).toBe("Finder.app");
	});

	it("leaves the app focused with no focused window when none survive", () => {
		const ds = makeFocusedApp();
		ds.System.Manager.Applications.apps.TestApp.windows =
			ds.System.Manager.Applications.apps.TestApp.windows.filter(
				(w) => w.id === "w2",
			);
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});
		expect(ds.System.Manager.Applications.apps.TestApp.focused).toBe(true);
		expect(ds.System.Manager.Applications.apps.TestApp.windows).toHaveLength(0);
	});

	it("does not choose a utility window as the successor", () => {
		const ds = makeFocusedApp();
		ds.System.Manager.Applications.apps.TestApp.windows[0].windowType =
			"utility";
		classicyWindowEventHandler(ds, {
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "w2" },
		});
		const w1 = ds.System.Manager.Applications.apps.TestApp.windows.find(
			(w) => w.id === "w1",
		);
		expect(w1?.focused).toBe(false);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts -t "ClassicyWindowDestroy"`

Expected: the "removes the window record" test PASSES (existing behavior); the succession tests FAIL — `w1?.focused` is `false`, not `true`, because the handler has no focus logic.

- [ ] **Step 3: Add the `focusApp` import**

In `ClassicyDesktopWindowManagerContext.tsx:11`, extend the existing import:

```ts
import {
	focusApp,
	focusWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
```

- [ ] **Step 4: Add focus succession to the handler**

Replace the `case "ClassicyWindowDestroy"` block (~:221-230) with:

```ts
		case "ClassicyWindowDestroy": {
			if (!hasAppAndWindow(action)) break;
			if (!ds.System.Manager.Applications.apps[action.app.id]) break;
			// Capture focus ownership BEFORE the record is filtered out — once
			// the window is gone there is no way to tell it held focus, and a
			// modal unmounting would leave focus dangling on a window that no
			// longer exists (#223).
			const destroyed = ds.System.Manager.Applications.apps[
				action.app.id
			].windows.find((w) => w.id === action.window.id);
			const heldFocus =
				destroyed?.focused === true &&
				ds.System.Manager.Applications.focusedAppId === action.app.id;
			ds = updateWindow(action.app.id, action.window.id, { closed: true });
			ds.System.Manager.Applications.apps[action.app.id].windows =
				ds.System.Manager.Applications.apps[action.app.id].windows
					.map((w) => (w.id === action.window.id ? null : w))
					.filter(notEmpty);
			// Hand focus to a surviving sibling using the same succession rules
			// as ClassicyWindowClose (lastAccessed → highest zOrder → default,
			// skipping utility palettes). Removal happens first so the destroyed
			// window can never select itself.
			if (heldFocus) {
				focusApp(ds, action.app.id);
			}
			break;
		}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`

Expected: PASS, including the pre-existing `ClassicyWindowOpen`/`Close` tests in the same file.

- [ ] **Step 6: Lint and commit**

```bash
pnpm biome check src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts
git commit -m "fix(window): restore focus to a sibling on ClassicyWindowDestroy

Destroy removed the window record without reassigning focus, so
destroying the focused window left the app with no focused window.
Reuses focusApp/pickWindowToRestore so succession matches window close.

Refs #223"
```

---

### Task 2: Modal-scoped destroy on unmount

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` (after the registration effect ending at ~:433)
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindow.modal.test.tsx`

**Interfaces:**
- Consumes: `ClassicyWindowDestroy` with focus succession from Task 1. Action shape is `{ type, app: { id: string }, window: { id: string } }` — the `hasAppAndWindow` predicate only checks `app.id` and `window.id`, so no geometry fields are needed.
- Produces: nothing later tasks consume.

**Background the implementer needs:**

`ClassicyWindow` registers exactly once via a ref guard at `:417-433`:

```ts
const windowRegistered = useRef(false);
useEffect(() => {
	if (!windowRegistered.current) {
		windowRegistered.current = true;
		desktopEventDispatch({ type: "ClassicyWindowOpen", window: ws, app: { id: appId } });
	}
}, [appId, ws, desktopEventDispatch]);
```

**Do not reset `windowRegistered` in the new cleanup.** It is per component instance, and a destroyed modal always remounts as a fresh instance with a fresh ref.

The new effect must be **separate** from the registration effect, not a cleanup added to it — the registration effect depends on `ws`, which changes identity on nearly every store update, so a cleanup there would fire constantly.

`modal` is destructured at `:193` with a default of `false`.

- [ ] **Step 1: Write the failing test**

Create `src/SystemFolder/SystemResources/Window/ClassicyWindow.modal.test.tsx`:

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
						Desktop: { doubleClickTitleToCollapse: true },
						Applications: {
							apps: {
								TestApp: {
									id: "TestApp",
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
	() => ({ useSoundDispatch: () => mockPlayer }),
);

const destroyCalls = () =>
	mockDispatch.mock.calls.filter(
		(c) => (c[0] as { type: string }).type === "ClassicyWindowDestroy",
	);

describe("ClassicyWindow modal unmount lifecycle", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	it("dispatches ClassicyWindowDestroy when a modal window unmounts", () => {
		const { unmount } = render(
			<ClassicyWindow id="TestWindow" appId="TestApp" title="Dialog" modal>
				<p>body</p>
			</ClassicyWindow>,
		);
		expect(destroyCalls()).toHaveLength(0);
		unmount();
		expect(destroyCalls()).toHaveLength(1);
		expect(destroyCalls()[0][0]).toMatchObject({
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "TestWindow" },
		});
	});

	it("dispatches nothing on unmount for a non-modal window", () => {
		const { unmount } = render(
			<ClassicyWindow id="TestWindow" appId="TestApp" title="Doc">
				<p>body</p>
			</ClassicyWindow>,
		);
		unmount();
		expect(destroyCalls()).toHaveLength(0);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.modal.test.tsx`

Expected: the modal test FAILS with `expected [] to have a length of 1`. The non-modal test PASSES already.

- [ ] **Step 3: Add the cleanup effect**

In `ClassicyWindow.tsx`, immediately **after** the registration effect that ends at ~:433, add:

```ts
	// A modal window is ephemeral: it carries no persisted geometry, and
	// leaving its record in the store makes the next open a "known id", which
	// the ClassicyWindowOpen handler deliberately does not focus. Dropping the
	// record on unmount is what lets each modal open take focus (#222) and each
	// dismissal hand focus back (#223). Document windows are excluded — their
	// records hold position/size that must survive an unmount and a reload.
	useEffect(() => {
		if (!modal) return;
		return () => {
			desktopEventDispatch({
				type: "ClassicyWindowDestroy",
				window: { id },
				app: { id: appId },
			});
		};
	}, [modal, id, appId, desktopEventDispatch]);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.modal.test.tsx`

Expected: PASS, both tests.

- [ ] **Step 5: Run the full suite for regressions**

Run: `pnpm test`

Expected: PASS. Pay attention to any `ClassicyFileDialog`, `ClassicyAlert`, `MoviePlayer`, or Finder tests — those components use `modal={true}` and now emit an extra dispatch on unmount. If a test asserts an exact dispatch call count, it will need updating to filter by action type; that is a legitimate test fix, not a reason to abandon the change.

- [ ] **Step 6: Type-check**

Run: `pnpm build:source`

Expected: no TypeScript errors. (Vitest does not type-check, so this step is required.)

- [ ] **Step 7: Lint and commit**

```bash
pnpm biome check src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx src/SystemFolder/SystemResources/Window/ClassicyWindow.modal.test.tsx
git add src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx src/SystemFolder/SystemResources/Window/ClassicyWindow.modal.test.tsx
git commit -m "fix(window): drop the store record when a modal unmounts

ClassicyWindow registered once and dispatched nothing on unmount, so a
modal left a stale focused record behind. The next open then hit the
reducer's known-id branch, which deliberately skips focusWindow, so the
modal never took focus and focus never returned.

Scoped to modal windows: document windows keep persisted geometry.
Fixes all six modal={true} components.

Fixes #222, #223"
```

---

### Task 3: Reopen-sequence regression test and browser verification

The unit tests cover each half in isolation. #222 only reproduces across a full open → destroy → open cycle, so it needs its own test.

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts`

**Interfaces:**
- Consumes: Task 1's succession, Task 2's unmount dispatch.
- Produces: nothing.

- [ ] **Step 1: Write the sequence test**

Append to the `ClassicyWindowDestroy` describe block from Task 1:

```ts
	it("refocuses a modal on every reopen, not just the first (#222)", () => {
		const ds = makeFocusedApp();
		const openDialog = () =>
			classicyWindowEventHandler(ds, {
				type: "ClassicyWindowOpen",
				app: { id: "TestApp" },
				window: {
					id: "dialog",
					minimumSize: [100, 100],
					size: [360, 120],
					position: [0, 0],
				},
			});
		const closeDialog = () =>
			classicyWindowEventHandler(ds, {
				type: "ClassicyWindowDestroy",
				app: { id: "TestApp" },
				window: { id: "dialog" },
			});
		const focusedId = () =>
			ds.System.Manager.Applications.apps.TestApp.windows.find((w) => w.focused)
				?.id;

		openDialog();
		expect(focusedId()).toBe("dialog");
		closeDialog();
		expect(focusedId()).toBe("w2");

		// Before the fix this second open hit the known-id branch and never
		// focused, leaving w2 active behind a visible modal.
		openDialog();
		expect(focusedId()).toBe("dialog");
		closeDialog();
		expect(focusedId()).toBe("w2");
	});
```

- [ ] **Step 2: Run the test**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts -t "reopen"`

Expected: PASS (Tasks 1 and 2 are already in place).

- [ ] **Step 3: Verify in a real browser**

Six components share this code path, so unit tests alone are not sufficient evidence.

Use the `verify` skill, or manually: `pnpm build:source` then `pnpm preview`.

Check each of these:
1. **HyperCard** — run a stack with an `answer` or `ask` action. While the dialog is up, the HyperCard window's title bar must be **dimmed** (`classicyWindowInactive`, no racing stripes). Dismiss it: the main window title bar must become **active** again. **Repeat at least three times** — the bug only appeared from the second dialog onward.
2. **A second modal** — open a File Open dialog or the About window and confirm the same dim-then-restore behavior.
3. **Regression check** — open two document windows in Finder, move and resize them, reload the page. Positions and sizes must be restored. This is the check that the `modal` guard is doing its job.

- [ ] **Step 4: Commit**

```bash
git add src/SystemFolder/SystemResources/Desktop/ClassicyWindowEventHandler.test.ts
git commit -m "test(window): cover modal reopen focus across the full cycle

Refs #222, #223"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| R1 — modal takes focus on every open | Task 2 (record removal) + Task 3 (sequence test) |
| R2 — focus returns on dismissal | Task 1 |
| R3 — document windows unchanged | Task 2 `modal` guard; Task 2 Step 5, Task 3 Step 3 item 3 |
| R4 — destroying an unfocused window is inert | Task 1 (`heldFocus` guard + two tests) |
| R5 — applies to all six modal components | Task 2 (fix is in `ClassicyWindow`); Task 3 Step 3 item 2 |

**Placeholder scan:** none — every step has runnable code or an exact command.

**Type consistency:** `focusApp(ds, appId)` matches `ClassicyAppHelpers.ts:73`. `ClassicyWindowDestroy` with `window: { id }` matches the declared action union and the `hasAppAndWindow` predicate. `notEmpty` and `updateWindow` are already in scope in the reducer file.

**Known risk:** Task 2 Step 5 may surface test failures in other modal components from the new dispatch. The step calls this out with the fix approach.
