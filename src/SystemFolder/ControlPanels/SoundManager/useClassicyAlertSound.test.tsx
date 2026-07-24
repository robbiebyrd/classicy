import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@/__tests__/test-utils";
import { useClassicyAlertSound } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicySoundDispatchContext } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerUtils";

describe("useClassicyAlertSound", () => {
	it("dispatches a ClassicyAlertSound action when called", () => {
		const dispatch = vi.fn();
		const wrapper = ({ children }: { children: ReactNode }) => (
			<ClassicySoundDispatchContext.Provider value={dispatch}>
				{children}
			</ClassicySoundDispatchContext.Provider>
		);
		const { result } = renderHook(() => useClassicyAlertSound(), { wrapper });
		result.current();
		expect(dispatch).toHaveBeenCalledWith({ type: "ClassicyAlertSound" });
	});

	it("returns a stable callback across renders", () => {
		const dispatch = vi.fn();
		const wrapper = ({ children }: { children: ReactNode }) => (
			<ClassicySoundDispatchContext.Provider value={dispatch}>
				{children}
			</ClassicySoundDispatchContext.Provider>
		);
		const { result, rerender } = renderHook(() => useClassicyAlertSound(), {
			wrapper,
		});
		const first = result.current;
		rerender();
		expect(result.current).toBe(first);
	});
});
