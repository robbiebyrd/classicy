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

	it("keeps the field focused — and focuses it — when an arrow is clicked", () => {
		// The focus ring around field and arrows is :focus-within on the group;
		// a press that blurred the field would dim the arrows mid-click.
		render(<ClassicySpinner id="test" prefillValue={3} />);
		input().focus();
		fireEvent.mouseDown(upBtn());
		fireEvent.mouseUp(upBtn());
		expect(document.activeElement).toBe(input());
		expect(input().value).toBe("4");

		input().blur();
		expect(document.activeElement).not.toBe(input());
		fireEvent.mouseDown(downBtn());
		fireEvent.mouseUp(downBtn());
		expect(document.activeElement).toBe(input());
		expect(input().value).toBe("3");
	});

	it("passes a forwarded ref through to the field alongside its own", () => {
		const ref = { current: null as HTMLInputElement | null };
		render(<ClassicySpinner id="test" ref={ref} />);
		expect(ref.current).toBe(input());
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

// WIG Ch.7 "Spin Boxes" (p.128): "with the focus, UP/DOWN ARROW change the
// value", and spin boxes "typically wrap at either end" (the audit's 7.26).
describe("ClassicySpinner — the arrow keys and wrap", () => {
	const key = (init: KeyboardEventInit) => {
		const event = new KeyboardEvent("keydown", {
			bubbles: true,
			cancelable: true,
			...init,
		});
		act(() => {
			input().dispatchEvent(event);
		});
		return event;
	};

	it("steps by one on Up and Down Arrow, taking the key's default", () => {
		const onChange = vi.fn();
		render(
			<ClassicySpinner id="test" prefillValue={5} onChangeFunc={onChange} />,
		);
		expect(key({ key: "ArrowUp" }).defaultPrevented).toBe(true);
		expect(input().value).toBe("6");
		expect(onChange).toHaveBeenLastCalledWith({ target: { value: "6" } });
		key({ key: "ArrowDown" });
		key({ key: "ArrowDown" });
		expect(input().value).toBe("4");
		expect(onChange).toHaveBeenLastCalledWith({ target: { value: "4" } });
	});

	it("stops at the ends without wrap, reporting the clamped value", () => {
		const onChange = vi.fn();
		render(
			<ClassicySpinner
				id="test"
				prefillValue={10}
				minValue={1}
				maxValue={10}
				onChangeFunc={onChange}
			/>,
		);
		key({ key: "ArrowUp" });
		expect(input().value).toBe("10");
		expect(onChange).toHaveBeenLastCalledWith({ target: { value: "10" } });
		for (let i = 0; i < 12; i++) key({ key: "ArrowDown" });
		expect(input().value).toBe("1");
	});

	it("leaves a modified arrow, and every key of a disabled field, alone", () => {
		const onChange = vi.fn();
		const { unmount } = render(
			<ClassicySpinner id="test" prefillValue={5} onChangeFunc={onChange} />,
		);
		for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"])
			expect(
				key({ key: "ArrowUp", [modifier]: true }).defaultPrevented,
				modifier,
			).toBe(false);
		expect(onChange).not.toHaveBeenCalled();
		unmount();
		render(
			<ClassicySpinner
				id="test"
				prefillValue={5}
				disabled
				onChangeFunc={onChange}
			/>,
		);
		key({ key: "ArrowUp" });
		expect(input().value).toBe("5");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("cycles past either end with wrap, by key and by arrow", () => {
		const onChange = vi.fn();
		render(
			<ClassicySpinner
				id="test"
				prefillValue={12}
				minValue={1}
				maxValue={12}
				wrap
				onChangeFunc={onChange}
			/>,
		);
		key({ key: "ArrowUp" });
		expect(input().value).toBe("1");
		key({ key: "ArrowDown" });
		expect(input().value).toBe("12");
		fireEvent.mouseDown(upBtn());
		fireEvent.mouseUp(upBtn());
		expect(input().value).toBe("1");
		fireEvent.mouseDown(downBtn());
		fireEvent.mouseUp(downBtn());
		expect(input().value).toBe("12");
		expect(onChange).toHaveBeenLastCalledWith({ target: { value: "12" } });
	});

	it("still clamps a typed value under wrap, and clamps the bottom with no maxValue", () => {
		const { unmount } = render(
			<ClassicySpinner
				id="test"
				prefillValue={5}
				minValue={1}
				maxValue={12}
				wrap
			/>,
		);
		fireEvent.change(input(), { target: { value: "40" } });
		expect(input().value).toBe("12");
		unmount();
		render(<ClassicySpinner id="test" prefillValue={0} wrap />);
		key({ key: "ArrowDown" });
		expect(input().value).toBe("0");
		key({ key: "ArrowUp" });
		expect(input().value).toBe("1");
	});

	describe("a held arrow's larger steps", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});
		afterEach(() => {
			vi.useRealTimers();
		});

		it("wrap by the range's span", () => {
			// Held past three seconds the step grows to ten; the wrapped value
			// is the unbounded one taken round the 100 values 0 to 99.
			const hold = (props: { maxValue?: number; wrap?: boolean }) => {
				const { unmount } = render(
					<ClassicySpinner id="test" prefillValue={0} {...props} />,
				);
				fireEvent.mouseDown(upBtn());
				act(() => {
					vi.advanceTimersByTime(3600);
				});
				fireEvent.mouseUp(upBtn());
				const value = Number(input().value);
				unmount();
				return value;
			};
			const unbounded = hold({});
			expect(unbounded).toBeGreaterThan(99);
			expect(hold({ maxValue: 99, wrap: true })).toBe(unbounded % 100);
		});
	});
});
