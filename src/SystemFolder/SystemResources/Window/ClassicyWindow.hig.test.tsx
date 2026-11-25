import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_MAXIMIZE_LAYOUT,
	TEST_MAXIMIZE_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyStoreSystemAppWindow,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { useClassicyScrollAreaHead } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollAreaHead.internal";
import { setClassicyTaskbarBand } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

// The dialog cases read the stand-in store below; the maximize cases (plan
// 0020-w98 §5) set `real` and run on the real store and reducer, since what
// they pin is the geometry the window stores and gets back.
const mockStore = vi.hoisted(() => ({ real: false }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")
			>();
		// Built when read: the factory runs while this file's imports (the
		// windowsRecord helper) may not be initialized yet.
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

const dispatchedTypes = () =>
	mockDispatch.mock.calls.map((call) => call[0] as { type: string });

function renderWindow(
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) {
	return render(
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test" {...props}>
			<p>content</p>
		</ClassicyWindow>,
	);
}

describe("ClassicyWindow HIG dialog behaviors", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// #197: a modal window hides the zoom box even when zoomable.
	it("hides the zoom box on a modal window", () => {
		const { container } = renderWindow({ modal: true, zoomable: true });
		expect(
			container.querySelector(".classicyWindowZoomBox") ??
				document.querySelector(".classicyWindowZoomBox"),
		).toBeNull();
	});

	// #197: Escape dismisses a closable modal (the Cancel keyboard equivalent).
	it("closes a modal on Escape", () => {
		renderWindow({ modal: true, closable: true });
		const win = document.querySelector(".classicyWindow") as HTMLElement;
		fireEvent.keyDown(win, { key: "Escape" });
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowClose" }),
		);
	});

	// #197: clicking the scrim outside a modal beeps and does not close it.
	it("beeps on an outside (scrim) click of a modal", () => {
		renderWindow({ modal: true, closable: true });
		const scrim = document.querySelector(
			".classicyWindowModalScrim",
		) as HTMLElement;
		expect(scrim).not.toBeNull();
		fireEvent.mouseDown(scrim);
		expect(mockPlayer).toHaveBeenCalledWith(
			expect.objectContaining({ type: "ClassicySoundPlayError" }),
		);
		expect(dispatchedTypes()).not.toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowClose" }),
		);
	});

	// #205: a fixed (error) modal cannot be dragged from the title bar.
	it("does not drag a fixed error modal", () => {
		renderWindow({ modal: true, type: "error" });
		const title = document.querySelector(".classicyWindowTitle") as HTMLElement;
		fireEvent.mouseDown(title, { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 200, clientY: 200 });
		const dragStarts = dispatchedTypes().filter(
			(e: { type: string; moving?: boolean }) =>
				e.type === "ClassicyWindowMove" &&
				(e as { moving?: boolean }).moving === true,
		);
		expect(dragStarts).toHaveLength(0);
	});

	// A non-error modal (e.g. a File Open/Save dialog) must sit in the
	// modal-front stacking band so it renders ABOVE utility/tool palettes
	// (.classicyWindowFloating) rather than being covered by them.
	it("puts a non-error modal in the modal-front band (above utility palettes)", () => {
		renderWindow({ modal: true });
		const win = document.querySelector(".classicyWindowModal");
		expect(win).not.toBeNull();
		expect(win?.classList.contains("classicyWindowModalFront")).toBe(true);
		expect(win?.classList.contains("classicyWindowRed")).toBe(false);
	});

	// An error alert modal stays in the red alert band (top of the stack), NOT
	// the modal-front band — so alerts still appear over File dialogs.
	it("keeps an error alert modal out of the modal-front band", () => {
		renderWindow({ modal: true, type: "error" });
		const win = document.querySelector(".classicyWindowModal");
		expect(win).not.toBeNull();
		expect(win?.classList.contains("classicyWindowRed")).toBe(true);
		expect(win?.classList.contains("classicyWindowModalFront")).toBe(false);
	});

	// System 7 (HIG p.190): a fixed modal dialog box has no drag region and
	// no title bar, a movable modal one has both. The marker names the modal
	// the window refuses to move, so a package can drop that one's title bar.
	describe("the fixed-modal marker", () => {
		const fixedMarker = () =>
			document
				.querySelector(".classicyWindow")
				?.classList.contains("classicyWindowModalFixed");

		it("marks a fixed (error) modal", () => {
			renderWindow({ modal: true, type: "error" });
			expect(fixedMarker()).toBe(true);
		});

		it("leaves a movable modal unmarked", () => {
			renderWindow({ modal: true });
			expect(fixedMarker()).toBe(false);
		});

		it("leaves a non-modal window unmarked, error-typed or not", () => {
			renderWindow({ type: "error" });
			expect(fixedMarker()).toBe(false);
		});
	});

	// HIGOS8 p.60: a (non-movable) modal dialog box that is not an alert, such
	// as Standard File, Print or Page Setup under System 7. `movable={false}`
	// fixes the modal without the error semantics: no beep on open, no error
	// scrim, no red alert band.
	describe("a fixed modal that is not an alert (movable={false})", () => {
		const win = () => document.querySelector(".classicyWindow");
		const dragStarts = () =>
			dispatchedTypes().filter(
				(e: { type: string; moving?: boolean }) =>
					e.type === "ClassicyWindowMove" && e.moving === true,
			);
		const dragFrom = (selector: string) => {
			const el = document.querySelector(selector) as HTMLElement;
			fireEvent.mouseDown(el, { clientX: 150, clientY: 120 });
			fireEvent.mouseMove(document.body, { clientX: 200, clientY: 200 });
		};

		it("carries the fixed-modal marker", () => {
			renderWindow({ modal: true, movable: false });
			expect(win()).toHaveClass("classicyWindowModal");
			expect(win()).toHaveClass("classicyWindowModalFixed");
		});

		it("cannot be dragged from the title bar or a frame edge", () => {
			renderWindow({ modal: true, movable: false });
			dragFrom(".classicyWindowTitle");
			dragFrom(".classicyWindowFrameEdge-left");
			expect(dragStarts()).toHaveLength(0);
		});

		it("does not beep when it opens", () => {
			renderWindow({ modal: true, movable: false });
			expect(mockPlayer).not.toHaveBeenCalled();
		});

		it("stacks in the modal-front band, not the red alert band", () => {
			renderWindow({ modal: true, movable: false });
			expect(win()).toHaveClass("classicyWindowModalFront");
			expect(win()).not.toHaveClass("classicyWindowRed");
		});

		it("draws the ordinary modal scrim, not the error scrim", () => {
			renderWindow({ modal: true, movable: false });
			const scrim = document.querySelector(".classicyWindowModalScrim");
			expect(scrim).not.toBeNull();
			expect(scrim).not.toHaveClass("classicyWindowModalScrimError");
		});

		it("still beeps on a scrim click, as every modal does", () => {
			renderWindow({ modal: true, movable: false });
			const scrim = document.querySelector(
				".classicyWindowModalScrim",
			) as HTMLElement;
			fireEvent.mouseDown(scrim);
			expect(mockPlayer).toHaveBeenCalledWith(
				expect.objectContaining({ type: "ClassicySoundPlayError" }),
			);
		});

		it("leaves a modal movable by default", () => {
			renderWindow({ modal: true });
			dragFrom(".classicyWindowTitle");
			expect(dragStarts().length).toBeGreaterThan(0);
			expect(win()).not.toHaveClass("classicyWindowModalFixed");
		});

		it("has no effect on a non-modal window", () => {
			renderWindow({ movable: false });
			expect(win()).not.toHaveClass("classicyWindowModalFixed");
			dragFrom(".classicyWindowTitle");
			expect(dragStarts().length).toBeGreaterThan(0);
		});

		// `type="error"` keeps its behavior exactly: an error modal is fixed
		// whatever `movable` says, beeps on open and takes the alert band.
		it("leaves an error modal fixed, beeping and red even when movable", () => {
			renderWindow({ modal: true, type: "error", movable: true });
			expect(win()).toHaveClass("classicyWindowModalFixed");
			expect(win()).toHaveClass("classicyWindowRed");
			expect(document.querySelector(".classicyWindowModalScrim")).toHaveClass(
				"classicyWindowModalScrimError",
			);
			expect(mockPlayer).toHaveBeenCalledWith(
				expect.objectContaining({ type: "ClassicySoundPlayError" }),
			);
			dragFrom(".classicyWindowTitle");
			expect(dragStarts()).toHaveLength(0);
		});

		// `movable={false}` means nothing on a non-modal window; say so once
		// per window, in development, rather than ignore it silently.
		describe("on a non-modal window", () => {
			/** Window warnings logged while `run` runs, read through a sink. */
			const windowWarnings = (run: () => void) => {
				const entries: ClassicyLogEntry[] = [];
				const mirror = vi.spyOn(console, "warn").mockImplementation(() => {});
				registerClassicyLogSink({
					id: "window-movable-test",
					onLog: (entry) => entries.push(entry),
				});
				try {
					run();
				} finally {
					unregisterClassicyLogSink("window-movable-test");
					mirror.mockRestore();
				}
				return entries.filter(
					(e) => e.level === "warn" && e.subsystem === "Window",
				);
			};

			it("warns once per window that movable={false} is ignored", () => {
				const warnings = windowWarnings(() => {
					const { rerender } = renderWindow({ movable: false });
					// Retitled, then made modal and back: still the same window.
					for (const modal of [false, true, false]) {
						rerender(
							<ClassicyWindow
								id="TestWindow"
								appId="TestApp"
								title="Retitled"
								modal={modal}
								movable={false}
							>
								<p>content</p>
							</ClassicyWindow>,
						);
					}
				});
				expect(warnings).toHaveLength(1);
				expect(warnings[0].message).toMatch(/movable=\{false\}/);
				expect(warnings[0].message).toMatch(/non-modal/);
				expect(warnings[0].details).toContainEqual(
					expect.objectContaining({ appId: "TestApp", id: "TestWindow" }),
				);
			});

			it("does not warn for a modal, or a window that leaves movable alone", () => {
				const warnings = windowWarnings(() => {
					renderWindow({ modal: true, movable: false }).unmount();
					renderWindow({ movable: true }).unmount();
					renderWindow().unmount();
				});
				expect(warnings).toEqual([]);
			});

			it("stays quiet in production", () => {
				vi.stubEnv("NODE_ENV", "production");
				try {
					const warnings = windowWarnings(() => {
						renderWindow({ movable: false });
					});
					expect(warnings).toEqual([]);
				} finally {
					vi.unstubAllEnvs();
				}
			});
		});
	});

	// #208: zooming a full-mode window moves it to the standard-state origin and
	// flags it zoomed.
	it("zooms to the standard-state rect on a zoom-box click", () => {
		const { container } = renderWindow({ zoomable: true });
		const zoomBox = container.querySelector(
			".classicyWindowZoomBox",
		) as HTMLElement;
		fireEvent.click(zoomBox);
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowZoom", zoomed: true }),
		);
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({
				type: "ClassicyWindowMove",
				position: [8, 38],
			}),
		);
		// Plan 0020-w98 §8: only a maximize sends a rect to return to.
		for (const action of dispatchedTypes())
			if (action.type === "ClassicyWindowZoom")
				expect(action).not.toHaveProperty("restore");
	});

	// HIGOS8 Ch.5 "Zoom Boxes" (p.104): a full zoom targets the standard state
	// (here an explicit idealSize), NOT the whole screen.
	it("full-zooms to idealSize, not the whole desktop", () => {
		const { container } = renderWindow({
			zoomable: true,
			idealSize: [500, 400],
		});
		const win = container.querySelector(".classicyWindow") as HTMLElement;
		const zoomBox = container.querySelector(
			".classicyWindowZoomBox",
		) as HTMLElement;
		fireEvent.click(zoomBox);
		// Sized to the ideal, clamped to the window minimum / desktop — not filled.
		expect(win.style.width).toBe("500px");
		expect(win.style.height).toBe("400px");
	});

	// #205: renders four draggable frame-edge handles on an expanded window.
	it("renders draggable frame edges on all four sides", () => {
		const { container } = renderWindow();
		expect(container.querySelectorAll(".classicyWindowFrameEdge")).toHaveLength(
			4,
		);
	});

	// WIG Ch.6 "Window Frames" (p.76): a window that cannot be sized has no
	// sizing border, so the root says so (`classicyWindowNoResize`) for a
	// package to frame it; the core itself draws no grow box for it.
	it("marks a resizable={false} window classicyWindowNoResize and draws no grow box", () => {
		const { container } = renderWindow({ resizable: false });
		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(root.classList.contains("classicyWindowNoResize")).toBe(true);
		expect(container.querySelector(".classicyWindowResizer")).toBeNull();
	});

	it("marks a resizable window with neither, and draws its grow box", () => {
		const { container } = renderWindow();
		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(root.classList.contains("classicyWindowNoResize")).toBe(false);
		expect(container.querySelector(".classicyWindowResizer")).not.toBeNull();
	});

	// #203: the content frame carries active/inactive styling.
	it("applies the content frame class when contentFrame is set, and marks the contents holding it", () => {
		const { container } = renderWindow({ contentFrame: true });
		expect(
			container.querySelector(".classicyWindowContentsFramed"),
		).not.toBeNull();
		// The holder's class lets a package style it without `:has()`.
		expect(
			container.querySelector(
				".classicyWindowContents.classicyWindowContentsWithFrame .classicyWindowContentsFramed",
			),
		).not.toBeNull();
	});

	it("marks no contents holder without contentFrame", () => {
		const { container } = renderWindow({});
		expect(
			container.querySelector(".classicyWindowContentsWithFrame"),
		).toBeNull();
	});

	// #183: the list header variant is applied to the header region.
	it("applies the list header variant class", () => {
		const { container } = renderWindow({
			headerVariant: "list",
			header: <span>Columns</span>,
		});
		expect(container.querySelector(".classicyWindowHeaderList")).not.toBeNull();
	});

	// Story 0216-1im F9: list titles drawn above the contents' scrolling
	// region (the contents' scroll area's head) take over the header's
	// bottom edge, so the header is marked while its contents have a head.
	it("marks the header while the contents draw a head", () => {
		const AskForHead = ({ ask }: { ask: boolean }) => {
			useClassicyScrollAreaHead(ask);
			return null;
		};
		const view = (ask: boolean) => (
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Test"
				header={<span>4 items</span>}
			>
				<AskForHead ask={ask} />
			</ClassicyWindow>
		);
		const { container, rerender } = render(view(false));
		const header = () =>
			container.querySelector(".classicyWindowHeader") as HTMLElement;
		expect(header().classList.contains("classicyWindowHeaderAboveHead")).toBe(
			false,
		);
		rerender(view(true));
		expect(container.querySelector(".classicyScrollAreaHead")).not.toBeNull();
		expect(header().classList.contains("classicyWindowHeaderAboveHead")).toBe(
			true,
		);
		rerender(view(false));
		expect(header().classList.contains("classicyWindowHeaderAboveHead")).toBe(
			false,
		);
	});
});

// Plan 0020-w98 §5, "Maximize and restore": `layout.window.zoom` decides what
// the zoom box does. On the real store and reducer, the default layout (Mac
// OS 8's standard state, as always) and a package that maximizes (Windows
// 95/98: WIG Ch.6 "Maximizing Windows" and "Restoring Windows", pp.84-85).
describe("ClassicyWindow under window.zoom", () => {
	const APP = "Maximize.app";
	// jsdom's viewport; the window's frame is given per side by an inline
	// padding, which jsdom's computed style reports (chrome 7 4 5 6).
	const VIEWPORT: [number, number] = [1024, 768];
	const CHROME = { left: 7, top: 4, right: 5, bottom: 6 };
	const FRAME_STYLE = { padding: "4px 5px 6px 7px" };
	const STANDARD_PACKAGE_ID = "test-standard-zoom";

	beforeEach(() => {
		mockStore.real = true;
		localStorage.clear();
		Object.assign(window, {
			innerWidth: VIEWPORT[0],
			innerHeight: VIEWPORT[1],
		});
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		act(() =>
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Applications.apps[APP] = {
						id: APP,
						name: "Maximize",
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
		// Unmounted while the real store is still in use (see the collapse
		// cases in ClassicyWindow.collapse.test.tsx).
		cleanup();
		act(() => setClassicyTaskbarBand(0));
		mockStore.real = false;
		unregisterClassicyAppearancePackage(TEST_MAXIMIZE_PACKAGE_ID);
		unregisterClassicyAppearancePackage(STANDARD_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		Object.assign(window, {
			innerWidth: VIEWPORT[0],
			innerHeight: VIEWPORT[1],
		});
	});

	const maximizing = () => {
		registerTestTaskbarPackage(TEST_MAXIMIZE_LAYOUT, TEST_MAXIMIZE_PACKAGE_ID);
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_MAXIMIZE_PACKAGE_ID,
			}),
		);
	};

	const record = () =>
		getAppWindow(
			useAppManager.getState().System.Manager.Applications.apps[APP],
			"main",
		);
	const setRecord = (patch: Partial<ClassicyStoreSystemAppWindow>) =>
		act(() =>
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					Object.assign(
						draft.System.Manager.Applications.apps[APP].windows?.main ?? {},
						patch,
					);
				}),
			),
		);
	// The menu bar's band the window keeps below: the active theme's
	// `--menu-bar-height` (the layout keeps the screen bar).
	const menuBarHeight = () =>
		Number.parseFloat(
			(
				getThemeVars(
					useAppManager.getState().System.Manager.Appearance
						.activeTheme as ClassicyTheme,
				) as Record<string, string>
			)["--menu-bar-height"],
		);

	const mainWindow = (
		props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
	) => (
		<ClassicyWindow
			id="main"
			appId={APP}
			title="Main"
			initialSize={[400, 300]}
			initialPosition={[50, 60]}
			style={FRAME_STYLE}
			{...props}
		>
			<p>main content</p>
		</ClassicyWindow>
	);
	const root = () => document.getElementById(`${APP}_main`) as HTMLElement;
	const zoomBox = () =>
		root().querySelector(".classicyWindowZoomBox") as HTMLElement;
	const geometry = () => ({
		position: record()?.position,
		size: record()?.size,
		left: root().style.left,
		top: root().style.top,
		width: root().style.width,
		height: root().style.height,
	});
	// The rect a maximized window takes: the work area, the frame outside.
	const maximizedGeometry = (bottomBand = 0, viewport = VIEWPORT) => {
		const top = menuBarHeight();
		const size = [viewport[0], viewport[1] - top - bottomBand];
		const position = [-CHROME.left, top - CHROME.top];
		return {
			position,
			size,
			left: `${position[0]}px`,
			top: `${position[1]}px`,
			width: `${size[0]}px`,
			height: `${size[1]}px`,
		};
	};
	const openedGeometry = {
		position: [50, 60],
		size: [400, 300],
		left: "50px",
		top: "60px",
		width: "400px",
		height: "300px",
	};

	describe("under the default layout (the standard state)", () => {
		it("zooms to the standard state: no maximized class, no stored rect, the frame and grow box kept", () => {
			render(mainWindow());
			expect(zoomBox()).toHaveAttribute("aria-label", "Zoom");
			fireEvent.click(zoomBox());

			expect(record()?.zoomed).toBe(true);
			expect(root()).toHaveClass("expanded");
			expect(root()).not.toHaveClass("classicyWindowMaximized");
			// The standard state's origin, inside the zoom margin, never the
			// frame-outside rect.
			expect(record()?.position?.[0]).toBeGreaterThanOrEqual(0);
			expect(record()?.position).not.toEqual(maximizedGeometry().position);
			// No rect goes with the zoom, so the record never gains the key.
			expect(record() && "restoreRect" in record()!).toBe(false);
			expect(zoomBox()).toHaveAttribute("aria-label", "Zoom");
			expect(root().querySelectorAll(".classicyWindowFrameEdge")).toHaveLength(
				4,
			);
			expect(root().querySelector(".classicyWindowResizer")).not.toBeNull();

			fireEvent.click(zoomBox());
			expect(geometry()).toEqual(openedGeometry);
			expect(root()).not.toHaveClass("expanded");
		});

		it("un-zooms a window that has a stored rect to it, under every package", () => {
			render(mainWindow());
			setRecord({
				zoomed: true,
				position: [10, 40],
				size: [900, 600],
				restoreRect: { position: [70, 80], size: [420, 310] },
			});
			fireEvent.click(zoomBox());
			expect(record()).toMatchObject({
				zoomed: false,
				position: [70, 80],
				size: [420, 310],
			});
			expect(record() && "restoreRect" in record()!).toBe(false);
		});

		it("un-zooms a window zoomed before this mount, with no rect stored, where it is", () => {
			// Zoomed in an earlier session: nothing remembered, nothing stored.
			// The standard state's un-zoom keeps the geometry, as it always
			// has; only a maximizing layout falls back to the opening rect.
			render(mainWindow());
			setRecord({ zoomed: true, position: [8, 38], size: [500, 420] });
			fireEvent.click(zoomBox());
			expect(record()).toMatchObject({
				zoomed: false,
				position: [8, 38],
				size: [500, 420],
			});
		});

		it("draws a box only for what the window has: no unavailable partner", () => {
			render(mainWindow({ zoomable: false }));
			expect(zoomBox()).toBeNull();
			expect(
				root().querySelector(".classicyWindowCollapseBox"),
			).not.toHaveClass("disabled");
			cleanup();
			render(mainWindow({ collapsable: false }));
			expect(root().querySelector(".classicyWindowCollapseBox")).toBeNull();
			expect(zoomBox()).not.toHaveClass("disabled");
		});
	});

	describe('under window.zoom: "maximize"', () => {
		beforeEach(maximizing);

		it("maximizes to the work area with the frame outside it, and stores the rect it had", () => {
			render(mainWindow());
			expect(zoomBox()).toHaveAttribute("aria-label", "Maximize");
			fireEvent.click(zoomBox());

			expect(geometry()).toEqual(maximizedGeometry());
			expect(record()).toMatchObject({
				zoomed: true,
				restoreRect: { position: [50, 60], size: [400, 300] },
			});
			expect(root()).toHaveClass("expanded");
			expect(root()).toHaveClass("classicyWindowMaximized");
			expect(zoomBox()).toHaveAttribute("aria-label", "Restore");
			// Its frame neither moves nor sizes it: no edges, no grow box.
			expect(root().querySelector(".classicyWindowFrameEdge")).toBeNull();
			expect(root().querySelector(".classicyWindowResizer")).toBeNull();
		});

		it("leaves the taskbar's band out of the work area", () => {
			act(() => setClassicyTaskbarBand(28));
			render(mainWindow());
			fireEvent.click(zoomBox());
			expect(geometry()).toEqual(maximizedGeometry(28));
		});

		it("restores the rect it had, and forgets it", () => {
			render(mainWindow());
			fireEvent.click(zoomBox());
			fireEvent.click(zoomBox());

			expect(geometry()).toEqual(openedGeometry);
			expect(record()?.zoomed).toBe(false);
			expect(record() && "restoreRect" in record()!).toBe(false);
			expect(root()).not.toHaveClass("expanded");
			expect(root()).not.toHaveClass("classicyWindowMaximized");
			expect(zoomBox()).toHaveAttribute("aria-label", "Maximize");
			expect(root().querySelectorAll(".classicyWindowFrameEdge")).toHaveLength(
				4,
			);
			expect(root().querySelector(".classicyWindowResizer")).not.toBeNull();
		});

		it("restores the stored rect after a remount, which remembers nothing", () => {
			const view = render(mainWindow());
			fireEvent.click(zoomBox());
			view.unmount();
			render(mainWindow());
			expect(geometry()).toEqual(maximizedGeometry());

			fireEvent.click(zoomBox());
			expect(geometry()).toEqual(openedGeometry);
			expect(record() && "restoreRect" in record()!).toBe(false);
		});

		it("ignores a malformed stored rect, restoring the rect the window opened at", () => {
			render(mainWindow());
			setRecord({
				zoomed: true,
				restoreRect: {
					position: [Number.NaN, 5],
					size: [400, 300],
				} as ClassicyStoreSystemAppWindow["restoreRect"],
			});
			expect(geometry()).toEqual(maximizedGeometry());

			fireEvent.click(zoomBox());
			expect(geometry()).toEqual(openedGeometry);
		});

		it("takes the work area on mount, whatever geometry the record holds", () => {
			render(mainWindow());
			// Zoomed under another package: its standard state.
			setRecord({ zoomed: true, position: [8, 38], size: [500, 420] });
			expect(geometry()).toEqual(maximizedGeometry());
			// With no rect stored or remembered, Restore returns to the rect
			// the window opened at.
			fireEvent.click(zoomBox());
			expect(geometry()).toEqual(openedGeometry);
		});

		it("follows the work area when the desktop resizes or the taskbar's band changes", () => {
			render(mainWindow());
			fireEvent.click(zoomBox());
			act(() => {
				Object.assign(window, { innerWidth: 900, innerHeight: 700 });
				window.dispatchEvent(new Event("resize"));
			});
			expect(geometry()).toEqual(maximizedGeometry(0, [900, 700]));
			act(() => setClassicyTaskbarBand(28));
			expect(geometry()).toEqual(maximizedGeometry(28, [900, 700]));
		});

		it("ignores zoomMode and idealSize: Windows has one maximized state", () => {
			render(mainWindow({ zoomMode: "horizontal", idealSize: [300, 200] }));
			fireEvent.click(zoomBox());
			expect(geometry()).toEqual(maximizedGeometry());
		});

		it("does not move while maximized: its caption's drag is refused", () => {
			render(mainWindow());
			fireEvent.click(zoomBox());
			const title = root().querySelector(".classicyWindowTitle") as HTMLElement;
			fireEvent.mouseDown(title, { clientX: 200, clientY: 10 });
			fireEvent.mouseMove(document.body, { clientX: 260, clientY: 90 });
			expect(record()?.moving).not.toBe(true);
			expect(record()?.dragging).not.toBe(true);
			expect(record()?.position).toEqual(maximizedGeometry().position);
			fireEvent.mouseUp(document.body, { clientX: 260, clientY: 90 });
		});

		it("loses the maximize, and its stored rect, to a WindowShade collapse, as a zoom always has", () => {
			// The package shades (no `window.collapse`): a shade clears the
			// zoom, and with it the stored rect, as it always has.
			render(mainWindow());
			fireEvent.click(zoomBox());
			fireEvent.click(
				root().querySelector(".classicyWindowCollapseBox") as HTMLElement,
			);
			expect(record()).toMatchObject({ collapsed: true, zoomed: false });
			expect(record() && "restoreRect" in record()!).toBe(false);
			expect(root()).not.toHaveClass("classicyWindowMaximized");
		});

		it("draws no zoom box on a palette, which has no Maximize button", () => {
			render(mainWindow({ windowType: "utility" }));
			expect(zoomBox()).toBeNull();
		});

		it("draws a palette's zoom from another package unmaximized", () => {
			render(mainWindow({ windowType: "utility" }));
			setRecord({ zoomed: true, position: [8, 38], size: [500, 420] });
			expect(root()).not.toHaveClass("classicyWindowMaximized");
			expect(record()?.position).toEqual([8, 38]);
		});

		it("is clamped back on screen under another package, keeps its zoom and un-zooms to its stored rect", () => {
			const view = render(mainWindow());
			fireEvent.click(zoomBox());
			view.unmount();
			// A package that zooms to the standard state, as Platinum does.
			registerTestTaskbarPackage(
				CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				STANDARD_PACKAGE_ID,
			);
			act(() =>
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: STANDARD_PACKAGE_ID,
				}),
			);
			render(mainWindow());
			expect(root()).not.toHaveClass("classicyWindowMaximized");
			expect(root()).toHaveClass("expanded");
			expect(Number.parseFloat(root().style.left)).toBeGreaterThanOrEqual(0);
			expect(zoomBox()).toHaveAttribute("aria-label", "Zoom");

			fireEvent.click(zoomBox());
			expect(geometry()).toEqual(openedGeometry);
			expect(record() && "restoreRect" in record()!).toBe(false);
		});

		// Windows 95/98 draws Minimize and Maximize as a pair, the one a
		// window lacks grayed (Wine's `NC_DrawCaption`: "In win95 the two
		// buttons are always there"; the Calculator's grayed Maximize).
		describe("Minimize and Maximize as a pair", () => {
			const collapseBox = () =>
				root().querySelector(".classicyWindowCollapseBox") as HTMLElement;

			it("draws an unavailable Maximize beside a lone Minimize, which does nothing", () => {
				render(mainWindow({ zoomable: false }));
				expect(zoomBox()).toHaveClass("disabled");
				expect(zoomBox()).toHaveAttribute("aria-disabled", "true");
				expect(zoomBox()).toHaveAttribute("aria-label", "Maximize");
				expect(collapseBox()).not.toHaveClass("disabled");
				fireEvent.click(zoomBox());
				expect(record()?.zoomed).not.toBe(true);
				// Nor does the caption's double-click: no Maximize box.
				fireEvent.doubleClick(
					root().querySelector(".classicyWindowTitle") as Element,
				);
				expect(record()?.zoomed).not.toBe(true);
			});

			it("draws an unavailable Minimize beside a lone Maximize, which does nothing", () => {
				render(mainWindow({ collapsable: false }));
				expect(collapseBox()).toHaveClass("disabled");
				expect(collapseBox()).toHaveAttribute("aria-disabled", "true");
				expect(zoomBox()).not.toHaveClass("disabled");
				fireEvent.click(collapseBox());
				expect(record()?.collapsed).not.toBe(true);
			});

			it("draws neither with neither box, nor any unavailable box with both", () => {
				render(mainWindow({ zoomable: false, collapsable: false }));
				expect(zoomBox()).toBeNull();
				expect(collapseBox()).toBeNull();
				cleanup();
				render(mainWindow());
				expect(zoomBox()).not.toHaveClass("disabled");
				expect(collapseBox()).not.toHaveClass("disabled");
			});

			it("leaves palettes and dialogs out: neither has the pair", () => {
				render(mainWindow({ windowType: "utility", zoomable: false }));
				expect(zoomBox()).toBeNull();
				cleanup();
				render(mainWindow({ modal: true, collapsable: false }));
				expect(zoomBox()).toBeNull();
				expect(collapseBox()).toBeNull();
			});
		});
	});
});
