// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { StrictMode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compileScss, scssRule } from "@/__tests__/compiledCss";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { noteClassicyWindowZoomSource } from "@/SystemFolder/SystemResources/Window/ClassicyZoomRects";
import { resetClassicyZoomSourcesForTests } from "@/SystemFolder/SystemResources/Window/ClassicyZoomSources.internal";

// Zoom rectangles on the desktop (story 0230-n6c): a folder opened from a
// drive's desktop icon or from an icon in a Finder window zooms out of the
// icon, the window drawn when the rectangles end; closing it zooms back.

vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }),
	}),
);

// The fake display draws a frame every 16 ms.
const FRAME = 16;
const HD = "Macintosh HD";
const FINDER = "Finder.app";

const box = (left: number, top: number, width: number, height: number) =>
	({
		left,
		top,
		width,
		height,
		right: left + width,
		bottom: top + height,
		x: left,
		y: top,
		toJSON: () => ({}),
	}) as DOMRect;

// jsdom lays nothing out: the desktop is 800 × 600, a window 400 × 300 at
// (50, 60) with its content area (header and contents) 390 × 270 at
// (55, 85), an icon in a window 32 px at (120, 140), and any other icon
// 32 px at (700, 40).
const stubLayout = () => {
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
		function (this: Element) {
			if (this.id === "classicyDesktop") return box(0, 0, 800, 600);
			if (this.classList.contains("classicyWindow"))
				return box(50, 60, 400, 300);
			if (
				this.classList.contains("classicyWindowHeader") ||
				this.classList.contains("classicyWindowContents")
			)
				return box(55, 85, 390, 270);
			if (this.closest(".classicyWindow")) return box(120, 140, 32, 32);
			return box(700, 40, 32, 32);
		},
	);
};

const stubMotion = (reduce: boolean) =>
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			matches: reduce && query === "(prefers-reduced-motion: reduce)",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
		})),
	);

const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

beforeEach(() => {
	localStorage.clear();
	resetClassicyZoomSourcesForTests();
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
	stubMotion(false);
	stubLayout();
	vi.useFakeTimers({
		toFake: [
			"setTimeout",
			"clearTimeout",
			"Date",
			"requestAnimationFrame",
			"cancelAnimationFrame",
			"performance",
		],
	});
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
});

const renderDesktop = (children?: React.ReactNode, strict = false) => {
	const tree = (
		<ClassicyAppManagerProvider>
			<ClassicyDesktop controlStrip={false}>{children}</ClassicyDesktop>
		</ClassicyAppManagerProvider>
	);
	return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
};

const rects = () =>
	document.querySelectorAll<HTMLElement>('[data-classicy-part="zoom-rect"]');
const finderWindow = (path: string) =>
	document.getElementById(`${FINDER}_${path}`);
const hidden = (path: string) =>
	finderWindow(path)?.classList.contains("classicyWindowZoomHidden") ?? false;
const record = (path: string) =>
	getAppWindow(
		useAppManager.getState().System.Manager.Applications.apps[FINDER],
		path,
	);
const driveIcon = () =>
	document.querySelector<HTMLElement>(
		`.classicyDesktopIcon[data-classicy-drop-folder="${HD}"]`,
	);
const step = (ms: number) =>
	act(() => {
		vi.advanceTimersByTime(ms);
	});
const frames = (n: number) => step(n * FRAME);
const openHd = () =>
	act(() => {
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: HD });
	});
const closeFolder = (path: string) =>
	act(() => {
		dispatch({ type: "ClassicyAppFinderCloseFolder", path });
	});

describe("zoom rectangles from a desktop icon", () => {
	it("zoom a drive's window out of its icon, one a frame, and draw the window when they end", () => {
		renderDesktop();
		const icon = driveIcon();
		expect(icon).not.toBeNull();
		act(() => {
			fireEvent.doubleClick(icon as HTMLElement);
		});
		expect(finderWindow(HD)).not.toBeNull();
		// Laid out but not drawn while the rectangles run (Platinum: six,
		// one a tick, from the icon toward the window's content area).
		expect(hidden(HD)).toBe(true);
		expect(rects()).toHaveLength(1);
		frames(1);
		expect(rects()).toHaveLength(1);
		frames(5);
		expect(rects()).toHaveLength(6);
		expect(hidden(HD)).toBe(true);
		frames(1);
		expect(rects()).toHaveLength(0);
		expect(hidden(HD)).toBe(false);
		// It ends at the content area's box: the last step lies inside it.
		expect(record(HD)?.focused).toBe(true);
	});

	it("zoom from the icon opened by the keyboard (Enter)", () => {
		renderDesktop();
		act(() => {
			fireEvent.keyDown(driveIcon() as HTMLElement, { key: "Enter" });
		});
		expect(hidden(HD)).toBe(true);
		expect(rects()).toHaveLength(1);
		frames(7);
		expect(hidden(HD)).toBe(false);
	});

	it("zoom back to the icon when the window closes, from the window's box", () => {
		renderDesktop();
		openHd();
		expect(finderWindow(HD)).not.toBeNull();
		expect(rects()).toHaveLength(0);
		closeFolder(HD);
		expect(finderWindow(HD)).toBeNull();
		step(0);
		expect(rects()).toHaveLength(1);
		const first = rects()[0];
		expect([first.style.left, first.style.top, first.style.width]).toEqual([
			"50px",
			"60px",
			"400px",
		]);
		frames(6);
		const widths = [...rects()].map((el) => Number.parseFloat(el.style.width));
		expect(widths).toHaveLength(6);
		for (let i = 1; i < widths.length; i++)
			expect(widths[i]).toBeLessThan(widths[i - 1]);
		frames(1);
		expect(rects()).toHaveLength(0);
	});

	it("end the opening zoom when the window closes during it, and zoom back from its box", () => {
		renderDesktop();
		act(() => {
			fireEvent.doubleClick(driveIcon() as HTMLElement);
		});
		frames(3);
		expect(rects()).toHaveLength(3);
		closeFolder(HD);
		// The opening's rectangles are gone with it.
		expect(rects()).toHaveLength(0);
		step(0);
		expect(rects()).toHaveLength(1);
		expect(rects()[0].style.width).toBe("400px");
		frames(7);
		expect(rects()).toHaveLength(0);
	});

	it("draw nothing, and never hide the window, for reduced motion", () => {
		stubMotion(true);
		renderDesktop();
		act(() => {
			fireEvent.doubleClick(driveIcon() as HTMLElement);
		});
		expect(hidden(HD)).toBe(false);
		expect(rects()).toHaveLength(0);
		closeFolder(HD);
		frames(8);
		expect(rects()).toHaveLength(0);
	});

	it("draw nothing for an open with no source rectangle", () => {
		renderDesktop();
		openHd();
		expect(hidden(HD)).toBe(false);
		expect(rects()).toHaveLength(0);
	});

	it("draw nothing for a window that is already open", () => {
		renderDesktop();
		openHd();
		act(() => {
			fireEvent.doubleClick(driveIcon() as HTMLElement);
		});
		expect(rects()).toHaveLength(0);
		expect(hidden(HD)).toBe(false);
	});

	it("zoom once each way under StrictMode", () => {
		renderDesktop(undefined, true);
		act(() => {
			fireEvent.doubleClick(driveIcon() as HTMLElement);
		});
		expect(hidden(HD)).toBe(true);
		expect(rects()).toHaveLength(1);
		frames(6);
		expect(rects()).toHaveLength(6);
		frames(1);
		expect(hidden(HD)).toBe(false);
		expect(rects()).toHaveLength(0);
		closeFolder(HD);
		step(0);
		expect(rects()).toHaveLength(1);
		frames(7);
		expect(rects()).toHaveLength(0);
	});

	it("zoom the Trash's window out of its icon from its contextual Open", () => {
		renderDesktop();
		const trash = useAppManager
			.getState()
			.System.Manager.Desktop.icons.find((i) => i.appId === "Trash");
		const open = (trash?.contextMenu as ClassicyMenuItem[] | undefined)?.find(
			(item) => item.title === "Open",
		);
		expect(open).toBeDefined();
		act(() => {
			open?.onClickFunc?.();
		});
		expect(hidden("Trash")).toBe(true);
		expect(rects()).toHaveLength(1);
		frames(7);
		expect(hidden("Trash")).toBe(false);
	});
});

describe("a press during the zoom", () => {
	it("the hidden window stays transparent and still takes the pointer", () => {
		const rule = scssRule(
			compileScss(
				"src/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
			),
			".classicyWindowZoomHidden",
		);
		expect(rule).toEqual({ opacity: "0" });
	});

	it("lands on the new window, which stays in front", () => {
		renderDesktop();
		openHd();
		const row = document.querySelector<HTMLElement>(
			`#Finder\\.app_${CSS.escape(HD)} .classicyFileBrowserViewTableRowContainer[data-classicy-drop-folder]`,
		);
		const path = row?.getAttribute("data-classicy-drop-folder") as string;
		act(() => {
			fireEvent.doubleClick(row?.closest("tr") as HTMLElement);
		});
		expect(hidden(path)).toBe(true);
		// A third click, at the spot the new window covers.
		const win = finderWindow(path) as HTMLElement;
		act(() => {
			fireEvent.mouseDown(win, { button: 0 });
			fireEvent.mouseUp(win, { button: 0 });
			fireEvent.click(win, { button: 0 });
		});
		frames(7);
		expect(hidden(path)).toBe(false);
		expect(record(path)?.focused).toBe(true);
		expect(record(HD)?.focused).toBe(false);
	});
});

describe("zoom rectangles from a Finder window", () => {
	// The window's folders: an icon in the icon view, a row in the list view.
	const firstFolder = (selector: string) =>
		document.querySelector<HTMLElement>(
			`#Finder\\.app_${CSS.escape(HD)} ${selector}[data-classicy-drop-folder]`,
		);

	const opensAndClosesBack = (open: () => string) => {
		const path = open();
		expect(hidden(path)).toBe(true);
		const first = rects()[0];
		// Opening from the icon's box (120, 140; 32 px) toward the content
		// area's (390 × 270).
		expect(Number.parseFloat(first.style.width)).toBeGreaterThan(32);
		expect(Number.parseFloat(first.style.width)).toBeLessThan(390);
		frames(7);
		expect(rects()).toHaveLength(0);
		expect(hidden(path)).toBe(false);
		// Closing it zooms back toward its icon in the parent's window.
		closeFolder(path);
		step(0);
		expect(rects()).toHaveLength(1);
		frames(7);
		expect(rects()).toHaveLength(0);
	};

	const iconView = () =>
		act(() => {
			dispatch({
				type: "ClassicyAppFinderSetFolderView",
				path: HD,
				viewType: "icons",
			});
			dispatch({ type: "ClassicyAppFinderOpenFolder", path: HD });
		});

	it("zoom a folder's window out of its icon in the icon view", () => {
		renderDesktop();
		iconView();
		opensAndClosesBack(() => {
			const folder = firstFolder(".classicyIcon");
			expect(folder).not.toBeNull();
			act(() => {
				fireEvent.doubleClick(folder as HTMLElement);
			});
			return folder?.getAttribute("data-classicy-drop-folder") as string;
		});
	});

	it("zoom from an icon-view icon opened by the keyboard (Enter)", () => {
		renderDesktop();
		iconView();
		opensAndClosesBack(() => {
			const folder = firstFolder(".classicyIcon") as HTMLElement;
			act(() => {
				fireEvent.keyDown(folder, { key: "Enter" });
			});
			return folder.getAttribute("data-classicy-drop-folder") as string;
		});
	});

	it("zoom a folder's window out of its row in the list view", () => {
		renderDesktop();
		openHd();
		opensAndClosesBack(() => {
			const folder = firstFolder(".classicyFileBrowserViewTableRowContainer");
			expect(folder).not.toBeNull();
			act(() => {
				fireEvent.doubleClick(folder?.closest("tr") as HTMLElement);
			});
			return folder?.getAttribute("data-classicy-drop-folder") as string;
		});
	});

	it("zoom from a list row opened by the keyboard (Return)", () => {
		renderDesktop();
		openHd();
		opensAndClosesBack(() => {
			const folder = firstFolder(
				".classicyFileBrowserViewTableRowContainer",
			) as HTMLElement;
			const row = folder.closest("tr") as HTMLElement;
			act(() => {
				fireEvent.mouseDown(row, { button: 0 });
				fireEvent.click(row, { button: 0 });
			});
			const list = folder.closest(
				".classicyFileBrowserViewTableContainer",
			) as HTMLElement;
			act(() => {
				fireEvent.keyDown(list, { key: "Enter" });
			});
			return folder.getAttribute("data-classicy-drop-folder") as string;
		});
	});

	it("close every window at once on Close All, zooming back only the one it was chosen from", () => {
		renderDesktop();
		openHd();
		const row = document.querySelector<HTMLElement>(
			`#Finder\\.app_${CSS.escape(HD)} .classicyFileBrowserViewTableRowContainer[data-classicy-drop-folder]`,
		);
		const path = row?.getAttribute("data-classicy-drop-folder") as string;
		act(() => {
			dispatch({ type: "ClassicyAppFinderOpenFolder", path });
		});
		expect(finderWindow(path)).not.toBeNull();
		const file = record(path)?.menuBar?.find((m) => m.title === "File");
		const closeAll = file?.menuChildren?.find(
			(item) => item.title === "Close All Windows",
		);
		expect(closeAll).toBeDefined();
		act(() => {
			closeAll?.onClickFunc?.();
		});
		expect(finderWindow(HD)).toBeNull();
		expect(finderWindow(path)).toBeNull();
		step(0);
		// One zoom, from the window it was chosen from (its box, the only
		// window box in this layout): six rectangles, not twelve.
		expect(rects()).toHaveLength(1);
		frames(6);
		expect(rects()).toHaveLength(6);
		frames(1);
		expect(rects()).toHaveLength(0);
	});
});

describe("zoom rectangles from an application's icon", () => {
	const TestApp = () => (
		<ClassicyApp id="Zoomer.app" name="Zoomer" icon="zoomer.png">
			<ClassicyWindow id="zoomer" appId="Zoomer.app" title="Zoomer" />
		</ClassicyApp>
	);
	const appIcon = () =>
		document.getElementById("Zoomer.app.shortcut") as HTMLElement;
	const appWindow = () => document.getElementById("Zoomer.app_zoomer");

	it("zoom to the whole desktop when it starts the application, drawing its window after, and not when it is running", () => {
		renderDesktop(<TestApp />);
		expect(appIcon()).not.toBeNull();
		act(() => {
			fireEvent.doubleClick(appIcon());
		});
		expect(
			useAppManager.getState().System.Manager.Applications.apps["Zoomer.app"]
				?.open,
		).toBe(true);
		// The application's window waits for the zoom, as 8.1 drew it after.
		expect(appWindow()?.classList.contains("classicyWindowZoomHidden")).toBe(
			true,
		);
		frames(6);
		const last = [...rects()].at(-1);
		expect(rects()).toHaveLength(6);
		// Toward the desktop's 800 × 600.
		expect(Number.parseFloat(last?.style.width ?? "0")).toBeGreaterThan(400);
		frames(1);
		expect(rects()).toHaveLength(0);
		expect(appWindow()?.classList.contains("classicyWindowZoomHidden")).toBe(
			false,
		);
		act(() => {
			fireEvent.doubleClick(appIcon());
		});
		expect(rects()).toHaveLength(0);
	});
});

// A floating window (story 0233-c79: an extension's window that publishes no
// menus, drawn in the desktop's floating layer) sets `pointer-events: auto`
// inline, over the layer's own `none`. No icon opens one today, but if a
// source is noted for it, its zoom must compose with that style as a
// document window's does: transparent, and still taking the pointer
// (0230-n6c's I-1), so the inline style and the hidden state agree
// (0233-c79 RR6 n3).
describe("a floating window that opens with a zoom", () => {
	// An extension's windows mount open: this one mounts on demand, so it
	// opens after its source is noted.
	let showFloater: (show: boolean) => void = () => {};
	const FloatingApp = () => {
		const [show, setShow] = useState(false);
		showFloater = setShow;
		return (
			<ClassicyApp id="Floater.app" name="Floater" icon="" extension>
				{show && (
					<ClassicyWindow
						id="f"
						appId="Floater.app"
						title="Floater"
						initialSize={[100, 60]}
						initialPosition={[10, 10]}
					>
						<p>Floater</p>
					</ClassicyWindow>
				)}
			</ClassicyApp>
		);
	};
	const floater = () => document.getElementById("Floater.app_f");

	it("is hidden by its opacity alone and takes a click during the zoom", () => {
		renderDesktop(<FloatingApp />);
		noteClassicyWindowZoomSource("Floater.app", "f", {
			rect: { left: 700, top: 40, width: 32, height: 32 },
			desktop: document.getElementById("classicyDesktop"),
		});
		act(() => {
			showFloater(true);
		});
		const win = floater() as HTMLElement;
		expect(win.parentElement?.id).toBe("classicy-floating-layer");
		expect(win.classList.contains("classicyWindowZoomHidden")).toBe(true);
		expect(rects().length).toBeGreaterThan(0);
		// The layer's window keeps the pointer while hidden: the zoom-hidden
		// rule sets only the opacity, so nothing overrides the inline style.
		expect(win.style.pointerEvents).toBe("auto");
		expect(
			scssRule(
				compileScss(
					"src/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
				),
				".classicyWindowZoomHidden",
			),
		).toEqual({ opacity: "0" });
		act(() => {
			fireEvent.mouseDown(win, { button: 0 });
			fireEvent.mouseUp(win, { button: 0 });
			fireEvent.click(win, { button: 0 });
		});
		frames(7);
		expect(rects()).toHaveLength(0);
		expect(floater()?.classList.contains("classicyWindowZoomHidden")).toBe(
			false,
		);
		const state = useAppManager.getState().System.Manager.Applications;
		expect(getAppWindow(state.apps["Floater.app"], "f")?.focused).toBe(true);
		// A floating window never takes the front application.
		expect(state.focusedAppId).not.toBe("Floater.app");
	});
});

describe("a package that has not opted in", () => {
	const NO_ZOOM = "test-no-zoom";

	beforeEach(() => {
		const base = getTheme("default");
		const { enabled: _enabled, ...zoomRects } = (
			base.measurements as Record<string, Record<string, number>>
		).zoomRects;
		registerClassicyAppearancePackage({
			id: NO_ZOOM,
			name: "No Zoom",
			css: "",
			defaults: {
				...base,
				id: "test-no-zoom-default",
				package: NO_ZOOM,
				measurements: { ...base.measurements, zoomRects },
			},
			layout: platinum.layout,
		});
	});

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
	});

	it("opens windows at once, with no rectangles and no hidden window", () => {
		renderDesktop();
		act(() => {
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: NO_ZOOM,
			});
		});
		expect(
			document
				.getElementById("classicyDesktop")
				?.getAttribute("data-classicy-appearance"),
		).toBe(NO_ZOOM);
		act(() => {
			fireEvent.doubleClick(driveIcon() as HTMLElement);
		});
		expect(finderWindow(HD)).not.toBeNull();
		expect(hidden(HD)).toBe(false);
		expect(rects()).toHaveLength(0);
		closeFolder(HD);
		frames(8);
		expect(rects()).toHaveLength(0);
	});
});

describe("under System 7", () => {
	beforeEach(async () => {
		await import("@classicy/appearance-system7");
	});

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
	});

	it("draws every step from the icon, four at a time, and the window after eleven ticks", () => {
		renderDesktop();
		act(() => {
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: "system7",
			});
		});
		act(() => {
			fireEvent.doubleClick(driveIcon() as HTMLElement);
		});
		expect(hidden(HD)).toBe(true);
		// The first is the icon's own box.
		expect(rects()[0].style.width).toBe("32px");
		const counts = [rects().length];
		for (let f = 1; f <= 11; f++) {
			frames(1);
			counts.push(rects().length);
		}
		expect(counts).toEqual([1, 1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4]);
		expect(hidden(HD)).toBe(true);
		// A tick after the last (the fake display's 16 ms frames run a little
		// ahead of 1/60 s, so it falls a frame later here).
		frames(2);
		expect(rects()).toHaveLength(0);
		expect(hidden(HD)).toBe(false);
	});
});
