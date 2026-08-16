import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicyOutput } from "@/SystemFolder/SystemResources/Output/ClassicyOutput";

vi.mock(
	"@/SystemFolder/SystemResources/Output/ClassicyOutput.scss",
	() => ({}),
);

describe("ClassicyOutput", () => {
	it("renders a semantic <output> with the value", () => {
		const { container } = render(<ClassicyOutput id="total" value={110} />);
		const output = container.querySelector("output");
		expect(output).not.toBeNull();
		expect(output).toHaveAttribute("id", "total");
		expect(output).toHaveTextContent("110");
		expect(output).toHaveClass("classicyOutput", "classicyOutputPlain");
	});

	it("renders children when no value is given", () => {
		const { container } = render(
			<ClassicyOutput id="result">
				<em>done</em>
			</ClassicyOutput>,
		);
		expect(container.querySelector("output em")).toHaveTextContent("done");
	});

	it("renders a zero value (not children)", () => {
		const { container } = render(
			<ClassicyOutput id="count" value={0}>
				fallback
			</ClassicyOutput>,
		);
		expect(container.querySelector("output")).toHaveTextContent("0");
	});

	it("joins htmlFor ids into the for attribute", () => {
		const { container } = render(
			<ClassicyOutput id="sum" value={3} htmlFor={["a", "b"]} />,
		);
		expect(container.querySelector("output")).toHaveAttribute("for", "a b");
	});

	it("applies the inset and mono variants", () => {
		const { container } = render(
			<ClassicyOutput id="calc" value="1,024" variant="inset" mono />,
		);
		const output = container.querySelector("output");
		expect(output).toHaveClass("classicyOutputInset", "classicyOutputMono");
	});

	it("renders a ClassicyControlLabel tied to the output", () => {
		render(<ClassicyOutput id="total" value={42} label="Total" />);
		const label = screen.getByText("Total");
		expect(label.closest("label")).toHaveAttribute("for", "total");
	});
});
