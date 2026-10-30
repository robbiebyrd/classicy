// Side-effect import: registers the Sound Control Strip module, which needs
// this provider's context.
import "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundControlStripModule";
// Side-effect import: registers the Platinum sound pack, which lives with the
// Platinum package's assets. The provider loads it for any sprite the active
// pack lacks, so it must be registered whichever module loads first.
import "@/Appearance/Platinum/assets/sounds/platinum";
import {
	type FC as FunctionalComponent,
	type ReactNode,
	useEffect,
	useReducer,
} from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	CLASSICY_DEFAULT_SOUND_PACK_ID,
	getClassicySoundPack,
	useClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import {
	ClassicySoundDispatchContext,
	ClassicySoundManagerContext,
	ClassicySoundStateEventReducer,
	classicySoundGain,
	initialPlayer,
	seedSoundState,
} from "./ClassicySoundManagerUtils";

export const ClassicySoundManagerProvider: FunctionalComponent<{
	children: ReactNode;
	/**
	 * Boot with sound off. First-mount default only — mirrors React's
	 * `defaultChecked`/`defaultValue` convention, so changing it later does
	 * nothing and the menu bar widget stays free to unmute at runtime.
	 * Not persisted; sound state is per-mount.
	 */
	defaultMuted?: boolean;
}> = ({ children, defaultMuted }) => {
	// Muting is the `"*"` wildcard in `disabled` — the same flag the menu bar
	// widget and Sound control panel toggle, and the one `playerCanPlay` gates
	// on. The lazy initializer seeds it exactly once per mount and copies
	// `initialPlayer` rather than mutating that module-level singleton.
	// The same initializer loads the persisted theme's sound pack, so the
	// player exists before children's mount effects (the boot chime) dispatch.
	// The selector reads the pack id string, so editing any other part of the
	// theme never re-runs the load effect below.
	const packId =
		useAppManager(
			(s) => s.System.Manager.Appearance?.activeTheme?.sound?.pack,
		) ?? CLASSICY_DEFAULT_SOUND_PACK_ID;
	const packs = useClassicySoundPacks();
	const [sound, soundDispatch] = useReducer(
		ClassicySoundStateEventReducer,
		initialPlayer,
		(base) => seedSoundState(base, packId, defaultMuted),
	);

	// Load the theme's pack when it changes, or when it is registered after
	// mount (`packs` is the registry snapshot). Falls back to Platinum while the
	// pack is unknown.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `packs` is the registry snapshot; it re-runs the load when a pack registers after mount.
	useEffect(() => {
		const pack =
			getClassicySoundPack(packId) ??
			getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID);
		if (!pack || pack.id === sound.packId) return;
		soundDispatch({
			type: "ClassicySoundLoad",
			pack,
			disabled:
				useAppManager.getState().System.Manager.Appearance?.activeTheme?.sound
					?.disabled,
		});
	}, [packId, packs, sound.packId]);

	// Bridge the persisted Appearance selection (Zustand) into the sound state
	// so the reducer stays pure and the ClassicyAlertSound/PlayError events can
	// resolve the current choice without reaching across stores.
	const alertSound = useAppManager(
		(s) => s.System.Manager.Appearance?.alertSound,
	);
	useEffect(() => {
		if (alertSound) {
			soundDispatch({ type: "ClassicySoundSetAlertSound", sound: alertSound });
		}
	}, [alertSound]);
	const alertVolume = useAppManager(
		(s) => s.System.Manager.Appearance?.alertVolume,
	);
	useEffect(() => {
		// 0 is a real level, so test for a number rather than truthiness.
		if (typeof alertVolume === "number") {
			soundDispatch({ type: "ClassicySoundSetAlertVolume", alertVolume });
		}
	}, [alertVolume]);

	// The system volume (ClassicyVolumeSet) is the player's gain. Re-applied
	// when a sound theme loads a new player, so the level carries over.
	const { soundPlayer, fallbackPlayer, volume } = sound;
	useEffect(() => {
		soundPlayer?.volume(classicySoundGain(volume));
		fallbackPlayer?.volume(classicySoundGain(volume));
	}, [soundPlayer, fallbackPlayer, volume]);

	return (
		<ClassicySoundManagerContext.Provider value={sound}>
			<ClassicySoundDispatchContext.Provider value={soundDispatch}>
				{children}
			</ClassicySoundDispatchContext.Provider>
		</ClassicySoundManagerContext.Provider>
	);
};
