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

	describe("forwarded ref", () => {
		it("binds to the hours input only, not minutes or seconds", () => {
			const ref = createRef<HTMLInputElement>();
			render(<ClassicyTimePicker id="t" prefillValue={prefill} ref={ref} />);

			const hours = document.getElementById("t_hour") as HTMLInputElement;
			const minutes = document.getElementById("t_minutes") as HTMLInputElement;
			const seconds = document.getElementById("t_seconds") as HTMLInputElement;

			expect(ref.current).toBe(hours);
			expect(ref.current).not.toBe(minutes);
			expect(ref.current).not.toBe(seconds);
		});
	});

	describe("AM/PM-aware hour math", () => {
		it("round-trips 12 AM (midnight) to hour 0, not noon", () => {
			const onChange = vi.fn();
			// 9:00 AM prefill so the picker starts in the "am" period.
			const morning = new Date("2026-07-14T09:00:00");
			render(
				<ClassicyTimePicker
					id="t"
					prefillValue={morning}
					onChangeFunc={onChange}
				/>,
			);

			const hourInput = document.getElementById("t_hour") as HTMLInputElement;
			fireEvent.change(hourInput, { target: { value: "12" } });

			const updated = onChange.mock.calls.at(-1)?.[0] as Date;
			expect(updated.getHours()).toBe(0);
		});

		it("round-trips 12 PM (noon) to hour 12, not midnight", () => {
			const onChange = vi.fn();
			// 3:00 PM prefill so the picker starts in the "pm" period.
			const afternoon = new Date("2026-07-14T15:00:00");
			render(
				<ClassicyTimePicker
					id="t"
					prefillValue={afternoon}
					onChangeFunc={onChange}
				/>,
			);

			const hourInput = document.getElementById("t_hour") as HTMLInputElement;
			fireEvent.change(hourInput, { target: { value: "12" } });

			const updated = onChange.mock.calls.at(-1)?.[0] as Date;
			expect(updated.getHours()).toBe(12);
		});

		it("increments the hour in the PM period without flipping to AM", () => {
			const onChange = vi.fn();
			// 3:00 PM (15:00) -- stepping up should land on 4 PM (16:00), not
			// 4 AM (04:00), which is what the pre-fix arithmetic produced.
			const afternoon = new Date("2026-07-14T15:00:00");
			render(
				<ClassicyTimePicker
					id="t"
					prefillValue={afternoon}
					onChangeFunc={onChange}
				/>,
			);

			const hourInput = document.getElementById("t_hour") as HTMLInputElement;
			fireEvent.focus(hourInput);
			fireEvent.mouseDown(
				screen.getByRole("button", { name: /increment time/i }),
			);
			fireEvent.mouseUp(
				screen.getByRole("button", { name: /increment time/i }),
			);

			const updated = onChange.mock.calls.at(-1)?.[0] as Date;
			expect(updated.getHours()).toBe(16);
		});

		it("decrements the hour in the PM period without flipping to AM", () => {
			const onChange = vi.fn();
			// 3:00 PM (15:00) -- stepping down should land on 2 PM (14:00), not
			// 2 AM (02:00).
			const afternoon = new Date("2026-07-14T15:00:00");
			render(
				<ClassicyTimePicker
					id="t"
					prefillValue={afternoon}
					onChangeFunc={onChange}
				/>,
			);

			const hourInput = document.getElementById("t_hour") as HTMLInputElement;
			fireEvent.focus(hourInput);
			fireEvent.mouseDown(
				screen.getByRole("button", { name: /decrement time/i }),
			);
			fireEvent.mouseUp(
				screen.getByRole("button", { name: /decrement time/i }),
			);

			const updated = onChange.mock.calls.at(-1)?.[0] as Date;
			expect(updated.getHours()).toBe(14);
		});

		it("recomputes the 24-hour value when the am/pm period changes", () => {
			const onChange = vi.fn();
			// 3:00 PM (15:00) -- switching the period to "am" should reinterpret
			// the same displayed "3" as 3 AM (03:00), not silently keep 15:00 or
			// subtract the wrong offset.
			const afternoon = new Date("2026-07-14T15:00:00");
			render(
				<ClassicyTimePicker
					id="t"
					prefillValue={afternoon}
					onChangeFunc={onChange}
				/>,
			);

			fireEvent.click(screen.getByRole("combobox"));
			fireEvent.click(screen.getByRole("option", { name: "am" }));

			const updated = onChange.mock.calls.at(-1)?.[0] as Date;
			expect(updated.getHours()).toBe(3);
		});
	});
});
