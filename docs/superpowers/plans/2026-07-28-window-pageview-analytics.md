# ClassicyWindow Pageview Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit a Google Analytics pageview when a `ClassicyWindow` opens or gains focus, using a derived low-cardinality path that never contains user file paths.

**Architecture:** All string handling lives in one pure, React-free module (`ClassicyAnalyticsPath.ts`) so the tricky rules are unit-testable in isolation. `useClassicyAnalytics` gains a wrapped `page(path, title)` alongside its existing wrapped `track`. `ClassicyWindow` owns a single effect that watches `ws.closed` / `ws.focused` and calls `page`, with refs to detect transitions and suppress the open-and-focus double fire.

**Tech Stack:** React 19 + TypeScript, the `analytics` / `use-analytics` packages, Zustand store, vitest + React Testing Library, Biome, pnpm.

**Spec:** `docs/superpowers/specs/2026-07-28-window-pageview-analytics-design.md`

## Global Constraints

- Run a single test file with `pnpm vitest run <path>`; the whole suite with `pnpm test`.
- `pnpm test` does NOT type-check. Run `pnpm build:source` (which runs `tsc -b`) before the final commit.
- Do NOT hand-edit `index.ts` barrel files — `generate-barrels` regenerates them during `pnpm build:source`.
- Scope Biome to the files you touched: `pnpm biome check --write <files>`. Running it on a whole directory reformats unrelated files.
- Indentation in this repo is **tabs**. Match the surrounding file.
- The pageview path is **never** prefixed with `ClassicyAnalyticsPrefixContext`. That prefix namespaces custom event names only; prefixing a path would produce `classicy_/simpletext/window-1`.
- The separator between app name and window title in a pageview title is an em dash with spaces: `" — "`.
- Exact default copy for path segments: `app` (unknown app), `main` (empty window segment), `file` (file window), `folder` (path-keyed window), `window-<n>` (numeric window segment).
- Do not change, rename, or remove any existing `track()` call in `ClassicyWindow`.
- Known pre-existing flake, **not** caused by this work: under full-suite load, `PDFViewerDocument.test.tsx` ("does not zoom on canvas click while the Pan tool is active") and `ClassicyAppManagerContext.test.tsx` ("seeds the store…") can time out. Both pass in isolation. If one fails in `pnpm test`, re-run that file alone to confirm before investigating.

---

### Task 1: Path and title derivation

A pure module with no React imports, so every rule is testable directly. This is where the privacy-critical logic lives: two window-id shapes in this repo embed user file paths (`ClassicyApp.tsx:312` builds file windows as `` `${id}_file_${filePath}` ``, and Finder keys its windows by folder path), and both must collapse to a generic segment.

**Files:**
- Create: `src/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath.ts`
- Create: `src/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `classicyWindowPagePath(appId: string, windowId: string): string`
  - `classicyWindowPageTitle(appName: string | undefined, title: string | undefined, fallbackPath: string): string`

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	classicyWindowPagePath,
	classicyWindowPageTitle,
} from "@/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath";

describe("classicyWindowPagePath", () => {
	it("derives an app segment by dropping a trailing .app", () => {
		expect(classicyWindowPagePath("SimpleText.app", "SimpleText_1")).toBe(
			"/simpletext/window-1",
		);
	});

	it("prefixes a purely numeric window segment with window-", () => {
		expect(classicyWindowPagePath("DriveSetup.app", "DriveSetup_1")).toBe(
			"/drivesetup/window-1",
		);
	});

	it("keeps a descriptive window id as-is", () => {
		expect(classicyWindowPagePath("MoviePlayer.app", "player")).toBe(
			"/movieplayer/player",
		);
	});

	it("strips the full appId prefix before the app segment (longest match wins)", () => {
		expect(
			classicyWindowPagePath("SimpleText.app", "SimpleText.app_debugger"),
		).toBe("/simpletext/debugger");
	});

	it("collapses a file window id to /file instead of leaking the path", () => {
		expect(
			classicyWindowPagePath(
				"SimpleText.app",
				"SimpleText.app_file_Macintosh HD:Docs:budget.txt",
			),
		).toBe("/simpletext/file");
	});

	it("collapses a path-keyed window id to /folder", () => {
		expect(classicyWindowPagePath("Finder.app", "Macintosh HD:Applications")).toBe(
			"/finder/folder",
		);
	});

	it("collapses a slash-separated window id too", () => {
		expect(classicyWindowPagePath("Finder.app", "Macintosh HD/Applications")).toBe(
			"/finder/folder",
		);
	});

	it("falls back to /app for an empty appId", () => {
		expect(classicyWindowPagePath("", "Thing_1")).toBe("/app/thing-1");
	});

	it("falls back to main for an empty window id", () => {
		expect(classicyWindowPagePath("Finder.app", "")).toBe("/finder/main");
	});

	it("falls back to main when the window id is just the app id", () => {
		expect(classicyWindowPagePath("SimpleText.app", "SimpleText.app")).toBe(
			"/simpletext/main",
		);
	});

	it("collapses punctuation runs and trims the edges", () => {
		expect(classicyWindowPagePath("My App!!.app", "__Some   Window__")).toBe(
			"/my-app/some-window",
		);
	});

	it("does not strip an app prefix that is not followed by a separator", () => {
		// "apple" must not become "le" just because the app segment is "app".
		expect(classicyWindowPagePath("", "apple")).toBe("/app/apple");
	});
});

describe("classicyWindowPageTitle", () => {
	it("joins app name and window title with an em dash", () => {
		expect(classicyWindowPageTitle("SimpleText", "Budget.txt", "/x")).toBe(
			"SimpleText — Budget.txt",
		);
	});

	it("uses the window title alone when there is no app name", () => {
		expect(classicyWindowPageTitle(undefined, "Budget.txt", "/x")).toBe(
			"Budget.txt",
		);
	});

	it("uses the app name alone when the window has no title", () => {
		expect(classicyWindowPageTitle("SimpleText", undefined, "/x")).toBe(
			"SimpleText",
		);
	});

	it("falls back to the path when neither is available", () => {
		expect(classicyWindowPageTitle(undefined, undefined, "/simpletext/main")).toBe(
			"/simpletext/main",
		);
	});

	it("treats whitespace-only values as absent", () => {
		expect(classicyWindowPageTitle("   ", "  ", "/x")).toBe("/x");
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath.test.ts`
Expected: FAIL — `Failed to resolve import ".../ClassicyAnalyticsPath"`.

- [ ] **Step 3: Write the implementation**

Create `src/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath.ts`:

```ts
/**
 * Derives Google Analytics pageview paths and titles for ClassicyWindow.
 *
 * Pure string handling, deliberately free of React and store imports so every
 * rule below is unit-testable on its own.
 */

const slugify = (value: string): string =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

// A window id holding one of these is a filesystem path, not a route.
const FILESYSTEM_SEPARATOR = /[:/]/;

// Strips `prefix` from `segment`, but only on a segment boundary — so the app
// segment "app" never turns the window id "apple" into "le".
const stripPrefix = (segment: string, prefix: string): string | null => {
	if (!prefix) return null;
	if (segment === prefix) return "";
	if (segment.startsWith(`${prefix}-`)) return segment.slice(prefix.length + 1);
	return null;
};

/**
 * Builds `/<app>/<window>` from a window's app and window ids.
 *
 * Window ids that contain a filesystem separator are user data — ClassicyApp
 * builds file-window ids as `<appId>_file_<path>` and Finder keys its windows
 * by folder path. Those collapse to a single generic segment so user file and
 * folder names never reach GA and path cardinality stays bounded.
 */
export const classicyWindowPagePath = (
	appId: string,
	windowId: string,
): string => {
	const appSegment = slugify(appId.replace(/\.app$/i, "")) || "app";

	if (FILESYSTEM_SEPARATOR.test(windowId)) {
		const isFileWindow = windowId.startsWith(`${appId}_file_`);
		return `/${appSegment}/${isFileWindow ? "file" : "folder"}`;
	}

	let windowSegment = slugify(windowId);

	// Longest match first: "simpletext-app-debugger" must yield "debugger",
	// not "app-debugger".
	for (const prefix of [slugify(appId), appSegment]) {
		const stripped = stripPrefix(windowSegment, prefix);
		if (stripped !== null) {
			windowSegment = stripped;
			break;
		}
	}

	if (/^\d+$/.test(windowSegment)) windowSegment = `window-${windowSegment}`;
	if (!windowSegment) windowSegment = "main";

	return `/${appSegment}/${windowSegment}`;
};

/**
 * Human-readable pageview title. The window title is passed through verbatim,
 * including titles derived from user file names — an accepted trade-off that
 * keeps GA's content report readable. The *path* stays free of user data.
 */
export const classicyWindowPageTitle = (
	appName: string | undefined,
	title: string | undefined,
	fallbackPath: string,
): string => {
	const app = appName?.trim();
	const window = title?.trim();
	if (app && window) return `${app} — ${window}`;
	return window || app || fallbackPath;
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath.test.ts`
Expected: PASS (17 tests).

- [ ] **Step 5: Format and commit**

```bash
pnpm biome check --write src/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath.ts src/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath.test.ts
git add src/SystemFolder/SystemResources/Analytics/
git commit -m "feat(analytics): derive window pageview paths and titles

Collapses window ids that embed filesystem paths to a generic segment, so
user file and folder names never reach GA and path cardinality stays
bounded."
```

---

### Task 2: A wrapped `page` on `useClassicyAnalytics`

`page` currently rides through the `...analytics` spread untouched, typed with the `analytics` package's `(data?: PageData, ...)` signature — so `page("/path", "Title")` would not type-check. This gives it the same treatment `track` already has, in **both** branches of the hook so the returned union has one consistent signature.

**Files:**
- Modify: `src/SystemFolder/SystemResources/Analytics/useClassicyAnalytics.ts`
- Modify: `src/SystemFolder/SystemResources/Analytics/useClassicyAnalytics.test.tsx`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `useClassicyAnalytics().page(path: string, title?: string): Promise<unknown>` — referentially stable across renders, available with or without an `AnalyticsProvider`.

- [ ] **Step 1: Write the failing tests**

Append to `src/SystemFolder/SystemResources/Analytics/useClassicyAnalytics.test.tsx`. Add `vi` to the existing `vitest` import and `AnalyticsProvider` from `use-analytics`:

```tsx
describe("useClassicyAnalytics page", () => {
	it("returns a referentially stable page across re-renders", () => {
		const pages: unknown[] = [];
		let forceRender: () => void = () => {};

		const Probe = (): null => {
			const [, setTick] = useState(0);
			forceRender = () => setTick((t) => t + 1);
			pages.push(useClassicyAnalytics().page);
			return null;
		};

		// No AnalyticsProvider on purpose: the no-op fallback must be stable too.
		render(<Probe />);
		act(() => forceRender());

		expect(pages.length).toBeGreaterThanOrEqual(2);
		expect(pages[1]).toBe(pages[0]);
	});

	it("is callable without a provider and does not throw", async () => {
		let call: (() => Promise<unknown>) | null = null;

		const Probe = (): null => {
			const { page } = useClassicyAnalytics();
			call = () => Promise.resolve(page("/simpletext/window-1", "SimpleText"));
			return null;
		};

		render(<Probe />);
		await expect((call as unknown as () => Promise<unknown>)()).resolves.not.toThrow();
	});

	it("forwards path and title to the instance without prefixing the path", () => {
		const pageSpy = vi.fn();
		const instance = {
			track: vi.fn(),
			page: pageSpy,
			identify: vi.fn(),
			reset: vi.fn(),
			ready: vi.fn(),
			on: vi.fn(),
			once: vi.fn(),
			user: vi.fn(),
			getState: vi.fn(),
			storage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
			plugins: { enable: vi.fn(), disable: vi.fn() },
		};

		const Probe = (): null => {
			useClassicyAnalytics().page("/simpletext/window-1", "SimpleText — Budget");
			return null;
		};

		render(
			// biome-ignore lint/suspicious/noExplicitAny: minimal analytics test double
			<AnalyticsProvider instance={instance as any}>
				<Probe />
			</AnalyticsProvider>,
		);

		expect(pageSpy).toHaveBeenCalledWith({
			path: "/simpletext/window-1",
			title: "SimpleText — Budget",
		});
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Analytics/useClassicyAnalytics.test.tsx`
Expected: FAIL — the forwarding test fails because `page` receives a string rather than `{ path, title }`, and the stability test may fail because the spread `page` identity is not memo-owned.

- [ ] **Step 3: Add the no-op page and wrap the real one**

In `src/SystemFolder/SystemResources/Analytics/useClassicyAnalytics.ts`, add above the hook (after `noOpAnalytics`):

```ts
// Explicitly typed so both branches of the hook return the same `page`
// signature; the annotation, rather than unused parameters, is what carries it.
const noOpPage: (path: string, title?: string) => Promise<void> = () =>
	Promise.resolve();
```

Then update both return branches inside the existing `useMemo`:

```ts
		if (!analytics) {
			if (process.env.NODE_ENV !== "production") {
				console.warn(
					"[ClassicyAnalytics] No analytics provider found. Using no-op fallback. Wrap your app in AnalyticsProvider to enable tracking.",
				);
			}
			return { ...noOpAnalytics, page: noOpPage };
		}

		return {
			...analytics,
			track: (eventName: string, payload?: Record<string, unknown>) =>
				analytics.track(`${prefix}${eventName}`, payload),
			// Deliberately NOT prefixed: the prefix namespaces custom event names,
			// while a pageview path is a URL namespace.
			page: (path: string, title?: string) => analytics.page({ path, title }),
		};
```

Also extend the hook's doc comment with one line:

```
 * `page(path, title)` is wrapped the same way, but its path is NOT prefixed —
 * see the comment on the call below.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Analytics/useClassicyAnalytics.test.tsx`
Expected: PASS (4 tests — the original stability test plus the 3 new ones).

- [ ] **Step 5: Format and commit**

```bash
pnpm biome check --write src/SystemFolder/SystemResources/Analytics/useClassicyAnalytics.ts src/SystemFolder/SystemResources/Analytics/useClassicyAnalytics.test.tsx
git add src/SystemFolder/SystemResources/Analytics/
git commit -m "feat(analytics): wrap page() on useClassicyAnalytics

Gives page the same stable, typed treatment track has, in both the real
and no-op branches, so callers can pass (path, title). The path is not
event-prefixed."
```

---

### Task 3: Emit the pageview from `ClassicyWindow`

**Files:**
- Modify: `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`
- Create: `src/SystemFolder/SystemResources/Window/ClassicyWindow.pageview.test.tsx`

**Interfaces:**
- Consumes: `classicyWindowPagePath`, `classicyWindowPageTitle` (Task 1); `useClassicyAnalytics().page` (Task 2).
- Produces: `ClassicyWindow` props `analyticsPath?: string` and `analyticsExclude?: boolean`.

Emission rules, from the spec: fire when the window **becomes open**, and when an **already-open window gains focus**. Closing and blurring fire nothing. Opening normally focuses in the same commit, so a ref holding the last emitted path suppresses the double fire; that ref clears whenever the window is not focused, so re-focusing after visiting another window emits again.

- [ ] **Step 1: Write the failing tests**

Create `src/SystemFolder/SystemResources/Window/ClassicyWindow.pageview.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());
const mockPage = vi.hoisted(() => vi.fn());
const mockTrack = vi.hoisted(() => vi.fn());
const windowState = vi.hoisted(() => ({ closed: false, focused: true }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Desktop: { doubleClickTitleToCollapse: true },
						Applications: {
							apps: {
								TestApp: {
									name: "Test App",
									focused: windowState.focused,
									windows: [
										{
											id: "TestApp_1",
											appId: "TestApp",
											collapsed: false,
											focused: windowState.focused,
											dragging: false,
											moving: false,
											resizing: false,
											zoomed: false,
											closed: windowState.closed,
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
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: mockTrack, page: mockPage }),
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

import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const renderWindow = (props: Record<string, unknown> = {}) =>
	render(
		<ClassicyWindow id="TestApp_1" appId="TestApp" title="Untitled" {...props}>
			<p>content</p>
		</ClassicyWindow>,
	);

describe("ClassicyWindow pageview", () => {
	beforeEach(() => {
		mockPage.mockClear();
		mockTrack.mockClear();
		mockDispatch.mockClear();
		windowState.closed = false;
		windowState.focused = true;
	});

	it("emits once for a window that mounts open and focused", () => {
		renderWindow();
		expect(mockPage).toHaveBeenCalledTimes(1);
		expect(mockPage).toHaveBeenCalledWith(
			"/testapp/window-1",
			"Test App — Untitled",
		);
	});

	it("emits nothing for a window that mounts closed", () => {
		windowState.closed = true;
		renderWindow();
		expect(mockPage).not.toHaveBeenCalled();
	});

	it("emits when a closed window opens", () => {
		windowState.closed = true;
		const { rerender } = renderWindow();
		expect(mockPage).not.toHaveBeenCalled();

		windowState.closed = false;
		rerender(
			<ClassicyWindow id="TestApp_1" appId="TestApp" title="Untitled">
				<p>content</p>
			</ClassicyWindow>,
		);
		expect(mockPage).toHaveBeenCalledTimes(1);
	});

	it("emits nothing when an open window closes", () => {
		const { rerender } = renderWindow();
		mockPage.mockClear();

		windowState.closed = true;
		rerender(
			<ClassicyWindow id="TestApp_1" appId="TestApp" title="Untitled">
				<p>content</p>
			</ClassicyWindow>,
		);
		expect(mockPage).not.toHaveBeenCalled();
	});

	it("emits nothing when an open window merely loses focus", () => {
		const { rerender } = renderWindow();
		mockPage.mockClear();

		windowState.focused = false;
		rerender(
			<ClassicyWindow id="TestApp_1" appId="TestApp" title="Untitled">
				<p>content</p>
			</ClassicyWindow>,
		);
		expect(mockPage).not.toHaveBeenCalled();
	});

	it("emits again when the window is re-focused after a blur", () => {
		const { rerender } = renderWindow();
		const again = () =>
			rerender(
				<ClassicyWindow id="TestApp_1" appId="TestApp" title="Untitled">
					<p>content</p>
				</ClassicyWindow>,
			);

		windowState.focused = false;
		again();
		mockPage.mockClear();

		windowState.focused = true;
		again();
		expect(mockPage).toHaveBeenCalledTimes(1);
	});

	it("uses analyticsPath instead of the derived path", () => {
		renderWindow({ analyticsPath: "/editor/compose" });
		expect(mockPage).toHaveBeenCalledWith(
			"/editor/compose",
			"Test App — Untitled",
		);
	});

	it("emits nothing when analyticsExclude is set", () => {
		renderWindow({ analyticsExclude: true });
		expect(mockPage).not.toHaveBeenCalled();
	});

	it("lets analyticsExclude win over analyticsPath", () => {
		renderWindow({ analyticsExclude: true, analyticsPath: "/editor/compose" });
		expect(mockPage).not.toHaveBeenCalled();
	});

	it("falls back to the path as the title when the window has no title", () => {
		renderWindow({ title: undefined });
		expect(mockPage).toHaveBeenCalledWith("/testapp/window-1", "Test App");
	});

	it("still dispatches ClassicyWindowOpen as before", () => {
		renderWindow();
		const types = mockDispatch.mock.calls.map(
			(call) => (call[0] as { type: string }).type,
		);
		expect(types).toContain("ClassicyWindowOpen");
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.pageview.test.tsx`
Expected: FAIL — `mockPage` is never called, and `analyticsPath` / `analyticsExclude` are unknown props.

- [ ] **Step 3: Add the imports and props**

In `src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx`, add to the imports:

```tsx
import {
	classicyWindowPagePath,
	classicyWindowPageTitle,
} from "@/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath";
```

Add to `ClassicyWindowProps` (after `contextMenu`):

```tsx
	/** Override the generated analytics pageview path for this window. */
	analyticsPath?: string;
	/** Suppress this window's analytics pageview entirely. */
	analyticsExclude?: boolean;
```

Destructure `analyticsPath` and `analyticsExclude` in the component's parameter list.

Change the analytics hook destructure from `const { track } = useClassicyAnalytics();` to:

```tsx
	const { track, page } = useClassicyAnalytics();
```

- [ ] **Step 4: Add the emission effect**

In `ClassicyWindow.tsx`, after the `ws` memo (so `ws` is in scope), add:

```tsx
	const pageviewPath = useMemo(
		() => analyticsPath ?? classicyWindowPagePath(appId, id),
		[analyticsPath, appId, id],
	);
	const lastPageviewRef = useRef<string | null>(null);
	const wasOpenRef = useRef(false);
	const wasFocusedRef = useRef(false);

	// GA pageviews for a windowing UI: a window becoming open, or an open
	// window gaining focus, is the analogue of a navigation. Opening normally
	// focuses in the same commit, so lastPageviewRef suppresses the double
	// fire; it clears whenever the window is not focused, so re-focusing after
	// visiting another window emits again.
	useEffect(() => {
		const isOpen = !ws.closed;
		const isFocused = isOpen && ws.focused;
		const justOpened = isOpen && !wasOpenRef.current;
		const justFocused = isFocused && !wasFocusedRef.current;
		wasOpenRef.current = isOpen;
		wasFocusedRef.current = isFocused;

		if (!isFocused) lastPageviewRef.current = null;

		if (analyticsExclude || !isOpen) return;
		if (!justOpened && !justFocused) return;
		if (lastPageviewRef.current === pageviewPath) return;

		lastPageviewRef.current = pageviewPath;
		page(
			pageviewPath,
			classicyWindowPageTitle(currentApp?.name, title, pageviewPath),
		);
	}, [
		ws.closed,
		ws.focused,
		analyticsExclude,
		pageviewPath,
		currentApp?.name,
		title,
		page,
	]);
```

`currentApp` is already selected at `ClassicyWindow.tsx:208`, so this adds no store subscription. `page` is stable from Task 2's `useMemo`, so it is safe in the dependency array.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/ClassicyWindow.pageview.test.tsx`
Expected: PASS (11 tests).

- [ ] **Step 6: Run every Window test to confirm nothing regressed**

Run: `pnpm vitest run src/SystemFolder/SystemResources/Window/`
Expected: PASS. The existing `ClassicyWindow.*.test.tsx` files mock `useClassicyAnalytics` as `() => ({ track: vi.fn() })` — with no `page`. If any now throws `page is not a function`, add `page: vi.fn()` to that file's mock; do not change the component to tolerate a missing `page`.

- [ ] **Step 7: Format and commit**

```bash
pnpm biome check --write src/SystemFolder/SystemResources/Window/ClassicyWindow.tsx src/SystemFolder/SystemResources/Window/ClassicyWindow.pageview.test.tsx
git add src/SystemFolder/SystemResources/Window/
git commit -m "feat(window): emit a GA pageview on window open and focus

Adds analyticsPath and analyticsExclude to ClassicyWindow and emits a
pageview when a window becomes open or an open window gains focus, so GA's
pageview-driven reports reflect what the user is actually looking at."
```

---

### Task 4: Document and verify in a browser

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1-3.
- Produces: no new API.

- [ ] **Step 1: Document the behavior in CLAUDE.md**

Add a new section to `CLAUDE.md` immediately before `### Balloon Help`:

````markdown
### Analytics

`useClassicyAnalytics()` returns `track(eventName, payload)` and
`page(path, title)`. Both are referentially stable, and both fall back to
silent no-ops when no `AnalyticsProvider` is mounted. Event names are prefixed
with `ClassicyAnalyticsPrefixContext` (default `classicy_`); **pageview paths
are not** — a path is a URL namespace, not an event name.

`ClassicyWindow` emits a pageview when a window becomes open and when an open
window gains focus, so GA's pageview reports track what the user is looking at.
Closing and blurring emit nothing.

```tsx
<ClassicyWindow analyticsPath="/editor/compose" />  // override the derived path
<ClassicyWindow analyticsExclude />                 // no pageview at all
```

Paths are derived by `ClassicyAnalyticsPath.ts` as `/<app>/<window>`: the
`appId` minus a trailing `.app`, plus the window id with any redundant app
prefix stripped. **A window id containing a filesystem separator (`:` or `/`)
is treated as user data** and collapses to `/file` or `/folder` — `ClassicyApp`
builds file-window ids as `` `${id}_file_${filePath}` `` and Finder keys its
windows by folder path, so slugifying either would leak user file names into GA
and make path cardinality unbounded.

The window *title* is sent to GA verbatim, including titles derived from user
file names. That is a deliberate trade-off for readable content reports; the
path is what stays free of user data.
````

- [ ] **Step 2: Run the full suite**

Run: `pnpm test`
Expected: PASS, with the total up by the tests added in Tasks 1-3. If `PDFViewerDocument.test.tsx` or `ClassicyAppManagerContext.test.tsx` fails, re-run that file alone — see Global Constraints.

- [ ] **Step 3: Type-check the library**

Run: `pnpm build:source`
Expected: builds clean. `pnpm test` does not type-check, so this is the first step that catches a signature mismatch — particularly the `page` union across the two hook branches.

- [ ] **Step 4: Commit**

```bash
pnpm biome check --write CLAUDE.md
git add -A
git commit -m "docs(analytics): document window pageview tracking"
```

- [ ] **Step 5: Verify in a browser**

Use the `/verify` skill to build the library and run the example app.

**Finding the right dev server matters:** several stale example servers may
already be running, and port 5173 may belong to an unrelated project. Match the
vite process's working directory to `classicy/example` before trusting anything
you read from the page:

```bash
for p in $(ss -ltnp 2>/dev/null | grep -oE "pid=[0-9]+" | cut -d= -f2 | sort -u); do
  cwd=$(readlink /proc/$p/cwd 2>/dev/null)
  [[ "$cwd" == *"classicy/example"* ]] && { echo "PID $p"; ps -o lstart= -p $p; ss -ltnp 2>/dev/null | grep "pid=$p,"; }
done
```

Then, in the browser, capture pageviews by wrapping the instance before
interacting — assert on the calls, not on network traffic:

1. Open an app from the Apple menu; confirm one pageview with the expected
   `/<app>/<window>` path and a `"<App> — <Title>"` title.
2. Click another window, then click back; confirm each focus change emits.
3. Close a window; confirm no pageview.
4. Open a document in SimpleText and confirm the path is `/simpletext/file` —
   **the file name must not appear anywhere in the path.**
5. Open a Finder folder window and confirm the path is `/finder/folder`.

Report what you actually observed. If any check fails, fix it and re-run
`pnpm test` plus `pnpm build:source` before finishing.
