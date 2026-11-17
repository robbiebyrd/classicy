import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
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
	vi.spyOn(el("title"), "getClientRects").mockReturnValue([
		DOMRect.fromRect({ x: 41, y: 41, width: 398, height: 18 }),
	] as unknown as DOMRectList);
	return { win: el("win"), bar: el("bar"), track: el("track") };
};

const published = (el: HTMLElement) => [
	el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_X),
	el.style.getPropertyValue(CLASSICY_SCROLL_ORIGIN_Y),
];

describe("classicyWindowContentOrigin", () => {
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

const WINDOW_ORIGIN_PACKAGE = "test-window-pattern-origin";

describe("ClassicyScrollArea under a package that lays its pattern from the window", () => {
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
