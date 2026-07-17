import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { ClassicyImageWell } from "@/SystemFolder/SystemResources/ImageWell/ClassicyImageWell";

vi.mock(
	"@/SystemFolder/SystemResources/ImageWell/ClassicyImageWell.scss",
	() => ({}),
);

describe("ClassicyImageWell", () => {
	it("renders an image from src with alt text", () => {
		render(<ClassicyImageWell src="pic.png" alt="Portrait" />);
		expect(screen.getByAltText("Portrait")).toBeInTheDocument();
	});

	it("renders children when no src is provided", () => {
		render(<ClassicyImageWell>Empty</ClassicyImageWell>);
		expect(screen.getByText("Empty")).toBeInTheDocument();
	});

	it("defaults to the enabled state", () => {
		const { container } = render(<ClassicyImageWell src="pic.png" alt="P" />);
		expect(container.querySelector(".classicyImageWell")).toHaveAttribute(
			"data-state",
			"enabled",
		);
	});

	it("reports the selected state", () => {
		const { container } = render(
			<ClassicyImageWell src="pic.png" alt="P" selected={true} />,
		);
		const well = container.querySelector(".classicyImageWell");
		expect(well).toHaveAttribute("data-state", "selected");
		expect(well).toHaveClass("classicyImageWellSelected");
	});

	it("reports the disabled state via aria-disabled", () => {
		const { container } = render(
			<ClassicyImageWell src="pic.png" alt="P" enabled={false} />,
		);
		const well = container.querySelector(".classicyImageWell");
		expect(well).toHaveAttribute("data-state", "disabled");
		expect(well).toHaveAttribute("aria-disabled", "true");
	});

	it("calls onDrop with the dropped files when it is a drop target", () => {
		const onDrop = vi.fn();
		render(
			<ClassicyImageWell alt="Well" onDrop={onDrop}>
				Drop
			</ClassicyImageWell>,
		);
		const well = screen.getByRole("img");
		const file = new File(["x"], "x.png", { type: "image/png" });
		fireEvent.drop(well, { dataTransfer: { files: [file] } });
		expect(onDrop).toHaveBeenCalledTimes(1);
		expect(onDrop.mock.calls[0][0][0]).toBe(file);
	});

	it("does not fire onDrop when disabled", () => {
		const onDrop = vi.fn();
		render(
			<ClassicyImageWell alt="Well" enabled={false} onDrop={onDrop}>
				Drop
			</ClassicyImageWell>,
		);
		const file = new File(["x"], "x.png", { type: "image/png" });
		fireEvent.drop(screen.getByRole("img"), {
			dataTransfer: { files: [file] },
		});
		expect(onDrop).not.toHaveBeenCalled();
	});
});
