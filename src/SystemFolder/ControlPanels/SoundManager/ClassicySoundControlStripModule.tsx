import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { SOUND_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerManifest";
import {
	CLASSICY_CONTROL_STRIP_MODULE_IDS,
	registerClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { ClassicyPopUpSlider } from "@/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSlider";

const useSoundMuted = (): boolean => useSound().disabled.includes("*");

/**
 * The speaker loses its waves while sound is off or the volume is at the
 * bottom. Read from the active package's icons at render time (System 7
 * draws its Sound Volume module's glyph).
 */
const useSoundModuleIcon = (): string => {
	const { volume = 100 } = useSound();
	const off = useSoundMuted() || volume === 0;
	const on = useClassicyAsset("icons", "system.controlStrip.sound");
	const offIcon = useClassicyAsset("icons", "system.controlStrip.soundOff");
	return off
		? (offIcon ?? ClassicyIcons.system.controlStrip.soundOff)
		: (on ?? ClassicyIcons.system.controlStrip.sound);
};

/**
 * The volume icon's tip in the Windows shell's status area: "Volume", and
 * "Volume (muted)" while sound is off (Windows 98 SE's systray.exe strings).
 */
const useSoundTrayLabel = (): string =>
	useSoundMuted() ? "Volume (muted)" : "Volume";

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
		// The Windows shell's status area only (the Control Strip reads
		// neither): Windows 98 SE's volume icon's menu, "&Open Volume
		// Controls" (bold, the default), opens the Sound control panel, the
		// one Classicy has; its second item, "&Adjust Audio Properties",
		// opens Multimedia Properties, which Classicy has no separate panel
		// for, so it is left out. Its tips are systray.exe's.
		panel: {
			id: SOUND_MANAGER_APP_ID,
			name: "Sound Manager",
			icon: ClassicyIcons.controlPanels.soundManager.app,
			command: "Open Volume Controls",
		},
		trayLabel: useSoundTrayLabel,
	});
