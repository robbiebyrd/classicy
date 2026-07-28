import { act, render } from "@testing-library/react";
import { useState } from "react";
import { AnalyticsProvider } from "use-analytics";
import { describe, expect, it, vi } from "vitest";
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

describe("useClassicyAnalytics page", () => {
	it("returns a referentially stable page across re-renders", () => {
		const pages: unknown[] = [];
		let forceRender: () => void = () => {};

		const Probe = (): null => {
			const [, setTick] = useState(0);
			forceRender = () => setTick((t) => t + 1);
			pages.push(useClassicyAnalytics().page);
			return null;
		};

		// No AnalyticsProvider on purpose: the no-op fallback must be stable too.
		render(<Probe />);
		act(() => forceRender());

		expect(pages.length).toBeGreaterThanOrEqual(2);
		expect(pages[1]).toBe(pages[0]);
	});

	it("is callable without a provider and does not throw", async () => {
		let call: (() => Promise<unknown>) | null = null;

		const Probe = (): null => {
			const { page } = useClassicyAnalytics();
			call = () => Promise.resolve(page("/simpletext/window-1", "SimpleText"));
			return null;
		};

		render(<Probe />);
		await expect(
			(call as unknown as () => Promise<unknown>)(),
		).resolves.not.toThrow();
	});

	it("forwards path and title to the instance without prefixing the path", () => {
		const pageSpy = vi.fn();
		const instance = {
			track: vi.fn(),
			page: pageSpy,
			identify: vi.fn(),
			reset: vi.fn(),
			ready: vi.fn(),
			on: vi.fn(),
			once: vi.fn(),
			user: vi.fn(),
			getState: vi.fn(),
			storage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
			plugins: { enable: vi.fn(), disable: vi.fn() },
		};

		const Probe = (): null => {
			useClassicyAnalytics().page(
				"/simpletext/window-1",
				"SimpleText — Budget",
			);
			return null;
		};

		render(
			// biome-ignore lint/suspicious/noExplicitAny: minimal analytics test double
			<AnalyticsProvider instance={instance as any}>
				<Probe />
			</AnalyticsProvider>,
		);

		expect(pageSpy).toHaveBeenCalledWith({
			path: "/simpletext/window-1",
			title: "SimpleText — Budget",
		});
	});
});
