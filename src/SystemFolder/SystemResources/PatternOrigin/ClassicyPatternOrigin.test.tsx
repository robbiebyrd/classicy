import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import {
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
// The test package's defaults name Platinum's sound pack, which a package
// registration requires to be registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import {
	CLASSICY_PATTERN_ORIGIN_X,
	CLASSICY_PATTERN_ORIGIN_Y,
	classicyPatternOriginScopeCountForTests,
	watchClassicyPatternOrigin,
} from "./ClassicyPatternOrigin.internal";

// Story 0219-c62: a package may declare, per component, the origin its
// patterns are laid from (`layout.patternOrigin`): the window's content
// origin, as QuickDraw laid a pixel pattern from the window's port, or the
// desktop's corner, as it laid a 1-bit pattern from the screen's. The core
// publishes that origin on each pattern-bearing element of the component,
// from the element's padding-box corner, as it does for scroll bars
// (`scrollBar.patternOrigin`, story 0217-etx).

const place = (el: Element, x: number, y: number, w = 10, h = 10) =>
	vi
		.spyOn(el, "getBoundingClientRect")
		.mockReturnValue(DOMRect.fromRect({ x, y, width: w, height: h }));

const published = (el: Element) => [
	(el as HTMLElement).style.getPropertyValue(CLASSICY_PATTERN_ORIGIN_X),
	(el as HTMLElement).style.getPropertyValue(CLASSICY_PATTERN_ORIGIN_Y),
];

const PACKAGE = "test-pattern-origins";

const registerPatternOrigins = (
	patternOrigin: ClassicyAppearanceLayout["patternOrigin"],
) =>
	registerClassicyAppearancePackage({
		id: PACKAGE,
		name: "Pattern Origins",
		css: "",
		defaults: {
			...getTheme("default"),
			id: "test-pattern-origins-default",
			package: PACKAGE,
		},
		layout: { ...CLASSICY_DEFAULT_APPEARANCE_LAYOUT, patternOrigin },
	});

/** A desktop at (3, 5) holding a window frame at (40, 40), whose content
 * origin is (41, 59). */
const inWindow = (ui: React.ReactElement) => {
	const desktop = document.createElement("div");
	desktop.className = "classicyDesktop";
	place(desktop, 3, 5, 1024, 768);
	const win = document.createElement("div");
	win.className = "classicyWindow";
	const title = document.createElement("div");
	title.className = "classicyWindowTitleBar";
	win.append(title);
	desktop.append(win);
	document.body.append(desktop);
	place(win, 40, 40, 400, 300);
	Object.defineProperty(win, "clientLeft", { value: 1 });
	Object.defineProperty(win, "clientTop", { value: 1 });
	place(title, 41, 41, 398, 18);
	vi.spyOn(title, "getClientRects").mockReturnValue([
		DOMRect.fromRect({ x: 41, y: 41, width: 398, height: 18 }),
	] as unknown as DOMRectList);
	const host = document.createElement("div");
	win.append(host);
	const view = render(ui, { container: host });
	return { win, ...view };
};

describe("layout.patternOrigin", () => {
	beforeEach(() => resetClassicyAppearancePackagesForTests());
	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		vi.restoreAllMocks();
	});

	it("accepts an origin for each component that publishes, and nothing else", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const registers = (patternOrigin: unknown) => {
			resetClassicyAppearancePackagesForTests();
			registerPatternOrigins(
				patternOrigin as ClassicyAppearanceLayout["patternOrigin"],
			);
			return getClassicyAppearancePackage(PACKAGE) !== undefined;
		};
		expect(registers(undefined)).toBe(true);
		expect(registers({})).toBe(true);
		expect(
			registers({
				ControlGroup: "desktop",
				PopUpMenu: "window",
				Slider: "element",
			}),
		).toBe(true);
		expect(registers({ Button: "window" })).toBe(false);
		expect(registers({ PopUpMenu: "screen" })).toBe(false);
		expect(registers({ window: ["PopUpMenu"] })).toBe(false);
	});

	it("is unset in the default layout (Mac OS 8 publishes nothing)", () => {
		expect(CLASSICY_DEFAULT_APPEARANCE_LAYOUT.patternOrigin).toBeUndefined();
	});
});

describe("watchClassicyPatternOrigin", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	const scene = () => {
		document.body.innerHTML = `
<div class="classicyDesktop" id="desk">
  <div class="classicyWindow" id="win">
    <div class="classicyWindowTitleBar" id="title"></div>
    <div id="a"></div><div id="b"></div>
  </div>
</div>`;
		const el = (id: string) => document.getElementById(id) as HTMLElement;
		place(el("desk"), 3, 5, 1024, 768);
		place(el("win"), 40, 40, 400, 300);
		Object.defineProperty(el("win"), "clientLeft", { value: 1 });
		Object.defineProperty(el("win"), "clientTop", { value: 1 });
		place(el("title"), 41, 41, 398, 18);
		vi.spyOn(el("title"), "getClientRects").mockReturnValue([
			DOMRect.fromRect({ x: 41, y: 41, width: 398, height: 18 }),
		] as unknown as DOMRectList);
		return { win: el("win"), a: el("a"), b: el("b") };
	};

	it("publishes before it returns, and again when the part moves", async () => {
		const { win, a } = scene();
		place(a, 100, 80);
		const stop = watchClassicyPatternOrigin([a]);
		expect(published(a)).toEqual(["-59px", "-21px"]);
		// One pixel right and one down: content inserted above it.
		place(a, 101, 81);
		win.insertBefore(document.createElement("p"), a);
		await vi.waitFor(() => expect(published(a)).toEqual(["-60px", "-22px"]));
		stop();
		expect(published(a)).toEqual(["", ""]);
	});

	it("measures from the padding-box corner, in whole device pixels", () => {
		const { a } = scene();
		place(a, 100.4, 80.6);
		Object.defineProperty(a, "clientLeft", { value: 2 });
		Object.defineProperty(a, "clientTop", { value: 1 });
		const stop = watchClassicyPatternOrigin([a]);
		expect(published(a)).toEqual(["-61px", "-23px"]);
		stop();
	});

	it("publishes the desktop's corner for a part laid from the desktop", () => {
		const { a } = scene();
		place(a, 100, 80);
		const stop = watchClassicyPatternOrigin([a], "desktop");
		expect(published(a)).toEqual(["-97px", "-75px"]);
		stop();
	});

	it("republishes a desktop-laid part when its window moves", async () => {
		const { win, a } = scene();
		place(a, 100, 80);
		const stop = watchClassicyPatternOrigin([a], "desktop");
		// The window dragged a pixel right and a pixel down, its part with it:
		// against the window nothing moved, against the desktop both did.
		place(win, 41, 41, 400, 300);
		place(a, 101, 81);
		win.style.left = "1px";
		await vi.waitFor(() => expect(published(a)).toEqual(["-98px", "-76px"]));
		stop();
	});

	it("shares one watcher among every part of a window, and drops it with the last", () => {
		const { a, b } = scene();
		place(a, 100, 80);
		place(b, 120, 90);
		const before = classicyPatternOriginScopeCountForTests();
		const stopA = watchClassicyPatternOrigin([a]);
		const stopB = watchClassicyPatternOrigin([b]);
		expect(classicyPatternOriginScopeCountForTests()).toBe(before + 1);
		// Both republish on one signal.
		place(a, 103, 80);
		place(b, 123, 90);
		window.dispatchEvent(new Event("resize"));
		expect(published(a)).toEqual(["-62px", "-21px"]);
		expect(published(b)).toEqual(["-82px", "-31px"]);
		stopA();
		expect(classicyPatternOriginScopeCountForTests()).toBe(before + 1);
		stopB();
		expect(classicyPatternOriginScopeCountForTests()).toBe(before);
	});
});

describe("components a package lays from a fixed origin", () => {
	beforeEach(() => resetClassicyAppearancePackagesForTests());
	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	const parts = (container: HTMLElement) => [
		...container.querySelectorAll(
			".classicyControlGroupFieldset, .classicyPopUpMenuButton, .classicyPopUpMenuIndicator, input.classicySlider, .classicySliderTicks",
		),
	];

	const controls = (
		<>
			<ClassicyControlGroup label="Group">x</ClassicyControlGroup>
			<ClassicyPopUpMenu
				id="pop"
				options={[{ value: "a", label: "A" }]}
				selected="a"
				disabled
			/>
			<ClassicySlider id="slide" value={50} tickInterval={50} disabled />
		</>
	);

	it("publishes the origin on each pattern-bearing element", () => {
		registerPatternOrigins({
			ControlGroup: "desktop",
			PopUpMenu: "desktop",
			Slider: "window",
		});
		const { container } = inWindow(controls);
		const found = parts(container);
		expect(found.length).toBe(5);
		for (const el of found)
			for (const value of published(el)) expect(value).toMatch(/^-?\d+px$/);
	});

	it("publishes the origin the package names: the window's or the desktop's", () => {
		for (const [origin, expected] of [
			["window", ["-19px", "-31px"]],
			["desktop", ["-57px", "-85px"]],
		] as const) {
			resetClassicyAppearancePackagesForTests();
			registerPatternOrigins({ ControlGroup: origin });
			const { container, unmount } = inWindow(controls);
			const group = container.querySelector(
				".classicyControlGroupFieldset",
			) as HTMLElement;
			place(group, 60, 90);
			window.dispatchEvent(new Event("resize"));
			expect(published(group), origin).toEqual(expected);
			unmount();
			document.body.innerHTML = "";
		}
	});

	it("republishes when a part moves a pixel", () => {
		registerPatternOrigins({ ControlGroup: "desktop" });
		const { win, container } = inWindow(controls);
		const group = container.querySelector(
			".classicyControlGroupFieldset",
		) as HTMLElement;
		place(group, 60, 90);
		window.dispatchEvent(new Event("resize"));
		expect(published(group)).toEqual(["-57px", "-85px"]);
		place(group, 61, 91);
		win.dispatchEvent(new Event("transitionend", { bubbles: true }));
		expect(published(group)).toEqual(["-58px", "-86px"]);
	});

	it("publishes only on the components the package names", () => {
		registerPatternOrigins({ PopUpMenu: "desktop", Slider: "element" });
		const { container } = inWindow(controls);
		for (const el of parts(container)) {
			const named = el.matches(
				".classicyPopUpMenuButton, .classicyPopUpMenuIndicator",
			);
			expect(
				published(el).every((v) => v !== ""),
				el.className,
			).toBe(named);
		}
	});

	it("publishes nothing and watches nothing without the declaration", () => {
		const before = classicyPatternOriginScopeCountForTests();
		const { container } = inWindow(controls);
		for (const el of parts(container)) expect(published(el)).toEqual(["", ""]);
		expect(classicyPatternOriginScopeCountForTests()).toBe(before);
	});

	it("removes what it published when the package changes to one without it", () => {
		registerPatternOrigins({
			ControlGroup: "desktop",
			PopUpMenu: "desktop",
			Slider: "desktop",
		});
		const before = classicyPatternOriginScopeCountForTests();
		const { container } = inWindow(controls);
		expect(classicyPatternOriginScopeCountForTests()).toBe(before + 1);
		act(() => resetClassicyAppearancePackagesForTests());
		for (const el of parts(container)) expect(published(el)).toEqual(["", ""]);
		expect(classicyPatternOriginScopeCountForTests()).toBe(before);
	});
});
