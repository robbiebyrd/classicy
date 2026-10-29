import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import {
	ClassicyScreenSaver,
	SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS,
	SCREEN_SAVER_OVERLAY_ID,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver";
import type { ScreenSaverData } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import { registerClassicyScreenSaver } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockData = vi.hoisted(
	() => ({ current: {} }) as { current: Record<string, unknown> },
);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Applications: {
							apps: {
								"ScreenSaver.app": {
									id: "ScreenSaver.app",
									name: "Screen Saver",
									icon: "/icons/screensaver.png",
									open: true,
									extension: true,
									windows: {} as never[],
									data: mockData.current,
								},
							},
						},
						Appearance: {
							activeTheme: {
								color: {
									white: 0xffffff,
									black: 0x000000,
									error: 0xff0000,
									system: [0, 0, 0, 0, 0, 0, 0, 0],
									theme: [0, 0, 0, 0, 0, 0, 0, 0],
								},
							},
						},
					},
				},
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

const dispatchedTypes = () =>
	mockDispatch.mock.calls.map((call) => (call[0] as { type: string }).type);

const setData = (data: ScreenSaverData) => {
	mockData.current = data as Record<string, unknown>;
};

describe("ClassicyScreenSaver overlay", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		setData({});
	});

	it("renders no overlay while inactive", () => {
		const { container } = render(<ClassicyScreenSaver />);
		expect(container.querySelector(".classicyScreenSaverOverlay")).toBeNull();
	});

	it("renders the selected saver inside the overlay while active", () => {
		setData({ active: true, selectedSaver: "bouncing-ball" });
		const { container } = render(<ClassicyScreenSaver />);
		expect(
			container.querySelector(".classicyScreenSaverOverlay"),
		).not.toBeNull();
		expect(
			container.querySelector(".classicySaverBouncingBall"),
		).not.toBeNull();
	});

	it("applies the saved ball count to the bouncing-ball saver", () => {
		setData({
			active: true,
			selectedSaver: "bouncing-ball",
			saverConfigs: { "bouncing-ball": { balls: 5 } },
		});
		const { container } = render(<ClassicyScreenSaver />);
		expect(
			container.querySelectorAll(".classicySaverBouncingBallBall"),
		).toHaveLength(5);
	});

	it("gives the overlay the id its stylesheet overrides key on", () => {
		setData({ active: true, selectedSaver: "bouncing-ball" });
		render(<ClassicyScreenSaver />);
		expect(
			document
				.getElementById(SCREEN_SAVER_OVERLAY_ID)
				?.classList.contains("classicyScreenSaverOverlay"),
		).toBe(true);
	});

	it("leaves the balls' animation to the stylesheet, where reduced motion reaches it", () => {
		setData({ active: true, selectedSaver: "bouncing-ball" });
		const { container } = render(<ClassicyScreenSaver />);
		const balls = container.querySelectorAll(".classicySaverBouncingBallBall");
		expect(balls).toHaveLength(3);
		for (const ball of balls) expect(ball.getAttribute("style")).toBeNull();
	});

	describe("a registered saver with an inline animation", () => {
		// No stylesheet rule outranks an inline `animation` shorthand, so the
		// overlay pauses its subtree's animations itself for reduced motion.
		const InlineSaver = () => (
			<div
				className="testInlineSaver"
				style={{ animation: "testSpin 1s linear infinite" }}
			/>
		);
		registerClassicyScreenSaver({
			id: "test-inline-animation",
			name: "Inline Animation",
			component: InlineSaver,
		});

		const stubMotion = (reduce: boolean) => {
			const animation = { pause: vi.fn(), play: vi.fn() };
			const getAnimations = vi.fn(() => [animation]);
			vi.stubGlobal(
				"matchMedia",
				vi.fn((query: string) => ({
					matches: reduce && query === "(prefers-reduced-motion: reduce)",
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
				})),
			);
			Object.defineProperty(HTMLElement.prototype, "getAnimations", {
				configurable: true,
				value: getAnimations,
			});
			return { animation, getAnimations };
		};

		afterEach(() => {
			vi.unstubAllGlobals();
			delete (HTMLElement.prototype as { getAnimations?: unknown })
				.getAnimations;
		});

		it("is paused under reduced motion", () => {
			const { animation, getAnimations } = stubMotion(true);
			setData({ active: true, selectedSaver: "test-inline-animation" });
			const { container } = render(<ClassicyScreenSaver />);
			expect(
				container.querySelector<HTMLElement>(".testInlineSaver")?.style
					.animation,
			).toContain("testSpin");
			expect(getAnimations).toHaveBeenCalledWith({ subtree: true });
			expect(getAnimations.mock.contexts[0]).toBe(
				document.getElementById(SCREEN_SAVER_OVERLAY_ID),
			);
			expect(animation.pause).toHaveBeenCalled();
		});

		it("keeps running without a reduced-motion preference", () => {
			const { animation } = stubMotion(false);
			setData({ active: true, selectedSaver: "test-inline-animation" });
			render(<ClassicyScreenSaver />);
			expect(animation.pause).not.toHaveBeenCalled();
		});
	});

	it("marks the overlay transparent for savers that reveal the desktop", () => {
		setData({ active: true, selectedSaver: "fade-out" });
		const { container } = render(<ClassicyScreenSaver />);
		expect(
			container.querySelector(".classicyScreenSaverOverlayTransparent"),
		).not.toBeNull();
	});

	it("renders a bare overlay for an unknown saver id", () => {
		setData({ active: true, selectedSaver: "no-such-saver" });
		const { container } = render(<ClassicyScreenSaver />);
		const overlay = container.querySelector(".classicyScreenSaverOverlay");
		expect(overlay).not.toBeNull();
		expect(overlay?.childElementCount).toBe(0);
	});

	it("does not render the overlay while disabled, even if active is set", () => {
		setData({ active: true, enabled: false });
		const { container } = render(<ClassicyScreenSaver />);
		expect(container.querySelector(".classicyScreenSaverOverlay")).toBeNull();
	});

	it("hides the pointer document-wide while active and restores it on waking", () => {
		const root = document.documentElement;
		expect(root.classList.contains(SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS)).toBe(
			false,
		);
		setData({ active: true, selectedSaver: "logo" });
		const { rerender, unmount } = render(<ClassicyScreenSaver />);
		expect(root.classList.contains(SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS)).toBe(
			true,
		);
		// Waking clears `active`; the overlay unmounts and the class goes with it.
		setData({ selectedSaver: "logo" });
		rerender(<ClassicyScreenSaver />);
		expect(root.classList.contains(SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS)).toBe(
			false,
		);
		unmount();
	});

	it("takes the pointer-hiding class off when the whole extension unmounts", () => {
		setData({ active: true, selectedSaver: "logo" });
		const { unmount } = render(<ClassicyScreenSaver />);
		unmount();
		expect(
			document.documentElement.classList.contains(
				SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS,
			),
		).toBe(false);
	});
});

describe("ClassicyScreenSaver idle monitor", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockDispatch.mockClear();
		setData({});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("activates after the idle timeout elapses", () => {
		render(<ClassicyScreenSaver />);
		vi.advanceTimersByTime(5 * 60_000);
		expect(dispatchedTypes()).toContain("ClassicyAppScreenSaverActivate");
	});

	it("counts activity against the timeout", () => {
		render(<ClassicyScreenSaver />);
		vi.advanceTimersByTime(4 * 60_000);
		fireEvent.mouseMove(document.body);
		vi.advanceTimersByTime(4 * 60_000);
		expect(dispatchedTypes()).not.toContain("ClassicyAppScreenSaverActivate");
		vi.advanceTimersByTime(2 * 60_000);
		expect(dispatchedTypes()).toContain("ClassicyAppScreenSaverActivate");
	});

	it("honors a custom timeout", () => {
		setData({ timeoutMinutes: 1 });
		render(<ClassicyScreenSaver />);
		vi.advanceTimersByTime(60_000);
		expect(dispatchedTypes()).toContain("ClassicyAppScreenSaverActivate");
	});

	it("never activates while disabled", () => {
		setData({ enabled: false });
		render(<ClassicyScreenSaver />);
		vi.advanceTimersByTime(60 * 60_000);
		expect(dispatchedTypes()).not.toContain("ClassicyAppScreenSaverActivate");
	});

	it("wakes on keydown while active and swallows the keystroke", () => {
		setData({ active: true });
		render(<ClassicyScreenSaver />);
		const defaultAllowed = fireEvent.keyDown(document.body, { key: "a" });
		expect(dispatchedTypes()).toContain("ClassicyAppScreenSaverDeactivate");
		expect(defaultAllowed).toBe(false);
	});

	it("wakes on mouse movement while active without cancelling the event", () => {
		setData({ active: true });
		render(<ClassicyScreenSaver />);
		fireEvent.mouseMove(document.body);
		expect(dispatchedTypes()).toContain("ClassicyAppScreenSaverDeactivate");
	});

	it("does not dispatch Deactivate for activity while inactive", () => {
		render(<ClassicyScreenSaver />);
		fireEvent.mouseMove(document.body);
		fireEvent.keyDown(document.body, { key: "a" });
		expect(dispatchedTypes()).not.toContain("ClassicyAppScreenSaverDeactivate");
	});
});
