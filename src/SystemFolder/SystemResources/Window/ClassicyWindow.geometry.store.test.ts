// Window geometry against the REAL store: a drag or resize dispatches
// ClassicyWindowMove/Resize on every mousemove, the record changes identity
// and the window re-renders, which is the hot path a theme-variable read must
// stay out of. (ClassicyWindow.geometry.test.ts mocks the store, so neither
// re-render nor `ws.resizing` ever happens there.)
// jsdom's getComputedStyle reports inline custom properties set with
// `style.setProperty`; no getComputedStyle stub is needed.
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@/__tests__/test-utils";
import {
	type ClassicyAppearanceLayout,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import {
	classicyLayoutThemeVars,
	classicyLayoutVars,
	useClassicyAppearanceLayout,
} from "@/Appearance/useClassicyAppearanceLayout";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const APP = "Geometry.app";

// Pass-through spy, so the tests can count reads per variable name.
vi.mock(
	"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader")
			>();
		return {
			...actual,
			readClassicyThemeVar: vi.fn(actual.readClassicyThemeVar),
		};
	},
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => () => {} }),
);
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }) }),
);
vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);

const app: ClassicyStoreSystemApp = {
	id: APP,
	name: "Geometry",
	icon: "",
	open: true,
	focused: true,
	windows: {},
};

const reads = (name: string) =>
	vi.mocked(readClassicyThemeVar).mock.calls.filter(([n]) => n === name).length;

const storedWindow = () =>
	getAppWindow(
		useAppManager.getState().System.Manager.Applications.apps[APP],
		"win",
	);

let rectSpy: ReturnType<typeof vi.spyOn>;
// Layout reads of the desktop's size (resolveSize's clientWidth/Height).
const desktopWidthRead = vi.fn(() => 1024);
const desktopHeightRead = vi.fn(() => 768);

beforeEach(() => {
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		useAppManager.setState((state) => ({
			...state,
			System: {
				...state.System,
				Manager: {
					...state.System.Manager,
					Applications: {
						...state.System.Manager.Applications,
						apps: { ...state.System.Manager.Applications.apps, [APP]: app },
					},
				},
			},
		}));
	});
	// jsdom runs no layout: every element reports the window's start rect.
	rectSpy = vi
		.spyOn(Element.prototype, "getBoundingClientRect")
		.mockReturnValue({
			width: 350,
			height: 200,
			top: 110,
			left: 110,
			right: 460,
			bottom: 310,
			x: 110,
			y: 110,
			toJSON: () => {},
		} as DOMRect);
	const desktop = document.createElement("div");
	desktop.id = "classicyDesktop";
	desktop.style.setProperty("--window-resize-inset", "7px");
	desktopWidthRead.mockClear();
	desktopHeightRead.mockClear();
	Object.defineProperty(desktop, "clientWidth", { get: desktopWidthRead });
	Object.defineProperty(desktop, "clientHeight", { get: desktopHeightRead });
	document.body.append(desktop);
});

afterEach(() => {
	rectSpy.mockRestore();
	document.getElementById("classicyDesktop")?.remove();
	vi.restoreAllMocks();
});

// Rendered inside the desktop: the window reads theme variables from its own
// element, which inherits them from the desktop root.
const renderWindow = () =>
	render(
		createElement(
			ClassicyWindow,
			{
				id: "win",
				appId: APP,
				title: "Geometry",
				resizable: true,
				initialPosition: [110, 110],
			},
			createElement("p", null, "content"),
		),
		{ container: document.getElementById("classicyDesktop") as HTMLElement },
	);

describe("ClassicyWindow geometry on the store-driven hot path", () => {
	it("a drag of many mousemoves reads no theme variable and no desktop size", () => {
		const { container } = renderWindow();
		const title = container.querySelector(
			".classicyWindowTitle",
		) as HTMLElement;
		vi.mocked(readClassicyThemeVar).mockClear();
		desktopWidthRead.mockClear();
		desktopHeightRead.mockClear();

		fireEvent.mouseDown(title, { clientX: 150, clientY: 120 });
		const moves = 20;
		for (let i = 1; i <= moves; i++) {
			fireEvent.mouseMove(document.body, {
				clientX: 150 + i * 5,
				clientY: 120 + i * 5,
			});
		}
		// The drag really moved the stored record, so the window re-rendered
		// on every move: (250, 220) less the (40, 10) click offset. The release
		// re-reads the mocked rect, so this is checked before it.
		expect(storedWindow()?.position).toEqual([210, 210]);
		fireEvent.mouseUp(document.body, { clientX: 250, clientY: 220 });

		expect(reads("--menu-bar-height")).toBe(0);
		// The default initialSize/minimumSize are stable, so the resolveSize
		// memos never re-run (and never force a layout read) during the drag.
		expect(desktopWidthRead).not.toHaveBeenCalled();
		expect(desktopHeightRead).not.toHaveBeenCalled();
	});

	it("registers a boot-render window against the active theme's menu bar", () => {
		// The boot render: the window renders inside the desktop's first commit,
		// so no #classicyDesktop carries the variables yet.
		document.getElementById("classicyDesktop")?.remove();
		act(() => {
			useAppManager.setState((state) => {
				const theme = state.System.Manager.Appearance.activeTheme;
				return {
					...state,
					System: {
						...state.System,
						Manager: {
							...state.System.Manager,
							Appearance: {
								...state.System.Manager.Appearance,
								// controlSize 16 → --menu-bar-height 40 (control × 2.5).
								activeTheme: {
									...theme,
									measurements: {
										...theme.measurements,
										window: { ...theme.measurements.window, controlSize: 16 },
									},
								},
							},
						},
					},
				};
			});
		});

		render(
			createElement(
				ClassicyWindow,
				{
					id: "win",
					appId: APP,
					title: "Geometry",
					initialPosition: ["left", "top"],
				},
				createElement("p", null, "content"),
			),
		);

		expect(storedWindow()?.position).toEqual([0, 40]);

		// Still no desktop after mount: the layout-effect re-read keeps the
		// active theme's 40 too, so a zoom lands at 8 margin + 40 + 8.
		fireEvent.click(
			document.querySelector(".classicyWindowZoomBox") as HTMLElement,
		);
		expect(storedWindow()?.position).toEqual([8, 48]);
	});

	it("the React onMouseMove resize path adds the CSS inset once per gesture", () => {
		const { container } = renderWindow();
		const root = container.querySelector(".classicyWindow") as HTMLElement;
		const resizer = container.querySelector(
			".classicyWindowResizer",
		) as HTMLElement;
		vi.mocked(readClassicyThemeVar).mockClear();

		fireEvent.mouseDown(resizer, { clientX: 460, clientY: 310 });
		// The store now says resizing, so moves inside the window go through
		// changeWindow (the document handler skips targets inside the window).
		expect(storedWindow()?.resizing).toBe(true);
		fireEvent.mouseMove(root, { clientX: 480, clientY: 330 });
		fireEvent.mouseMove(root, { clientX: 505, clientY: 365 });

		// |110 − 505| + 7 and |110 − 365| + 7.
		expect(root.style.width).toBe("402px");
		expect(root.style.height).toBe("262px");
		expect(reads("--window-resize-inset")).toBe(1);
		fireEvent.mouseUp(root, { clientX: 505, clientY: 365 });
	});
});

// G17: under menuBar.placement "window" the screen bar is headless, so its
// band is 0 and windows, zoom and the resize floor may use the full height.
describe("ClassicyWindow geometry under the menu-bar placement (G17)", () => {
	const platinum = getClassicyAppearancePackage(PLATINUM_APPEARANCE_PACKAGE_ID);
	const placementPackage = (
		id: string,
		placement: ClassicyAppearanceLayout["menuBar"]["placement"],
	) => ({
		id,
		name: id,
		css: "",
		defaults: { ...getTheme("default"), id: `${id}-default`, package: id },
		layout: {
			window: { growBoxCorner: "bottom-right" as const },
			menuBar: { placement },
			desktop: { iconGridOrigin: "top-right" as const },
		},
	});

	// The desktop root's variable spread, as ClassicyDesktop builds it: the
	// theme's, then the layout's.
	function Desktop({ children }: { children: ReactNode }) {
		const theme = useAppManager(
			(state) => state.System.Manager.Appearance.activeTheme,
		);
		const layout = useClassicyAppearanceLayout();
		return createElement(
			"div",
			{
				id: "classicyDesktop",
				style: {
					...getThemeVars(theme),
					...classicyLayoutVars(layout),
					...classicyLayoutThemeVars(layout),
				},
			},
			children,
		);
	}

	const renderInDesktop = () =>
		render(
			createElement(
				Desktop,
				null,
				createElement(
					ClassicyWindow,
					{
						id: "win",
						appId: APP,
						title: "Geometry",
						resizable: true,
						initialPosition: [110, 110],
					},
					createElement("p", null, "content"),
				),
			),
		);

	const activate = (packageId: string) =>
		act(() =>
			dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
		);

	const clickZoom = () =>
		fireEvent.click(
			document.querySelector(".classicyWindowZoomBox") as HTMLElement,
		);

	beforeEach(() => {
		// The harness's bare desktop carries no theme; these tests mount their own.
		document.getElementById("classicyDesktop")?.remove();
	});

	afterEach(() => {
		// Unmount before the harness removes #classicyDesktop: here it is the
		// stand-in desktop React rendered.
		cleanup();
		resetClassicyAppearancePackagesForTests();
		if (platinum) registerClassicyAppearancePackage(platinum);
	});

	it("zooms to the screen's top after a switch to a window-placement package", () => {
		registerClassicyAppearancePackage(
			placementPackage("test-window", "window"),
		);
		renderInDesktop();
		activate("test-window");
		clickZoom();
		expect(storedWindow()?.position).toEqual([8, 8]);
	});

	it("follows a layout-only change of the placement", () => {
		registerClassicyAppearancePackage(
			placementPackage("test-window", "window"),
		);
		renderInDesktop();
		activate("test-window");
		clickZoom();
		expect(storedWindow()?.position).toEqual([8, 8]);
		clickZoom();
		// The same package re-registered with the screen bar: activeTheme does
		// not change, only the layout does.
		act(() =>
			registerClassicyAppearancePackage(
				placementPackage("test-window", "screen"),
			),
		);
		clickZoom();
		expect(storedWindow()?.position).toEqual([8, 38]);
	});

	it("registers a boot-render window at the screen's top under window placement", () => {
		registerClassicyAppearancePackage(
			placementPackage("test-window", "window"),
		);
		activate("test-window");
		// No desktop: the window seeds from the active theme and layout. The x
		// is numeric because ClassicyWindowOpen treats exactly [0, 0] as "no
		// position" and cascades it to [30, 30].
		render(
			createElement(
				ClassicyWindow,
				{
					id: "win",
					appId: APP,
					title: "Geometry",
					initialPosition: [110, "top"],
				},
				createElement("p", null, "content"),
			),
		);
		expect(storedWindow()?.position).toEqual([110, 0]);
	});
});

// M4: on a page with several desktops (Storybook Docs), a window reads the
// theme variables of the desktop it is in, not the first #classicyDesktop.
describe("ClassicyWindow reads its own desktop's variables", () => {
	it("zooms by the margin and menu bar of the desktop it is in", () => {
		const other = document.getElementById("classicyDesktop") as HTMLElement;
		other.style.setProperty("--window-zoom-margin", "20px");
		other.style.setProperty("--menu-bar-height", "50px");
		const own = document.createElement("div");
		own.id = "classicyDesktop";
		own.style.setProperty("--window-zoom-margin", "4px");
		own.style.setProperty("--menu-bar-height", "12px");
		document.body.append(own);
		try {
			render(
				createElement(
					ClassicyWindow,
					{
						id: "win",
						appId: APP,
						title: "Geometry",
						initialPosition: [110, 110],
					},
					createElement("p", null, "content"),
				),
				{ container: own },
			);
			fireEvent.click(
				document.querySelector(".classicyWindowZoomBox") as HTMLElement,
			);
			expect(storedWindow()?.position).toEqual([4, 16]);
		} finally {
			own.remove();
		}
	});

	it("adds the resize inset of the desktop it is in", () => {
		const own = document.createElement("div");
		own.id = "classicyDesktop";
		own.style.setProperty("--window-resize-inset", "3px");
		document.body.append(own);
		try {
			const { container } = render(
				createElement(
					ClassicyWindow,
					{
						id: "win",
						appId: APP,
						title: "Geometry",
						resizable: true,
						initialPosition: [110, 110],
					},
					createElement("p", null, "content"),
				),
				{ container: own },
			);
			const root = container.querySelector(".classicyWindow") as HTMLElement;
			fireEvent.mouseDown(
				container.querySelector(".classicyWindowResizer") as HTMLElement,
				{ clientX: 460, clientY: 310 },
			);
			fireEvent.mouseMove(root, { clientX: 505, clientY: 365 });
			// |110 − 505| + 3 and |110 − 365| + 3, not the first desktop's 7.
			expect(root.style.width).toBe("398px");
			expect(root.style.height).toBe("258px");
			fireEvent.mouseUp(root, { clientX: 505, clientY: 365 });
		} finally {
			own.remove();
		}
	});
});
