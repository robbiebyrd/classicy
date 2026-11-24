// Side-effect import: registers the Sound Control Strip module, which needs
// this provider's context.
import "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundControlStripModule";
import type { Howl } from "howler";
import {
	type FC as FunctionalComponent,
	type ReactNode,
	useEffect,
	useReducer,
	useRef,
} from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { findClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPackLookup.internal";
import {
	CLASSICY_DEFAULT_SOUND_PACK_ID,
	useClassicySoundPacks,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import {
	buildClassicySoundPlayers,
	ClassicySoundActionTypes,
	ClassicySoundDispatchContext,
	ClassicySoundManagerContext,
	type ClassicySoundPlayers,
	ClassicySoundStateEventReducer,
	classicySoundGain,
	initialPlayer,
	runClassicySoundCommand,
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

	// The players, built here and never in the reducer (React calls reducers
	// and initializers twice in StrictMode): one Howl per pack, kept in a
	// cache that survives StrictMode's simulated unmount and is unloaded
	// when the provider really unmounts. `players` is what the commands run
	// on, with the pack it was built for.
	const cache = useRef(new Map<string, Howl>());
	const players = useRef<ClassicySoundPlayers & { packId: string | null }>({
		packId: null,
		soundPlayer: null,
		fallbackPlayer: null,
	});
	const mounted = useRef(false);
	useEffect(() => {
		mounted.current = true;
		const built = cache.current;
		return () => {
			mounted.current = false;
			// StrictMode remounts at once; only a real unmount lets this run
			// with the provider still gone.
			setTimeout(() => {
				if (mounted.current) return;
				for (const player of built.values()) player.unload();
				built.clear();
			}, 0);
		};
	}, []);
	const { packId: loadedPackId, fallbackPackId, pack: loadedPack } = sound;
	useEffect(() => {
		const built = buildClassicySoundPlayers(
			{ packId: loadedPackId, fallbackPackId, pack: loadedPack },
			cache.current,
		);
		players.current = { packId: loadedPackId, ...built };
		soundDispatch({
			type: ClassicySoundActionTypes.ClassicySoundSetPlayers,
			soundPlayer: built.soundPlayer ?? undefined,
			fallbackPlayer: built.fallbackPlayer,
		});
	}, [loadedPackId, fallbackPackId, loadedPack]);

	// The queued commands (plays, stops), each run once, in order, on the
	// players built for the pack the state names; a command queued before
	// they are waits for them (the boot chime a child asks for on mount).
	// With no pack at all they run on no player: silence, as before.
	const ranThrough = useRef(0);
	useEffect(() => {
		const pending = (sound.commands ?? []).filter(
			(c) => c.id > ranThrough.current,
		);
		if (pending.length === 0) return;
		if (sound.packId !== null && players.current.packId !== sound.packId)
			return;
		for (const command of pending)
			runClassicySoundCommand(sound, command.action, players.current);
		ranThrough.current = pending[pending.length - 1].id;
		soundDispatch({
			type: ClassicySoundActionTypes.ClassicySoundCommandsRun,
			through: ranThrough.current,
		});
	}, [sound]);

	// Load the theme's pack when it changes, or when it is registered after
	// mount (`packs` is the registry snapshot). Falls back to the default pack
	// while the theme's is unknown, and stays silent while neither is
	// registered (the core ships no pack; Platinum's comes with its package).
	// biome-ignore lint/correctness/useExhaustiveDependencies: `packs` is the registry snapshot; it re-runs the load when a pack registers after mount.
	useEffect(() => {
		const pack =
			findClassicySoundPack(packId) ??
			findClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID);
		if (!pack) return;
		if (pack.id === sound.packId) {
			// Loaded already; only the stand-in for the sprites it lacks can be
			// missing, when the default pack registered after this one loaded.
			if (
				!sound.fallbackPackId &&
				pack.id !== CLASSICY_DEFAULT_SOUND_PACK_ID &&
				findClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID)
			) {
				soundDispatch({ type: "ClassicySoundLoadFallback" });
			}
			return;
		}
		soundDispatch({
			type: "ClassicySoundLoad",
			pack,
			disabled:
				useAppManager.getState().System.Manager.Appearance?.activeTheme?.sound
					?.disabled,
		});
	}, [packId, packs, sound.packId, sound.fallbackPackId]);

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
