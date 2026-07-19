# Startup Parade Icon Injection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let hosts and `ClassicyApp` components add icons to the startup-screen Extensions parade without registering a real extension.

**Architecture:** A new session-only `System.Manager.Boot.paradeIcons` store slice, written by two new `ClassicyBootParadeIcon*` events (routed by prefix to a new `classicyBootEventHandler`). `ClassicyApp` gains a `bootIcon?: boolean | string` prop that dispatches the add event on mount. `ClassicyStartupScreen` renders injected icons first, then extension-derived icons.

**Tech Stack:** React 18 + TypeScript, Zustand (immer-wrapped dispatch), Vitest + Testing Library. Spec: `docs/superpowers/specs/2026-07-19-startup-parade-icon-injection-design.md`.

## Global Constraints

- Package manager is **pnpm**. Run tests with `pnpm vitest run <path>` from the repo root (`/home/robbiebyrd/classicy`).
- Do **not** edit any `index.ts` barrel file — barrelsby regenerates them during `pnpm build:source`.
- The `paradeIcons` slice is session-only: it must be stripped in `sanitizeStateForPersistence()` (Task 2), never persisted with content.
- Event names are exactly `ClassicyBootParadeIconAdd` and `ClassicyBootParadeIconRemove`; the reducer routes on prefix `ClassicyBootParadeIcon`.
- Injected icons render **before** extension icons in the parade.
- `ClassicyIcons.*` values are plain URL strings — no special handling needed for them.
- All handler mutations happen on the immer draft passed in as `ds` (same style as `classicyAppEventHandler`).

---

### Task 1: Boot store slice, event handler, and reducer routing

**Files:**
- Create: `src/SystemFolder/SystemResources/Boot/ClassicyBootManager.ts`
- Create: `src/SystemFolder/SystemResources/Boot/ClassicyBootManager.test.ts`
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` (types ~lines 98–106, routing ~lines 342–365, defaults ~line 389)

**Interfaces:**
- Consumes: `ClassicyStore`, `ActionMessage` types from `ClassicyAppManager.ts`; `classicyDesktopStateEventReducer` for the routing test.
- Produces:
  - `interface ClassicyBootParadeIcon { id: string; icon: string; name?: string }`
  - `interface ClassicyStoreSystemBootManager { paradeIcons: ClassicyBootParadeIcon[] }`
  - `classicyBootEventHandler(ds: ClassicyStore, action: ActionMessage): ClassicyStore`
  - Store path `ds.System.Manager.Boot.paradeIcons` (default `[]`), used by Tasks 2 and 4.
  - Events `ClassicyBootParadeIconAdd` (`{ type, id, icon, name? }`) and `ClassicyBootParadeIconRemove` (`{ type, id }`), used by Task 3.

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/SystemResources/Boot/ClassicyBootManager.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	type ClassicyStore,
	classicyDesktopStateEventReducer,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyBootEventHandler } from "@/SystemFolder/SystemResources/Boot/ClassicyBootManager";

// The handler only touches System.Manager.Boot, so a minimal fixture suffices.
const makeStore = (): ClassicyStore =>
	({
		System: { Manager: { Boot: { paradeIcons: [] } } },
	}) as unknown as ClassicyStore;

describe("classicyBootEventHandler", () => {
	it("appends a parade icon on ClassicyBootParadeIconAdd", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "brand",
			icon: "/brand.png",
			name: "Brand",
		});
		expect(ds.System.Manager.Boot.paradeIcons).toEqual([
			{ id: "brand", icon: "/brand.png", name: "Brand" },
		]);
	});

	it("appends in dispatch order", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "a",
			icon: "/a.png",
		});
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "b",
			icon: "/b.png",
		});
		expect(ds.System.Manager.Boot.paradeIcons.map((p) => p.id)).toEqual([
			"a",
			"b",
		]);
	});

	it("updates a duplicate id in place, preserving its position", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "a",
			icon: "/a.png",
			name: "A",
		});
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "b",
			icon: "/b.png",
		});
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "a",
			icon: "/a2.png",
			name: "A2",
		});
		expect(ds.System.Manager.Boot.paradeIcons).toEqual([
			{ id: "a", icon: "/a2.png", name: "A2" },
			{ id: "b", icon: "/b.png", name: undefined },
		]);
	});

	it("removes an icon on ClassicyBootParadeIconRemove", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "a",
			icon: "/a.png",
		});
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconRemove",
			id: "a",
		});
		expect(ds.System.Manager.Boot.paradeIcons).toEqual([]);
	});

	it("ignores remove of an unknown id", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconRemove",
			id: "ghost",
		});
		expect(ds.System.Manager.Boot.paradeIcons).toEqual([]);
	});

	it("ignores add with missing or non-string id/icon", () => {
		const ds = makeStore();
		classicyBootEventHandler(ds, { type: "ClassicyBootParadeIconAdd" });
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "a",
		});
		classicyBootEventHandler(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: 42,
			icon: "/a.png",
		});
		expect(ds.System.Manager.Boot.paradeIcons).toEqual([]);
	});
});

describe("reducer routing", () => {
	it("routes ClassicyBootParadeIcon* actions to the boot handler", () => {
		const ds = makeStore();
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyBootParadeIconAdd",
			id: "routed",
			icon: "/r.png",
		});
		expect(ds.System.Manager.Boot.paradeIcons.map((p) => p.id)).toEqual([
			"routed",
		]);
	});

	it("initializes Boot.paradeIcons to [] in the default state", async () => {
		const { DefaultAppManagerState } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);
		expect(DefaultAppManagerState.System.Manager.Boot.paradeIcons).toEqual([]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Boot/ClassicyBootManager.test.ts`
Expected: FAIL — module `ClassicyBootManager.ts` does not exist.

- [ ] **Step 3: Create the boot event handler**

Create `src/SystemFolder/SystemResources/Boot/ClassicyBootManager.ts`:

```ts
import type {
	ActionMessage,
	ClassicyStore,
	ClassicyStoreSystemManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

/** One icon shown in the startup-screen parade, registered without a real
 *  extension. `id` is the dedup key; re-adding the same id updates in place. */
export interface ClassicyBootParadeIcon {
	id: string;
	icon: string;
	name?: string;
}

export interface ClassicyStoreSystemBootManager
	extends ClassicyStoreSystemManager {
	paradeIcons: ClassicyBootParadeIcon[];
}

export const classicyBootEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
): ClassicyStore => {
	switch (action.type) {
		case "ClassicyBootParadeIconAdd": {
			if (typeof action.id !== "string" || action.id === "") break;
			if (typeof action.icon !== "string" || action.icon === "") break;
			const name = typeof action.name === "string" ? action.name : undefined;
			const icons = ds.System.Manager.Boot.paradeIcons;
			const existing = icons.find((entry) => entry.id === action.id);
			if (existing) {
				existing.icon = action.icon;
				existing.name = name;
			} else {
				icons.push({ id: action.id, icon: action.icon, name });
			}
			break;
		}
		case "ClassicyBootParadeIconRemove": {
			if (typeof action.id !== "string") break;
			ds.System.Manager.Boot.paradeIcons =
				ds.System.Manager.Boot.paradeIcons.filter(
					(entry) => entry.id !== action.id,
				);
			break;
		}
	}
	return ds;
};
```

(The type-only circular import with `ClassicyAppManager.ts` is erased at compile time and matches the existing `ClassicyDesktopManager.tsx` pattern.)

- [ ] **Step 4: Wire the slice and routing into ClassicyAppManager.ts**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts`:

4a. Add the import next to the other handler imports (after the `classicyDesktopIconEventHandler` import around line 26):

```ts
import {
	type ClassicyStoreSystemBootManager,
	classicyBootEventHandler,
} from "@/SystemFolder/SystemResources/Boot/ClassicyBootManager";
```

4b. Add `Boot` to `ClassicyStoreSystem` (around line 98):

```ts
export interface ClassicyStoreSystem {
	Manager: {
		Desktop: ClassicyStoreSystemDesktopManager;
		Sound: ClassicyStoreSystemSoundManager;
		Applications: ClassicyStoreSystemAppManager;
		Appearance: ClassicyStoreSystemAppearanceManager;
		DateAndTime: ClassicyStoreSystemDateAndTimeManager;
		Boot: ClassicyStoreSystemBootManager;
	};
}
```

4c. Add the routing branch in `classicyDesktopStateEventReducer` (around line 349), between the `ClassicyDesktop` and `ClassicyManagerDateTime` branches. It must come anywhere before the plugin/`ClassicyApp` fallthrough; no existing prefix shadows `ClassicyBootParadeIcon`:

```ts
		} else if (action.type.startsWith("ClassicyBootParadeIcon")) {
			ds = classicyBootEventHandler(ds, action);
		} else if (action.type.startsWith("ClassicyManagerDateTime")) {
```

4d. Add the default slice in `DefaultAppManagerState` (inside `Manager`, after `DateAndTime` around line 407):

```ts
			Boot: {
				paradeIcons: [],
			},
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Boot/ClassicyBootManager.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 6: Run the full suite to check for regressions**

Run: `pnpm vitest run`
Expected: all tests pass. (Adding a `Manager.Boot` key can surface store fixtures elsewhere that build a full `ClassicyStore` literal — if any fail to type-check or assert on the whole `Manager` object, add `Boot: { paradeIcons: [] }` to those fixtures.)

- [ ] **Step 7: Commit**

```bash
git add src/SystemFolder/SystemResources/Boot/ClassicyBootManager.ts src/SystemFolder/SystemResources/Boot/ClassicyBootManager.test.ts src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts
git commit -m "feat(boot): parade icon store slice, events, and reducer routing"
```

---

### Task 2: Exclude parade icons from localStorage persistence

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx` (`sanitizeStateForPersistence`, ~line 83)
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts` (append to the existing `persistence lifecycle` describe block, ~line 109)

**Interfaces:**
- Consumes: `ds.System.Manager.Boot.paradeIcons` and event `ClassicyBootParadeIconAdd` from Task 1; existing `dispatch`, `useAppManager`, persistence lifecycle exports.
- Produces: persisted `classicyDesktopState` always has `System.Manager.Boot.paradeIcons: []` while the live store keeps its entries.

- [ ] **Step 1: Write the failing test**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts`, the `persistence lifecycle` describe block re-imports the module in `beforeEach` after `vi.resetModules()`. Add `useAppManager` to the destructured imports:

```ts
	let useAppManager: typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")["useAppManager"];
```

and inside `beforeEach`, after the existing assignments:

```ts
		useAppManager = mod.useAppManager;
```

Then add this test inside the same describe block:

```ts
	it("strips boot parade icons from persisted state but keeps them live", () => {
		dispatch({
			type: "ClassicyBootParadeIconAdd",
			id: "brand",
			icon: "/brand.png",
			name: "Brand",
		});
		vi.advanceTimersByTime(500);

		// Live store keeps the icon…
		expect(
			useAppManager.getState().System.Manager.Boot.paradeIcons,
		).toHaveLength(1);

		// …but the persisted snapshot is always empty (session-only slice).
		const raw = localStorage.getItem("classicyDesktopState");
		expect(raw).not.toBeNull();
		const parsed = JSON.parse(raw ?? "");
		expect(parsed.System.Manager.Boot.paradeIcons).toEqual([]);
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts`
Expected: the new test FAILS — persisted `paradeIcons` contains the entry. (All other tests still pass.)

- [ ] **Step 3: Strip the slice in the sanitizer**

In `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx`, inside the `produce` callback of `sanitizeStateForPersistence` (after the HyperCard edit-session block, before the closing `});`):

```ts
			// Boot parade icons are session-only: owners re-register them on every
			// mount, so persisting them would resurrect icons whose owner removed
			// its bootIcon prop.
			draft.System.Manager.Boot.paradeIcons = [];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.tsx src/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils.test.ts
git commit -m "feat(boot): keep parade icons session-only (strip from persistence)"
```

---

### Task 3: ClassicyApp `bootIcon` prop

**Files:**
- Modify: `src/SystemFolder/SystemResources/App/ClassicyApp.tsx` (props interface ~line 17, mount effect ~lines 87–136)
- Create: `src/SystemFolder/SystemResources/App/ClassicyApp.booticon.test.tsx`

**Interfaces:**
- Consumes: event `ClassicyBootParadeIconAdd` (`{ type, id, icon, name? }`) from Task 1.
- Produces: `ClassicyAppProps.bootIcon?: boolean | string`. `true` → dispatch add with the app's `icon`; a string → dispatch add with that string; dedup `id` = app id, `name` = app name. Apps with `extension` set never dispatch it.

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/SystemResources/App/ClassicyApp.booticon.test.tsx` (mock pattern copied from `ClassicyApp.extension.test.tsx`):

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Applications: {
							apps: {
								"Paint.app": {
									id: "Paint.app",
									name: "Paint",
									icon: "/icons/paint.png",
									open: true,
									focused: false,
									windows: [] as never[],
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
	ClassicyWindow: (): null => null,
}));

type BootIconEvent = {
	type: string;
	id?: string;
	icon?: string;
	name?: string;
};

const paradeAddEvents = (): BootIconEvent[] =>
	mockDispatch.mock.calls
		.map((call) => call[0] as BootIconEvent)
		.filter((e) => e.type === "ClassicyBootParadeIconAdd");

function renderApp(props: { bootIcon?: boolean | string; extension?: boolean }) {
	return render(
		<ClassicyApp
			id="Paint.app"
			name="Paint"
			icon="/icons/paint.png"
			noDesktopIcon
			{...props}
		>
			<div />
		</ClassicyApp>,
	);
}

describe("ClassicyApp bootIcon prop", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("bootIcon={true} dispatches a parade add with the app's own icon", () => {
		renderApp({ bootIcon: true });
		expect(paradeAddEvents()).toEqual([
			{
				type: "ClassicyBootParadeIconAdd",
				id: "Paint.app",
				icon: "/icons/paint.png",
				name: "Paint",
			},
		]);
	});

	it("bootIcon as a string dispatches a parade add with that icon", () => {
		renderApp({ bootIcon: "/icons/custom-ext.png" });
		expect(paradeAddEvents()).toEqual([
			{
				type: "ClassicyBootParadeIconAdd",
				id: "Paint.app",
				icon: "/icons/custom-ext.png",
				name: "Paint",
			},
		]);
	});

	it("no bootIcon prop dispatches nothing to the parade", () => {
		renderApp({});
		expect(paradeAddEvents()).toEqual([]);
	});

	it("extensions ignore bootIcon — they are already in the parade", () => {
		renderApp({ bootIcon: true, extension: true });
		expect(paradeAddEvents()).toEqual([]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyApp.booticon.test.tsx`
Expected: the two dispatch tests FAIL (no `ClassicyBootParadeIconAdd` dispatched); the two negative tests pass.

- [ ] **Step 3: Implement the prop**

In `src/SystemFolder/SystemResources/App/ClassicyApp.tsx`:

3a. Add to `ClassicyAppProps` (after `extension?: boolean;`):

```ts
	/** Show an icon in the startup parade without being an extension.
	 *  `true` uses the app's own icon; a string (any icon URL, including
	 *  ClassicyIcons.* values) shows that icon instead. Ignored when
	 *  `extension` is set — extensions already parade. */
	bootIcon?: boolean | string;
```

3b. Add `bootIcon,` to the destructured props (after `extension,`).

3c. In the mount `useEffect`, after the `ClassicyAppLoad` dispatch block, add:

```ts
		if (bootIcon && !extension) {
			desktopEventDispatch({
				type: "ClassicyBootParadeIconAdd",
				id,
				icon: typeof bootIcon === "string" ? bootIcon : icon,
				name,
			});
		}
```

3d. Add `bootIcon` to that effect's dependency array (alongside `extension`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/ClassicyApp.booticon.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the other ClassicyApp suites for regressions**

Run: `pnpm vitest run src/SystemFolder/SystemResources/App/`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/App/ClassicyApp.tsx src/SystemFolder/SystemResources/App/ClassicyApp.booticon.test.tsx
git commit -m "feat(app): bootIcon prop injects an icon into the startup parade"
```

---

### Task 4: Render injected icons in the startup parade

**Files:**
- Modify: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx`
- Modify: `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx` (extend the store mock + add tests)

**Interfaces:**
- Consumes: `ds.System.Manager.Boot.paradeIcons` (`ClassicyBootParadeIcon[]`) from Task 1.
- Produces: parade order = injected icons (registration order) then extension apps; React keys `parade:<id>` / `ext:<id>`; reveal timing derived from the merged count.

- [ ] **Step 1: Extend the test mock and write the failing tests**

In `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx`:

1a. Add a parade fixture next to `mockApps`:

```ts
type MockParadeIcon = { id: string; icon: string; name?: string };

const mockParadeIcons = vi.hoisted(() => ({
	current: [] as MockParadeIcon[],
}));
```

1b. Replace the `useAppManager` mock's state object so selectors can reach both slices:

```ts
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Applications: { apps: mockApps.current },
						Boot: { paradeIcons: mockParadeIcons.current },
					},
				},
			}),
	}),
);
```

1c. Reset the fixture in the existing `beforeEach` (next to `mockApps.current = {};`):

```ts
		mockParadeIcons.current = [];
```

1d. Add tests. Match the file's existing style for advancing timers (`act` + `vi.advanceTimersByTime`) — reuse the same helpers/durations the existing extension-parade tests use. With `duration = 1000` and N merged icons, icon i is revealed after `(i + 1) * 1000 / (N + 1)` ms:

```tsx
	it("parades injected icons without any extension apps", () => {
		mockParadeIcons.current = [
			{ id: "brand", icon: "/brand.png", name: "Brand" },
		];
		render(<ClassicyStartupScreen duration={1000} />);
		act(() => {
			vi.advanceTimersByTime(600);
		});
		const img = screen.getByAltText("Brand");
		expect(img).toHaveAttribute("src", "/brand.png");
	});

	it("renders injected icons before extension icons", () => {
		mockParadeIcons.current = [
			{ id: "brand", icon: "/brand.png", name: "Brand" },
		];
		mockApps.current = {
			"ClockExt.app": {
				id: "ClockExt.app",
				name: "Clock",
				icon: "/clock.png",
				open: true,
				extension: true,
			},
		};
		const { container } = render(<ClassicyStartupScreen duration={1000} />);
		act(() => {
			vi.advanceTimersByTime(900);
		});
		const imgs = container.querySelectorAll(
			".classicyStartupScreenExtensions img",
		);
		expect(Array.from(imgs).map((img) => img.getAttribute("alt"))).toEqual([
			"Brand",
			"Clock",
		]);
	});

	it("uses the merged count for reveal timing", () => {
		mockParadeIcons.current = [
			{ id: "brand", icon: "/brand.png", name: "Brand" },
		];
		mockApps.current = {
			"ClockExt.app": {
				id: "ClockExt.app",
				name: "Clock",
				icon: "/clock.png",
				open: true,
				extension: true,
			},
		};
		render(<ClassicyStartupScreen duration={1000} />);
		// 2 icons → interval 1000/3 ≈ 333ms. At 400ms only the first shows.
		act(() => {
			vi.advanceTimersByTime(400);
		});
		expect(screen.getByAltText("Brand")).toBeInTheDocument();
		expect(screen.queryByAltText("Clock")).not.toBeInTheDocument();
	});

	it("falls back to an empty alt when an injected icon has no name", () => {
		mockParadeIcons.current = [{ id: "anon", icon: "/anon.png" }];
		const { container } = render(<ClassicyStartupScreen duration={1000} />);
		act(() => {
			vi.advanceTimersByTime(600);
		});
		const img = container.querySelector(
			".classicyStartupScreenExtensions img",
		);
		expect(img).toHaveAttribute("src", "/anon.png");
		expect(img).toHaveAttribute("alt", "");
	});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx`
Expected: the 4 new tests FAIL (no injected icons rendered); existing tests still pass — if any existing test crashes on the mock change, fix the mock, not the component.

- [ ] **Step 3: Merge the two sources in the component**

In `src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx`, replace the `apps`/`extensions` selection block (lines 40–54) with:

```tsx
	const apps = useAppManager((state) => state.System.Manager.Applications.apps);
	const paradeIcons = useAppManager(
		(state) => state.System.Manager.Boot.paradeIcons,
	);
	// Injected parade icons lead, then extension apps — both in registration
	// order. Keys are prefixed so a manual icon id can never collide with an
	// app id.
	const paradeEntries = useMemo(
		() => [
			...paradeIcons.map((entry) => ({
				key: `parade:${entry.id}`,
				icon: entry.icon,
				name: entry.name ?? "",
			})),
			...Object.values(apps)
				.filter((app) => app.extension)
				.map((app) => ({ key: `ext:${app.id}`, icon: app.icon, name: app.name })),
		],
		[paradeIcons, apps],
	);

	// Mac OS 7-style parade: with N icons, icon i appears once elapsed time
	// passes (i + 1) × duration / (N + 1) — the last icon lands before the
	// progress bar completes.
	const revealInterval = duration / (paradeEntries.length + 1);
	const elapsed = (progress / 100) * duration;
	const visibleParadeEntries = paradeEntries.slice(
		0,
		Math.min(paradeEntries.length, Math.floor(elapsed / revealInterval)),
	);
```

And replace the parade strip JSX (lines 95–101) with:

```tsx
			{visibleParadeEntries.length > 0 && (
				<div className="classicyStartupScreenExtensions">
					{visibleParadeEntries.map((entry) => (
						<img
							key={entry.key}
							src={entry.icon}
							alt={entry.name}
							title={entry.name}
						/>
					))}
				</div>
			)}
```

Also update the comment above the selectors (lines 36–39) to mention both sources:

```tsx
	// Both parade sources register during mount, before the splash covers the
	// desktop: extension apps dispatch ClassicyAppLoad and hosts/apps dispatch
	// ClassicyBootParadeIconAdd. The store is the parade's source of truth.
	// Select stable references and derive with useMemo — a filtering selector
	// would return a fresh array every snapshot.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Boot/`
Expected: PASS — all startup screen tests (old and new) plus Task 1's handler tests.

- [ ] **Step 5: Full suite + lint**

Run: `pnpm vitest run && pnpm lint`
Expected: all tests pass, no new lint errors in touched files. (Per project memory, do not run repo-wide `lint:fix` — it reformats unrelated files.)

- [ ] **Step 6: Commit**

```bash
git add src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.tsx src/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.test.tsx
git commit -m "feat(boot): startup parade renders injected icons ahead of extensions"
```
