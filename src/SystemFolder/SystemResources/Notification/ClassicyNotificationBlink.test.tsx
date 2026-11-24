import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClassicyNotificationBlink } from "./ClassicyNotificationBlink.internal";
import {
	CLASSICY_NOTIFICATION_BLINK_MS,
	type ClassicyNotificationMenuBarIcons,
} from "./ClassicyNotificationManager";

const none: ClassicyNotificationMenuBarIcons = { apple: [], application: [] };

let reduce = false;
let onMotionChange: (() => void) | undefined;

beforeEach(() => {
	vi.useFakeTimers();
	reduce = false;
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			get matches() {
				return reduce && query === "(prefers-reduced-motion: reduce)";
			},
			addEventListener: (_: string, listener: () => void) => {
				onMotionChange = listener;
			},
			removeEventListener: vi.fn(),
		})),
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	onMotionChange = undefined;
});

const half = CLASSICY_NOTIFICATION_BLINK_MS / 2;

const advance = (ms: number) =>
	act(() => {
		vi.advanceTimersByTime(ms);
	});

describe("useClassicyNotificationBlink", () => {
	it("draws nothing, and runs no timer, without requests", () => {
		const { result } = renderHook(() =>
			useClassicyNotificationBlink(none, false),
		);
		expect(result.current).toEqual({});
		expect(vi.getTimerCount()).toBe(0);
	});

	// Review M3: once a second while one title blinks, not twice.
	it("ticks at the blink rate while one title blinks, twice as fast for two", () => {
		let renders = 0;
		let icons: ClassicyNotificationMenuBarIcons = {
			apple: [],
			application: ["/b.png"],
		};
		const { rerender } = renderHook(() => {
			renders++;
			return useClassicyNotificationBlink(icons, false);
		});
		// One act per half period, so each tick that changes state renders.
		const halves = (n: number) => {
			for (let i = 0; i < n; i++) advance(CLASSICY_NOTIFICATION_BLINK_MS / 2);
		};
		const settled = renders;
		halves(8);
		expect(renders - settled).toBe(4);
		icons = { apple: ["/a.png"], application: ["/b.png"] };
		rerender();
		const again = renders;
		halves(8);
		expect(renders - again).toBe(8);
	});

	it("alternates one request's icon with the title's own, a second each", () => {
		const icons = { apple: [], application: ["/mail.png"] };
		const { result } = renderHook(() =>
			useClassicyNotificationBlink(icons, false),
		);
		expect(result.current).toEqual({ application: "/mail.png" });
		advance(CLASSICY_NOTIFICATION_BLINK_MS - 1);
		expect(result.current).toEqual({ application: "/mail.png" });
		advance(1);
		expect(result.current).toEqual({});
		advance(CLASSICY_NOTIFICATION_BLINK_MS);
		expect(result.current).toEqual({ application: "/mail.png" });
	});

	it("shows a series of icons, then the title's own", () => {
		const icons = { apple: ["/a.png", "/b.png"], application: [] };
		const { result } = renderHook(() =>
			useClassicyNotificationBlink(icons, false),
		);
		const seen = [result.current.apple];
		for (let i = 0; i < 3; i++) {
			advance(CLASSICY_NOTIFICATION_BLINK_MS);
			seen.push(result.current.apple);
		}
		expect(seen).toEqual(["/a.png", "/b.png", undefined, "/a.png"]);
	});

	it("staggers the two titles by half a period when both blink", () => {
		const icons = { apple: ["/a.png"], application: ["/b.png"] };
		const { result } = renderHook(() =>
			useClassicyNotificationBlink(icons, false),
		);
		const seen = [result.current];
		for (let i = 0; i < 4; i++) {
			advance(half);
			seen.push(result.current);
		}
		expect(seen).toEqual([
			{ apple: "/a.png", application: "/b.png" },
			{ application: "/b.png" },
			{},
			{ apple: "/a.png" },
			{ apple: "/a.png", application: "/b.png" },
		]);
	});

	it("starts over from the first icon when the icons change", () => {
		let icons: ClassicyNotificationMenuBarIcons = {
			apple: [],
			application: ["/a.png"],
		};
		const { result, rerender } = renderHook(() =>
			useClassicyNotificationBlink(icons, false),
		);
		advance(CLASSICY_NOTIFICATION_BLINK_MS);
		expect(result.current).toEqual({});
		icons = { apple: [], application: ["/a.png", "/b.png"] };
		rerender();
		expect(result.current).toEqual({ application: "/a.png" });
	});

	// Review M4, observed on Mac OS 8.1: while a menu is open the blink
	// stops on whatever frame it showed, and goes on when the menu closes.
	it("stops where it is while frozen, and goes on after", () => {
		const icons = { apple: [], application: ["/b.png"] };
		let frozen = false;
		const { result, rerender } = renderHook(() =>
			useClassicyNotificationBlink(icons, frozen),
		);
		advance(CLASSICY_NOTIFICATION_BLINK_MS);
		expect(result.current).toEqual({});
		frozen = true;
		rerender();
		advance(CLASSICY_NOTIFICATION_BLINK_MS * 5);
		expect(result.current).toEqual({});
		expect(vi.getTimerCount()).toBe(0);
		frozen = false;
		rerender();
		advance(CLASSICY_NOTIFICATION_BLINK_MS);
		expect(result.current).toEqual({ application: "/b.png" });
	});

	it("freezes on the request's icon when it was showing", () => {
		const icons = { apple: [], application: ["/b.png"] };
		let frozen = false;
		const { result, rerender } = renderHook(() =>
			useClassicyNotificationBlink(icons, frozen),
		);
		frozen = true;
		rerender();
		advance(CLASSICY_NOTIFICATION_BLINK_MS * 3);
		expect(result.current).toEqual({ application: "/b.png" });
	});

	it("stops blinking for reduced motion: the first icon shows steadily", () => {
		reduce = true;
		const icons = { apple: ["/a.png", "/c.png"], application: ["/b.png"] };
		const { result } = renderHook(() =>
			useClassicyNotificationBlink(icons, false),
		);
		for (let i = 0; i < 6; i++) {
			expect(result.current).toEqual({
				apple: "/a.png",
				application: "/b.png",
			});
			advance(half);
		}
		expect(vi.getTimerCount()).toBe(0);
	});

	it("follows the preference when it changes", () => {
		const icons = { apple: [], application: ["/b.png"] };
		const { result } = renderHook(() =>
			useClassicyNotificationBlink(icons, false),
		);
		advance(CLASSICY_NOTIFICATION_BLINK_MS);
		expect(result.current).toEqual({});
		reduce = true;
		act(() => onMotionChange?.());
		expect(result.current).toEqual({ application: "/b.png" });
		advance(CLASSICY_NOTIFICATION_BLINK_MS * 3);
		expect(result.current).toEqual({ application: "/b.png" });
	});

	it("blinks where there is no matchMedia", () => {
		vi.stubGlobal("matchMedia", undefined);
		const icons = { apple: [], application: ["/b.png"] };
		const { result } = renderHook(() =>
			useClassicyNotificationBlink(icons, false),
		);
		expect(result.current).toEqual({ application: "/b.png" });
		advance(CLASSICY_NOTIFICATION_BLINK_MS);
		expect(result.current).toEqual({});
	});
});
