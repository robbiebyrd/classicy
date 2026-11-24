// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { clearClassicyWindowZoomSources } from "@/SystemFolder/SystemResources/Window/ClassicyZoomRects";

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

const TICK = 1000 / 60;
const HD = "Macintosh HD";

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
// (50, 60), an icon in a window 32 px at (120, 140), and any other icon
// 32 px at (700, 40).
const stubLayout = () => {
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
		function (this: Element) {
			if (this.id === "classicyDesktop") return box(0, 0, 800, 600);
			if (this.classList.contains("classicyWindow"))
				return box(50, 60, 400, 300);
			if (this.closest(".classicyWindow")) return box(120, 140, 32, 32);
			return box(700, 40, 32, 32);
		},
	);
	const windowOnly = (value: number) =>
		function (this: Element) {
			return this.classList.contains("classicyWindow") ? value : 0;
		};
	vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
		windowOnly(398),
	);
	vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
		windowOnly(298),
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

beforeEach(() => {
	localStorage.clear();
	clearClassicyWindowZoomSources();
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
	stubMotion(false);
	stubLayout();
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
});

const renderDesktop = (children?: React.ReactNode) =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop controlStrip={false}>{children}</ClassicyDesktop>
		</ClassicyAppManagerProvider>,
	);

const rects = () =>
	document.querySelectorAll<HTMLElement>('[data-classicy-part="zoom-rect"]');
const finderWindow = (path: string) =>
	document.getElementById(`Finder.app_${path}`);
const driveIcon = () =>
	document.querySelector<HTMLElement>(
		`.classicyDesktopIcon[data-classicy-drop-folder="${HD}"]`,
	);
const step = (ms: number) =>
	act(() => {
		vi.advanceTimersByTime(ms);
	});

describe("zoom rectangles from a desktop icon", () => {
	it("zoom a drive's window out of its icon, and draw the window when they end", () => {
		renderDesktop();
		const icon = driveIcon();
		expect(icon).not.toBeNull();
		act(() => {
			fireEvent.doubleClick(icon as HTMLElement);
		});
		const win = finderWindow(HD);
		expect(win).not.toBeNull();
		// Laid out but not drawn while the rectangles run (Platinum: six,
		// one a tick, from the icon toward the window).
		expect(win?.classList.contains("classicyWindowZoomHidden")).toBe(true);
		expect(rects()).toHaveLength(1);
		step(5 * TICK);
		expect(rects()).toHaveLength(6);
		expect(win?.classList.contains("classicyWindowZoomHidden")).toBe(true);
		step(TICK);
		expect(rects()).toHaveLength(0);
		expect(
			finderWindow(HD)?.classList.contains("classicyWindowZoomHidden"),
		).toBe(false);
	});

	it("zoom back to the icon when the window closes, from the window's box", () => {
		renderDesktop();
		act(() => {
			dispatch({ type: "ClassicyAppFinderOpenFolder", path: HD });
		});
		expect(finderWindow(HD)).not.toBeNull();
		expect(rects()).toHaveLength(0);
		act(() => {
			dispatch({ type: "ClassicyAppFinderCloseFolder", path: HD });
		});
		expect(finderWindow(HD)).toBeNull();
		step(0);
		expect(rects()).toHaveLength(1);
		const first = rects()[0];
		expect([first.style.left, first.style.top, first.style.width]).toEqual([
			"50px",
			"60px",
			"400px",
		]);
		step(5 * TICK);
		const widths = [...rects()].map((el) => Number.parseFloat(el.style.width));
		expect(widths).toHaveLength(6);
		for (let i = 1; i < widths.length; i++)
			expect(widths[i]).toBeLessThan(widths[i - 1]);
		step(TICK);
		expect(rects()).toHaveLength(0);
	});

	it("draw nothing, and never hide the window, for reduced motion", () => {
		stubMotion(true);
		renderDesktop();
		act(() => {
			fireEvent.doubleClick(driveIcon() as HTMLElement);
		});
		expect(
			finderWindow(HD)?.classList.contains("classicyWindowZoomHidden"),
		).toBe(false);
		expect(rects()).toHaveLength(0);
		act(() => {
			dispatch({ type: "ClassicyAppFinderCloseFolder", path: HD });
		});
		step(100);
		expect(rects()).toHaveLength(0);
	});

	it("draw nothing for an open with no source rectangle", () => {
		renderDesktop();
		act(() => {
			dispatch({ type: "ClassicyAppFinderOpenFolder", path: HD });
		});
		expect(
			finderWindow(HD)?.classList.contains("classicyWindowZoomHidden"),
		).toBe(false);
		expect(rects()).toHaveLength(0);
	});

	it("draw nothing for a window that is already open", () => {
		renderDesktop();
		act(() => {
			dispatch({ type: "ClassicyAppFinderOpenFolder", path: HD });
		});
		act(() => {
			fireEvent.doubleClick(driveIcon() as HTMLElement);
		});
		expect(rects()).toHaveLength(0);
		expect(
			finderWindow(HD)?.classList.contains("classicyWindowZoomHidden"),
		).toBe(false);
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
		expect(
			finderWindow(path)?.classList.contains("classicyWindowZoomHidden"),
		).toBe(true);
		const first = rects()[0];
		// Opening from the icon's box (120, 140; 32 px) toward the window's.
		expect(Number.parseFloat(first.style.width)).toBeGreaterThan(32);
		expect(Number.parseFloat(first.style.width)).toBeLessThan(398);
		step(6 * TICK);
		expect(rects()).toHaveLength(0);
		expect(
			finderWindow(path)?.classList.contains("classicyWindowZoomHidden"),
		).toBe(false);
		// Closing it zooms back toward its icon in the parent's window.
		act(() => {
			dispatch({ type: "ClassicyAppFinderCloseFolder", path });
		});
		step(0);
		expect(rects()).toHaveLength(1);
		step(6 * TICK);
		expect(rects()).toHaveLength(0);
	};

	it("zoom a folder's window out of its icon in the icon view", () => {
		renderDesktop();
		act(() => {
			dispatch({
				type: "ClassicyAppFinderSetFolderView",
				path: HD,
				viewType: "icons",
			});
			dispatch({ type: "ClassicyAppFinderOpenFolder", path: HD });
		});
		opensAndClosesBack(() => {
			const folder = firstFolder(".classicyIcon");
			expect(folder).not.toBeNull();
			act(() => {
				fireEvent.doubleClick(folder as HTMLElement);
			});
			return folder?.getAttribute("data-classicy-drop-folder") as string;
		});
	});

	it("zoom a folder's window out of its row in the list view", () => {
		renderDesktop();
		act(() => {
			dispatch({ type: "ClassicyAppFinderOpenFolder", path: HD });
		});
		opensAndClosesBack(() => {
			const folder = firstFolder(".classicyFileBrowserViewTableRowContainer");
			expect(folder).not.toBeNull();
			act(() => {
				fireEvent.doubleClick(folder?.closest("tr") as HTMLElement);
			});
			return folder?.getAttribute("data-classicy-drop-folder") as string;
		});
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

	it("zoom to the whole desktop when it starts the application, and not when it is running", () => {
		renderDesktop(<TestApp />);
		expect(appIcon()).not.toBeNull();
		act(() => {
			fireEvent.doubleClick(appIcon());
		});
		expect(
			useAppManager.getState().System.Manager.Applications.apps["Zoomer.app"]
				?.open,
		).toBe(true);
		step(5 * TICK);
		const last = [...rects()].at(-1);
		expect(rects()).toHaveLength(6);
		// Toward the desktop's 800 × 600.
		expect(Number.parseFloat(last?.style.width ?? "0")).toBeGreaterThan(400);
		step(TICK);
		expect(rects()).toHaveLength(0);
		act(() => {
			fireEvent.doubleClick(appIcon());
		});
		expect(rects()).toHaveLength(0);
	});
});
