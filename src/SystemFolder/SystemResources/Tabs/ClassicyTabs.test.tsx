import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, userEvent } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss", () => ({}));

const tabs = [
	{ title: "First Tab", children: <p>First content</p> },
	{ title: "Second Tab", children: <p>Second content</p> },
	{ title: "Third Tab", children: <p>Third content</p> },
];

describe("ClassicyTabs", () => {
	it("renders tab buttons with titles", () => {
		render(<ClassicyTabs tabs={tabs} />);
		expect(screen.getByText("First Tab")).toBeInTheDocument();
		expect(screen.getByText("Second Tab")).toBeInTheDocument();
		expect(screen.getByText("Third Tab")).toBeInTheDocument();
	});

	it("first tab content is visible by default", () => {
		const { container } = render(<ClassicyTabs tabs={tabs} />);
		const contentDivs = container.querySelectorAll(
			".classicyTabActiveContent, .classicyTabHiddenContent",
		);
		expect(contentDivs[0]).toHaveClass("classicyTabActiveContent");
	});

	it("non-first tabs are hidden by default", () => {
		const { container } = render(<ClassicyTabs tabs={tabs} />);
		const contentDivs = container.querySelectorAll(
			".classicyTabActiveContent, .classicyTabHiddenContent",
		);
		expect(contentDivs[1]).toHaveClass("classicyTabHiddenContent");
		expect(contentDivs[2]).toHaveClass("classicyTabHiddenContent");
	});

	it("first tab button has active class by default", () => {
		render(<ClassicyTabs tabs={tabs} />);
		const firstButton = screen.getByRole("tab", { name: "First Tab" });
		expect(firstButton).toHaveClass("selected");
	});

	// A package keys the chosen tab's look on its wrapper's own state (no
	// `:has()`, which Firefox 113-120 lacks).
	it("marks the chosen tab's wrapper selected, and only it", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyTabs tabs={tabs} />);
		const selected = () =>
			[...container.querySelectorAll(".classicyTabButtonWrapper")].map((w) =>
				w.classList.contains("selected"),
			);
		expect(selected()).toEqual([true, false, false]);
		await user.click(screen.getByRole("tab", { name: "Third Tab" }));
		expect(selected()).toEqual([false, false, true]);
	});

	it("clicking second tab shows its content and hides first", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyTabs tabs={tabs} />);
		const secondButton = screen.getByRole("tab", { name: "Second Tab" });
		await user.click(secondButton);
		const contentDivs = container.querySelectorAll(
			".classicyTabActiveContent, .classicyTabHiddenContent",
		);
		expect(contentDivs[0]).toHaveClass("classicyTabHiddenContent");
		expect(contentDivs[1]).toHaveClass("classicyTabActiveContent");
	});

	it("exposes tablist/tab/tabpanel roles and roving tabindex", () => {
		render(<ClassicyTabs tabs={tabs} />);
		expect(screen.getByRole("tablist")).toBeInTheDocument();
		const [first, second] = screen.getAllByRole("tab");
		expect(first).toHaveAttribute("aria-selected", "true");
		expect(first).toHaveAttribute("tabindex", "0");
		expect(second).toHaveAttribute("aria-selected", "false");
		expect(second).toHaveAttribute("tabindex", "-1");
	});

	it("moves selection with the Right arrow key", async () => {
		const user = userEvent.setup();
		render(<ClassicyTabs tabs={tabs} />);
		const first = screen.getByRole("tab", { name: "First Tab" });
		first.focus();
		await user.keyboard("{ArrowRight}");
		const second = screen.getByRole("tab", { name: "Second Tab" });
		expect(second).toHaveAttribute("aria-selected", "true");
		expect(second).toHaveFocus();
	});

	it("wraps to the last tab with the Left arrow key", async () => {
		const user = userEvent.setup();
		render(<ClassicyTabs tabs={tabs} />);
		const first = screen.getByRole("tab", { name: "First Tab" });
		first.focus();
		await user.keyboard("{ArrowLeft}");
		expect(screen.getByRole("tab", { name: "Third Tab" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	it("renders an icon on a tab and still exposes the title as its name", () => {
		render(
			<ClassicyTabs
				tabs={[{ title: "Icons", icon: "folder.png", children: <p>Body</p> }]}
			/>,
		);
		const tab = screen.getByRole("tab", { name: "Icons" });
		expect(tab.querySelector("img")).toHaveAttribute("src", "folder.png");
	});
});

describe("ClassicyTabs sizes", () => {
	it("defaults to medium, which carries no modifier class", () => {
		const { container } = render(<ClassicyTabs tabs={tabs} />);
		const root = container.querySelector(".classicyTabContainer");
		expect(root?.className).toBe("classicyTabContainer");
	});

	it.each([
		["small", "classicyTabsSizeSmall"],
		["large", "classicyTabsSizeLarge"],
	] as const)("applies the %s modifier class", (size, expected) => {
		const { container } = render(<ClassicyTabs tabs={tabs} size={size} />);
		expect(container.querySelector(".classicyTabContainer")).toHaveClass(
			expected,
		);
	});
});

/**
 * jsdom performs no layout, so every box measures zero and the strip can never
 * report overflow on its own. These tests install the measurements the
 * component reads — the scroller's viewport/content widths and each tab
 * wrapper's position — then fire a scroll event to force a re-measure through
 * the listener the component already attached.
 */
const stubLayout = (
	container: HTMLElement,
	{ clientWidth, tabWidth }: { clientWidth: number; tabWidth: number },
): HTMLElement => {
	const scroller = container.querySelector<HTMLElement>(
		".classicyTabScroller",
	) as HTMLElement;
	const wrappers = Array.from(
		container.querySelectorAll<HTMLElement>(".classicyTabButtonWrapper"),
	);
	wrappers.forEach((wrapper, index) => {
		Object.defineProperty(wrapper, "offsetLeft", {
			get: () => index * tabWidth,
			configurable: true,
		});
		Object.defineProperty(wrapper, "offsetWidth", {
			get: () => tabWidth,
			configurable: true,
		});
	});
	let scrollLeft = 0;
	Object.defineProperty(scroller, "clientWidth", {
		get: () => clientWidth,
		configurable: true,
	});
	Object.defineProperty(scroller, "scrollWidth", {
		get: () => wrappers.length * tabWidth,
		configurable: true,
	});
	Object.defineProperty(scroller, "scrollLeft", {
		get: () => scrollLeft,
		set: (value: number) => {
			scrollLeft = value;
		},
		configurable: true,
	});
	fireEvent.scroll(scroller);
	return scroller;
};

describe("ClassicyTabs overflow scrolling", () => {
	const manyTabs = ["One", "Two", "Three", "Four", "Five"].map((title) => ({
		title,
		children: <p>{title}</p>,
	}));

	it("shows no scroll arrows when the strip fits", () => {
		render(<ClassicyTabs tabs={tabs} />);
		expect(
			screen.queryByLabelText("Scroll tabs right"),
		).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Scroll tabs left")).not.toBeInTheDocument();
	});

	it("shows both arrows once the strip overflows, with the left one disabled at the start", () => {
		const { container } = render(<ClassicyTabs tabs={manyTabs} />);
		stubLayout(container, { clientWidth: 250, tabWidth: 100 });
		expect(screen.getByLabelText("Scroll tabs left")).toBeDisabled();
		expect(screen.getByLabelText("Scroll tabs right")).toBeEnabled();
	});

	it("keeps the arrows outside the tablist so the tab count stays accurate", () => {
		const { container } = render(<ClassicyTabs tabs={manyTabs} />);
		stubLayout(container, { clientWidth: 250, tabWidth: 100 });
		expect(screen.getAllByRole("tab")).toHaveLength(manyTabs.length);
	});

	it("steps right by whole tabs, pulling the next clipped tab flush to the edge", () => {
		const { container } = render(<ClassicyTabs tabs={manyTabs} />);
		const scroller = stubLayout(container, { clientWidth: 250, tabWidth: 100 });
		fireEvent.click(screen.getByLabelText("Scroll tabs right"));
		// Tab index 2 spans 200–300 and is the first past the 250px viewport;
		// bringing its right edge flush leaves the strip at 300 - 250.
		expect(scroller.scrollLeft).toBe(50);
	});

	it("steps left back to the previous tab boundary", () => {
		const { container } = render(<ClassicyTabs tabs={manyTabs} />);
		const scroller = stubLayout(container, { clientWidth: 250, tabWidth: 100 });
		fireEvent.click(screen.getByLabelText("Scroll tabs right"));
		// A real browser emits `scroll` after the programmatic scroll; that event
		// is what re-enables the left arrow, so the test has to supply it.
		fireEvent.scroll(scroller);
		fireEvent.click(screen.getByLabelText("Scroll tabs left"));
		expect(scroller.scrollLeft).toBe(0);
	});

	it("disables the right arrow once the strip is scrolled to the end", () => {
		const { container } = render(<ClassicyTabs tabs={manyTabs} />);
		const scroller = stubLayout(container, { clientWidth: 250, tabWidth: 100 });
		scroller.scrollLeft = 250;
		fireEvent.scroll(scroller);
		expect(screen.getByLabelText("Scroll tabs right")).toBeDisabled();
		expect(screen.getByLabelText("Scroll tabs left")).toBeEnabled();
	});
});

// A window that reopens on its last tab (WIG Ch.8 p.146; the control panels
// through useClassicySessionTab) opens the strip on `defaultTab` and hears
// each change through `onTabChange`; without them the strip opens on its
// first tab, as before.
describe("ClassicyTabs defaultTab and onTabChange", () => {
	const active = (container: HTMLElement) =>
		Array.from(
			container.querySelectorAll(
				".classicyTabActiveContent, .classicyTabHiddenContent",
			),
		).findIndex((el) => el.classList.contains("classicyTabActiveContent"));

	it("opens on the tab given, clamped to the tabs", () => {
		expect(
			active(render(<ClassicyTabs tabs={tabs} defaultTab={2} />).container),
		).toBe(2);
		expect(
			active(render(<ClassicyTabs tabs={tabs} defaultTab={9} />).container),
		).toBe(2);
		expect(
			active(render(<ClassicyTabs tabs={tabs} defaultTab={-1} />).container),
		).toBe(0);
		expect(active(render(<ClassicyTabs tabs={tabs} />).container)).toBe(0);
	});

	it("reports each tab selected", async () => {
		const onTabChange = vi.fn();
		render(<ClassicyTabs tabs={tabs} onTabChange={onTabChange} />);
		await userEvent.click(screen.getByText("Third Tab"));
		expect(onTabChange).toHaveBeenLastCalledWith(2);
		await userEvent.click(screen.getByText("Second Tab"));
		expect(onTabChange).toHaveBeenLastCalledWith(1);
	});
});

// When a tab is chosen: at the release over it under the Mac's rule (every
// package but Windows 98), at the button-1 press under `layout.mouse`
// "windows" (comctl32's TAB_LButtonDown selects on WM_LBUTTONDOWN: Windows
// 98 as shipped; WIG Ch.4 "Mouse Actions", p.24; App. A Table A.1, p.349).
describe("ClassicyTabs — when a press chooses a tab (layout.mouse)", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const useWindowsLayout = () =>
		registerClassicyAppearancePackage({
			id: "windows-tabs",
			name: "Windows tabs",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-tabs-default",
				package: "windows-tabs",
			},
			layout: windows98.layout as never,
		});
	const chosen = () =>
		screen
			.getAllByRole("tab")
			.filter((tab) => tab.getAttribute("aria-selected") === "true")
			.map((tab) => tab.textContent);

	it("chooses a tab at the release without the key", () => {
		const onTabChange = vi.fn();
		render(<ClassicyTabs tabs={tabs} onTabChange={onTabChange} />);
		const second = screen.getByRole("tab", { name: "Second Tab" });
		fireEvent.mouseDown(second, { button: 0 });
		expect(chosen()).toEqual(["First Tab"]);
		fireEvent.mouseUp(second, { button: 0 });
		expect(chosen()).toEqual(["Second Tab"]);
		expect(onTabChange).toHaveBeenCalledWith(1);
	});

	it("chooses a tab at the button-1 press under the Windows layout, and not again at the release", () => {
		useWindowsLayout();
		const onTabChange = vi.fn();
		render(<ClassicyTabs tabs={tabs} onTabChange={onTabChange} />);
		const second = screen.getByRole("tab", { name: "Second Tab" });
		fireEvent.mouseDown(second, { button: 0 });
		expect(chosen()).toEqual(["Second Tab"]);
		expect(onTabChange).toHaveBeenCalledTimes(1);
		// Let go over another tab: the press already chose, the release does not.
		fireEvent.mouseUp(screen.getByRole("tab", { name: "Third Tab" }), {
			button: 0,
		});
		expect(chosen()).toEqual(["Second Tab"]);
		expect(onTabChange).toHaveBeenCalledTimes(1);
	});

	it("chooses nothing on another button's press under the Windows layout", () => {
		useWindowsLayout();
		render(<ClassicyTabs tabs={tabs} />);
		const third = screen.getByRole("tab", { name: "Third Tab" });
		for (const button of [1, 2]) {
			fireEvent.mouseDown(third, { button });
			fireEvent.mouseUp(third, { button });
		}
		expect(chosen()).toEqual(["First Tab"]);
	});
});

// The remaining chapters' audit's 4.11 / B.12 (WIG Ch.4 "Access Keys",
// p.27): a tab given an `accessKey` is chosen by Alt and its key under a
// package's `layout.menu.accessKeys`; a tab given none takes none, "auto"
// or not (Windows 98's property sheets' tabs carried none).
describe("ClassicyTabs — access keys", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const keyed = [
		{ title: "General", accessKey: "g", children: <p>General content</p> },
		{ title: "Sharing", children: <p>Sharing content</p> },
		{ title: "Tools", accessKey: "t", children: <p>Tools content</p> },
	];
	const alt = (k: string, target: Element) =>
		fireEvent.keyDown(target, {
			key: k,
			code: `Key${k.toUpperCase()}`,
			altKey: true,
		});
	const chosen = () =>
		screen
			.getAllByRole("tab")
			.filter((tab) => tab.getAttribute("aria-selected") === "true")
			.map((tab) => tab.textContent);

	it("underlines a given key and chooses its tab on Alt and it under the Windows layout", () => {
		registerClassicyAppearancePackage({
			id: "windows-tabs",
			name: "Windows tabs",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-tabs-default",
				package: "windows-tabs",
			},
			layout: windows98.layout as never,
		});
		const onTabChange = vi.fn();
		const { container } = render(
			<div className="classicyWindow">
				<button type="button">OK</button>
				<ClassicyTabs tabs={keyed} onTabChange={onTabChange} />
			</div>,
		);
		expect(
			Array.from(
				container.querySelectorAll("[data-classicy-part='access-key']"),
			).map((el) => el.textContent),
		).toEqual(["G", "T"]);
		const ok = screen.getByRole("button", { name: "OK" });
		ok.focus();
		expect(alt("t", ok)).toBe(false);
		expect(chosen()).toEqual(["Tools"]);
		expect(screen.getByRole("tab", { name: "Tools" })).toHaveFocus();
		expect(onTabChange).toHaveBeenLastCalledWith(2);
		// A tab takes letters itself: the key alone from it does nothing.
		fireEvent.keyDown(screen.getByRole("tab", { name: "Tools" }), {
			key: "g",
			code: "KeyG",
		});
		expect(chosen()).toEqual(["Tools"]);
		alt("g", screen.getByRole("tab", { name: "Tools" }));
		expect(chosen()).toEqual(["General"]);
	});

	it("draws and takes nothing by default (Platinum)", () => {
		const onTabChange = vi.fn();
		const { container } = render(
			<div className="classicyWindow">
				<button type="button">OK</button>
				<ClassicyTabs tabs={keyed} onTabChange={onTabChange} />
			</div>,
		);
		expect(container.querySelector("[data-classicy-part]")).toBeNull();
		const ok = screen.getByRole("button", { name: "OK" });
		ok.focus();
		expect(alt("t", ok)).toBe(true);
		expect(chosen()).toEqual(["General"]);
		expect(onTabChange).not.toHaveBeenCalled();
	});
});
