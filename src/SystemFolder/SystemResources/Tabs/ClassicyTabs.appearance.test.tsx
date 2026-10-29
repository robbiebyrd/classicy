import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Tabs emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Tabs");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const TABS = ["One", "Two", "Three", "Four", "Five"].map((title) => ({
	title,
	children: <p>{title}</p>,
}));

const root = (container: HTMLElement) =>
	container.querySelector(".classicyTabContainer") as HTMLElement;

/** Lays the strip out wider than its viewport, so the scroll arrows show. */
const overflow = (container: HTMLElement) => {
	const scroller = container.querySelector(
		".classicyTabScroller",
	) as HTMLElement;
	const wrappers = Array.from(
		container.querySelectorAll<HTMLElement>(".classicyTabButtonWrapper"),
	);
	wrappers.forEach((wrapper, index) => {
		Object.defineProperty(wrapper, "offsetLeft", { get: () => index * 100 });
		Object.defineProperty(wrapper, "offsetWidth", { get: () => 100 });
	});
	let scrollLeft = 0;
	Object.defineProperty(scroller, "clientWidth", { get: () => 250 });
	Object.defineProperty(scroller, "scrollWidth", {
		get: () => wrappers.length * 100,
	});
	Object.defineProperty(scroller, "scrollLeft", {
		get: () => scrollLeft,
		set: (value: number) => {
			scrollLeft = value;
		},
	});
	fireEvent.scroll(scroller);
	return scroller;
};

describe("ClassicyTabs appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(<ClassicyTabs tabs={TABS} />);
		const el = root(container);
		expect(el).toHaveClass("classicyTabContainer", "probe-Tabs");
		// The container had no state class; `selected` stays on the tab buttons.
		expect(el.getAttribute("data-probe-state")).toBe("");
	});

	it("emits its events", () => {
		render(<ClassicyTabs tabs={TABS} />);
		const second = screen.getByRole("tab", { name: "Two" });
		fireEvent.mouseDown(second);
		expect(emitted()).toEqual([{ event: "press", detail: { tabId: 1 } }]);
		// Releasing the press is the click that selects the tab.
		fireEvent.mouseUp(second);
		expect(emitted().slice(1)).toEqual([
			{ event: "select", detail: { tabId: 1 } },
		]);
	});

	it("emits press and select for keyboard traversal", () => {
		render(<ClassicyTabs tabs={TABS} />);
		const first = screen.getByRole("tab", { name: "One" });
		fireEvent.keyDown(first, { key: "ArrowRight" });
		fireEvent.keyDown(screen.getByRole("tab", { name: "Two" }), {
			key: "End",
		});
		fireEvent.keyDown(screen.getByRole("tab", { name: "Five" }), {
			key: "x",
		});
		expect(emitted()).toEqual([
			{ event: "press", detail: { tabId: 1 } },
			{ event: "select", detail: { tabId: 1 } },
			{ event: "press", detail: { tabId: 4 } },
			{ event: "select", detail: { tabId: 4 } },
		]);
	});

	it("emits change when a scroll arrow steps the strip", () => {
		const { container } = render(<ClassicyTabs tabs={TABS} />);
		const scroller = overflow(container);
		fireEvent.click(screen.getByLabelText("Scroll tabs right"));
		// jsdom never scrolls on its own: report the new offset.
		fireEvent.scroll(scroller);
		fireEvent.click(screen.getByLabelText("Scroll tabs left"));
		expect(emitted()).toEqual([
			{ event: "change", detail: { scroll: 1 } },
			{ event: "change", detail: { scroll: -1 } },
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(<ClassicyTabs tabs={TABS} size="small" />);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe(
			"classicyTabContainer classicyTabsSizeSmall",
		);
	});
});
