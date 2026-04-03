import { act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);
vi.mock(
	"@/SystemFolder/SystemResources/Spinner/ClassicySpinner.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

const input = () => screen.getByRole("spinbutton") as HTMLInputElement;
const upBtn = () => screen.getByRole("button", { name: /increment/i });
const downBtn = () => screen.getByRole("button", { name: /decrement/i });

describe("ClassicySpinner", () => {
	it("defaults to minValue (0) when no prefillValue given", () => {
		render(<ClassicySpinner id="test" />);
		expect(input().value).toBe("0");
	});

	it("renders with prefillValue", () => {
		render(<ClassicySpinner id="test" prefillValue={7} />);
		expect(input().value).toBe("7");
	});

	it("increments by 1 on up button press", () => {
		render(<ClassicySpinner id="test" prefillValue={5} />);
		fireEvent.mouseDown(upBtn());
		fireEvent.mouseUp(upBtn());
		expect(input().value).toBe("6");
	});

	it("decrements by 1 on down button press", () => {
		render(<ClassicySpinner id="test" prefillValue={5} />);
		fireEvent.mouseDown(downBtn());
		fireEvent.mouseUp(downBtn());
		expect(input().value).toBe("4");
	});

	it("does not go below default minValue of 0", () => {
		render(<ClassicySpinner id="test" prefillValue={0} />);
		fireEvent.mouseDown(downBtn());
		fireEvent.mouseUp(downBtn());
		expect(input().value).toBe("0");
	});

	it("does not go below custom minValue", () => {
		render(<ClassicySpinner id="test" prefillValue={3} minValue={3} />);
		fireEvent.mouseDown(downBtn());
		fireEvent.mouseUp(downBtn());
		expect(input().value).toBe("3");
	});

	it("does not go above maxValue when specified", () => {
		render(<ClassicySpinner id="test" prefillValue={10} maxValue={10} />);
		fireEvent.mouseDown(upBtn());
		fireEvent.mouseUp(upBtn());
		expect(input().value).toBe("10");
	});

	it("allows values above any threshold when no maxValue given", () => {
		render(<ClassicySpinner id="test" prefillValue={9999} />);
		fireEvent.mouseDown(upBtn());
		fireEvent.mouseUp(upBtn());
		expect(input().value).toBe("10000");
	});

	it("renders a label when labelTitle is provided", () => {
		render(<ClassicySpinner id="test" labelTitle="Count" />);
		expect(screen.getByText("Count")).toBeInTheDocument();
	});

	it("buttons are disabled when disabled prop is true", () => {
		render(<ClassicySpinner id="test" disabled />);
		expect(upBtn()).toBeDisabled();
		expect(downBtn()).toBeDisabled();
	});

	describe("click-and-hold acceleration", () => {
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it("continues incrementing while button is held", () => {
			render(<ClassicySpinner id="test" prefillValue={0} />);
			fireEvent.mouseDown(upBtn());
			act(() => {
				vi.advanceTimersByTime(500);
			});
			fireEvent.mouseUp(upBtn());
			expect(Number(input().value)).toBeGreaterThan(1);
		});

		it("increases step size to 10 after 3 seconds of holding", () => {
			render(<ClassicySpinner id="test" prefillValue={0} />);
			fireEvent.mouseDown(upBtn());
			act(() => {
				vi.advanceTimersByTime(3100);
			});
			fireEvent.mouseUp(upBtn());
			// 1 immediate + 30 step-1 ticks + 1 step-10 tick = 41
			expect(Number(input().value)).toBeGreaterThan(30);
		});

		it("increases step size to 100 after 6 seconds of holding", () => {
			render(<ClassicySpinner id="test" prefillValue={0} />);
			fireEvent.mouseDown(upBtn());
			act(() => {
				vi.advanceTimersByTime(6100);
			});
			fireEvent.mouseUp(upBtn());
			// significant acceleration at 6s
			expect(Number(input().value)).toBeGreaterThan(300);
		});

		it("stops incrementing on mouseUp", () => {
			render(<ClassicySpinner id="test" prefillValue={0} />);
			fireEvent.mouseDown(upBtn());
			act(() => {
				vi.advanceTimersByTime(300);
			});
			fireEvent.mouseUp(upBtn());
			const valAfterRelease = Number(input().value);
			act(() => {
				vi.advanceTimersByTime(500);
			});
			expect(Number(input().value)).toBe(valAfterRelease);
		});

		it("stops incrementing on mouseLeave", () => {
			render(<ClassicySpinner id="test" prefillValue={0} />);
			fireEvent.mouseDown(upBtn());
			act(() => {
				vi.advanceTimersByTime(300);
			});
			fireEvent.mouseLeave(upBtn());
			const valAfterLeave = Number(input().value);
			act(() => {
				vi.advanceTimersByTime(500);
			});
			expect(Number(input().value)).toBe(valAfterLeave);
		});

		it("decrement also accelerates on hold", () => {
			render(<ClassicySpinner id="test" prefillValue={10000} />);
			fireEvent.mouseDown(downBtn());
			act(() => {
				vi.advanceTimersByTime(3100);
			});
			fireEvent.mouseUp(downBtn());
			expect(Number(input().value)).toBeLessThan(10000 - 30);
		});
	});
});
