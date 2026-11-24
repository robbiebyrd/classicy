import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CLASSICY_ZOOM_SOURCE_TTL_MS,
	type ClassicyZoomRect,
	type ClassicyZoomRectsSettings,
	classicyWindowContentRect,
	classicyZoomFraction,
	classicyZoomOriginForPath,
	classicyZoomOriginOf,
	computeClassicyZoomRects,
	findClassicyZoomIcon,
	noteClassicyWindowZoomSource,
	playClassicyLaunchZoom,
	playClassicyZoomRects,
	readClassicyZoomRectsSettings,
	takeClassicyWindowZoomSource,
} from "@/SystemFolder/SystemResources/Window/ClassicyZoomRects";
import {
	beginClassicyLaunchZoom,
	resetClassicyZoomSourcesForTests,
	skipClassicyWindowCloseZoom,
	takeClassicyWindowCloseZoomSkip,
	waitForClassicyLaunchZoom,
} from "@/SystemFolder/SystemResources/Window/ClassicyZoomSources.internal";

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

// The display's frames, run by hand: `frame(t)` runs every callback
// requested before it with the frame time `t`.
const stubFrames = () => {
	let next = 0;
	const queue = new Map<number, (time: number) => void>();
	vi.stubGlobal("requestAnimationFrame", (cb: (time: number) => void) => {
		next += 1;
		queue.set(next, cb);
		return next;
	});
	vi.stubGlobal("cancelAnimationFrame", (id: number) => {
		queue.delete(id);
	});
	return {
		frame: (time: number) => {
			const due = [...queue.values()];
			queue.clear();
			for (const cb of due) cb(time);
		},
		pending: () => queue.size,
	};
};

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

let frames: ReturnType<typeof stubFrames>;

beforeEach(() => {
	stubMotion(false);
	frames = stubFrames();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	resetClassicyZoomSourcesForTests();
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
	it("is off where no package opts in: enabled is not on the core floor", () => {
		expect(readClassicyZoomRectsSettings(document.body)).toBeNull();
	});

	it("reads Mac OS 8.1's path and pace from the core floor once a package opts in", () => {
		const el = document.createElement("div");
		el.style.setProperty("--zoom-rects-enabled", "1px");
		document.body.append(el);
		expect(readClassicyZoomRectsSettings(el)).toEqual(PLATINUM);
	});

	it("reads a theme's knobs, and null when the package turns the zoom off", () => {
		const el = document.createElement("div");
		el.style.setProperty("--zoom-rects-enabled", "1px");
		el.style.setProperty("--zoom-rects-first-step", "0px");
		el.style.setProperty("--zoom-rects-trail", "4px");
		document.body.append(el);
		expect(readClassicyZoomRectsSettings(el)).toEqual(SYSTEM7);
		el.style.setProperty("--zoom-rects-enabled", "0px");
		expect(readClassicyZoomRectsSettings(el)).toBeNull();
	});

	it("brings values into range", () => {
		const el = document.createElement("div");
		el.style.setProperty("--zoom-rects-enabled", "1px");
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
	const parts = (desktop: HTMLElement) =>
		desktop.querySelectorAll<HTMLElement>('[data-classicy-part="zoom-rect"]');

	it("draws one rectangle a frame at 60 Hz, keeps them all, and erases them a tick after the last", () => {
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
		// The first at once, with the window's box known, before any frame.
		expect(parts(desktop)).toHaveLength(1);
		// The frame that shows it starts the clock.
		frames.frame(1000);
		expect(parts(desktop)).toHaveLength(1);
		for (let n = 2; n <= 6; n++) {
			frames.frame(1000 + (n - 1) * TICK);
			expect(parts(desktop)).toHaveLength(n);
		}
		expect(onEnd).not.toHaveBeenCalled();
		frames.frame(1000 + 6 * TICK);
		expect(parts(desktop)).toHaveLength(0);
		expect(desktop.querySelector(".classicyZoomRects")).toBeNull();
		expect(onEnd).toHaveBeenCalledTimes(1);
		expect(frames.pending()).toBe(0);
	});

	it("draws none faster than a tick on a 120 Hz display", () => {
		const desktop = makeDesktop();
		playClassicyZoomRects({
			desktop,
			icon: ICON,
			window: CONTENT,
			direction: "open",
			settings: PLATINUM,
		});
		const counts: number[] = [];
		for (let f = 0; f <= 12; f++) {
			frames.frame(f * (1000 / 120));
			counts.push(parts(desktop).length);
		}
		// One step every other frame: 1/60 s a step, as at 60 Hz.
		expect(counts).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 0]);
	});

	it("draws one step a frame after a late frame, never skipping or bunching them", () => {
		const desktop = makeDesktop();
		const onEnd = vi.fn();
		playClassicyZoomRects({
			desktop,
			icon: ICON,
			window: CONTENT,
			direction: "open",
			settings: PLATINUM,
			onEnd,
		});
		frames.frame(0);
		frames.frame(TICK);
		expect(parts(desktop)).toHaveLength(2);
		// The page is busy for three ticks: the next frame draws one step.
		frames.frame(4 * TICK);
		expect(parts(desktop)).toHaveLength(3);
		frames.frame(5 * TICK);
		expect(parts(desktop)).toHaveLength(4);
		frames.frame(6 * TICK);
		frames.frame(7 * TICK);
		expect(parts(desktop)).toHaveLength(6);
		expect(onEnd).not.toHaveBeenCalled();
		// It ends at the next frame, two ticks later than an idle page's.
		frames.frame(8 * TICK);
		expect(onEnd).toHaveBeenCalledTimes(1);
		expect(parts(desktop)).toHaveLength(0);
	});

	it("keeps a trail of four under System 7.5, erasing each older one", () => {
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
		frames.frame(0);
		const counts = [parts(desktop).length];
		for (let i = 1; i < 11; i++) {
			frames.frame(i * TICK);
			counts.push(parts(desktop).length);
		}
		expect(counts).toEqual([1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 4]);
		// The newest four, the oldest erased.
		const widths = [...parts(desktop)].map((el) => rectOf(el).width);
		expect(widths).toEqual(
			computeClassicyZoomRects(ICON, CONTENT, "open", SYSTEM7)
				.slice(7)
				.map((r) => r.width),
		);
		frames.frame(11 * TICK);
		expect(onEnd).toHaveBeenCalledTimes(1);
		expect(desktop.querySelector(".classicyZoomRects")).toBeNull();
	});

	it("paces by a timer at its rate where the page has no display frames", () => {
		vi.stubGlobal("requestAnimationFrame", undefined);
		vi.useFakeTimers({
			toFake: ["setTimeout", "clearTimeout", "performance", "Date"],
		});
		const desktop = makeDesktop();
		const onEnd = vi.fn();
		playClassicyZoomRects({
			desktop,
			icon: ICON,
			window: CONTENT,
			direction: "open",
			settings: PLATINUM,
			onEnd,
		});
		vi.advanceTimersByTime(TICK + 1);
		expect(parts(desktop)).toHaveLength(1);
		vi.advanceTimersByTime(5 * TICK);
		expect(parts(desktop)).toHaveLength(6);
		vi.advanceTimersByTime(TICK);
		expect(onEnd).toHaveBeenCalledTimes(1);
	});

	it("places the rectangles on the desktop and publishes the desktop's corner for the pattern", () => {
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
		desktop.style.setProperty("--zoom-rects-enabled", "1px");
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

	it("draws nothing on a hidden page, where no frame would come", () => {
		const desktop = makeDesktop();
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
		expect(
			playClassicyZoomRects({
				desktop,
				icon: ICON,
				window: CONTENT,
				direction: "open",
				settings: PLATINUM,
			}),
		).toBeNull();
		expect(desktop.childElementCount).toBe(0);
	});

	it("draws nothing for a package that has not opted in, or a box with no size", () => {
		const desktop = makeDesktop();
		expect(
			playClassicyZoomRects({
				desktop,
				icon: ICON,
				window: CONTENT,
				direction: "open",
			}),
		).toBeNull();
		desktop.style.setProperty("--zoom-rects-enabled", "1px");
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

	it("is ended by cancel, with no onEnd and no frame left", () => {
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
		frames.frame(0);
		zoom?.cancel();
		expect(desktop.childElementCount).toBe(0);
		expect(frames.pending()).toBe(0);
		frames.frame(1000);
		expect(onEnd).not.toHaveBeenCalled();
	});
});

describe("playClassicyLaunchZoom", () => {
	it("zooms from the icon out to the whole desktop", () => {
		const desktop = makeDesktop();
		desktop.style.setProperty("--zoom-rects-enabled", "1px");
		const zoom = playClassicyLaunchZoom({ rect: ICON, desktop });
		expect(zoom).not.toBeNull();
		for (let f = 0; f <= 5; f++) frames.frame(f * TICK);
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

	it("holds the launched applications' windows until it ends", () => {
		const desktop = makeDesktop();
		desktop.style.setProperty("--zoom-rects-enabled", "1px");
		playClassicyLaunchZoom({ rect: ICON, desktop }, ["Zoomer.app"]);
		const woken = vi.fn();
		expect(waitForClassicyLaunchZoom("Other.app", woken)).toBeNull();
		expect(waitForClassicyLaunchZoom("Zoomer.app", woken)).not.toBeNull();
		for (let f = 0; f <= 5; f++) frames.frame(f * TICK);
		expect(woken).not.toHaveBeenCalled();
		frames.frame(6 * TICK);
		expect(woken).toHaveBeenCalledTimes(1);
		expect(waitForClassicyLaunchZoom("Zoomer.app", woken)).toBeNull();
	});

	it("draws nothing, and holds no window, with no origin, no desktop or no opt-in", () => {
		expect(playClassicyLaunchZoom(undefined, ["A.app"])).toBeNull();
		expect(playClassicyLaunchZoom({ rect: ICON, desktop: null })).toBeNull();
		const desktop = makeDesktop();
		expect(
			playClassicyLaunchZoom({ rect: ICON, desktop }, ["A.app"]),
		).toBeNull();
		expect(waitForClassicyLaunchZoom("A.app", vi.fn())).toBeNull();
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

	it("skips a window's close zoom once, within the time a source waits", () => {
		vi.useFakeTimers();
		skipClassicyWindowCloseZoom("Finder.app", "HD:Docs");
		expect(takeClassicyWindowCloseZoomSkip("Finder.app", "HD:Other")).toBe(
			false,
		);
		expect(takeClassicyWindowCloseZoomSkip("Finder.app", "HD:Docs")).toBe(true);
		expect(takeClassicyWindowCloseZoomSkip("Finder.app", "HD:Docs")).toBe(
			false,
		);
		skipClassicyWindowCloseZoom("Finder.app", "HD:Docs");
		vi.advanceTimersByTime(CLASSICY_ZOOM_SOURCE_TTL_MS + 1);
		expect(takeClassicyWindowCloseZoomSkip("Finder.app", "HD:Docs")).toBe(
			false,
		);
	});

	it("wakes every window waiting on a launch once, and stops waiting on request", () => {
		const end = beginClassicyLaunchZoom(["A.app"]);
		const first = vi.fn();
		const second = vi.fn();
		waitForClassicyLaunchZoom("A.app", first);
		const stop = waitForClassicyLaunchZoom("A.app", second);
		stop?.();
		end();
		end();
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
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

	it("opens a window into its content area: header, contents and scroll bars, inside the frame", () => {
		// The 8.1 Developer window (Infinite Mac): frame [40,68,427,255),
		// title bar to y 89, the content region the rectangles ended at
		// [45,89,421,249): the header ("27 items") and the contents with
		// their scroll bars.
		const win = document.createElement("div");
		const part = (cls: string, rect: DOMRect) => {
			const el = document.createElement("div");
			el.className = cls;
			win.append(el);
			vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rect);
			return el;
		};
		part("classicyWindowTitleBar", box(41, 69, 385, 20));
		part("classicyWindowHeader", box(45, 89, 376, 12));
		part("classicyWindowContents", box(45, 101, 376, 148));
		part("classicyWindowResizer", box(405, 233, 16, 16));
		document.body.append(win);
		vi.spyOn(win, "getBoundingClientRect").mockReturnValue(
			box(40, 68, 387, 187),
		);
		expect(classicyWindowContentRect(win)).toEqual(CONTENT);
	});

	it("falls back to the inside of the border below the title bar", () => {
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
