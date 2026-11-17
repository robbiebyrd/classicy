import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { stubClassicyClientRects } from "@/__tests__/withClientRects";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
// The test package's defaults name Platinum's sound pack, which a package
// registration requires to be registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyScrollArea } from "./ClassicyScrollArea";
import {
	CLASSICY_SCROLL_ORIGIN_X,
	CLASSICY_SCROLL_ORIGIN_Y,
	classicyWindowContentOrigin,
	publishClassicyScrollPatternOrigin,
	useClassicyScrollPatternOrigin,
} from "./ClassicyScrollPatternOrigin.internal";

// Story 0217-etx: a package that declares `scrollBar.patternOrigin:
// "window"` (System 7) lays its track pattern from the window's content
// origin, as QuickDraw laid a pattern from the window's port: the core
// publishes where that origin lies from each bar's and track's corner.

const place = (el: Element, x: number, y: number, w = 10, h = 10) =>
	vi
		.spyOn(el, "getBoundingClientRect")
		.mockReturnValue(DOMRect.fromRect({ x, y, width: w, height: h }));

/** A window frame at (40, 40) with a 1 px border and a 19 px title bar
 * whose bottom is y 59, holding a bar and its track. */
const windowWithBar = () => {
	document.body.innerHTML = `
<div class="classicyDesktop">
  <div class="classicyWindow" id="win">
    <div class="classicyWindowTitleBar" id="title"></div>
    <div class="classicyScrollBar" id="bar"><div class="classicyScrollBarTrack" id="track"></div></div>
  </div>
</div>`;
	const el = (id: string) => document.getElementById(id) as HTMLElement;
	place(el("win"), 40, 40, 400, 300);
	Object.defineProperty(el("win"), "clientLeft", { value: 1 });
	Object.defineProperty(el("win"), "clientTop", { value: 1 });
	place(el("title"), 41, 41, 398, 18);
	Object.defineProperty(el("title"), "getClientRects", {
		configurable: true,
		value: () =>
			[
				DOMRect.fromRect({ x: 41, y: 41, width: 398, height: 18 }),
			] as unknown as DOMRectList,
	});
	return { win: el("win"), bar: el("bar"), track: el("track") };
};

const published = (el: HTMLElement) => [
	el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_X),
	el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_Y),
];

describe("classicyWindowContentOrigin", () => {
	beforeEach(() => stubClassicyClientRects());
	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	it("is inside the window's frame, under its title bar", () => {
		const { bar } = windowWithBar();
		expect(classicyWindowContentOrigin(bar)).toEqual({ x: 41, y: 59 });
	});

	it("is inside the frame's top when the title bar is not drawn (a fixed modal)", () => {
		const { bar } = windowWithBar();
		vi.spyOn(
			document.getElementById("title") as HTMLElement,
			"getClientRects",
		).mockReturnValue([] as unknown as DOMRectList);
		expect(classicyWindowContentOrigin(bar)).toEqual({ x: 41, y: 41 });
	});

	it("is the desktop's corner outside a window", () => {
		document.body.innerHTML = `<div class="classicyDesktop" id="desk"><div id="bar"></div></div>`;
		place(document.getElementById("desk") as HTMLElement, 5, 7);
		expect(
			classicyWindowContentOrigin(document.getElementById("bar") as Element),
		).toEqual({ x: 5, y: 7 });
	});
});

describe("publishClassicyScrollPatternOrigin", () => {
	beforeEach(() => stubClassicyClientRects());
	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	it("publishes the origin from the bar's and the track's corners, in whole pixels", () => {
		const { bar, track } = windowWithBar();
		// A vertical bar at x 238, its track 16 px down, 1 px inside it.
		place(bar, 237, 99, 16, 100);
		Object.defineProperty(bar, "clientLeft", { value: 1 });
		Object.defineProperty(bar, "clientTop", { value: 1 });
		place(track, 238, 115, 14, 60);
		publishClassicyScrollPatternOrigin(bar, track);
		expect(published(bar)).toEqual(["-197px", "-41px"]);
		expect(published(track)).toEqual(["-197px", "-56px"]);
	});

	it("measures the same before and after the scroll area's snap nudge", () => {
		const { bar, track } = windowWithBar();
		// Laid out half a pixel low, then nudged onto the grid by the scroll
		// area (`--classicy-scroll-snap-y`).
		place(bar, 237, 99.4, 16, 100);
		place(track, 237, 115.4, 16, 60);
		publishClassicyScrollPatternOrigin(bar, track);
		const before = [published(bar), published(track)];
		bar.style.setProperty("--classicy-scroll-snap-y", "-0.4px");
		place(bar, 237, 99, 16, 100);
		place(track, 237, 115, 16, 60);
		publishClassicyScrollPatternOrigin(bar, track);
		expect([published(bar), published(track)]).toEqual(before);
		expect(published(track)).toEqual(["-196px", "-56px"]);
	});
});

// Review M-4: a bar can move against its window's content origin with no
// element between them resizing. Each case moves the bar 3 px right and
// 2 px down, then raises only the signal that case gives.
describe("useClassicyScrollPatternOrigin republishes", () => {
	beforeEach(() => stubClassicyClientRects());
	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	const track = (bar: HTMLElement) => {
		place(bar, 237, 99, 16, 100);
		renderHook(() =>
			useClassicyScrollPatternOrigin({ current: bar }, { current: null }, true),
		);
		expect(published(bar)).toEqual(["-196px", "-40px"]);
		place(bar, 240, 101, 16, 100);
	};
	const moved = ["-199px", "-42px"];

	it("when content is inserted above the bar inside the window (no resize)", async () => {
		const { win, bar } = windowWithBar();
		track(bar);
		win.insertBefore(document.createElement("p"), bar);
		await vi.waitFor(() => expect(published(bar)).toEqual(moved));
	});

	it("when a class or style inside the window changes", async () => {
		const { win, bar } = windowWithBar();
		track(bar);
		(win.querySelector("#title") as HTMLElement).classList.add("taller");
		await vi.waitFor(() => expect(published(bar)).toEqual(moved));
	});

	it("when the desktop's attributes change (a theme's variables, the package)", async () => {
		const { bar } = windowWithBar();
		track(bar);
		(document.querySelector(".classicyDesktop") as HTMLElement).setAttribute(
			"data-classicy-appearance",
			"other",
		);
		await vi.waitFor(() => expect(published(bar)).toEqual(moved));
	});

	it("when a stylesheet is added", async () => {
		const { bar } = windowWithBar();
		track(bar);
		const sheet = document.createElement("style");
		document.head.appendChild(sheet);
		try {
			await vi.waitFor(() => expect(published(bar)).toEqual(moved));
		} finally {
			sheet.remove();
		}
	});

	it("when a container outside any window scrolls (the desktop's corner is the origin)", () => {
		document.body.innerHTML = `
<div class="classicyDesktop" id="desk"><div id="scroller"><div class="classicyScrollBar" id="bar"></div></div></div>`;
		place(document.getElementById("desk") as HTMLElement, 0, 0, 1024, 768);
		const bar = document.getElementById("bar") as HTMLElement;
		place(bar, 37, 61, 16, 100);
		renderHook(() =>
			useClassicyScrollPatternOrigin({ current: bar }, { current: null }, true),
		);
		expect(published(bar)).toEqual(["-37px", "-61px"]);
		place(bar, 37, 41, 16, 100);
		(document.getElementById("scroller") as HTMLElement).dispatchEvent(
			new Event("scroll"),
		);
		expect(published(bar)).toEqual(["-37px", "-41px"]);
	});

	it("when the document scrolls a bar outside any desktop", () => {
		document.body.innerHTML = `<div class="classicyScrollBar" id="bar"></div>`;
		const bar = document.getElementById("bar") as HTMLElement;
		place(bar, 10, 300, 16, 100);
		renderHook(() =>
			useClassicyScrollPatternOrigin({ current: bar }, { current: null }, true),
		);
		expect(published(bar)).toEqual(["-10px", "-300px"]);
		place(bar, 10, 200, 16, 100);
		document.dispatchEvent(new Event("scroll"));
		expect(published(bar)).toEqual(["-10px", "-200px"]);
	});

	it("when a transition or an animation inside the window ends", () => {
		const { win, bar } = windowWithBar();
		track(bar);
		win.dispatchEvent(new Event("transitionend", { bubbles: true }));
		expect(published(bar)).toEqual(moved);
		place(bar, 237, 99, 16, 100);
		win.dispatchEvent(new Event("animationend", { bubbles: true }));
		expect(published(bar)).toEqual(["-196px", "-40px"]);
	});

	it("a frame after the pointer or the focus moves (a stylesheet's :hover, :active or :focus)", async () => {
		for (const type of ["pointerover", "pointerdown", "focusin"]) {
			document.body.innerHTML = "";
			const scene = windowWithBar();
			track(scene.bar);
			scene.win.dispatchEvent(new Event(type, { bubbles: true }));
			await vi.waitFor(() => expect(published(scene.bar)).toEqual(moved));
		}
	});

	// Review r0, issue 1: a bar that is not rendered (its window's hidden
	// pane) publishes nothing, and nothing is written as its window moves.
	it("not while the bar is unrendered, and again once it renders", async () => {
		const { win, bar } = windowWithBar();
		track(bar);
		bar.style.display = "none";
		await vi.waitFor(() => expect(published(bar)).toEqual(["", ""]));
		const writes = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");
		window.dispatchEvent(new Event("resize"));
		win.style.left = "1px";
		await new Promise((r) => setTimeout(r));
		expect(
			writes.mock.calls.filter(([name]) => String(name).includes("-origin-")),
		).toEqual([]);
		writes.mockRestore();
		bar.style.display = "";
		await vi.waitFor(() => expect(published(bar)).toEqual(moved));
	});

	it("when the viewport resizes", () => {
		const { bar } = windowWithBar();
		track(bar);
		window.dispatchEvent(new Event("resize"));
		expect(published(bar)).toEqual(moved);
	});
});

const WINDOW_ORIGIN_PACKAGE = "test-window-pattern-origin";

describe("ClassicyScrollArea under a package that lays its pattern from the window", () => {
	beforeEach(() => stubClassicyClientRects());
	beforeEach(() => resetClassicyAppearancePackagesForTests());
	afterEach(() => resetClassicyAppearancePackagesForTests());

	const content = () => (
		<div className="classicyWindow">
			<ClassicyScrollArea vertical="always" horizontal="never">
				<div style={{ height: 1000 }} />
			</ClassicyScrollArea>
		</div>
	);

	it("publishes the origin on each bar and its track", () => {
		registerClassicyAppearancePackage({
			id: WINDOW_ORIGIN_PACKAGE,
			name: "Window Origin",
			css: "",
			defaults: {
				...getTheme("default"),
				id: "test-window-pattern-origin-default",
				package: WINDOW_ORIGIN_PACKAGE,
			},
			layout: {
				...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				scrollBar: { patternOrigin: "window" },
			},
		});
		const { container } = render(content());
		const bar = container.querySelector(".classicyScrollBar") as HTMLElement;
		const track = container.querySelector(
			".classicyScrollBarTrack",
		) as HTMLElement;
		for (const el of [bar, track]) {
			expect(el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_X)).toMatch(
				/^-?\d+px$/,
			);
			expect(el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_Y)).toMatch(
				/^-?\d+px$/,
			);
		}
	});

	it("publishes nothing without the declaration (Mac OS 8)", () => {
		const { container } = render(content());
		for (const el of container.querySelectorAll<HTMLElement>(
			".classicyScrollBar, .classicyScrollBarTrack",
		)) {
			expect(el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_X)).toBe("");
			expect(el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_Y)).toBe("");
		}
	});
});
