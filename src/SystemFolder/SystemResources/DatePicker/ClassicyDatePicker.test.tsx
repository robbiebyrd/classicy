import { fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicyDatePicker } from "@/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker";

vi.mock(
	"@/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/TimePicker/ClassicyLittleArrows.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

const prefill = new Date("1998-07-14T00:00:00");

const field = (id: string) => document.getElementById(id) as HTMLInputElement;

describe("ClassicyDatePicker", () => {
	it("seeds the fields from prefillValue", () => {
		render(<ClassicyDatePicker id="d" prefillValue={prefill} />);
		expect(field("d_month").value).toBe("7");
		expect(field("d_day").value).toBe("14");
		expect(field("d_year").value).toBe("1998");
	});

	it("forwards the ref to the month field (no longer ignored)", () => {
		const ref = createRef<HTMLInputElement>();
		render(<ClassicyDatePicker id="d" prefillValue={prefill} ref={ref} />);
		expect(ref.current).toBe(field("d_month"));
	});

	it("renders the visible little-arrows widget", () => {
		render(<ClassicyDatePicker id="d" prefillValue={prefill} />);
		expect(
			screen.getByRole("button", { name: /increment date/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /decrement date/i }),
		).toBeInTheDocument();
	});

	it("increments the focused part via the little arrows", () => {
		const onChange = vi.fn();
		render(
			<ClassicyDatePicker
				id="d"
				prefillValue={prefill}
				onChangeFunc={onChange}
			/>,
		);
		fireEvent.focus(field("d_day"));
		fireEvent.mouseDown(
			screen.getByRole("button", { name: /increment date/i }),
		);
		fireEvent.mouseUp(screen.getByRole("button", { name: /increment date/i }));
		expect(field("d_day").value).toBe("15");
		expect(onChange).toHaveBeenCalled();
	});

	it("disables the arrows when disabled", () => {
		render(<ClassicyDatePicker id="d" prefillValue={prefill} disabled />);
		expect(
			screen.getByRole("button", { name: /increment date/i }),
		).toBeDisabled();
	});
});
