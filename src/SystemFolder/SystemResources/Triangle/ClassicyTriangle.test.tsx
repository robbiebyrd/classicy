import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, userEvent } from "@/__tests__/test-utils";
import { ClassicyTriangle } from "@/SystemFolder/SystemResources/Triangle/ClassicyTriangle";

const trackMock = vi.fn();
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: trackMock }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Triangle/ClassicyTriangle.scss",
	() => ({}),
);

describe("ClassicyTriangle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	it("renders interactive by default with closed class and role=button", () => {
		const { container } = render(<ClassicyTriangle />);
		const wrapper = container.querySelector('[role="button"]');
		expect(wrapper).not.toBeNull();
		expect(wrapper).toHaveAttribute("tabIndex", "0");
		expect(wrapper).toHaveAttribute("aria-expanded", "false");
		const svg = container.querySelector("svg");
		expect(svg).toHaveClass("classicyTriangleRightClosed");
	});

	it("toggles open on click when uncontrolled", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyTriangle />);
		const wrapper = container.querySelector('[role="button"]') as HTMLElement;
		await user.click(wrapper);
		expect(container.querySelector("svg")).toHaveClass(
			"classicyTriangleRightOpen",
		);
		expect(wrapper).toHaveAttribute("aria-expanded", "true");
	});

	it("respects defaultOpen for initial uncontrolled state", () => {
		const { container } = render(<ClassicyTriangle defaultOpen={true} />);
		expect(container.querySelector("svg")).toHaveClass(
			"classicyTriangleRightOpen",
		);
	});

	it("toggles open on Enter key press", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyTriangle />);
		const wrapper = container.querySelector('[role="button"]') as HTMLElement;
		wrapper.focus();
		await user.keyboard("{Enter}");
		expect(container.querySelector("svg")).toHaveClass(
			"classicyTriangleRightOpen",
		);
	});

	it("toggles open on Space key press", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyTriangle />);
		const wrapper = container.querySelector('[role="button"]') as HTMLElement;
		wrapper.focus();
		await user.keyboard(" ");
		expect(container.querySelector("svg")).toHaveClass(
			"classicyTriangleRightOpen",
		);
	});

	it("tracks a ClassicyTriangle analytics event on toggle", async () => {
		const user = userEvent.setup();
		const { container } = render(<ClassicyTriangle direction="down" />);
		const wrapper = container.querySelector('[role="button"]') as HTMLElement;
		await user.click(wrapper);
		expect(trackMock).toHaveBeenCalledWith("click", {
			expanded: true,
			type: "ClassicyTriangle",
			direction: "down",
		});
	});

	it("in controlled mode, reflects the open prop and calls onToggle without changing on its own", async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();
		const { container, rerender } = render(
			<ClassicyTriangle open={false} onToggle={onToggle} />,
		);
		const wrapper = container.querySelector('[role="button"]') as HTMLElement;
		await user.click(wrapper);
		expect(onToggle).toHaveBeenCalledWith(true);
		// Still closed because the parent hasn't updated the `open` prop yet.
		expect(container.querySelector("svg")).toHaveClass(
			"classicyTriangleRightClosed",
		);
		rerender(<ClassicyTriangle open={true} onToggle={onToggle} />);
		expect(container.querySelector("svg")).toHaveClass(
			"classicyTriangleRightOpen",
		);
	});

	it("applies the direction class for each supported direction", () => {
		const { container, rerender } = render(<ClassicyTriangle direction="up" />);
		expect(container.querySelector("svg")).toHaveClass(
			"classicyTriangleUpClosed",
		);
		rerender(<ClassicyTriangle direction="down" />);
		expect(container.querySelector("svg")).toHaveClass(
			"classicyTriangleDownClosed",
		);
		rerender(<ClassicyTriangle direction="left" />);
		expect(container.querySelector("svg")).toHaveClass(
			"classicyTriangleLeftClosed",
		);
	});

	it("renders only the SVG with no button role or keyboard handling when interactive is false", () => {
		const { container } = render(
			<ClassicyTriangle interactive={false} open={true} />,
		);
		expect(container.querySelector('[role="button"]')).toBeNull();
		const svg = container.querySelector("svg");
		expect(svg).toHaveClass("classicyTriangleRightOpen");
	});

	it("does not call track when interactive is false", () => {
		render(<ClassicyTriangle interactive={false} open={true} />);
		expect(trackMock).not.toHaveBeenCalled();
	});
});
