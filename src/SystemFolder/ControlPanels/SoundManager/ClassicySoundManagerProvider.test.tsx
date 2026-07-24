import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { useSound } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
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
