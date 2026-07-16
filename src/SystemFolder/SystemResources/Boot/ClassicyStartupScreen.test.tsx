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

type MockApp = {
	id: string;
	name: string;
	icon: string;
	open: boolean;
	extension?: boolean;
};

const mockApps = vi.hoisted(() => ({
	current: {} as Record<string, MockApp>,
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: { Manager: { Applications: { apps: mockApps.current } } },
			}),
	}),
);

describe("ClassicyStartupScreen", () => {
	beforeEach(() => {
		sessionStorage.clear();
		mockPlayer.mockClear();
		mockApps.current = {};
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
		expect(screen.getByAltText("Classicy")).toBeInTheDocument();
		expect(screen.getByText("Classicy")).toBeInTheDocument();
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

	it("centers the Starting Up label over the progress bar", () => {
		render(<ClassicyStartupScreen />);
		const label = screen.getByText("Starting Up…");
		expect(label.closest(".classicyLabelAlignCenter")).not.toBeNull();
	});
});

const extApp = (id: string, name: string): MockApp => ({
	id,
	name,
	icon: `/icons/${id}.png`,
	open: true,
	extension: true,
});

describe("ClassicyStartupScreen extension parade", () => {
	beforeEach(() => {
		sessionStorage.clear();
		mockApps.current = {};
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders no parade row when no extensions are registered", () => {
		mockApps.current = {
			"Finder.app": { id: "Finder.app", name: "Finder", icon: "", open: true },
		};
		const { container } = render(<ClassicyStartupScreen />);
		expect(
			container.querySelector(".classicyStartupScreenExtensions"),
		).toBeNull();
	});

	it("reveals extension icons one at a time, paced by duration/(N+1)", () => {
		mockApps.current = {
			"AExt.app": extApp("AExt.app", "Alpha"),
			"BExt.app": extApp("BExt.app", "Beta"),
			"CExt.app": extApp("CExt.app", "Gamma"),
		};
		// duration 4000, N=3 → reveal interval 1000ms
		const { container } = render(<ClassicyStartupScreen />);
		const icons = () =>
			container.querySelectorAll(".classicyStartupScreenExtensions img").length;

		expect(icons()).toBe(0);
		act(() => {
			vi.advanceTimersByTime(950);
		});
		expect(icons()).toBe(0);
		act(() => {
			vi.advanceTimersByTime(100); // t=1050
		});
		expect(icons()).toBe(1);
		expect(screen.getByAltText("Alpha")).toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(1000); // t=2050
		});
		expect(icons()).toBe(2);
		act(() => {
			vi.advanceTimersByTime(1000); // t=3050
		});
		expect(icons()).toBe(3);
		// splash still visible with the full parade before completion
		expect(
			container.querySelector(".classicyStartupScreen"),
		).toBeInTheDocument();
	});

	it("excludes non-extension apps from the parade", () => {
		mockApps.current = {
			"Finder.app": { id: "Finder.app", name: "Finder", icon: "", open: true },
			"AExt.app": extApp("AExt.app", "Alpha"),
		};
		// N=1 → interval 2000ms
		const { container } = render(<ClassicyStartupScreen />);
		act(() => {
			vi.advanceTimersByTime(3000);
		});
		const imgs = container.querySelectorAll(
			".classicyStartupScreenExtensions img",
		);
		expect(imgs).toHaveLength(1);
		expect(screen.getByAltText("Alpha")).toBeInTheDocument();
	});
});
