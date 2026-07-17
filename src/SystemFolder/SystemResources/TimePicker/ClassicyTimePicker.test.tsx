import { fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicyTimePicker } from "@/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);
vi.mock(
	"@/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/TimePicker/ClassicyLittleArrows.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

const prefill = new Date("2026-07-14T10:30:20");

describe("ClassicyTimePicker", () => {
	it("renders the visible little-arrows widget beside the field", () => {
		render(<ClassicyTimePicker id="t" prefillValue={prefill} />);
		expect(
			screen.getByRole("button", { name: /increment time/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /decrement time/i }),
		).toBeInTheDocument();
	});

	it("increments the focused part via the little arrows", () => {
		const onChange = vi.fn();
		render(
			<ClassicyTimePicker
				id="t"
				prefillValue={prefill}
				onChangeFunc={onChange}
			/>,
		);
		// Focus the minutes field, then click the up arrow.
		const minutes = document.getElementById("t_minutes") as HTMLInputElement;
		fireEvent.focus(minutes);
		fireEvent.mouseDown(
			screen.getByRole("button", { name: /increment time/i }),
		);
		fireEvent.mouseUp(screen.getByRole("button", { name: /increment time/i }));
		expect(onChange).toHaveBeenCalled();
		const updated = onChange.mock.calls.at(-1)?.[0] as Date;
		expect(updated.getMinutes()).toBe(31);
	});

	it("forwards the ref to an input", () => {
		const ref = createRef<HTMLInputElement>();
		render(<ClassicyTimePicker id="t" prefillValue={prefill} ref={ref} />);
		expect(ref.current).toBeInstanceOf(HTMLInputElement);
	});

	it("disables the arrows when disabled", () => {
		render(<ClassicyTimePicker id="t" prefillValue={prefill} disabled />);
		expect(
			screen.getByRole("button", { name: /increment time/i }),
		).toBeDisabled();
	});
});
