import { describe, expect, it } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicySeparator } from "@/SystemFolder/SystemResources/Separator/ClassicySeparator";

describe("ClassicySeparator", () => {
	it("renders an <hr> separator element", () => {
		const { container } = render(<ClassicySeparator />);
		const hr = container.querySelector("hr");
		expect(hr).toBeInTheDocument();
		expect(hr).toHaveClass("classicySeparator");
	});

	it("defaults to the horizontal orientation", () => {
		const { container } = render(<ClassicySeparator />);
		const hr = container.querySelector("hr");
		expect(hr).toHaveClass("classicySeparatorHorizontal");
		expect(hr).not.toHaveClass("classicySeparatorVertical");
		expect(hr).toHaveAttribute("aria-orientation", "horizontal");
	});

	it("applies the vertical orientation when requested", () => {
		const { container } = render(
			<ClassicySeparator orientation="vertical" />,
		);
		const hr = container.querySelector("hr");
		expect(hr).toHaveClass("classicySeparatorVertical");
		expect(hr).not.toHaveClass("classicySeparatorHorizontal");
		expect(hr).toHaveAttribute("aria-orientation", "vertical");
	});

	it("merges an extra className", () => {
		const { container } = render(
			<ClassicySeparator className="extraDivider" />,
		);
		const hr = container.querySelector("hr");
		expect(hr).toHaveClass("classicySeparator");
		expect(hr).toHaveClass("extraDivider");
	});
});
