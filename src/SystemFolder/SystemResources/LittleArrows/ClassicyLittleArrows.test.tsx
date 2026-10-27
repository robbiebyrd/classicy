import { act, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicyLittleArrows } from "@/SystemFolder/SystemResources/LittleArrows/ClassicyLittleArrows";

vi.mock(
	"@/SystemFolder/SystemResources/LittleArrows/ClassicyLittleArrows.scss",
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

	describe("focus on a mouse press", () => {
		// The group's focus ring and the arrows' black bevel are :focus-within
		// styles, so a press that moved focus to the arrow (or, in Safari and
		// Firefox on macOS, to nothing at all) would blur the field and dim the
		// whole control mid-click.
		it("does not take focus from a focused field in its group", () => {
			render(
				<div className="classicyLittleArrowsGroup">
					<input aria-label="Field" />
					<ClassicyLittleArrows onStep={vi.fn()} />
				</div>,
			);
			const field = screen.getByRole("textbox", { name: "Field" });
			field.focus();
			expect(fireEvent.mouseDown(upBtn())).toBe(false);
			expect(document.activeElement).toBe(field);
			expect(fireEvent.mouseDown(downBtn())).toBe(false);
			expect(document.activeElement).toBe(field);
		});

		it("lets the arrow take focus as usual when nothing in its group is focused", () => {
			render(
				<div className="classicyLittleArrowsGroup">
					<input aria-label="Field" />
					<ClassicyLittleArrows onStep={vi.fn()} />
				</div>,
			);
			expect(fireEvent.mouseDown(upBtn())).toBe(true);
		});

		it("moves focus to focusTarget instead, when one is given", () => {
			const target = createRef<HTMLInputElement>();
			render(
				<div className="classicyLittleArrowsGroup">
					<input aria-label="Field" ref={target} />
					<ClassicyLittleArrows onStep={vi.fn()} focusTarget={target} />
				</div>,
			);
			expect(fireEvent.mouseDown(upBtn())).toBe(false);
			expect(document.activeElement).toBe(target.current);
		});

		it("still steps on the press either way", () => {
			const onStep = vi.fn();
			const target = createRef<HTMLInputElement>();
			render(
				<div className="classicyLittleArrowsGroup">
					<input aria-label="Field" ref={target} />
					<ClassicyLittleArrows onStep={onStep} focusTarget={target} />
				</div>,
			);
			fireEvent.mouseDown(upBtn());
			fireEvent.mouseUp(upBtn());
			expect(onStep).toHaveBeenCalledWith(1, 0);
		});
	});

	it("steps +1 on up press and -1 on down press", () => {
		const onStep = vi.fn();
		render(<ClassicyLittleArrows onStep={onStep} />);
		fireEvent.mouseDown(upBtn());
		fireEvent.mouseUp(upBtn());
		fireEvent.mouseDown(downBtn());
		fireEvent.mouseUp(downBtn());
		expect(onStep).toHaveBeenNthCalledWith(1, 1, 0);
		expect(onStep).toHaveBeenNthCalledWith(2, -1, 0);
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

		it("reports the held time and honours a custom repeat interval", () => {
			const onStep = vi.fn();
			render(<ClassicyLittleArrows onStep={onStep} repeatIntervalMs={100} />);
			fireEvent.mouseDown(upBtn());
			act(() => {
				vi.advanceTimersByTime(300);
			});
			fireEvent.mouseUp(upBtn());
			expect(onStep.mock.calls).toEqual([
				[1, 0],
				[1, 100],
				[1, 200],
				[1, 300],
			]);
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
