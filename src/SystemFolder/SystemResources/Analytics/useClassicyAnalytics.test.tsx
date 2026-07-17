import { act, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

/**
 * The hook's return value is used in effect dependency arrays (e.g.
 * ClassicyAboutWindow's mount effect dispatches ClassicyWindowFocus with
 * `track` as a dep). An unstable `track` re-fires such effects on every
 * render, which can cascade into an infinite dispatch loop.
 */
describe("useClassicyAnalytics", () => {
	it("returns a referentially stable track across re-renders", () => {
		const tracks: unknown[] = [];
		let forceRender: () => void = () => {};

		const Probe = (): null => {
			const [, setTick] = useState(0);
			forceRender = () => setTick((t) => t + 1);
			tracks.push(useClassicyAnalytics().track);
			return null;
		};

		// No AnalyticsProvider on purpose: the no-op fallback must be stable too.
		render(<Probe />);
		act(() => forceRender());
		act(() => forceRender());

		expect(tracks.length).toBeGreaterThanOrEqual(3);
		expect(tracks[1]).toBe(tracks[0]);
		expect(tracks[2]).toBe(tracks[0]);
	});
});
