import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { ClassicyBootSequence } from "@/SystemFolder/SystemResources/Boot/ClassicyBootSequence";

const mockPlayer = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: {
		system: { macosSvg: "macos.svg" },
		ui: { halftoneLarge: "halftone-large.png" },
	},
}));

vi.mock(
	"@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/Boot/ClassicyBootSequence.scss",
	() => ({}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Applications: { apps: {} },
						Boot: { paradeIcons: [] },
					},
				},
			}),
	}),
);

const powerOnScreen = (powerOn: () => void) => (
	<button type="button" onClick={powerOn}>
		POWER ON
	</button>
);

describe("ClassicyBootSequence", () => {
	beforeEach(() => {
		sessionStorage.clear();
		mockPlayer.mockClear();
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("goes straight to the startup screen (chime fires) with no preBootScreen", () => {
		const { container } = render(<ClassicyBootSequence />);
		expect(container.querySelector(".classicyPreBootScreen")).toBeNull();
		expect(container.querySelector(".classicyStartupScreen")).toBeInTheDocument();
		expect(mockPlayer).toHaveBeenCalledWith({
			type: "ClassicySoundPlay",
			sound: "ClassicyBoot",
		});
	});

	it("shows the power-on screen and does NOT play the chime yet", () => {
		const { container } = render(
			<ClassicyBootSequence preBootScreen={powerOnScreen} />,
		);
		expect(
			container.querySelector(".classicyPreBootScreen"),
		).toBeInTheDocument();
		expect(screen.getByText("POWER ON")).toBeInTheDocument();
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
		expect(mockPlayer).not.toHaveBeenCalled();
	});

	it("covers the desktop with the halftone pattern via a CSS custom property", () => {
		const { container } = render(
			<ClassicyBootSequence preBootScreen={powerOnScreen} />,
		);
		const overlay = container.querySelector(
			".classicyPreBootScreen",
		) as HTMLElement;
		expect(overlay.style.getPropertyValue("--classicy-preboot-halftone")).toBe(
			"url(halftone-large.png)",
		);
	});

	it("advances to the startup screen and plays the chime on POWER ON", () => {
		const { container } = render(
			<ClassicyBootSequence preBootScreen={powerOnScreen} />,
		);
		act(() => {
			fireEvent.click(screen.getByText("POWER ON"));
		});
		expect(container.querySelector(".classicyPreBootScreen")).toBeNull();
		expect(container.querySelector(".classicyStartupScreen")).toBeInTheDocument();
		expect(mockPlayer).toHaveBeenCalledWith({
			type: "ClassicySoundPlay",
			sound: "ClassicyBoot",
		});
	});

	it("skips the power-on screen when the session was already shown", () => {
		sessionStorage.setItem("classicyStartupScreenShown", "true");
		const { container } = render(
			<ClassicyBootSequence preBootScreen={powerOnScreen} />,
		);
		expect(container.querySelector(".classicyPreBootScreen")).toBeNull();
		// startup screen self-gates to null; nothing renders, no chime.
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
		expect(mockPlayer).not.toHaveBeenCalled();
	});

	it("with startupScreen=false, POWER ON reveals the desktop and plays no chime", () => {
		const { container } = render(
			<ClassicyBootSequence
				startupScreen={false}
				preBootScreen={powerOnScreen}
			/>,
		);
		expect(
			container.querySelector(".classicyPreBootScreen"),
		).toBeInTheDocument();
		act(() => {
			fireEvent.click(screen.getByText("POWER ON"));
		});
		expect(container.querySelector(".classicyPreBootScreen")).toBeNull();
		expect(container.querySelector(".classicyStartupScreen")).toBeNull();
		expect(mockPlayer).not.toHaveBeenCalled();
	});

	it("marks the session on POWER ON with startupScreen=false so a reload skips the gate", () => {
		const { unmount } = render(
			<ClassicyBootSequence startupScreen={false} preBootScreen={powerOnScreen} />,
		);
		act(() => {
			fireEvent.click(screen.getByText("POWER ON"));
		});
		// Flag is now persisted for this session.
		expect(sessionStorage.getItem("classicyStartupScreenShown")).toBe("true");
		// Simulate a reload within the same tab session: a brand-new mount.
		unmount();
		const second = render(
			<ClassicyBootSequence startupScreen={false} preBootScreen={powerOnScreen} />,
		);
		expect(
			second.container.querySelector(".classicyPreBootScreen"),
		).toBeNull();
	});
});
