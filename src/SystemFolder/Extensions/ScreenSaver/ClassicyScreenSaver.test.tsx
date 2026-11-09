// Registers Platinum's sound pack, which the core default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { fireEvent } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { act, render } from "@/__tests__/test-utils";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import {
	ClassicyScreenSaver,
	SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS,
	SCREEN_SAVER_OVERLAY_ID,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver";
import type { ScreenSaverData } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import {
	type ClassicyScreenSaverDefinition,
	registerClassicyScreenSaver,
	resetClassicyScreenSaversForTests,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockData = vi.hoisted(
	() => ({ current: {} }) as { current: Record<string, unknown> },
);
const mockPackageId = vi.hoisted(
	() => ({ current: undefined }) as { current: string | undefined },
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
							packageId: mockPackageId.current,
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

// The core ships no saver the tests may lean on: they register fakes. Every
// registration goes through `track` so `restoreFakes` can put them back after
// a case that cleared the registry.
const fakes: ClassicyScreenSaverDefinition[] = [];
const track = (saver: ClassicyScreenSaverDefinition) => {
	fakes.push(saver);
	return registerClassicyScreenSaver(saver);
};
const restoreFakes = () => {
	resetClassicyScreenSaversForTests();
	for (const saver of fakes) registerClassicyScreenSaver(saver);
};

const FakeBall = ({ config }: { config: Record<string, unknown> }) => (
	<div className="fakeBall">
		{Array.from({ length: Number(config.balls) }, (_, i) => (
			// biome-ignore lint/suspicious/noArrayIndexKey: static fake
			<b key={i} className="fakeBallBall" />
		))}
	</div>
);
track({
	id: "fake-ball",
	name: "Fake Ball",
	component: FakeBall,
	configSchema: z.looseObject({ balls: z.number().min(1).max(10).default(3) }),
});
track({
	id: "fake-fade",
	name: "Fake Fade",
	component: () => <div className="fakeFade" />,
	transparentBackground: true,
});
track({
	id: "fake-logo",
	name: "Fake Logo",
	component: () => <div className="fakeLogo" />,
});

const dispatchedTypes = () =>
	mockDispatch.mock.calls.map((call) => (call[0] as { type: string }).type);

const setData = (data: ScreenSaverData) => {
	mockData.current = data as Record<string, unknown>;
};

describe("ClassicyScreenSaver overlay", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPackageId.current = undefined;
		setData({});
	});

	afterEach(() => {
		restoreFakes();
		resetClassicyAppearancePackagesForTests();
	});

	it("renders no overlay while inactive", () => {
		const { container } = render(<ClassicyScreenSaver />);
		expect(container.querySelector(".classicyScreenSaverOverlay")).toBeNull();
	});

	it("renders the selected saver inside the overlay while active", () => {
		setData({ active: true, selectedSaver: "fake-ball" });
		const { container } = render(<ClassicyScreenSaver />);
		expect(
			container.querySelector(".classicyScreenSaverOverlay"),
		).not.toBeNull();
		expect(container.querySelector(".fakeBall")).not.toBeNull();
	});

	it("applies the saved ball count to the bouncing-ball saver", () => {
		setData({
			active: true,
			selectedSaver: "fake-ball",
			saverConfigs: { "fake-ball": { balls: 5 } },
		});
		const { container } = render(<ClassicyScreenSaver />);
		expect(container.querySelectorAll(".fakeBallBall")).toHaveLength(5);
	});

	it("gives the overlay the id its stylesheet overrides key on", () => {
		setData({ active: true, selectedSaver: "fake-ball" });
		render(<ClassicyScreenSaver />);
		expect(
			document
				.getElementById(SCREEN_SAVER_OVERLAY_ID)
				?.classList.contains("classicyScreenSaverOverlay"),
		).toBe(true);
	});

	it("leaves the balls' animation to the stylesheet, where reduced motion reaches it", () => {
		setData({ active: true, selectedSaver: "fake-ball" });
		const { container } = render(<ClassicyScreenSaver />);
		const balls = container.querySelectorAll(".fakeBallBall");
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
		track({
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

		it("resumes only what it paused when reduced motion is turned off", () => {
			// One animation the overlay pauses, one the saver had paused itself.
			const ours = { playState: "running", pause: vi.fn(), play: vi.fn() };
			const theirs = { playState: "paused", pause: vi.fn(), play: vi.fn() };
			ours.pause.mockImplementation(() => {
				ours.playState = "paused";
			});
			let onChange: ((e: { matches: boolean }) => void) | undefined;
			vi.stubGlobal(
				"matchMedia",
				vi.fn((query: string) => ({
					matches: query === "(prefers-reduced-motion: reduce)",
					addEventListener: (_: string, listener: typeof onChange) => {
						onChange = listener;
					},
					removeEventListener: vi.fn(),
				})),
			);
			Object.defineProperty(HTMLElement.prototype, "getAnimations", {
				configurable: true,
				value: () => [ours, theirs],
			});
			setData({ active: true, selectedSaver: "test-inline-animation" });
			render(<ClassicyScreenSaver />);
			expect(ours.pause).toHaveBeenCalled();
			expect(theirs.pause).not.toHaveBeenCalled();
			act(() => onChange?.({ matches: false }));
			expect(ours.play).toHaveBeenCalledTimes(1);
			expect(theirs.play).not.toHaveBeenCalled();
		});

		it("forgets a paused animation once its element leaves the document", () => {
			const target = { isConnected: true };
			const gone = {
				playState: "running",
				effect: { target },
				pause: vi.fn(),
				play: vi.fn(),
			};
			gone.pause.mockImplementation(() => {
				gone.playState = "paused";
			});
			const later = {
				playState: "running",
				effect: { target: { isConnected: true } },
				pause: vi.fn(),
				play: vi.fn(),
			};
			let onChange: ((e: { matches: boolean }) => void) | undefined;
			vi.stubGlobal(
				"matchMedia",
				vi.fn((query: string) => ({
					matches: query === "(prefers-reduced-motion: reduce)",
					addEventListener: (_: string, listener: typeof onChange) => {
						onChange = listener;
					},
					removeEventListener: vi.fn(),
				})),
			);
			Object.defineProperty(HTMLElement.prototype, "getAnimations", {
				configurable: true,
				value: () => [gone],
			});
			setData({ active: true, selectedSaver: "test-inline-animation" });
			render(<ClassicyScreenSaver />);
			expect(gone.pause).toHaveBeenCalled();
			// The element is removed; a later animation starts and is paused.
			target.isConnected = false;
			const spawned = document.querySelector(".testInlineSaver") as HTMLElement;
			Object.defineProperty(spawned, "getAnimations", {
				configurable: true,
				value: () => [later],
			});
			spawned.dispatchEvent(new Event("animationstart", { bubbles: true }));
			expect(later.pause).toHaveBeenCalled();
			act(() => onChange?.({ matches: false }));
			expect(later.play).toHaveBeenCalledTimes(1);
			expect(gone.play).not.toHaveBeenCalled();
		});

		it("keeps running without a reduced-motion preference", () => {
			const { animation } = stubMotion(false);
			setData({ active: true, selectedSaver: "test-inline-animation" });
			render(<ClassicyScreenSaver />);
			expect(animation.pause).not.toHaveBeenCalled();
		});
	});

	describe("a registered saver that spawns inline-animated elements later", () => {
		// An element appended after mount carries an inline `animation` the
		// mount-time pass never saw; the overlay's capture-phase
		// `animationstart` listener pauses it when it starts.
		const SpawningSaver = () => {
			const [spawned, setSpawned] = useState(false);
			useEffect(() => {
				const timer = setTimeout(() => setSpawned(true), 1000);
				return () => clearTimeout(timer);
			}, []);
			return (
				<div className="testSpawningSaver">
					{spawned && (
						<b
							className="testSpawned"
							style={{ animation: "testFall 2s linear infinite" }}
						/>
					)}
				</div>
			);
		};
		track({
			id: "test-spawning",
			name: "Spawning",
			component: SpawningSaver,
		});

		const spawnAndStart = (reduce: boolean) => {
			vi.useFakeTimers();
			vi.stubGlobal(
				"matchMedia",
				vi.fn((query: string) => ({
					matches: reduce && query === "(prefers-reduced-motion: reduce)",
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
				})),
			);
			setData({ active: true, selectedSaver: "test-spawning" });
			const { container } = render(<ClassicyScreenSaver />);
			expect(container.querySelector(".testSpawned")).toBeNull();
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			const spawned = container.querySelector<HTMLElement>(".testSpawned");
			expect(spawned?.style.animation).toContain("testFall");
			const animation = { pause: vi.fn(), play: vi.fn() };
			Object.defineProperty(spawned, "getAnimations", {
				configurable: true,
				value: () => [animation],
			});
			spawned?.dispatchEvent(new Event("animationstart", { bubbles: true }));
			return animation;
		};

		afterEach(() => {
			vi.useRealTimers();
			vi.unstubAllGlobals();
		});

		it("pauses an animation that starts after mount under reduced motion", () => {
			expect(spawnAndStart(true).pause).toHaveBeenCalled();
		});

		it("leaves it running without a reduced-motion preference", () => {
			expect(spawnAndStart(false).pause).not.toHaveBeenCalled();
		});
	});

	it("marks the overlay transparent for savers that reveal the desktop", () => {
		setData({ active: true, selectedSaver: "fake-fade" });
		const { container } = render(<ClassicyScreenSaver />);
		expect(
			container.querySelector(".classicyScreenSaverOverlayTransparent"),
		).not.toBeNull();
	});

	it("draws the first offered saver for an unknown saver id", () => {
		setData({ active: true, selectedSaver: "no-such-saver" });
		const { container } = render(<ClassicyScreenSaver />);
		expect(container.querySelector(".fakeBall")).not.toBeNull();
	});

	describe("follows the active package", () => {
		const LAYOUT: ClassicyAppearancePackage["layout"] = {
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		};
		const registerPkg = (id: string, defaultScreenSaver?: string) =>
			registerClassicyAppearancePackage({
				id,
				name: id,
				css: "",
				defaults: {
					...structuredClone(CLASSICY_CORE_DEFAULT_THEME),
					package: id,
				},
				layout: LAYOUT,
				defaultScreenSaver,
			});

		it("the overlay draws the active package's default when the stored choice belongs to another package", () => {
			resetClassicyScreenSaversForTests();
			registerClassicyScreenSaver({
				id: "theirs",
				name: "Theirs",
				component: () => <div className="theirs" />,
				packages: ["pkg-b"],
			});
			registerClassicyScreenSaver({
				id: "ours",
				name: "Ours",
				component: () => <div className="ours" />,
				packages: ["pkg-a"],
			});
			registerPkg("pkg-a", "ours");
			mockPackageId.current = "pkg-a";
			setData({ active: true, selectedSaver: "theirs" });
			const { container } = render(<ClassicyScreenSaver />);
			expect(container.querySelector(".ours")).not.toBeNull();
			expect(container.querySelector(".theirs")).toBeNull();
		});

		it("draws no overlay when no saver is offered, even when active", () => {
			resetClassicyScreenSaversForTests();
			registerClassicyScreenSaver({
				id: "theirs",
				name: "Theirs",
				component: () => <div className="theirs" />,
				packages: ["pkg-b"],
			});
			registerPkg("pkg-a");
			mockPackageId.current = "pkg-a";
			setData({ active: true, selectedSaver: "theirs" });
			const { container } = render(<ClassicyScreenSaver />);
			expect(container.querySelector(".classicyScreenSaverOverlay")).toBeNull();
			expect(
				document.documentElement.classList.contains(
					SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS,
				),
			).toBe(false);
		});
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
		setData({ active: true, selectedSaver: "fake-logo" });
		const { rerender, unmount } = render(<ClassicyScreenSaver />);
		expect(root.classList.contains(SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS)).toBe(
			true,
		);
		// Waking clears `active`; the overlay unmounts and the class goes with it.
		setData({ selectedSaver: "fake-logo" });
		rerender(<ClassicyScreenSaver />);
		expect(root.classList.contains(SCREEN_SAVER_ACTIVE_DOCUMENT_CLASS)).toBe(
			false,
		);
		unmount();
	});

	it("takes the pointer-hiding class off when the whole extension unmounts", () => {
		setData({ active: true, selectedSaver: "fake-logo" });
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
		mockPackageId.current = undefined;
		setData({});
	});

	afterEach(() => {
		vi.useRealTimers();
		restoreFakes();
	});

	it("never activates when no saver is offered", () => {
		resetClassicyScreenSaversForTests();
		render(<ClassicyScreenSaver />);
		vi.advanceTimersByTime(60 * 60_000);
		expect(dispatchedTypes()).not.toContain("ClassicyAppScreenSaverActivate");
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

	it("wakes on mouse movement while active without canceling the event", () => {
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
