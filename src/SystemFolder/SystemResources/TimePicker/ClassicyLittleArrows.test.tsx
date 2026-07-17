import { act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicyLittleArrows } from "@/SystemFolder/SystemResources/TimePicker/ClassicyLittleArrows";

vi.mock(
	"@/SystemFolder/SystemResources/TimePicker/ClassicyLittleArrows.scss",
	() => ({}),
);

const upBtn = () => screen.getByRole("button", { name: /increment/i });
const downBtn = () => screen.getByRole("button", { name: /decrement/i });

describe("ClassicyLittleArrows", () => {
	it("renders an up and a down arrow button", () => {
		render(<ClassicyLittleArrows onStep={vi.fn()} />);
		expect(upBtn()).toBeInTheDocument();
		expect(downBtn()).toBeInTheDocument();
	});

	it("steps +1 on up press and -1 on down press", () => {
		const onStep = vi.fn();
		render(<ClassicyLittleArrows onStep={onStep} />);
		fireEvent.mouseDown(upBtn());
		fireEvent.mouseUp(upBtn());
		fireEvent.mouseDown(downBtn());
		fireEvent.mouseUp(downBtn());
		expect(onStep).toHaveBeenNthCalledWith(1, 1);
		expect(onStep).toHaveBeenNthCalledWith(2, -1);
	});

	it("honours custom aria labels", () => {
		render(
			<ClassicyLittleArrows
				onStep={vi.fn()}
				upLabel="Increment time"
				downLabel="Decrement time"
			/>,
		);
		expect(
			screen.getByRole("button", { name: "Increment time" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Decrement time" }),
		).toBeInTheDocument();
	});

	it("disables both buttons and does not step when disabled", () => {
		const onStep = vi.fn();
		render(<ClassicyLittleArrows onStep={onStep} disabled />);
		expect(upBtn()).toBeDisabled();
		expect(downBtn()).toBeDisabled();
	});

	describe("press-and-hold repeat", () => {
		beforeEach(() => vi.useFakeTimers());
		afterEach(() => vi.useRealTimers());

		it("repeats a single unit while held (no acceleration)", () => {
			const onStep = vi.fn();
			render(<ClassicyLittleArrows onStep={onStep} />);
			fireEvent.mouseDown(upBtn());
			act(() => {
				vi.advanceTimersByTime(600);
			});
			fireEvent.mouseUp(upBtn());
			// 1 immediate + several repeats, every one a +1 step (never accelerates).
			expect(onStep.mock.calls.length).toBeGreaterThan(1);
			expect(onStep.mock.calls.every(([dir]) => dir === 1)).toBe(true);
		});

		it("stops repeating on mouse up", () => {
			const onStep = vi.fn();
			render(<ClassicyLittleArrows onStep={onStep} />);
			fireEvent.mouseDown(upBtn());
			act(() => {
				vi.advanceTimersByTime(300);
			});
			fireEvent.mouseUp(upBtn());
			const count = onStep.mock.calls.length;
			act(() => {
				vi.advanceTimersByTime(600);
			});
			expect(onStep.mock.calls.length).toBe(count);
		});
	});
});
