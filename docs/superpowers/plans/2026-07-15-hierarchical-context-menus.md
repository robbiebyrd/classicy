# Hierarchical Contextual Menus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Right-click shows the correct contextual menu for what was clicked — control > window > app > desktop (empty area only) — with a single shared menu host and a wrapper component for control items.

**Architecture:** A `ClassicyContextualMenuProvider` at the desktop level holds the one open menu in transient React state and renders it via portal. Resolution is target-based through DOM event bubbling: each layer (control wrapper, window, icon, desktop) has its own `onContextMenu` handler that claims the event (`preventDefault` + `stopPropagation`) and shows its menu via the provider. Components with custom right-click behavior opt out by calling `e.preventDefault()`; every layer checks `e.defaultPrevented` first. No open-menu state touches the persisted Zustand store.

**Tech Stack:** React 18 + TypeScript, Zustand (existing store), SCSS, Vitest + Testing Library, Storybook 10, Biome (tabs, double quotes).

**Spec:** `docs/superpowers/specs/2026-07-15-hierarchical-context-menus-design.md`

## Global Constraints

- Run tests with `pnpm test` (full) or `pnpm vitest run <path>` (single file). Lint with `pnpm lint` (Biome — tabs, double quotes; fix with `pnpm lint:fix`).
- Never edit `index.ts` barrel files — `pnpm build:source` regenerates them via barrelsby. New exported files are picked up automatically.
- All styling in co-located SCSS files; no inline styles for layout/presentation.
- Path alias `@/` → `./src/`.
- Menu items are `ClassicyMenuItem[]` from `@/SystemFolder/SystemResources/Menu/ClassicyMenu`.
- Existing suite has 924 passing tests; it must stay green after every task.
- Commit after every task with a conventional-commit message.

---

### Task 1: `ClassicyContextualMenuProvider` + `useClassicyContextualMenu` hook

The shared menu host: holds `{items, position} | null`, renders the existing `ClassicyContextualMenu` through a portal, guarantees at most one open menu.

**Files:**
- Create: `src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider.tsx`
- Test: `src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider.test.tsx`

**Interfaces:**
- Consumes: existing `ClassicyContextualMenu` component (same directory), `ClassicyMenuItem` type.
- Produces (used by Tasks 2, 4, 5, 6):
  - `ClassicyContextualMenuProvider: FC<PropsWithChildren>`
  - `useClassicyContextualMenu(): { showContextMenu: (items: ClassicyMenuItem[], clickAt: [number, number]) => void; hideContextMenu: () => void }`
  - `showContextMenu` takes **raw client coordinates**; the provider applies the `[10, 10]` click offset internally (call sites must NOT subtract it).
  - Outside a provider the hook returns no-ops (components render fine unwrapped, e.g. in existing tests).

- [ ] **Step 1: Write the failing test**

```tsx
// src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	ClassicyContextualMenuProvider,
	useClassicyContextualMenu,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const menuA: ClassicyMenuItem[] = [{ id: "a1", title: "Alpha One" }];
const menuB: ClassicyMenuItem[] = [{ id: "b1", title: "Beta One" }];

const Trigger = ({
	items,
	label,
}: {
	items: ClassicyMenuItem[];
	label: string;
}) => {
	const { showContextMenu, hideContextMenu } = useClassicyContextualMenu();
	return (
		<>
			<button
				type="button"
				onClick={() => showContextMenu(items, [100, 100])}
			>
				{label}
			</button>
			<button type="button" onClick={() => hideContextMenu()}>
				hide-{label}
			</button>
		</>
	);
};

describe("ClassicyContextualMenuProvider", () => {
	it("shows the menu when showContextMenu is called", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
	});

	it("replaces an open menu when showContextMenu is called again", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
				<Trigger items={menuB} label="show-b" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.click(screen.getByText("show-b"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		expect(screen.getByText("Beta One")).toBeInTheDocument();
	});

	it("hides the menu when hideContextMenu is called", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.click(screen.getByText("hide-show-a"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});

	it("hides the menu on outside mousedown (existing ClassicyContextualMenu behavior)", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.mouseDown(document.body);
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});

	it("applies the [10,10] click offset to the menu position", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		expect(wrapper.style.left).toBe("90px");
		expect(wrapper.style.top).toBe("90px");
	});

	it("hook is a no-op without a provider", () => {
		render(<Trigger items={menuA} label="show-a" />);
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});
});
```

Note: if the shared `src/__tests__/test-utils` render is required by this repo's test setup (other component tests import it), use it instead of raw `@testing-library/react` — check `ClassicyDesktopIcon.test.tsx` imports and mirror them. SCSS imports may need the same `vi.mock` pattern used there if the Vitest config does not already handle SCSS.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider.test.tsx`
Expected: FAIL — cannot resolve `ClassicyContextualMenuProvider` module.

- [ ] **Step 3: Write the implementation**

```tsx
// src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider.tsx
import {
	createContext,
	type FC as FunctionalComponent,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

interface OpenContextMenu {
	items: ClassicyMenuItem[];
	position: [number, number];
}

export interface ClassicyContextualMenuAPI {
	showContextMenu: (
		items: ClassicyMenuItem[],
		clickAt: [number, number],
	) => void;
	hideContextMenu: () => void;
}

const noop = () => {};

const ClassicyContextualMenuContext =
	createContext<ClassicyContextualMenuAPI>({
		showContextMenu: noop,
		hideContextMenu: noop,
	});

export const useClassicyContextualMenu = (): ClassicyContextualMenuAPI =>
	useContext(ClassicyContextualMenuContext);

// Menus open slightly up-left of the pointer so the first item sits under it,
// matching the desktop's and windows' historical [10, 10] offset.
const clickOffset: [number, number] = [10, 10];

export const ClassicyContextualMenuProvider: FunctionalComponent<
	PropsWithChildren
> = ({ children }) => {
	const [openMenu, setOpenMenu] = useState<OpenContextMenu | null>(null);

	const showContextMenu = useCallback(
		(items: ClassicyMenuItem[], clickAt: [number, number]) => {
			setOpenMenu({
				items,
				position: [clickAt[0] - clickOffset[0], clickAt[1] - clickOffset[1]],
			});
		},
		[],
	);

	const hideContextMenu = useCallback(() => setOpenMenu(null), []);

	const api = useMemo(
		() => ({ showContextMenu, hideContextMenu }),
		[showContextMenu, hideContextMenu],
	);

	return (
		<ClassicyContextualMenuContext.Provider value={api}>
			{children}
			{openMenu &&
				createPortal(
					<ClassicyContextualMenu
						name={"classicyContextualMenu"}
						menuItems={openMenu.items}
						position={openMenu.position}
						onClose={hideContextMenu}
					/>,
					document.getElementById("classicyDesktop") ?? document.body,
				)}
		</ClassicyContextualMenuContext.Provider>
	);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Lint and commit**

```bash
pnpm lint:fix
git add src/SystemFolder/SystemResources/ContextualMenu/
git commit -m "feat: add ClassicyContextualMenuProvider shared menu host"
```

---

### Task 2: `ClassicyContextualMenuTarget` wrapper component

The control-item API: wrap anything to give it a right-click menu, mirroring the `ClassicyBalloonHelp` wrapper pattern.

**Files:**
- Create: `src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget.tsx`
- Create: `src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget.scss`
- Test: `src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget.test.tsx`

**Interfaces:**
- Consumes: `useClassicyContextualMenu` from Task 1.
- Produces: `ClassicyContextualMenuTarget: FC<PropsWithChildren<{ menuItems: ClassicyMenuItem[]; className?: string }>>` — claims the `contextmenu` event (`preventDefault` + `stopPropagation`) and shows `menuItems`; honors `e.defaultPrevented` (does nothing if a child already claimed the event).

- [ ] **Step 1: Write the failing test**

```tsx
// src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget.test.tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { ClassicyContextualMenuTarget } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const menu: ClassicyMenuItem[] = [{ id: "copy", title: "Copy Value" }];

describe("ClassicyContextualMenuTarget", () => {
	it("shows its menu on right-click", () => {
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyContextualMenuTarget menuItems={menu}>
					<span>wrapped control</span>
				</ClassicyContextualMenuTarget>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("wrapped control"));
		expect(screen.getByText("Copy Value")).toBeInTheDocument();
	});

	it("claims the event so outer handlers never see it", () => {
		const outerHandler = vi.fn();
		render(
			<ClassicyContextualMenuProvider>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
				<div onContextMenu={outerHandler}>
					<ClassicyContextualMenuTarget menuItems={menu}>
						<span>wrapped control</span>
					</ClassicyContextualMenuTarget>
				</div>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("wrapped control"));
		expect(outerHandler).not.toHaveBeenCalled();
	});

	it("does nothing when a child already claimed the event via preventDefault", () => {
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyContextualMenuTarget menuItems={menu}>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
					<span
						onContextMenu={(e) => {
							e.preventDefault();
						}}
					>
						custom right-click child
					</span>
				</ClassicyContextualMenuTarget>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("custom right-click child"));
		expect(screen.queryByText("Copy Value")).not.toBeInTheDocument();
	});

	it("inner target wins over outer target (nested wrappers)", () => {
		const innerMenu: ClassicyMenuItem[] = [{ id: "in", title: "Inner Item" }];
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyContextualMenuTarget menuItems={menu}>
					<ClassicyContextualMenuTarget menuItems={innerMenu}>
						<span>inner control</span>
					</ClassicyContextualMenuTarget>
				</ClassicyContextualMenuTarget>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("inner control"));
		expect(screen.getByText("Inner Item")).toBeInTheDocument();
		expect(screen.queryByText("Copy Value")).not.toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget.test.tsx`
Expected: FAIL — cannot resolve `ClassicyContextualMenuTarget` module.

- [ ] **Step 3: Write the implementation**

```scss
// src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget.scss
// display: contents keeps the wrapper out of layout entirely — the wrapped
// control renders exactly as if unwrapped.
.classicyContextualMenuTarget {
	display: contents;
}
```

```tsx
// src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget.tsx
import "./ClassicyContextualMenuTarget.scss";
import type {
	FC as FunctionalComponent,
	MouseEvent,
	PropsWithChildren,
} from "react";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

interface ClassicyContextualMenuTargetProps extends PropsWithChildren {
	menuItems: ClassicyMenuItem[];
	className?: string;
}

export const ClassicyContextualMenuTarget: FunctionalComponent<
	ClassicyContextualMenuTargetProps
> = ({ menuItems, className, children }) => {
	const { showContextMenu } = useClassicyContextualMenu();

	const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		if (e.defaultPrevented) return;
		e.preventDefault();
		e.stopPropagation();
		showContextMenu(menuItems, [e.clientX, e.clientY]);
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: transparent wrapper adds a contextual menu to arbitrary children
		<div
			className={["classicyContextualMenuTarget", className]
				.filter(Boolean)
				.join(" ")}
			onContextMenu={handleContextMenu}
		>
			{children}
		</div>
	);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Lint and commit**

```bash
pnpm lint:fix
git add src/SystemFolder/SystemResources/ContextualMenu/
git commit -m "feat: add ClassicyContextualMenuTarget wrapper for control-item menus"
```

---

### Task 3: App-level contextual menu (`ClassicyApp` prop → store)

Apps declare `contextMenu` like they declare `appMenu` today: prop → `ClassicyAppLoad` → app state. `loadApp` must **always** refresh the field (persisted localStorage state strips `onClickFunc` functions, so stale persisted menus must be overwritten on every mount).

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` (app interface ~line 52-66; `ClassicyAppLoad` case ~line 196)
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers.ts` (`loadApp` ~line 104)
- Modify: `src/SystemFolder/SystemResources/App/ClassicyApp.tsx` (new prop, dispatch)
- Test: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts` (add cases to existing file)

**Interfaces:**
- Consumes: existing `loadApp(ds, appId, appName, appIcon)` and `ClassicyAppLoad` action.
- Produces (used by Task 4):
  - `ClassicyStoreSystemApp.contextMenu?: ClassicyMenuItem[]`
  - `loadApp(ds, appId, appName, appIcon, contextMenu?: ClassicyMenuItem[])`
  - `ClassicyApp` prop `contextMenu?: ClassicyMenuItem[]`; the `ClassicyAppLoad` action carries `contextMenu`.

- [ ] **Step 1: Write the failing tests**

Add to the existing `describe` structure in `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`, reusing that file's existing initial-state fixture/helpers (match its local naming — assume a helper that produces a full `ClassicyStore` exists; follow the file's own pattern for other `ClassicyAppLoad` tests):

```ts
describe("ClassicyAppLoad — app contextMenu", () => {
	it("stores contextMenu on a newly loaded app", () => {
		const ds = createTestStore(); // use this file's existing fixture helper
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppLoad",
			app: { id: "Menu.app", name: "Menu App", icon: "icon.png" },
			contextMenu: [{ id: "m1", title: "App Item" }],
		});
		expect(
			ds.System.Manager.Applications.apps["Menu.app"].contextMenu,
		).toEqual([{ id: "m1", title: "App Item" }]);
	});

	it("refreshes contextMenu on an already-loaded app (persisted state is stale)", () => {
		const ds = createTestStore();
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppLoad",
			app: { id: "Menu.app", name: "Menu App", icon: "icon.png" },
			contextMenu: [{ id: "m1", title: "Old Item" }],
		});
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppLoad",
			app: { id: "Menu.app", name: "Menu App", icon: "icon.png" },
			contextMenu: [{ id: "m2", title: "New Item" }],
		});
		expect(
			ds.System.Manager.Applications.apps["Menu.app"].contextMenu,
		).toEqual([{ id: "m2", title: "New Item" }]);
	});

	it("clears contextMenu when the app no longer declares one", () => {
		const ds = createTestStore();
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppLoad",
			app: { id: "Menu.app", name: "Menu App", icon: "icon.png" },
			contextMenu: [{ id: "m1", title: "Old Item" }],
		});
		classicyDesktopStateEventReducer(ds, {
			type: "ClassicyAppLoad",
			app: { id: "Menu.app", name: "Menu App", icon: "icon.png" },
		});
		expect(
			ds.System.Manager.Applications.apps["Menu.app"].contextMenu,
		).toBeUndefined();
	});
});
```

(If the file dispatches through a different entry point — e.g. a store instance — mirror its existing `ClassicyAppLoad` tests exactly; only the `contextMenu` payload and assertions are new.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: FAIL — `contextMenu` is `undefined` in the first two tests.

- [ ] **Step 3: Implement**

In `ClassicyAppManager.ts`, add to `ClassicyStoreSystemApp` (after `appMenu?: ClassicyMenuItem[];`):

```ts
	contextMenu?: ClassicyMenuItem[];
```

Change the `ClassicyAppLoad` case:

```ts
		case "ClassicyAppLoad": {
			if (hasDesktopAppRef(action)) {
				loadApp(
					ds,
					action.app.id,
					action.app.name,
					action.app.icon,
					Array.isArray(action.contextMenu)
						? (action.contextMenu as ClassicyMenuItem[])
						: undefined,
				);
			}
			break;
		}
```

In `ClassicyAppHelpers.ts`, change `loadApp`:

```ts
export function loadApp(
	ds: ClassicyStore,
	appId: string,
	appName: string,
	appIcon: string,
	contextMenu?: ClassicyMenuItem[],
) {
	const findApp = ds.System.Manager.Applications.apps[appId];
	if (!findApp) {
		ds.System.Manager.Applications.apps[appId] = {
			id: appId,
			name: appName,
			icon: appIcon,
			windows: [],
			open: false,
			data: {},
			contextMenu,
		};
	} else {
		// Always refresh: menu onClickFunc handlers do not survive localStorage
		// persistence, so a re-mounting app must overwrite the persisted value.
		findApp.contextMenu = contextMenu;
	}
}
```

In `ClassicyApp.tsx`, add the prop and pass it through:

```ts
export interface ClassicyAppProps {
	id: string;
	name: string;
	icon: string;
	defaultWindow?: string;
	noDesktopIcon?: boolean;
	addSystemMenu?: boolean;
	debug?: boolean;
	handlesFileTypes?: ClassicyFileSystemEntryFileType[];
	handlesOwnFiles?: boolean;
	contextMenu?: ClassicyMenuItem[];
	children?: ReactNode;
}
```

(add `contextMenu` to the destructured props, and import `type ClassicyMenuItem`). In the mount `useEffect`, change the load dispatch:

```ts
		desktopEventDispatch({
			type: "ClassicyAppLoad",
			app: { id, name, icon },
			contextMenu,
		});
```

Do NOT add `contextMenu` to that effect's dependency array — consumers pass inline array literals whose identity changes every render, which would re-fire the mount effect in a loop. Keep the existing dep list and add a biome-ignore comment matching the file's existing style:

```ts
		// contextMenu is intentionally omitted: inline menu literals change
		// identity every render and must not re-fire the load effect.
		// biome-ignore lint/correctness/useExhaustiveDependencies: see above
	}, [addSystemMenu, noDesktopIcon, desktopEventDispatch, id, name, icon]);
```

(If Biome does not flag it, omit the ignore comment — keep only the explanatory comment.)

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint and commit**

```bash
pnpm lint:fix
git add src/SystemFolder/ControlPanels/AppManager/ src/SystemFolder/SystemResources/App/ClassicyApp.tsx
git commit -m "feat: app-level contextMenu prop on ClassicyApp, stored via ClassicyAppLoad"
```

---

### Task 4: `ClassicyWindow` resolution (window prop → app fallback → nothing)

Replace the dead dispatch plumbing with live resolution through the provider. The window **always** claims the right-click (no desktop/native menu over a window), focuses itself, then shows `contextMenu` prop → `currentApp.contextMenu` → nothing.

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`
- Test: Create `src/SystemFolder/SystemResources/Window/ClassicyWindow.contextmenu.test.tsx`

**Interfaces:**
- Consumes: `useClassicyContextualMenu` (Task 1); `currentApp.contextMenu` (Task 3); existing `setActive`, `track`.
- Produces: `ClassicyWindow`'s existing `contextMenu?: ClassicyMenuItem[]` prop now means "window-level menu" and is no longer copied into window registration state.

- [ ] **Step 1: Write the failing test**

Model the store mock on `ClassicyWindow.titlebar.test.tsx` / `ClassicyWindow.mountfocus.test.tsx` (they already build a full mocked `useAppManager` state with an app + window — copy that setup verbatim and adjust). New file:

```tsx
// src/SystemFolder/SystemResources/Window/ClassicyWindow.contextmenu.test.tsx
// Copy the vi.mock setup (useAppManager/useAppManagerDispatch, sound,
// analytics, SCSS) from ClassicyWindow.titlebar.test.tsx. The mocked app
// state must expose: apps["Test.app"] = { id: "Test.app", focused: true,
// contextMenu: <set per test via a mutable variable>, windows: [ ...one
// window w/ id "test_window", closed: false, focused: true, position,
// size, minimumSize... ] }.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const windowMenu = [{ id: "w1", title: "Window Item" }];
const appMenu = [{ id: "a1", title: "App Item" }];

const renderWindow = (props: Record<string, unknown> = {}) =>
	render(
		<ClassicyContextualMenuProvider>
			<ClassicyWindow id="test_window" appId="Test.app" {...props}>
				<span>window content</span>
			</ClassicyWindow>
		</ClassicyContextualMenuProvider>,
	);

describe("ClassicyWindow contextual menu resolution", () => {
	it("shows the window-level menu from the contextMenu prop", () => {
		renderWindow({ contextMenu: windowMenu });
		fireEvent.contextMenu(screen.getByText("window content"));
		expect(screen.getByText("Window Item")).toBeInTheDocument();
	});

	it("window prop wins over the app-level menu", () => {
		// set mocked app contextMenu = appMenu for this test
		renderWindow({ contextMenu: windowMenu });
		fireEvent.contextMenu(screen.getByText("window content"));
		expect(screen.getByText("Window Item")).toBeInTheDocument();
		expect(screen.queryByText("App Item")).not.toBeInTheDocument();
	});

	it("falls back to the app-level menu when the window has none", () => {
		// set mocked app contextMenu = appMenu for this test
		renderWindow();
		fireEvent.contextMenu(screen.getByText("window content"));
		expect(screen.getByText("App Item")).toBeInTheDocument();
	});

	it("shows nothing when neither window nor app defines a menu, but still claims the event", () => {
		// mocked app contextMenu = undefined
		const outerHandler = vi.fn();
		render(
			<ClassicyContextualMenuProvider>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
				<div onContextMenu={outerHandler}>
					<ClassicyWindow id="test_window" appId="Test.app">
						<span>window content</span>
					</ClassicyWindow>
				</div>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("window content"));
		expect(outerHandler).not.toHaveBeenCalled();
		expect(
			document.querySelector(".classicyContextMenuWrapper"),
		).not.toBeInTheDocument();
	});

	it("does nothing when a child already claimed the event via preventDefault", () => {
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyWindow
					id="test_window"
					appId="Test.app"
					contextMenu={windowMenu}
				>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
					<span
						onContextMenu={(e) => {
							e.preventDefault();
						}}
					>
						opt-out child
					</span>
				</ClassicyWindow>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("opt-out child"));
		expect(screen.queryByText("Window Item")).not.toBeInTheDocument();
		expect(
			document.querySelector(".classicyContextMenuWrapper"),
		).not.toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.contextmenu.test.tsx`
Expected: FAIL — menus are not rendered through the provider yet (old code dispatches `ClassicyWindowContextMenu` into a reducer case that doesn't exist, so nothing appears; the "claims the event" assertions may also fail).

- [ ] **Step 3: Rewrite the window's context-menu code**

In `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`:

1. Import the hook:

```ts
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
```

2. Inside the component, after `const player = useSoundDispatch();`:

```ts
	const { showContextMenu } = useClassicyContextualMenu();
```

3. **Delete** (currently ~lines 617-656): `setContextMenu`, `closeContextMenuHandler`, `onMouseOutHandler`, and the old `showContextMenu` function.

4. **Add** the new handler in their place:

```ts
	const onContextMenuHandler = (e: MouseEvent<HTMLDivElement>) => {
		if (e.defaultPrevented) return;
		// Claim the right-click: neither the desktop menu nor the native
		// browser menu may appear over a window.
		e.preventDefault();
		e.stopPropagation();
		setActive();
		const items = contextMenu ?? currentApp?.contextMenu;
		track("contextMenu", {
			type: "ClassicyWindow",
			show: !!items,
			...analyticsArgs,
		});
		if (items && items.length > 0) {
			showContextMenu(items, [e.clientX, e.clientY]);
		}
	};
```

5. On the window `<div>` (~line 740): change `onContextMenu={showContextMenu}` to `onContextMenu={onContextMenuHandler}` and **remove** `onMouseOut={onMouseOutHandler}`.

6. **Delete** the inline menu render block (~lines 743-750):

```tsx
			{contextMenu && ws.contextMenu ? (
				<ClassicyContextualMenu ... />
			) : null}
```

and remove the now-unused `ClassicyContextualMenu` import.

7. In the `ws` initial-state memo (~lines 245-286): remove `contextMenu: contextMenu,` and `showContextMenu: false,` lines and drop `contextMenu` from the memo's dependency array.

8. Check whether `clickPosition` state (~line 171) has any remaining readers after the deletions (`grep -n "clickPosition" src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx` — note `clickPositionRef` is a different, still-used variable). If the only reader was the deleted menu render, delete the `clickPosition` state and its `setClickPosition` writers.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/`
Expected: new file PASSES; `titlebar`/`mountfocus` suites still pass (their fixtures still carry `showContextMenu: false` — harmless extra property until Task 7 removes the field from the type; if TS excess-property errors appear, remove those fixture lines now instead of in Task 7).

- [ ] **Step 5: Lint and commit**

```bash
pnpm lint:fix
git add src/SystemFolder/SystemResources/Window/
git commit -m "feat: ClassicyWindow resolves contextual menu (window prop, app fallback) via shared provider"
```

---

### Task 5: Desktop — provider mount + target guard fix

Fix the `currentTarget` bug so `defaultMenuItems` only appear on empty desktop, and move the desktop's menu onto the shared provider.

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx`
- Test: Create `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.contextmenu.test.tsx`

**Interfaces:**
- Consumes: `ClassicyContextualMenuProvider` + `useClassicyContextualMenu` (Task 1).
- Produces: `ClassicyDesktop` renders everything inside the provider — windows, icons, and wrapped controls all share the single menu host at runtime.

- [ ] **Step 1: Write the failing test**

`ClassicyDesktop` pulls in the whole app tree; a full render is heavy. Model mocks on `ClassicyDesktop.test.tsx` (existing file — reuse its mock set verbatim: it already stubs the store, apps, startup screen, etc.). Add a new focused file:

```tsx
// src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.contextmenu.test.tsx
// Reuse the vi.mock setup from ClassicyDesktop.test.tsx verbatim.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

describe("ClassicyDesktop contextual menu scoping", () => {
	it("shows defaultMenuItems when right-clicking the empty desktop", () => {
		render(<ClassicyDesktop startupScreen={false} />);
		const desktop = document.getElementById("classicyDesktop") as HTMLElement;
		fireEvent.contextMenu(desktop);
		// "Special" is a stable defaultMenuItems entry
		expect(screen.getByText("Special")).toBeInTheDocument();
	});

	it("does NOT show defaultMenuItems when right-clicking a child element", () => {
		render(
			<ClassicyDesktop startupScreen={false}>
				<span>desktop child</span>
			</ClassicyDesktop>,
		);
		fireEvent.contextMenu(screen.getByText("desktop child"));
		expect(screen.queryByText("Special")).not.toBeInTheDocument();
	});

	it("does not open a menu when the event was already claimed (defaultPrevented)", () => {
		render(
			<ClassicyDesktop startupScreen={false}>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
				<span onContextMenu={(e) => e.preventDefault()}>opt-out child</span>
			</ClassicyDesktop>,
		);
		fireEvent.contextMenu(screen.getByText("opt-out child"));
		expect(screen.queryByText("Special")).not.toBeInTheDocument();
	});
});
```

(Right-clicking a *child* whose target is not the desktop div also exercises the fixed guard — the second test is the regression test for the original bug.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.contextmenu.test.tsx`
Expected: test 1 may pass (old code also shows the menu there), test 2 FAILS — the old `currentTarget` guard shows "Special" on child right-clicks too.

- [ ] **Step 3: Implement**

In `ClassicyDesktop.tsx`:

1. Import provider + hook:

```ts
import {
	ClassicyContextualMenuProvider,
	useClassicyContextualMenu,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
```

2. In `ClassicyDesktopInner`: delete the `contextMenu`, `contextMenuLocation` `useState` pair (~lines 68-69), the `closeContextMenu` callback (~line 413), and the `{contextMenu ? <ClassicyContextualMenu ... /> : null}` block (~lines 449-456). Remove the now-unused `ClassicyContextualMenu` import. Add:

```ts
	const { showContextMenu } = useClassicyContextualMenu();
```

3. Replace `toggleDesktopContextMenu` (~lines 319-328):

```ts
	const toggleDesktopContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		if (e.defaultPrevented) return;
		// Always suppress the native browser menu over the desktop, but only
		// show the default menu when the click target IS the desktop itself
		// (e.target, not currentTarget — the handler lives on the desktop div,
		// so currentTarget is always the desktop).
		e.preventDefault();
		if ((e.target as HTMLElement).id === "classicyDesktop") {
			showContextMenu(defaultMenuItems, [e.clientX, e.clientY]);
		}
	};
```

Note: `defaultMenuItems` is declared *after* `toggleDesktopContextMenu` in the current file — the `useMemo` value is in scope because the handler only runs after render, but move the `defaultMenuItems` `useMemo` above the handler for readability if Biome/TS complains about use-before-declare.

4. In `clearActives` (~line 305): remove the `setContextMenu(false);` line (outside-mousedown close is handled by `ClassicyContextualMenu` itself).

5. In `startSelectBox` (~line 219): the right-button branch calls `toggleDesktopContextMenu(e)` — no change needed (the new guard checks `e.target`, which that branch already established is the desktop).

6. Mount the provider in the outer `ClassicyDesktop` export so `ClassicyDesktopInner` can use the hook:

```tsx
export const ClassicyDesktop: FunctionalComponent<ClassicyDesktopProps> = ({
	children,
	startupScreen,
	startupDuration,
}) => (
	<ClassicyCrashScreen>
		<ClassicyContextualMenuProvider>
			<ClassicyDesktopInner
				startupScreen={startupScreen}
				startupDuration={startupDuration}
			>
				{children}
			</ClassicyDesktopInner>
		</ClassicyContextualMenuProvider>
	</ClassicyCrashScreen>
);
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/`
Expected: new file PASSES (3 tests); existing desktop suites still pass.

- [ ] **Step 5: Lint and commit**

```bash
pnpm lint:fix
git add src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.contextmenu.test.tsx
git commit -m "fix: desktop context menu only on empty desktop; mount shared menu provider"
```

---

### Task 6: Per-icon contextual menus on `ClassicyDesktopIcon`

**Files:**
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.tsx`
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext.tsx` (`ClassicyDesktopIconAdd` case ~line 151)
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktop.tsx` (icon map ~line 471)
- Test: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.test.tsx` (add cases)

**Interfaces:**
- Consumes: `useClassicyContextualMenu` (Task 1); the icon store field `ClassicyStoreSystemDesktopManagerIcon.contextMenu?: ClassicyMenuItem[]` (already declared, currently unused).
- Produces: `ClassicyDesktopIcon` prop `contextMenu?: ClassicyMenuItem[]`; `ClassicyDesktopIconAdd` action accepts `contextMenu`.

- [ ] **Step 1: Write the failing tests**

Add to `ClassicyDesktopIcon.test.tsx` (reuse its existing mocks; wrap renders in the provider):

```tsx
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";

describe("ClassicyDesktopIcon contextual menu", () => {
	const iconMenu = [{ id: "open", title: "Open Item" }];

	it("shows its per-icon menu on right-click and selects the icon", () => {
		const { container } = render(
			<ClassicyContextualMenuProvider>
				<ClassicyDesktopIcon {...defaultProps} contextMenu={iconMenu} />
			</ClassicyContextualMenuProvider>,
		);
		const iconDiv = container.querySelector(
			"#TestApp\\.shortcut",
		) as HTMLElement;
		fireEvent.contextMenu(iconDiv);
		expect(screen.getByText("Open Item")).toBeInTheDocument();
		expect(mockDispatch).toHaveBeenCalledWith({
			type: "ClassicyDesktopIconFocus",
			iconId: "TestApp",
		});
	});

	it("shows nothing on right-click when no menu is defined, but still claims the event", () => {
		const outerHandler = vi.fn();
		const { container } = render(
			<ClassicyContextualMenuProvider>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
				<div onContextMenu={outerHandler}>
					<ClassicyDesktopIcon {...defaultProps} />
				</div>
			</ClassicyContextualMenuProvider>,
		);
		const iconDiv = container.querySelector(
			"#TestApp\\.shortcut",
		) as HTMLElement;
		fireEvent.contextMenu(iconDiv);
		expect(outerHandler).not.toHaveBeenCalled();
		expect(
			document.querySelector(".classicyContextMenuWrapper"),
		).not.toBeInTheDocument();
	});
});
```

(`fireEvent` and `screen` are already imported in that file; add `vi` if missing.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.test.tsx`
Expected: FAIL — `contextMenu` prop does not exist / no menu appears. (The "claims the event" half may already pass since `clickFocus` calls `stopPropagation`.)

- [ ] **Step 3: Implement**

In `ClassicyDesktopIcon.tsx`:

1. Add to `ClassicyDesktopIconProps`:

```ts
	contextMenu?: ClassicyMenuItem[];
```

(import `type ClassicyMenuItem`; add `contextMenu` to the destructured props.)

2. Add the hook near the other hooks:

```ts
	const { showContextMenu } = useClassicyContextualMenu();
```

(import `useClassicyContextualMenu`.)

3. Replace the existing `onContextMenu` handler (~lines 206-210, currently a TODO):

```tsx
					onContextMenu={(e: MouseEvent<HTMLDivElement>) => {
						if (e.defaultPrevented) return;
						e.preventDefault();
						clickFocus(e); // selects the icon and stops propagation
						if (contextMenu && contextMenu.length > 0) {
							showContextMenu(contextMenu, [e.clientX, e.clientY]);
						}
					}}
```

In `ClassicyDesktopIconContext.tsx`, `ClassicyDesktopIconAdd` case — add alongside the `event`/`eventData` fields in the pushed icon object:

```ts
					contextMenu: Array.isArray(action.contextMenu)
						? (action.contextMenu as ClassicyMenuItem[])
						: undefined,
```

(import `type ClassicyMenuItem` if not already imported in that file.)

In `ClassicyDesktop.tsx`, the `desktopIcons.map` (~line 471) — pass the stored menu through:

```tsx
					contextMenu={i.contextMenu}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Desktop/`
Expected: PASS, including the two new tests.

- [ ] **Step 5: Lint and commit**

```bash
pnpm lint:fix
git add src/SystemFolder/SystemResources/Desktop/
git commit -m "feat: per-icon contextual menus on ClassicyDesktopIcon"
```

---

### Task 7: Delete dead context-menu state and events

Remove every remnant of the old dispatch-based plumbing. This task is mechanical but wide; the compiler is the safety net — remove the fields from the interfaces first, then fix every TS error.

**Files:**
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyAppManager.ts` — remove `contextMenu?`/`showContextMenu?` from `ClassicyStoreSystemAppWindow` (~lines 86-87) and `contextMenu: []` / `showContextMenu: false` from the Desktop initial state (~lines 401-402).
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager.tsx` — remove `contextMenu`/`showContextMenu` from `ClassicyStoreSystemDesktopManager` (~lines 45-46), the `ds.System.Manager.Desktop.showContextMenu = false;` line in `ClassicyDesktopFocus` (~line 108), and the whole `ClassicyDesktopContextMenu` case (~lines 138-145). Remove the now-unused `hasShowContextMenu` import.
- Modify: `src/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates.ts` — delete `hasShowContextMenu` (~lines 159-164).
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindowContext.ts` — remove `contextMenu?`, `contextMenuShown`, `contextMenuLocation?` (lines 16-18).
- Modify: `src/SystemFolder/SystemResources/Desktop/ClassicyDesktopWindowManagerContext.tsx` — remove `contextMenuShown: false,` (~line 26) and the commented `ClassicyWindowContextMenu` block (~lines 311-317).
- Test fixture updates (remove `showContextMenu: false,` and any `contextMenu: [],` from Desktop-state stubs): `ClassicyDesktopEventHandler.test.ts`, `ClassicyDesktopIconEventHandler.test.ts`, `ClassicyWindowEventHandler.test.ts`, `ClassicyReducerRouting.test.ts`, `ClassicyAppManager.test.ts`, `ClassicyAppManagerUtils.test.ts`, `ClassicyAppManagerContext.test.tsx`, `ClassicyFinderEventHandler.test.ts`, `ClassicyMoviePlayerEventHandler.test.ts`, `ClassicyPictureViewerEventHandler.test.ts`, `ClassicyPDFViewerEventHandler.test.ts`, `ClassicyDateTimeManagerEventHandler.test.ts`, `ClassicyWindow.mountfocus.test.tsx`, `ClassicyWindow.titlebar.test.tsx` (window-level `showContextMenu: false` stubs).
- Test deletions/rewrites:
  - `ClassicyDesktopEventHandler.test.ts`: delete the `describe("classicyDesktopEventHandler — ClassicyDesktopContextMenu", ...)` block (~lines 210-252). The `ClassicyDesktopFocus` test (~lines 432-445) asserts `showContextMenu` is reset — drop that assertion (keep the rest of the test).
  - `ClassicyReducerRouting.test.ts`: the routing test (~lines 171-180) uses `ClassicyDesktopContextMenu` to prove `ClassicyDesktop*` routing — rewrite it to use `ClassicyDesktopSetBalloonHelp`:

```ts
	it("ClassicyDesktopSetBalloonHelp routes to desktop handler — disableBalloonHelp is updated", () => {
		const ds = createStore();
		const result = classicyDesktopStateEventReducer(ds, {
			type: "ClassicyDesktopSetBalloonHelp",
			disableBalloonHelp: true,
		});
		expect(result.System.Manager.Desktop.disableBalloonHelp).toBe(true);
	});
```

  (match the file's actual fixture/helper names)
  - `ClassicyActionPredicates.test.ts`: delete the `hasShowContextMenu` describe block (~lines 328-343).

- [ ] **Step 1: Remove the interface fields, then chase compiler errors**

Remove the fields listed above, then run:

```bash
pnpm exec tsc -b --noEmit 2>&1 | head -50
```

Fix every error — they will all be fixture object literals or dead reads listed above. Repeat until clean. (`tsc -b` may not accept `--noEmit` with project refs; if so run `pnpm exec tsc -b` and discard build output, or `pnpm build:source`.)

- [ ] **Step 2: Update/delete the tests listed above**

- [ ] **Step 3: Run the full suite**

Run: `pnpm test`
Expected: PASS. Total count will drop slightly (deleted `ClassicyDesktopContextMenu` + `hasShowContextMenu` tests) and gain the rewritten routing test.

- [ ] **Step 4: Lint and commit**

```bash
pnpm lint:fix
git add -A src/
git commit -m "refactor: remove dead context-menu state, events, and predicates"
```

---

### Task 8: Storybook stories + docs

**Files:**
- Create: `src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget.stories.tsx`
- Modify: `CLAUDE.md` (add a Contextual Menus section under Balloon Help)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the story**

Model decorators/meta on the existing `ClassicyContextualMenu.stories.tsx` (same directory — copy its meta shape, decorators, and title prefix, e.g. `Controls/...`):

```tsx
// src/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget.stories.tsx
// Copy meta/decorators from ClassicyContextualMenu.stories.tsx.
import type { Meta, StoryObj } from "@storybook/react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { ClassicyContextualMenuTarget } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget";

// ...meta matching the sibling stories file, plus:
// decorators: wrap in <ClassicyContextualMenuProvider> so the menu host exists.

export const ControlWithMenu: Story = {
	render: () => (
		<ClassicyContextualMenuProvider>
			<ClassicyContextualMenuTarget
				menuItems={[
					{ id: "cut", title: "Cut" },
					{ id: "copy", title: "Copy" },
					{ id: "paste", title: "Paste" },
				]}
			>
				<ClassicyButton>Right-click me</ClassicyButton>
			</ClassicyContextualMenuTarget>
		</ClassicyContextualMenuProvider>
	),
};
```

Verify it renders: `pnpm storybook` (spot-check in the browser) or rely on the story build in CI if that's the project norm — check how sibling stories were verified.

- [ ] **Step 2: Document in CLAUDE.md**

Add after the Balloon Help section:

```markdown
### Contextual Menus

Right-click menus resolve target-based, innermost wins: a `ClassicyContextualMenuTarget`-wrapped control > the window's `contextMenu` prop > the app's `contextMenu` prop (`ClassicyApp`) > the desktop default menu (empty desktop only). Desktop icons take an optional `contextMenu` prop. A single `ClassicyContextualMenuProvider` (mounted by `ClassicyDesktop`) renders the one open menu via portal.

​```tsx
<ClassicyContextualMenuTarget menuItems={[{ id: "copy", title: "Copy" }]}>
  <ClassicyButton>Copy</ClassicyButton>
</ClassicyContextualMenuTarget>
​```

- Components with custom right-click behavior and no menu call `e.preventDefault()` in their own `onContextMenu`; every menu layer checks `e.defaultPrevented` and stays silent.
- If neither a window nor its app defines a menu, right-click shows nothing (native browser menu stays suppressed inside the desktop).
```

- [ ] **Step 3: Full verification**

```bash
pnpm test          # full suite green
pnpm lint          # clean
pnpm build:source  # library builds (barrels pick up the new files)
```

- [ ] **Step 4: Commit**

```bash
git add src/SystemFolder/SystemResources/ContextualMenu/ CLAUDE.md
git commit -m "docs: contextual menu story and CLAUDE.md docs"
```

---

## Final acceptance (manual, via example app)

Run `pnpm preview` and verify in the browser:

1. Right-click empty desktop → default menu (File/Edit/View/Special/Help).
2. Right-click a desktop icon → nothing (no icon menus defined yet by default).
3. Right-click inside any window → app/window menu or nothing — never the desktop menu, never the native menu.
4. Open two apps; right-click each window → correct menu per window, one menu open at a time.
