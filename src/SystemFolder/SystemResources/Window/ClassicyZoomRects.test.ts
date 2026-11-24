import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CLASSICY_ZOOM_SOURCE_TTL_MS,
	type ClassicyZoomRect,
	type ClassicyZoomRectsSettings,
	classicyWindowContentRect,
	classicyZoomFraction,
	classicyZoomOriginForPath,
	classicyZoomOriginOf,
	clearClassicyWindowZoomSources,
	computeClassicyZoomRects,
	findClassicyZoomIcon,
	noteClassicyWindowZoomSource,
	playClassicyLaunchZoom,
	playClassicyZoomRects,
	readClassicyZoomRectsSettings,
	takeClassicyWindowZoomSource,
} from "@/SystemFolder/SystemResources/Window/ClassicyZoomRects";

// Mac OS 8.1's zoom (the core floor's and Platinum's knobs) and System 7.5's.
const PLATINUM: ClassicyZoomRectsSettings = {
	steps: 11,
	growth: 1.4,
	firstStep: 5,
	trail: 0,
	rate: 60,
};
const SYSTEM7: ClassicyZoomRectsSettings = {
	...PLATINUM,
	firstStep: 0,
	trail: 4,
};
const TICK = 1000 / 60;

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

const rectOf = (el: HTMLElement): ClassicyZoomRect => ({
	left: Number.parseFloat(el.style.left),
	top: Number.parseFloat(el.style.top),
	width: Number.parseFloat(el.style.width),
	height: Number.parseFloat(el.style.height),
});

const stubMotion = (reduce: boolean) =>
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			matches: reduce && query === "(prefers-reduced-motion: reduce)",
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);

const makeDesktop = () => {
	const desktop = document.createElement("div");
	desktop.className = "classicyDesktop";
	document.body.append(desktop);
	vi.spyOn(desktop, "getBoundingClientRect").mockReturnValue(
		box(0, 0, 640, 480),
	);
	return desktop;
};

// The Developer folder in the Infinite HD window (Infinite Mac): System
// 7.5's first rectangle (the icon's box) and the window's content box the
// rectangles of both systems end at.
const ICON: ClassicyZoomRect = { left: 209, top: 98, width: 39, height: 34 };
const CONTENT: ClassicyZoomRect = {
	left: 45,
	top: 89,
	width: 376,
	height: 160,
};

beforeEach(() => {
	stubMotion(false);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	clearClassicyWindowZoomSources();
	document.body.replaceChildren();
});

describe("the zoom path", () => {
	it("makes each step 1.4 times the last, from the icon (0) to the window (1)", () => {
		expect(classicyZoomFraction(0, 11, 1.4)).toBe(0);
		expect(classicyZoomFraction(11, 11, 1.4)).toBeCloseTo(1);
		const steps = Array.from(
			{ length: 11 },
			(_, k) =>
				classicyZoomFraction(k + 1, 11, 1.4) - classicyZoomFraction(k, 11, 1.4),
		);
		for (let k = 1; k < steps.length; k++)
			expect(steps[k] / steps[k - 1]).toBeCloseTo(1.4);
		expect(classicyZoomFraction(3, 6, 1)).toBe(0.5);
	});

	it("draws Mac OS 8.1's six rectangles nearest the window, as measured", () => {
		const rects = computeClassicyZoomRects(ICON, CONTENT, "open", PLATINUM);
		// Infinite Mac, Mac OS 8.1: the six rectangles from Developer's icon
		// (left, top, right, bottom; right and bottom exclusive).
		const measured = [
			[191, 98, 268, 147],
			[182, 97, 278, 153],
			[170, 97, 291, 161],
			[152, 96, 309, 174],
			[128, 94, 334, 191],
			[94, 93, 370, 215],
		];
		expect(rects).toHaveLength(6);
		rects.forEach((r, i) => {
			const [left, top, right, bottom] = measured[i];
			expect(Math.abs(r.left - left)).toBeLessThanOrEqual(2);
			expect(Math.abs(r.top - top)).toBeLessThanOrEqual(2);
			expect(Math.abs(r.left + r.width - right)).toBeLessThanOrEqual(2);
			expect(Math.abs(r.top + r.height - bottom)).toBeLessThanOrEqual(2);
		});
	});

	it("draws every step from the icon under System 7.5", () => {
		const rects = computeClassicyZoomRects(ICON, CONTENT, "open", SYSTEM7);
		expect(rects).toHaveLength(11);
		expect(rects[0]).toEqual(ICON);
		// 7.5's widths, each measured in Infinite Mac: 39, 43, 47, 55, 64, 75,
		// 95, 119, 156, 205, 275.
		const widths = [39, 43, 47, 55, 64, 75, 95, 119, 156, 205, 275];
		rects.forEach((r, i) => {
			expect(Math.abs(r.width - widths[i])).toBeLessThanOrEqual(2);
		});
	});

	it("closes from the window's box back toward the icon, the same steps reversed", () => {
		const frame = { left: 40, top: 68, width: 387, height: 187 };
		const rects = computeClassicyZoomRects(ICON, frame, "close", PLATINUM);
		expect(rects).toHaveLength(6);
		expect(rects[0]).toEqual(frame);
		// Mac OS 8.1's second and last closing rectangles' left edges: 89, 181.
		expect(Math.abs(rects[1].left - 89)).toBeLessThanOrEqual(2);
		expect(Math.abs(rects[5].left - 181)).toBeLessThanOrEqual(2);
		for (let i = 1; i < rects.length; i++)
			expect(rects[i].width).toBeLessThan(rects[i - 1].width);
	});
});

describe("readClassicyZoomRectsSettings", () => {
	it("reads Mac OS 8.1's zoom from the core floor where no theme sets one", () => {
		expect(readClassicyZoomRectsSettings(document.body)).toEqual(PLATINUM);
	});

	it("reads a theme's knobs, and null when the package turns the zoom off", () => {
		const el = document.createElement("div");
		el.style.setProperty("--zoom-rects-first-step", "0px");
		el.style.setProperty("--zoom-rects-trail", "4px");
		document.body.append(el);
		expect(readClassicyZoomRectsSettings(el)).toEqual(SYSTEM7);
		el.style.setProperty("--zoom-rects-enabled", "0px");
		expect(readClassicyZoomRectsSettings(el)).toBeNull();
	});

	it("brings values into range", () => {
		const el = document.createElement("div");
		el.style.setProperty("--zoom-rects-steps", "500px");
		el.style.setProperty("--zoom-rects-first-step", "900px");
		el.style.setProperty("--zoom-rects-rate", "1000px");
		document.body.append(el);
		expect(readClassicyZoomRectsSettings(el)).toMatchObject({
			steps: 64,
			firstStep: 63,
			rate: 240,
		});
	});
});

describe("playClassicyZoomRects", () => {
	it("draws one rectangle a tick, keeps them all, and erases them a tick after the last", () => {
		vi.useFakeTimers();
		const desktop = makeDesktop();
		const onEnd = vi.fn();
		const zoom = playClassicyZoomRects({
			desktop,
			icon: ICON,
			window: CONTENT,
			direction: "open",
			settings: PLATINUM,
			onEnd,
		});
		expect(zoom?.durationMs).toBeCloseTo(6 * TICK);
		const parts = () =>
			desktop.querySelectorAll<HTMLElement>('[data-classicy-part="zoom-rect"]');
		// The first at once, before any timer.
		expect(parts()).toHaveLength(1);
		for (let n = 2; n <= 6; n++) {
			vi.advanceTimersByTime(TICK);
			expect(parts()).toHaveLength(n);
		}
		expect(onEnd).not.toHaveBeenCalled();
		vi.advanceTimersByTime(TICK);
		expect(parts()).toHaveLength(0);
		expect(desktop.querySelector(".classicyZoomRects")).toBeNull();
		expect(onEnd).toHaveBeenCalledTimes(1);
	});

	it("keeps a trail of four under System 7.5, erasing each older one", () => {
		vi.useFakeTimers();
		const desktop = makeDesktop();
		const onEnd = vi.fn();
		playClassicyZoomRects({
			desktop,
			icon: ICON,
			window: CONTENT,
			direction: "open",
			settings: SYSTEM7,
			onEnd,
		});
		const counts = [
			desktop.querySelectorAll('[data-classicy-part="zoom-rect"]').length,
		];
		for (let i = 1; i < 11; i++) {
			vi.advanceTimersByTime(TICK);
			counts.push(
				desktop.querySelectorAll('[data-classicy-part="zoom-rect"]').length,
			);
		}
		expect(counts).toEqual([1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4]);
		// The newest four, the oldest erased.
		const widths = [
			...desktop.querySelectorAll<HTMLElement>(
				'[data-classicy-part="zoom-rect"]',
			),
		].map((el) => rectOf(el).width);
		expect(widths).toEqual(
			computeClassicyZoomRects(ICON, CONTENT, "open", SYSTEM7)
				.slice(7)
				.map((r) => r.width),
		);
		vi.advanceTimersByTime(TICK);
		expect(onEnd).toHaveBeenCalledTimes(1);
		expect(desktop.querySelector(".classicyZoomRects")).toBeNull();
	});

	it("places the rectangles on the desktop and publishes the desktop's corner for the pattern", () => {
		vi.useFakeTimers();
		const desktop = makeDesktop();
		vi.spyOn(desktop, "getBoundingClientRect").mockReturnValue(
			box(100, 50, 640, 480),
		);
		playClassicyZoomRects({
			desktop,
			icon: { left: 300, top: 150, width: 32, height: 32 },
			window: { left: 120, top: 80, width: 400, height: 300 },
			direction: "close",
			settings: PLATINUM,
		});
		const first = desktop.querySelector<HTMLElement>(
			'[data-classicy-part="zoom-rect"]',
		);
		expect(first?.className).toBe("classicyZoomRect");
		expect(first && rectOf(first)).toEqual({
			left: 20,
			top: 30,
			width: 400,
			height: 300,
		});
		expect(first?.style.getPropertyValue("--classicy-pattern-origin-x")).toBe(
			"-20px",
		);
		expect(first?.style.getPropertyValue("--classicy-pattern-origin-y")).toBe(
			"-30px",
		);
		expect(
			desktop.querySelector(".classicyZoomRects")?.getAttribute("aria-hidden"),
		).toBe("true");
	});

	it("draws nothing for a user who prefers reduced motion", () => {
		stubMotion(true);
		const desktop = makeDesktop();
		const onEnd = vi.fn();
		const zoom = playClassicyZoomRects({
			desktop,
			icon: ICON,
			window: CONTENT,
			direction: "open",
			onEnd,
		});
		expect(zoom).toBeNull();
		expect(desktop.childElementCount).toBe(0);
		expect(onEnd).not.toHaveBeenCalled();
	});

	it("draws nothing when the package turns it off, or a box has no size", () => {
		const desktop = makeDesktop();
		desktop.style.setProperty("--zoom-rects-enabled", "0px");
		expect(
			playClassicyZoomRects({
				desktop,
				icon: ICON,
				window: CONTENT,
				direction: "open",
			}),
		).toBeNull();
		desktop.style.removeProperty("--zoom-rects-enabled");
		expect(
			playClassicyZoomRects({
				desktop,
				icon: { left: 0, top: 0, width: 0, height: 0 },
				window: CONTENT,
				direction: "open",
			}),
		).toBeNull();
		expect(desktop.childElementCount).toBe(0);
	});

	it("is ended by cancel, with no onEnd", () => {
		vi.useFakeTimers();
		const desktop = makeDesktop();
		const onEnd = vi.fn();
		const zoom = playClassicyZoomRects({
			desktop,
			icon: ICON,
			window: CONTENT,
			direction: "open",
			settings: PLATINUM,
			onEnd,
		});
		zoom?.cancel();
		expect(desktop.childElementCount).toBe(0);
		vi.advanceTimersByTime(1000);
		expect(onEnd).not.toHaveBeenCalled();
	});
});

describe("playClassicyLaunchZoom", () => {
	it("zooms from the icon out to the whole desktop", () => {
		vi.useFakeTimers();
		const desktop = makeDesktop();
		const zoom = playClassicyLaunchZoom({ rect: ICON, desktop });
		expect(zoom).not.toBeNull();
		for (let i = 0; i < 5; i++) vi.advanceTimersByTime(TICK);
		const rects = [
			...desktop.querySelectorAll<HTMLElement>(
				'[data-classicy-part="zoom-rect"]',
			),
		].map(rectOf);
		expect(rects).toEqual(
			computeClassicyZoomRects(
				ICON,
				{ left: 0, top: 0, width: 640, height: 480 },
				"open",
				PLATINUM,
			),
		);
	});

	it("draws nothing with no origin or no desktop", () => {
		expect(playClassicyLaunchZoom(undefined)).toBeNull();
		expect(playClassicyLaunchZoom({ rect: ICON, desktop: null })).toBeNull();
	});
});

describe("the open's source", () => {
	it("is taken once, by the window it names", () => {
		const origin = { rect: ICON, desktop: null };
		noteClassicyWindowZoomSource("Finder.app", "HD:Docs", origin);
		expect(
			takeClassicyWindowZoomSource("Finder.app", "HD:Other"),
		).toBeUndefined();
		expect(takeClassicyWindowZoomSource("Finder.app", "HD:Docs")).toBe(origin);
		expect(
			takeClassicyWindowZoomSource("Finder.app", "HD:Docs"),
		).toBeUndefined();
	});

	it("goes stale after CLASSICY_ZOOM_SOURCE_TTL_MS", () => {
		vi.useFakeTimers();
		noteClassicyWindowZoomSource("Finder.app", "HD:Docs", {
			rect: ICON,
			desktop: null,
		});
		vi.advanceTimersByTime(CLASSICY_ZOOM_SOURCE_TTL_MS + 1);
		expect(
			takeClassicyWindowZoomSource("Finder.app", "HD:Docs"),
		).toBeUndefined();
	});

	it("records nothing for no origin", () => {
		noteClassicyWindowZoomSource("Finder.app", "HD:Docs", undefined);
		expect(
			takeClassicyWindowZoomSource("Finder.app", "HD:Docs"),
		).toBeUndefined();
	});
});

describe("icons and windows", () => {
	const icon = (
		parent: Element,
		cls: string,
		attr: string,
		path: string,
		rect: DOMRect,
	) => {
		const el = document.createElement("div");
		el.className = cls;
		el.setAttribute(attr, path);
		const img = document.createElement("img");
		el.append(img);
		parent.append(el);
		vi.spyOn(img, "getBoundingClientRect").mockReturnValue(rect);
		return el;
	};

	it("takes an icon's image box, and the desktop it is on", () => {
		const desktop = makeDesktop();
		const el = icon(
			desktop,
			"classicyIcon",
			"data-classicy-file-path",
			"HD:Docs",
			box(10, 20, 32, 32),
		);
		expect(classicyZoomOriginOf(el)).toEqual({
			rect: { left: 10, top: 20, width: 32, height: 32 },
			desktop,
		});
		expect(classicyZoomOriginOf(null)).toBeUndefined();
	});

	it("finds a folder's icon, else the nearest enclosing one that shows", () => {
		const desktop = makeDesktop();
		const win = document.createElement("div");
		win.className = "classicyWindow";
		desktop.append(win);
		vi.spyOn(win, "getBoundingClientRect").mockReturnValue(box(0, 0, 300, 200));
		icon(
			desktop,
			"classicyDesktopIcon",
			"data-classicy-drop-folder",
			"HD",
			box(580, 40, 32, 32),
		);
		// Scrolled out of its window's box: it does not show.
		icon(
			win,
			"classicyIcon",
			"data-classicy-file-path",
			"HD:Docs",
			box(100, 400, 32, 32),
		);
		icon(
			win,
			"classicyFileBrowserViewTableRowContainer",
			"data-classicy-file-path",
			"HD:Docs:Letters",
			box(20, 60, 16, 16),
		);
		expect(findClassicyZoomIcon(desktop, "HD:Docs:Letters")?.rect.left).toBe(
			20,
		);
		expect(findClassicyZoomIcon(desktop, "HD:Docs:Bills")?.rect.left).toBe(580);
		expect(findClassicyZoomIcon(desktop, "HD:Docs")?.rect.left).toBe(580);
		expect(findClassicyZoomIcon(desktop, "Other:Thing")).toBeUndefined();
		expect(classicyZoomOriginForPath(win, "HD")).toBeUndefined();
	});

	it("opens a window into its content, below the title bar and inside the frame", () => {
		const win = document.createElement("div");
		const bar = document.createElement("div");
		bar.className = "classicyWindowTitleBar";
		win.append(bar);
		document.body.append(win);
		vi.spyOn(win, "getBoundingClientRect").mockReturnValue(
			box(40, 68, 387, 187),
		);
		vi.spyOn(bar, "getBoundingClientRect").mockReturnValue(
			box(41, 69, 385, 20),
		);
		Object.defineProperties(win, {
			clientLeft: { value: 1 },
			clientTop: { value: 1 },
			clientWidth: { value: 385 },
			clientHeight: { value: 185 },
		});
		expect(classicyWindowContentRect(win)).toEqual({
			left: 41,
			top: 89,
			width: 385,
			height: 165,
		});
	});
});
