import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	initialPlayer,
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";

vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

// Feed a fixed selection through the Zustand hook the provider reads.
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (s: unknown) => unknown): unknown =>
			selector({
				System: {
					Manager: { Appearance: { alertSound: "ClassicyAlertQuack" } },
				},
			}),
	}),
);

const Probe = () => {
	const sound = useSound();
	return <span data-testid="sel">{sound.alertSound}</span>;
};

describe("ClassicySoundManagerProvider alert bridge", () => {
	it("mirrors the Zustand alertSound selection into sound state", () => {
		render(
			<ClassicySoundManagerProvider>
				<Probe />
			</ClassicySoundManagerProvider>,
		);
		expect(screen.getByTestId("sel").textContent).toBe("ClassicyAlertQuack");
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
