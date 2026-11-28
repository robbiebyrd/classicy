import { produce } from "immer";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_MINIMIZE_LAYOUT,
	TEST_MINIMIZE_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyStoreSystemAppWindow,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockPlayer = vi.hoisted(() => vi.fn());

// Stands in for the store slice ClassicyWindowResize/Collapse/Expand mutate
// (see ClassicyAppManager.ts) — `size`/`collapsed` mirror what the real
// reducer would write on each dispatched action, so a test can assert the
// value that would ultimately be persisted to localStorage, not just that a
// dispatch call happened.
const mockWindowState = vi.hoisted(() => ({
	collapsed: false,
	size: [350, 200] as [number, number],
}));

const mockDispatch = vi.hoisted(() =>
	vi.fn((action: { type: string; size?: [number, number] }) => {
		if (action.type === "ClassicyWindowResize" && action.size) {
			mockWindowState.size = action.size;
		}
		if (action.type === "ClassicyWindowCollapse") {
			mockWindowState.collapsed = true;
		}
		if (action.type === "ClassicyWindowExpand") {
			mockWindowState.collapsed = false;
		}
	}),
);

// The collapsed-size cases read the stand-in above; the minimize cases (plan
// 0020-w98 §5) set `real` and run on the real store and reducer, since what
// they pin is where a click goes and where focus lands.
const mockStore = vi.hoisted(() => ({ real: false }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")
			>();
		const mockState = () => ({
			System: {
				Manager: {
					Desktop: { doubleClickTitleToCollapse: true },
					Applications: {
						apps: {
							TestApp: {
								id: "TestApp",
								focused: false,
								windows: windowsRecord({
									id: "TestWindow",
									appId: "TestApp",
									collapsed: mockWindowState.collapsed,
									focused: false,
									dragging: false,
									moving: false,
									resizing: false,
									zoomed: false,
									closed: false,
									size: mockWindowState.size,
									position: [110, 110] as [number, number],
									minimumSize: [0, 0] as [number, number],
									menuBar: [] as unknown[],
									default: false,
								}),
							},
						},
					},
				},
			},
		});
		const useAppManager = Object.assign(
			(selector: (state: unknown) => unknown) =>
				mockStore.real
					? // biome-ignore lint/correctness/useHookAtTopLevel: the mode is set before a test renders and kept until it unmounts, so every render of a component calls the same hooks
						actual.useAppManager(
							selector as Parameters<typeof actual.useAppManager>[0],
						)
					: selector(mockState()),
			{
				getState: actual.useAppManager.getState,
				setState: actual.useAppManager.setState,
				subscribe: actual.useAppManager.subscribe,
			},
		);
		return {
			...actual,
			useAppManager,
			useAppManagerDispatch: () =>
				mockStore.real ? actual.dispatch : mockDispatch,
		};
	},
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
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { files: { file: "file.png" } } },
}));

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);

function windowEl() {
	return (
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test">
			<p>content</p>
		</ClassicyWindow>
	);
}

const resizeDispatches = () =>
	mockDispatch.mock.calls
		.map((call) => call[0] as { type: string; size?: [number, number] })
		.filter((action) => action.type === "ClassicyWindowResize");

describe("ClassicyWindow collapsed-size persistence (#11)", () => {
	// Tracked separately from mockDispatch/mockPlayer (plain vi.fn() mocks with
	// a custom body, not spies) so afterEach only restores this real spy —
	// vi.restoreAllMocks() would also wipe mockDispatch's inline implementation
	// down to a no-op, since it was constructed via vi.fn(impl) rather than
	// vi.spyOn().
	let rectSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		mockWindowState.collapsed = false;
		mockWindowState.size = [350, 200];

		// jsdom never runs layout, so getBoundingClientRect() is always zeros
		// by default. In a real browser, ClassicyWindow.scss's
		// `.classicyWindow.collapsed { height: ... }` forces the
		// window's rect height to the ~24px title bar while collapsed. Stand
		// that in here — driven off the same class the component applies —
		// so the rect read at mouseup behaves exactly like a real browser.
		// When a resize drag is in flight the component writes the live size
		// directly to the element's inline style, so honor that too.
		rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: HTMLElement) {
				const collapsed = this.classList.contains("collapsed");
				const inlineHeight = parseFloat(this.style.height || "");
				const inlineWidth = parseFloat(this.style.width || "");
				const height = collapsed
					? 24
					: !Number.isNaN(inlineHeight)
						? inlineHeight
						: 200;
				const width = !Number.isNaN(inlineWidth) ? inlineWidth : 350;
				return {
					width,
					height,
					top: 110,
					left: 110,
					right: 110 + width,
					bottom: 110 + height,
					x: 110,
					y: 110,
					toJSON: () => {},
				} as DOMRect;
			});
	});

	afterEach(() => {
		rectSpy.mockRestore();
	});

	it("does not dispatch a resize whose height is the collapsed title-bar height on mouse release", () => {
		mockWindowState.collapsed = true;
		const { container, rerender } = render(windowEl());
		rerender(windowEl());

		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(root.classList.contains("collapsed")).toBe(true);

		fireEvent.mouseUp(root);

		expect(resizeDispatches()).toHaveLength(0);
	});

	it("leaves a collapsed window's height to the stylesheet", () => {
		// `.collapsed` sizes the window to its title bar in ClassicyWindow.scss
		// without `!important`, so any inline height would override it.
		mockWindowState.collapsed = true;
		const { container } = render(windowEl());

		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(root.classList.contains("collapsed")).toBe(true);
		expect(root.style.height).toBe("");
	});

	it("survives a collapse -> click -> expand cycle with the pre-collapse size intact", () => {
		const { container, rerender } = render(windowEl());

		// Collapse (mirrors a collapse-box click dispatching ClassicyWindowCollapse).
		mockWindowState.collapsed = true;
		rerender(windowEl());

		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(root.classList.contains("collapsed")).toBe(true);

		// The reported bug path: a bare click on the collapsed window — mousedown
		// and mouseup on the title bar with no movement, driving stopChangeWindow.
		const titleBar = container.querySelector(
			".classicyWindowTitle",
		) as HTMLElement;
		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseUp(titleBar, { clientX: 150, clientY: 120 });

		// Expand (mirrors ClassicyWindowExpand landing in the store).
		mockWindowState.collapsed = false;
		rerender(windowEl());

		// The size that would be persisted to localStorage is the pre-collapse
		// size — not the ~24px collapsed title-bar height the click's mouseup
		// would have measured off a real (uncapped) rect read.
		expect(mockWindowState.size).toEqual([350, 200]);
		expect(resizeDispatches()).toHaveLength(0);
	});

	it("still persists a new height when resizing an expanded (non-collapsed) window", () => {
		const { container } = render(windowEl());
		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(root.classList.contains("collapsed")).toBe(false);

		// A grow-box drag: the window sits at [110, 110], and the document-level
		// move handler sizes it to the pointer's distance from that corner + 5.
		const resizer = container.querySelector(
			".classicyWindowResizer",
		) as HTMLElement;
		fireEvent.mouseDown(resizer, { clientX: 460, clientY: 310 });
		fireEvent.mouseMove(document.body, { clientX: 505, clientY: 365 });
		fireEvent.mouseUp(root);

		const dispatches = resizeDispatches();
		expect(dispatches.length).toBeGreaterThan(0);
		expect(dispatches[dispatches.length - 1]?.size).toEqual([400, 260]);
		expect(mockWindowState.size).toEqual([400, 260]);
	});
});

// Plan 0020-w98 §5, "Minimize": `layout.window.collapse` decides what the
// collapse box does. On the real store and reducer, each case under the
// default layout (WindowShade, today's behavior) and under a package that
// minimizes.
describe("ClassicyWindow under window.collapse", () => {
	const APP = "Minimize.app";

	beforeEach(() => {
		mockStore.real = true;
		localStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		act(() =>
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Applications.apps[APP] = {
						id: APP,
						name: "Minimize",
						icon: "",
						windows: {},
						open: true,
						data: {},
					};
				}),
			),
		);
	});

	afterEach(() => {
		// Unmounted while the real store is still in use: a store write with
		// the stand-in back would re-render them with a different hook order.
		cleanup();
		mockStore.real = false;
		unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	const minimizing = () => {
		registerTestTaskbarPackage(TEST_MINIMIZE_LAYOUT, TEST_MINIMIZE_PACKAGE_ID);
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_MINIMIZE_PACKAGE_ID,
			}),
		);
	};

	const record = (id: string) =>
		getAppWindow(
			useAppManager.getState().System.Manager.Applications.apps[APP],
			id,
		);

	const setRecord = (
		id: string,
		patch: Partial<ClassicyStoreSystemAppWindow>,
	) =>
		act(() =>
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					Object.assign(
						draft.System.Manager.Applications.apps[APP].windows?.[id] ?? {},
						patch,
					);
				}),
			),
		);

	// The windows inside their app, inside a wrapper that hears every click
	// that bubbles out of the app.
	const outerClick = vi.fn();
	const renderApp = (windows: ReactNode) => {
		outerClick.mockClear();
		return render(
			// biome-ignore lint/a11y/noStaticElementInteractions: a test probe for bubbling clicks
			// biome-ignore lint/a11y/useKeyWithClickEvents: a test probe for bubbling clicks
			<div onClick={outerClick}>
				<ClassicyApp id={APP} name="Minimize" icon="">
					{windows}
				</ClassicyApp>
			</div>,
		);
	};

	const main = (
		<ClassicyWindow key="main" id="main" appId={APP} title="Main">
			<p>main content</p>
		</ClassicyWindow>
	);
	const second = (
		<ClassicyWindow key="second" id="second" appId={APP} title="Second">
			<p>second content</p>
		</ClassicyWindow>
	);
	const palette = (
		<ClassicyWindow
			key="tools"
			id="tools"
			appId={APP}
			title="Tools"
			windowType="utility"
		>
			<p>tools content</p>
		</ClassicyWindow>
	);

	const root = (id: string) =>
		document.getElementById(`${APP}_${id}`) as HTMLElement;
	const box = (id: string) =>
		root(id).querySelector(".classicyWindowCollapseBox") as HTMLElement;
	// A press and release on the box, then its click, as a mouse delivers
	// them: the release reaches the window's root first.
	const pressBox = (id: string) => {
		fireEvent.mouseDown(box(id));
		fireEvent.mouseUp(box(id));
		fireEvent.click(box(id));
	};

	describe("under the default layout (WindowShade)", () => {
		it("shades: the box is Collapse, its click bubbles, and a collapse clears the zoom", () => {
			renderApp([main, second]);
			setRecord("main", { zoomed: true });
			expect(box("main")).toHaveAttribute("aria-label", "Collapse");

			// `second` opened last and holds focus; the press is on `main`.
			pressBox("main");

			expect(record("main")).toMatchObject({ collapsed: true, zoomed: false });
			// The click reached the window and its app (ClassicyAppActivate
			// refocused the app's last-accessed window, `main`), as always.
			expect(outerClick).toHaveBeenCalledTimes(1);
			expect(record("main")?.focused).toBe(true);
			expect(root("main")).toHaveClass("collapsed");
			expect(root("main")).not.toHaveClass("classicyWindowMinimized");
			expect(root("main").style.height).toBe("");
		});

		it("draws a shaded palette shaded, with its collapse box", () => {
			renderApp([main, palette]);
			setRecord("tools", { collapsed: true });
			expect(root("tools")).toHaveClass("collapsed");
			expect(box("tools")).not.toBeNull();
			expect(root("tools")).not.toHaveClass("classicyWindowMinimized");
		});
	});

	describe('under window.collapse: "minimize"', () => {
		beforeEach(minimizing);

		it("names the box Minimize", () => {
			renderApp([main]);
			expect(box("main")).toHaveAttribute("aria-label", "Minimize");
		});

		it("takes the window off the screen with its tree still mounted", () => {
			renderApp([main]);
			const contentOf = () =>
				root("main").querySelector(".classicyWindowContentsInner p");
			const content = contentOf();
			pressBox("main");

			expect(record("main")).toMatchObject({ collapsed: true, focused: false });
			expect(root("main")).toHaveClass("classicyWindowMinimized");
			// Not WindowShade: no `collapsed` state, and the size is kept.
			expect(root("main")).not.toHaveClass("collapsed");
			expect(root("main").style.height).not.toBe("");
			expect(contentOf()).toBe(content);
			expect(content).toHaveTextContent("main content");
			expect(
				root("main").querySelector(".classicyWindowContents"),
			).not.toHaveClass("collapsed");
			// Its only window gone, the app hands the bar to the desktop.
			expect(
				useAppManager.getState().System.Manager.Applications.focusedAppId,
			).toBe("Finder.app");
		});

		it("keeps a maximized window's zoom, so it comes back maximized", () => {
			renderApp([main]);
			setRecord("main", { zoomed: true });
			pressBox("main");
			expect(record("main")).toMatchObject({ collapsed: true, zoomed: true });
			act(() =>
				dispatch({
					type: "ClassicyWindowFocus",
					app: { id: APP },
					window: { id: "main", menuBar: [] },
				}),
			);
			expect(record("main")).toMatchObject({
				collapsed: false,
				zoomed: true,
				focused: true,
			});
			expect(root("main")).not.toHaveClass("classicyWindowMinimized");
		});

		it("leaves an inactive window minimized: its click does not bubble to the app", () => {
			renderApp([main, second]);
			expect(record("second")?.focused).toBe(true);

			pressBox("main");

			// The release activated `main`, the click minimized it, and focus
			// passed back on; nothing after the click activated it again.
			expect(outerClick).not.toHaveBeenCalled();
			expect(record("main")).toMatchObject({ collapsed: true, focused: false });
			expect(record("second")?.focused).toBe(true);
			expect(root("main")).toHaveClass("classicyWindowMinimized");
		});

		it("draws a shaded palette expanded, with no Minimize box, and keeps its flag", () => {
			renderApp([main, palette]);
			setRecord("tools", { collapsed: true });
			expect(root("tools")).not.toHaveClass("collapsed");
			expect(root("tools")).not.toHaveClass("classicyWindowMinimized");
			expect(box("tools")).toBeNull();
			expect(
				root("tools").querySelector(".classicyWindowContents"),
			).not.toHaveClass("collapsed");
			// Its title's double-click (the desktop's preference is on) does
			// nothing either.
			fireEvent.doubleClick(
				root("tools").querySelector(".classicyWindowTitle") as HTMLElement,
			);
			expect(record("tools")?.collapsed).toBe(true);
		});

		it("hides a palette while every primary window of its app is minimized", () => {
			renderApp([main, second, palette]);
			pressBox("second");
			expect(root("tools")).not.toHaveClass("classicyWindowMinimized");
			pressBox("main");
			expect(root("tools")).toHaveClass("classicyWindowMinimized");
			expect(record("tools")?.collapsed).not.toBe(true);
			act(() =>
				dispatch({
					type: "ClassicyWindowFocus",
					app: { id: APP },
					window: { id: "main", menuBar: [] },
				}),
			);
			expect(root("tools")).not.toHaveClass("classicyWindowMinimized");
		});

		it("is not re-centered while it is off the screen", () => {
			// jsdom has no ResizeObserver: capture the callbacks, to report
			// the 0 x 0 box a window has while it is not displayed.
			const observers: { target: Element; report: () => void }[] = [];
			vi.stubGlobal(
				"ResizeObserver",
				class {
					private readonly report: () => void;
					constructor(callback: () => void) {
						this.report = callback;
					}
					observe(target: Element) {
						observers.push({ target, report: this.report });
					}
					unobserve() {}
					disconnect() {}
				},
			);
			try {
				renderApp(
					<ClassicyWindow
						id="centered"
						appId={APP}
						title="Centered"
						initialPosition={["center", "center"]}
					>
						<p>centered</p>
					</ClassicyWindow>,
				);
				pressBox("centered");
				expect(root("centered")).toHaveClass("classicyWindowMinimized");
				// Where the release left it (jsdom measures every box at 0, 0).
				const before = record("centered")?.position;
				act(() => {
					for (const o of observers)
						if (o.target === root("centered")) o.report();
				});
				expect(record("centered")?.position).toEqual(before);
			} finally {
				vi.unstubAllGlobals();
			}
		});

		it("keeps an app's palettes when it has no primary window", () => {
			renderApp([palette]);
			expect(root("tools")).not.toHaveClass("classicyWindowMinimized");
		});
	});
});
