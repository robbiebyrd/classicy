import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import {
	CLASSICY_CONTROL_STRIP_MODULE_IDS,
	registerClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { ClassicyPopUpSlider } from "@/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider";

const useSoundMuted = (): boolean => useSound().disabled.includes("*");

/** The speaker loses its waves while sound is off or the volume is at the bottom. */
const useSoundModuleIcon = (): string => {
	const { volume = 100 } = useSound();
	return useSoundMuted() || volume === 0
		? ClassicyIcons.system.controlStrip.soundOff
		: ClassicyIcons.system.controlStrip.sound;
};

/**
 * Figure 2-16's vertical slider. It sets the system volume (ClassicyVolumeSet);
 * raising it while sound is off turns sound back on.
 */
const ClassicySoundControlStripSlider = () => {
	const { volume = 100 } = useSound();
	const player = useSoundDispatch();
	const muted = useSoundMuted();
	const setVolume = (next: number) => {
		player({ type: "ClassicyVolumeSet", volume: next });
		// Only the "*" mute flag: per-sound choices in the Sound control panel
		// stay as they are.
		if (muted && next > 0)
			player({ type: "ClassicySoundEnableOne", enabled: "*" });
	};
	return (
		<ClassicyPopUpSlider
			ariaLabel="Volume"
			value={muted ? 0 : volume}
			onChange={setVolume}
		/>
	);
};

/**
 * Sound: Figure 2-16's volume module, registered with the sound provider that
 * powers it. System-level, so it has no owning app and always shows unless
 * the host disables it or the user hides it.
 */
export const CLASSICY_SOUND_CONTROL_STRIP_MODULE =
	registerClassicyControlStripModule({
		id: CLASSICY_CONTROL_STRIP_MODULE_IDS.sound,
		label: "Sound",
		order: 10,
		icon: useSoundModuleIcon,
		fileIcon: ClassicyIcons.controlPanels.soundManager.app,
		content: ClassicySoundControlStripSlider,
	});
