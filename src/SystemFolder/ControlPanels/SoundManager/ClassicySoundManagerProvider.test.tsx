import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	initialPlayer,
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { registerClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

registerClassicySoundPack({
	id: "platinum",
	name: "Platinum",
	src: ["platinum.mp3"],
	sprite: { ClassicyBeep: [0, 100] },
});

const { players } = vi.hoisted(() => ({
	players: [] as { volume: ReturnType<typeof vi.fn> }[],
}));

vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
		constructor() {
			players.push(this);
		}
	},
}));

vi.mock("@/Appearance/Platinum/assets/sounds/platinum", () => ({}));

// Feed a fixed selection through the Zustand hook the provider reads. The
// Appearance slice is hoisted so individual tests can vary it.
const { mockAppearance } = vi.hoisted(() => ({
	mockAppearance: {
		alertSound: "ClassicyAlertQuack",
		alertVolume: undefined as number | undefined,
	},
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (s: unknown) => unknown): unknown =>
			selector({
				System: { Manager: { Appearance: mockAppearance } },
			}),
	}),
);

const Probe = () => {
	const sound = useSound();
	return (
		<>
			<span data-testid="sel">{sound.alertSound}</span>
			<span data-testid="alertVolume">{String(sound.alertVolume)}</span>
		</>
	);
};

describe("ClassicySoundManagerProvider alert bridge", () => {
	afterEach(() => {
		mockAppearance.alertVolume = undefined;
	});

	it("mirrors the Zustand alertSound selection into sound state", () => {
		render(
			<ClassicySoundManagerProvider>
				<Probe />
			</ClassicySoundManagerProvider>,
		);
		expect(screen.getByTestId("sel").textContent).toBe("ClassicyAlertQuack");
	});

	it("mirrors the Zustand alertVolume into sound state, including 0", () => {
		mockAppearance.alertVolume = 0;
		render(
			<ClassicySoundManagerProvider>
				<Probe />
			</ClassicySoundManagerProvider>,
		);
		expect(screen.getByTestId("alertVolume").textContent).toBe("0");
	});

	it("keeps the 100% default when the store has no alertVolume", () => {
		render(
			<ClassicySoundManagerProvider>
				<Probe />
			</ClassicySoundManagerProvider>,
		);
		expect(screen.getByTestId("alertVolume").textContent).toBe("100");
	});
});

// "Muted" is the `"*"` wildcard in `disabled` — the same flag the menu bar
// widget and the Sound control panel toggle, and the one `playerCanPlay`
// gates on. There is no separate boolean.
const MuteProbe = () => {
	const sound = useSound();
	const dispatch = useSoundDispatch();
	return (
		<>
			<span data-testid="disabled">{JSON.stringify(sound.disabled)}</span>
			<button
				type="button"
				onClick={() => dispatch({ type: "ClassicySoundDisable", disabled: [] })}
			>
				unmute
			</button>
		</>
	);
};

const renderMuteProbe = (defaultMuted?: boolean) =>
	render(
		<ClassicySoundManagerProvider defaultMuted={defaultMuted}>
			<MuteProbe />
		</ClassicySoundManagerProvider>,
	);

describe("ClassicySoundManagerProvider defaultMuted", () => {
	it("boots unmuted when defaultMuted is omitted", () => {
		renderMuteProbe();
		expect(screen.getByTestId("disabled").textContent).toBe("[]");
	});

	it("boots muted when defaultMuted is set", () => {
		renderMuteProbe(true);
		expect(screen.getByTestId("disabled").textContent).toBe('["*"]');
	});

	it("lets the runtime unmute a provider that booted muted", () => {
		renderMuteProbe(true);
		fireEvent.click(screen.getByRole("button", { name: "unmute" }));
		expect(screen.getByTestId("disabled").textContent).toBe("[]");
	});

	it("ignores defaultMuted changes after the first mount", () => {
		const { rerender } = renderMuteProbe(true);
		rerender(
			<ClassicySoundManagerProvider defaultMuted={false}>
				<MuteProbe />
			</ClassicySoundManagerProvider>,
		);
		expect(screen.getByTestId("disabled").textContent).toBe('["*"]');
	});

	it("does not mutate the shared initialPlayer singleton", () => {
		renderMuteProbe(true);
		expect(initialPlayer.disabled).toEqual([]);
	});
});

const VolumeProbe = () => {
	const sound = useSound();
	const dispatch = useSoundDispatch();
	return (
		<button
			type="button"
			onClick={() => dispatch({ type: "ClassicyVolumeSet", volume: 40 })}
		>
			{`gain-${sound.volume}`}
		</button>
	);
};

describe("ClassicySoundManagerProvider volume", () => {
	it("applies the system volume to the player as its gain", () => {
		players.length = 0;
		render(
			<ClassicySoundManagerProvider>
				<VolumeProbe />
			</ClassicySoundManagerProvider>,
		);
		const player = players[0];
		expect(player.volume).toHaveBeenLastCalledWith(1);
		fireEvent.click(screen.getByRole("button", { name: "gain-100" }));
		expect(player.volume).toHaveBeenLastCalledWith(0.4);
	});
});
