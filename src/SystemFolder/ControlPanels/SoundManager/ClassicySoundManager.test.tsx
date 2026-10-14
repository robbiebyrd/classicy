import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicySoundManager } from "./ClassicySoundManager";
import { SOUND_MANAGER_APP_ID } from "./ClassicySoundManagerManifest";

const sound = vi.hoisted(() => ({
	state: {
		disabled: [] as string[],
		labels: [],
		volume: 70 as number | undefined,
	},
	player: vi.fn(),
}));

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useSound: () => sound.state,
		useSoundDispatch: () => sound.player,
	}),
);

const renderOpen = () => {
	dispatch({
		type: "ClassicyAppOpen",
		app: { id: SOUND_MANAGER_APP_ID, name: "Sound Manager", icon: "" },
	});
	return render(<ClassicySoundManager />);
};

afterEach(() => {
	dispatch({ type: "ClassicyAppClose", app: { id: SOUND_MANAGER_APP_ID } });
	cleanup();
	sound.player.mockClear();
	sound.state.disabled = [];
});

describe("ClassicySoundManager", () => {
	it("sets the system volume from its Volume slider", () => {
		renderOpen();
		const slider = screen.getByRole("slider", { name: /Volume/ });
		expect(slider).toHaveValue("70");
		fireEvent.change(slider, { target: { value: "35" } });
		expect(sound.player).toHaveBeenCalledWith({
			type: "ClassicyVolumeSet",
			volume: 35,
		});
	});

	it("toggles only the mute flag, keeping per-sound choices", () => {
		sound.state.disabled = ["*", "ClassicyWindowOpen"];
		renderOpen();
		fireEvent.click(screen.getByLabelText("Enable Interface Sounds"));
		expect(sound.player).toHaveBeenCalledWith({
			type: "ClassicySoundEnableOne",
			enabled: "*",
		});
	});
});
