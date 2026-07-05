import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useControllableState } from "@/SystemFolder/SystemResources/QuickTime/useControllableState";

describe("useControllableState", () => {
	it("manages internal state when no controlled value is provided", () => {
		const { result } = renderHook(() =>
			useControllableState<number>(undefined, 0.5),
		);
		expect(result.current[0]).toBe(0.5);
		act(() => result.current[1](0.8));
		expect(result.current[0]).toBe(0.8);
	});

	it("supports functional updates against the latest value", () => {
		const { result } = renderHook(() =>
			useControllableState<boolean>(undefined, false),
		);
		act(() => result.current[1]((prev) => !prev));
		expect(result.current[0]).toBe(true);
		act(() => result.current[1]((prev) => !prev));
		expect(result.current[0]).toBe(false);
	});

	it("mirrors the controlled prop and never drifts from it", () => {
		const onChange = vi.fn();
		const { result, rerender } = renderHook(
			({ value }) => useControllableState<number>(value, 0.5, onChange),
			{ initialProps: { value: 0.2 } },
		);
		expect(result.current[0]).toBe(0.2);
		act(() => result.current[1](0.9));
		// Controlled: the setter reports the change but the value stays prop-driven.
		expect(onChange).toHaveBeenCalledWith(0.9);
		expect(result.current[0]).toBe(0.2);
		rerender({ value: 0.9 });
		expect(result.current[0]).toBe(0.9);
	});

	it("fires onChange in uncontrolled mode too", () => {
		const onChange = vi.fn();
		const { result } = renderHook(() =>
			useControllableState<number>(undefined, 0, onChange),
		);
		act(() => result.current[1](3));
		expect(onChange).toHaveBeenCalledWith(3);
	});
});
