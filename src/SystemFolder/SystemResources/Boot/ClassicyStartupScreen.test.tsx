import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@/__tests__/test-utils";
import { ClassicyStartupScreen } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen";
import { resetStartupScreenSession } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession";

const mockPlayer = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => mockPlayer,
	}),
);

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { macosSvg: "macos.svg" } },
}));

vi.mock(
	"@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss",
	() => ({}),
);

describe("ClassicyStartupScreen", () => {
	beforeEach(() => {
		sessionStorage.clear();
		mockPlayer.mockClear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders the splash with logo, wordmark, and Starting Up label", () => {
		const { container } = render(<ClassicyStartupScreen />);
		expect(
			container.querySelector(".classicyStartupScreen"),
		).toBeInTheDocument();
		expect(screen.getByAltText("Mac OS")).toBeInTheDocument();
		expect(screen.getByText("Mac OS")).toBeInTheDocument();
		expect(screen.getByText("Starting Up…")).toBeInTheDocument();
	});

	it("plays the ClassicyBoot chime on mount", () => {
		render(<ClassicyStartupScreen />);
		expect(mockPlayer).toHaveBeenCalledWith({
			type: "ClassicySoundPlay",
			sound: "ClassicyBoot",
		});
	});

	it("marks the session so the splash shows only once per session", () => {
		render(<ClassicyStartupScreen />);
		expect(sessionStorage.getItem("classicyStartupScreenShown")).toBe("true");
	});

	it("resetStartupScreenSession clears the key so the splash shows again", () => {
		sessionStorage.setItem("classicyStartupScreenShown", "true");
		resetStartupScreenSession();
		expect(sessionStorage.getItem("classicyStartupScreenShown")).toBeNull();
		const { container } = render(<ClassicyStartupScreen />);
		expect(
			container.querySelector(".classicyStartupScreen"),
		).toBeInTheDocument();
	});

	it("renders nothing when the session key is already set", () => {
		sessionStorage.setItem("classicyStartupScreenShown", "true");
		const { container } = render(<ClassicyStartupScreen />);
		expect(container.firstChild).toBeNull();
		expect(mockPlayer).not.toHaveBeenCalled();
	});

	it("unmounts itself after the default 4000ms duration", () => {
		const { container } = render(<ClassicyStartupScreen />);
		act(() => {
			vi.advanceTimersByTime(3900);
		});
		expect(
			container.querySelector(".classicyStartupScreen"),
		).toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(200);
		});
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
	});

	it("honors a custom duration", () => {
		const { container } = render(<ClassicyStartupScreen duration={1000} />);
		act(() => {
			vi.advanceTimersByTime(1100);
		});
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
	});

	it("advances the progress bar as time elapses", () => {
		const { container } = render(<ClassicyStartupScreen />);
		act(() => {
			vi.advanceTimersByTime(2000);
		});
		const progress = container.querySelector("progress") as HTMLProgressElement;
		expect(progress.value).toBeGreaterThan(25);
		expect(progress.value).toBeLessThan(75);
	});
});
