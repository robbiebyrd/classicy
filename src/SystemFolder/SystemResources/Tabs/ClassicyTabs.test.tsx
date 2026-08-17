import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

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

vi.mock("@img/ui/tab.svg?base64", () => ({ default: "" }));
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
		expect(firstButton).toHaveClass("classicyTabButtonActive");
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
