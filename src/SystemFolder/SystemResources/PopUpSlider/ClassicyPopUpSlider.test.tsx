import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ClassicyPopUpSlider } from "@/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider";

const thumbOf = (slider: HTMLElement) =>
	slider.querySelector(".classicyPopUpSliderThumb") as HTMLElement;

const Controlled = ({ start = 50 }: { start?: number }) => {
	const [value, setValue] = useState(start);
	return (
		<ClassicyPopUpSlider ariaLabel="Volume" value={value} onChange={setValue} />
	);
};

describe("ClassicyPopUpSlider (HIGOS8 Figure 2-16)", () => {
	it("is a vertical slider whose thumb travels between the track's caps", () => {
		const { rerender } = render(
			<ClassicyPopUpSlider ariaLabel="Volume" value={100} onChange={vi.fn()} />,
		);
		const slider = screen.getByRole("slider", { name: "Volume" });
		expect(slider).toHaveAttribute("aria-orientation", "vertical");
		expect(slider).toHaveAttribute("aria-valuenow", "100");
		expect(thumbOf(slider).style.top).toBe("3px"); // at the top cap
		rerender(
			<ClassicyPopUpSlider ariaLabel="Volume" value={0} onChange={vi.fn()} />,
		);
		expect(thumbOf(slider).style.top).toBe("60px"); // on the bottom cap
	});

	it("steps with the arrow keys and Page Up/Down, and jumps with Home/End", () => {
		render(<Controlled />);
		const slider = screen.getByRole("slider", { name: "Volume" });
		fireEvent.keyDown(slider, { key: "ArrowUp" });
		expect(slider).toHaveAttribute("aria-valuenow", "51");
		fireEvent.keyDown(slider, { key: "ArrowLeft" });
		expect(slider).toHaveAttribute("aria-valuenow", "50");
		fireEvent.keyDown(slider, { key: "PageDown" });
		expect(slider).toHaveAttribute("aria-valuenow", "40");
		fireEvent.keyDown(slider, { key: "End" });
		expect(slider).toHaveAttribute("aria-valuenow", "100");
		fireEvent.keyDown(slider, { key: "ArrowUp" });
		expect(slider).toHaveAttribute("aria-valuenow", "100"); // clamped
		fireEvent.keyDown(slider, { key: "Home" });
		expect(slider).toHaveAttribute("aria-valuenow", "0");
	});

	it("sets the value from where the track is pressed, and follows a drag", () => {
		render(<Controlled />);
		const slider = screen.getByRole("slider", { name: "Volume" });
		vi.spyOn(slider, "getBoundingClientRect").mockReturnValue({
			top: 0,
		} as DOMRect);
		// The thumb's centre on y = 8 puts its top on the upper cap: the maximum.
		fireEvent.mouseDown(slider, { button: 0, clientY: 8 });
		expect(slider).toHaveAttribute("aria-valuenow", "100");
		fireEvent.mouseMove(document, { clientY: 65 });
		expect(slider).toHaveAttribute("aria-valuenow", "0");
		fireEvent.mouseUp(document);
		fireEvent.mouseMove(document, { clientY: 8 });
		expect(slider).toHaveAttribute("aria-valuenow", "0"); // drag ended
	});

	it("ignores input while disabled", () => {
		const onChange = vi.fn();
		render(
			<ClassicyPopUpSlider
				ariaLabel="Volume"
				value={50}
				onChange={onChange}
				disabled
			/>,
		);
		const slider = screen.getByRole("slider", { name: "Volume" });
		expect(slider).toHaveAttribute("aria-disabled", "true");
		expect(slider).toHaveAttribute("tabindex", "-1");
		fireEvent.keyDown(slider, { key: "ArrowUp" });
		fireEvent.mouseDown(slider, { button: 0, clientY: 8 });
		expect(onChange).not.toHaveBeenCalled();
	});
});
