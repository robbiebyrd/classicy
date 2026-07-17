import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
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
