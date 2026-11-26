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
	type ClassicySoundState,
	classicySoundGain,
	classicySoundStateReducer,
	initialPlayer,
	runClassicySoundCommand,
	seedClassicySoundState,
	unloadClassicySoundPlayer,
} from "./ClassicySoundManagerUtils";

/**
 * The seeded state with the persisted alert sound and alert volume read in
 * at once, so an alert a child plays from its mount effect (before the
 * bridge effects below have run) is judged by them.
 */
const withStoredAlert = (ss: ClassicySoundState): ClassicySoundState => {
	// A store stand-in without `getState` (a test's) seeds nothing here; the
	// bridge effects below still mirror the values in.
	const appearance =
		typeof useAppManager.getState === "function"
			? useAppManager.getState()?.System?.Manager?.Appearance
			: undefined;
	let next = ss;
	if (appearance?.alertSound)
		next = classicySoundStateReducer(next, {
			type: ClassicySoundActionTypes.ClassicySoundSetAlertSound,
			sound: appearance.alertSound,
		});
	if (typeof appearance?.alertVolume === "number")
		next = classicySoundStateReducer(next, {
			type: ClassicySoundActionTypes.ClassicySoundSetAlertVolume,
			alertVolume: appearance.alertVolume,
		});
	return next;
};

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
		classicySoundStateReducer,
		initialPlayer,
		(base) =>
			withStoredAlert(seedClassicySoundState(base, packId, defaultMuted)),
	);

	// The players, built here and never in the reducer (React calls reducers
	// and initializers twice in StrictMode): one Howl per pack, kept in a
	// cache that survives StrictMode's simulated unmount and is unloaded
	// when the provider really unmounts. They reach the state through
	// `ClassicySoundSetPlayers`, and the commands run on the state's players,
	// so a host's `ClassicySoundSet` player plays too.
	const cache = useRef(new Map<string, Howl>());
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
				for (const player of built.values()) unloadClassicySoundPlayer(player);
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
		soundDispatch({
			type: ClassicySoundActionTypes.ClassicySoundSetPlayers,
			soundPlayer: built.soundPlayer ?? undefined,
			fallbackPlayer: built.fallbackPlayer,
		});
	}, [loadedPackId, fallbackPackId, loadedPack]);

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
	// when a sound theme loads a new player, so the level carries over. It
	// runs before the queued commands below, in the same commit: a gain set
	// on a whole player after an alert played would override the alert's
	// own level (system gain × alert volume).
	// A player already at the gain is left alone: re-setting a whole
	// player's gain would reset an alert still sounding on it (a pack switch
	// keeps the default pack's player as the stand-in).
	const { soundPlayer, fallbackPlayer, volume } = sound;
	const gains = useRef(new WeakMap<Howl, number>());
	useEffect(() => {
		const gain = classicySoundGain(volume);
		for (const player of [soundPlayer, fallbackPlayer]) {
			if (!player || gains.current.get(player) === gain) continue;
			player.volume(gain);
			gains.current.set(player, gain);
		}
	}, [soundPlayer, fallbackPlayer, volume]);

	// The queued commands (plays, stops), each run once, in order, on the
	// state's players, each judged by the mute, alert sound and levels it was
	// queued under; a command queued before the players for the state's pack
	// are set waits for them (the boot chime a child asks for on mount).
	// With no pack at all they run on no player: silence, as before.
	const ranThrough = useRef(0);
	useEffect(() => {
		const pending = (sound.commands ?? []).filter(
			(c) => c.id > ranThrough.current,
		);
		if (pending.length === 0) return;
		if ((sound.playersPackId ?? null) !== sound.packId) return;
		for (const command of pending)
			runClassicySoundCommand({ ...sound, ...command.policy }, command.action);
		ranThrough.current = pending[pending.length - 1].id;
		soundDispatch({
			type: ClassicySoundActionTypes.ClassicySoundCommandsRun,
			through: ranThrough.current,
		});
	}, [sound]);

	return (
		<ClassicySoundManagerContext.Provider value={sound}>
			<ClassicySoundDispatchContext.Provider value={soundDispatch}>
				{children}
			</ClassicySoundDispatchContext.Provider>
		</ClassicySoundManagerContext.Provider>
	);
};
