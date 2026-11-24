import { Howl } from "howler";
import { createContext, type Dispatch } from "react";
import type { ClassicyStoreSystemManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { findClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPackLookup.internal";
import {
	CLASSICY_DEFAULT_SOUND_PACK_ID,
	type ClassicySoundPack,
	classicySoundPackMissingSprites,
	getClassicySoundPack,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import {
	type SoundData,
	SoundDataSchema,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundSchema";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { resolveClassicyAlertSound } from "./ClassicyAlertSounds";
import {
	classicyAudioAvailable,
	logClassicySoundUnavailable,
} from "./ClassicySoundAvailability.internal";
import soundLabels from "./ClassicySoundManagerLabels.json";

export interface ClassicyStoreSystemSoundManager
	extends ClassicyStoreSystemManager {
	volume: number;
	labels: Record<string, { group: string; label: string; description: string }>;
	disabled: string[];
}

export type ClassicyThemeSound = {
	pack: string;
	disabled: string[];
};

export type ClassicySoundInfo = {
	id: string;
	group: string;
	label: string;
	description: string;
};

export type ClassicySoundState = {
	soundPlayer: Howl | null;
	/** Id of the pack `soundPlayer` was built from; null before any load. */
	packId: string | null;
	/** The loaded pack itself (`ClassicySoundLoad`'s), which its player is built from. */
	pack?: ClassicySoundPack;
	/** Sprite ids the active pack defines. */
	sprites: ReadonlySet<string>;
	/**
	 * The default pack's (Platinum's) player, used for sprites the active pack
	 * lacks. Null when the default pack is the active one or is not registered;
	 * those sprites are then silent.
	 */
	fallbackPlayer: Howl | null;
	disabled: string[];
	labels: ClassicySoundInfo[];
	volume?: number;
	/** Sprite key of the user's selected default alert sound. */
	alertSound?: string;
	/**
	 * Alert sound level as a 0–100 percentage of the system volume (default
	 * 100). Applied only to the alert played by ClassicyAlertSound and
	 * ClassicySoundPlayError.
	 */
	alertVolume?: number;
	/**
	 * The pack the stand-in player for sprites the active pack lacks is built
	 * from: the default pack's id, or null (the active pack is the default,
	 * or the default is not registered). Decided by the reducer; the player
	 * itself is built by `ClassicySoundManagerProvider`.
	 */
	fallbackPackId?: string | null;
	/**
	 * Sound commands (play, stop) not yet run, oldest first.
	 * `classicySoundStateReducer` only queues them; `ClassicySoundManagerProvider`
	 * runs each once, in an effect (`runClassicySoundCommand`), so the reducer
	 * stays pure (React calls it twice in StrictMode). The deprecated
	 * `ClassicySoundStateEventReducer` runs them itself and leaves none.
	 */
	commands?: readonly ClassicySoundCommand[];
	/** The id the next queued command takes. */
	nextCommandId?: number;
	/**
	 * The pack `soundPlayer` and `fallbackPlayer` were set for
	 * (`ClassicySoundSetPlayers`, `ClassicySoundSet`); queued commands wait
	 * while it is not `packId`.
	 */
	playersPackId?: string | null;
	/**
	 * The pack the host's own player (`ClassicySoundSet`) was set for. The
	 * provider's players for that pack (`ClassicySoundSetPlayers`) leave it
	 * in place; a load of another pack replaces it, as it always did, and
	 * clears this, so returning to the pack takes the provider's player.
	 */
	hostPlayerPackId?: string | null;
};

/**
 * What a command is judged by, as it was when the command was queued: a
 * play followed by a mute in one batch still plays, as it did when the
 * reducer played at once.
 */
export type ClassicySoundCommandPolicy = Readonly<
	Pick<ClassicySoundState, "disabled" | "alertSound" | "alertVolume" | "volume">
>;

/** A queued sound command: a play or stop action, with its queue id. */
export type ClassicySoundCommand = Readonly<{
	id: number;
	action: ClassicySoundAction;
	/** The state's mute, alert sound and levels when it was queued. */
	policy: ClassicySoundCommandPolicy;
}>;

export enum ClassicySoundActionTypes {
	ClassicySoundStop = "ClassicySoundStop",
	ClassicySoundPlay = "ClassicySoundPlay",
	ClassicySoundPlayInterrupt = "ClassicySoundPlayInterrupt",
	ClassicySoundPlayError = "ClassicySoundPlayError",
	ClassicySoundLoad = "ClassicySoundLoad",
	ClassicySoundLoadFallback = "ClassicySoundLoadFallback",
	ClassicySoundSet = "ClassicySoundSet",
	ClassicySoundDisable = "ClassicySoundDisable",
	ClassicySoundDisableOne = "ClassicySoundDisableOne",
	ClassicySoundEnableOne = "ClassicySoundEnableOne",
	ClassicyVolumeSet = "ClassicyVolumeSet",
	ClassicyAlertSound = "ClassicyAlertSound",
	ClassicySoundSetAlertSound = "ClassicySoundSetAlertSound",
	ClassicySoundSetAlertVolume = "ClassicySoundSetAlertVolume",
	/** The provider built the players: stores them (`soundPlayer`, `fallbackPlayer`). */
	ClassicySoundSetPlayers = "ClassicySoundSetPlayers",
	/** The provider ran the queued commands through `through`: drops them. */
	ClassicySoundCommandsRun = "ClassicySoundCommandsRun",
}

export interface ClassicySoundAction {
	type: ClassicySoundActionTypes | string;
	sound?: string;
	/** ClassicySoundLoad: the pack to build the player from. */
	pack?: ClassicySoundPack;
	disabled?: string | string[];
	enabled?: string | string[];
	soundPlayer?: Howl;
	/** ClassicySoundSetPlayers: the stand-in player, or null. */
	fallbackPlayer?: Howl | null;
	volume?: number;
	/** ClassicySoundSetAlertVolume: the alert level, 0–100. */
	alertVolume?: number;
	/** ClassicySoundCommandsRun: the last command id run. */
	through?: number;
}

export type { SoundData };
export { SoundDataSchema };

export interface SoundPlayer {
	soundData: SoundData;
	options?: Partial<{
		volume: number;
		loop: boolean;
		autoplay: boolean;
		mute: boolean;
		rate: number;
	}>;
}

export const createSoundPlayer = ({
	soundData,
	options,
}: SoundPlayer): Howl | null => {
	if ("src" in soundData && "sprite" in soundData) {
		// No audio here at all (jsdom, audio disabled): no player, and one
		// quiet note per page, where a Howl would report a load error for
		// every pack it tried. A pack whose own formats fail where audio
		// works still gets its Howl, and its load error (below).
		if (classicyAudioAvailable() === false) {
			logClassicySoundUnavailable();
			return null;
		}
		return new Howl({
			src: soundData.src,
			sprite: soundData.sprite as Record<
				string,
				[number, number] | [number, number, boolean]
			>,
			...options,
			onloaderror: (_id: number, err: unknown) => {
				classicyLog(
					"error",
					"ClassicySoundManager",
					"Failed to load audio sprite",
					{
						src: soundData.src,
						error: err,
					},
				);
			},
			onplayerror: (_id: number, err: unknown) => {
				classicyLog("warn", "ClassicySoundManager", "Audio play error", {
					error: err,
				});
			},
		});
	}
	classicyLog(
		"error",
		"ClassicySoundManager",
		"createSoundPlayer: soundData is missing src or sprite",
		{ soundData },
	);
	return null;
};

/** The system volume as a 0–1 gain for the player (100 when unset). */
export const classicySoundGain = (volume: number | undefined): number =>
	(volume ?? 100) / 100;

export const initialPlayer: ClassicySoundState = {
	soundPlayer: null,
	packId: null,
	sprites: new Set<string>(),
	fallbackPlayer: null,
	disabled: [] as string[],
	labels: soundLabels,
	volume: 100,
	alertVolume: 100,
	fallbackPackId: null,
	commands: [],
	nextCommandId: 1,
};

/**
 * Log, once per build, the sprites `pack` lacks: they fall back to the
 * default pack's player when it is registered, else play nothing.
 */
const warnClassicySoundPackMissingSprites = (pack: ClassicySoundPack) => {
	const missing = classicySoundPackMissingSprites(pack);
	if (missing.length === 0) return;
	const isDefault = pack.id === CLASSICY_DEFAULT_SOUND_PACK_ID;
	// Only the default pack can stand in for the sprites; without it (or when
	// it is the pack missing them) they play nothing.
	const fallsBack =
		!isDefault &&
		getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID) !== undefined;
	classicyLog(
		"warn",
		"ClassicySoundManager",
		fallsBack
			? `Sound pack is missing sprites; falling back to ${CLASSICY_DEFAULT_SOUND_PACK_ID}`
			: "Sound pack is missing sprites; they play nothing",
		{ id: pack.id, missing },
	);
};

/**
 * Unload a player, if it can be: a host's stand-in for Howler (a test's
 * mock) may lack `unload`, and an unload is housekeeping, never worth an
 * exception (the provider's runs from a timer after it unmounts).
 */
export const unloadClassicySoundPlayer = (player: Howl | null | undefined) => {
	if (typeof player?.unload === "function") player.unload();
};

/** The players a sound state plays through. */
export type ClassicySoundPlayers = {
	soundPlayer: Howl | null;
	fallbackPlayer: Howl | null;
};

/**
 * Build the players `ss` wants (its `packId`'s, and its `fallbackPackId`'s)
 * into `cache`, keyed by pack id: one Howl per pack, built once and reused,
 * logging a pack's missing sprites when its player is built. Players of
 * packs `ss` no longer wants are unloaded and dropped. A pack not
 * registered gets no player. Called by `ClassicySoundManagerProvider` from
 * an effect, never from the reducer.
 */
export function buildClassicySoundPlayers(
	ss: Pick<ClassicySoundState, "packId" | "fallbackPackId" | "pack">,
	cache: Map<string, Howl>,
): ClassicySoundPlayers {
	const wanted = [ss.packId, ss.fallbackPackId ?? null].filter(
		(id): id is string => typeof id === "string",
	);
	for (const [id, player] of cache) {
		if (!wanted.includes(id)) {
			unloadClassicySoundPlayer(player);
			cache.delete(id);
		}
	}
	for (const id of wanted) {
		if (cache.has(id)) continue;
		const pack =
			id === ss.packId && ss.pack?.id === id
				? ss.pack
				: getClassicySoundPack(id);
		if (!pack) continue;
		if (id === ss.packId) warnClassicySoundPackMissingSprites(pack);
		const player = createSoundPlayer({ soundData: pack });
		if (player) cache.set(id, player);
	}
	return {
		soundPlayer: (ss.packId && cache.get(ss.packId)) || null,
		fallbackPlayer: (ss.fallbackPackId && cache.get(ss.fallbackPackId)) || null,
	};
}

/**
 * Stop whatever either player is playing. A loop started on one player (the
 * window-move loops) is ended by a sprite that may live on the other, so an
 * interrupt must silence both.
 */
const stopAll = (ss: ClassicySoundState) => {
	ss.soundPlayer?.stop();
	ss.fallbackPlayer?.stop();
};

/** The player that owns `sound`: the active pack's, else the default pack's. */
const playerFor = (ss: ClassicySoundState, sound: string): Howl | null =>
	ss.sprites.has(sound) ? ss.soundPlayer : ss.fallbackPlayer;

/**
 * Initial sound state for a provider mount: `base` (muted when asked) with
 * `packId`'s pack loaded, or the default pack when that one is not registered
 * (yet). Pure: the players are built by the provider's effect, and a play a
 * child's mount effect asks for (the boot chime) waits in the queue until
 * they are. Returns `base` when neither pack is registered (each missing id
 * is logged once), and without a window: a server render touches no audio.
 */
export const seedClassicySoundState = (
	base: ClassicySoundState,
	packId: string,
	muted: boolean | undefined,
): ClassicySoundState => {
	const start = muted ? { ...base, disabled: ["*"] } : base;
	if (typeof window === "undefined") return start;
	const pack =
		findClassicySoundPack(packId) ??
		findClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID);
	return pack
		? classicySoundStateReducer(start, {
				type: ClassicySoundActionTypes.ClassicySoundLoad,
				pack,
			})
		: start;
};

/**
 * @deprecated For a provider of your own on the deprecated
 * `ClassicySoundStateEventReducer`. Initial sound state with the player
 * already built from `packId`'s pack, or the default pack when that one is
 * not registered (yet), so children's mount effects find a player. Returns
 * `base`, with no player, when neither is registered; each missing id is
 * logged once. `ClassicySoundManagerProvider` uses the pure
 * `seedClassicySoundState`.
 */
export const seedSoundState = (
	base: ClassicySoundState,
	packId: string,
	muted: boolean | undefined,
): ClassicySoundState => {
	const start = muted ? { ...base, disabled: ["*"] } : base;
	if (typeof window === "undefined") return start;
	const pack =
		findClassicySoundPack(packId) ??
		findClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID);
	return pack
		? ClassicySoundStateEventReducer(start, {
				type: ClassicySoundActionTypes.ClassicySoundLoad,
				pack,
			})
		: start;
};

export const ClassicySoundManagerContext =
	createContext<ClassicySoundState>(initialPlayer);
export const ClassicySoundDispatchContext = createContext<
	Dispatch<ClassicySoundAction>
>((() => undefined) as Dispatch<ClassicySoundAction>);

const playerCanPlayInterrupt = (ss: ClassicySoundState, sound: string) => {
	return (
		!ss.disabled.includes("*") &&
		!ss.disabled.includes(sound) &&
		playerFor(ss, sound)
	);
};

/** Clamp a 0–100 percentage to a whole number; `undefined` when not finite. */
const clampPercent = (value: number | undefined): number | undefined =>
	typeof value === "number" && Number.isFinite(value)
		? Math.round(Math.min(100, Math.max(0, value)))
		: undefined;

/**
 * Play the alert `sound`, then scale just that instance to system volume ×
 * alert volume. Howler's per-id `volume(v, id)` is absolute (it replaces the
 * player gain for that sound rather than multiplying it), so the product is
 * computed here. Other sounds keep the plain player gain.
 */
const playAlert = (ss: ClassicySoundState, sound: string) => {
	const player = playerFor(ss, sound);
	stopAll(ss);
	const id = player?.play(sound);
	if (typeof id === "number") {
		player?.volume(
			classicySoundGain(ss.volume) * classicySoundGain(ss.alertVolume),
			id,
		);
	}
};

/** The alert to play now: the stored choice if the loaded pack has it. */
const currentAlert = (ss: ClassicySoundState): string | undefined =>
	resolveClassicyAlertSound(
		ss.packId ? getClassicySoundPack(ss.packId) : undefined,
		ss.alertSound,
	);

const playerCanPlay = (ss: ClassicySoundState, sound: string) => {
	return (
		playerCanPlayInterrupt(ss, sound) &&
		!ss.soundPlayer?.playing() &&
		!ss.fallbackPlayer?.playing()
	);
};

/** The command actions: the reducer queues them, the provider runs them. */
const SOUND_COMMANDS: ReadonlySet<string> = new Set([
	ClassicySoundActionTypes.ClassicySoundStop,
	ClassicySoundActionTypes.ClassicySoundPlay,
	ClassicySoundActionTypes.ClassicySoundPlayInterrupt,
	ClassicySoundActionTypes.ClassicySoundPlayError,
	ClassicySoundActionTypes.ClassicyAlertSound,
]);

/** Whether `action` is a sound command (play or stop), run outside the reducer. */
export const isClassicySoundCommand = (action: ClassicySoundAction): boolean =>
	SOUND_COMMANDS.has(action.type);

/**
 * Run one sound command (play or stop) on `players`: what the reducer did
 * itself before it was made pure. `ClassicySoundManagerProvider` calls it once
 * per queued command, from an effect. `players` defaults to the state's own.
 */
export function runClassicySoundCommand(
	state: ClassicySoundState,
	action: ClassicySoundAction,
	players: ClassicySoundPlayers = {
		soundPlayer: state.soundPlayer,
		fallbackPlayer: state.fallbackPlayer,
	},
): void {
	const ss: ClassicySoundState = { ...state, ...players };
	switch (action.type) {
		case ClassicySoundActionTypes.ClassicySoundStop: {
			stopAll(ss);
			return;
		}
		case ClassicySoundActionTypes.ClassicySoundPlay: {
			if (action.sound && playerCanPlay(ss, action.sound)) {
				playerFor(ss, action.sound)?.play(action.sound);
			}
			return;
		}
		case ClassicySoundActionTypes.ClassicySoundPlayInterrupt: {
			if (action.sound && playerCanPlayInterrupt(ss, action.sound)) {
				const player = playerFor(ss, action.sound);
				stopAll(ss);
				player?.play(action.sound);
			}
			return;
		}
		case ClassicySoundActionTypes.ClassicySoundPlayError: {
			const sound = action.sound ?? currentAlert(ss);
			if (sound && playerCanPlayInterrupt(ss, sound)) playAlert(ss, sound);
			return;
		}
		case ClassicySoundActionTypes.ClassicyAlertSound: {
			const sound = currentAlert(ss);
			if (sound && playerCanPlayInterrupt(ss, sound)) playAlert(ss, sound);
			return;
		}
	}
}

/**
 * The sound manager's reducer, as `ClassicySoundManagerProvider` uses it.
 * Pure: a play or stop is queued in `commands` (`isClassicySoundCommand`),
 * with the mute, alert sound and levels it is to be judged by, and loading
 * a pack only records which pack to play (`packId`, `pack`, `sprites`,
 * `fallbackPackId`); the provider builds the players and runs the commands
 * in effects, each once. React calls a reducer twice in StrictMode, so
 * nothing here may play or build.
 */
export const classicySoundStateReducer = (
	ss: ClassicySoundState,
	action: ClassicySoundAction,
): ClassicySoundState => {
	if ("debug" in action) {
		console.group("Sound Event");
		console.log("Action: ", action);
		console.log("Start State: ", ss);
	}

	let next: ClassicySoundState;
	switch (action.type) {
		case ClassicySoundActionTypes.ClassicySoundStop:
		case ClassicySoundActionTypes.ClassicySoundPlay:
		case ClassicySoundActionTypes.ClassicySoundPlayInterrupt:
		case ClassicySoundActionTypes.ClassicySoundPlayError:
		case ClassicySoundActionTypes.ClassicyAlertSound: {
			const id = ss.nextCommandId ?? 1;
			const policy: ClassicySoundCommandPolicy = {
				disabled: ss.disabled,
				alertSound: ss.alertSound,
				alertVolume: ss.alertVolume,
				volume: ss.volume,
			};
			next = {
				...ss,
				commands: [...(ss.commands ?? []), { id, action, policy }],
				nextCommandId: id + 1,
			};
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundCommandsRun: {
			const through = action.through ?? 0;
			const commands = (ss.commands ?? []).filter((c) => c.id > through);
			next =
				commands.length === (ss.commands ?? []).length
					? ss
					: { ...ss, commands };
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundSetPlayers: {
			// A host's own player set for this pack stays: a child sets it from
			// its mount effect, before the provider's players are built.
			const hostKept =
				ss.hostPlayerPackId !== undefined && ss.hostPlayerPackId === ss.packId;
			next = {
				...ss,
				soundPlayer: hostKept ? ss.soundPlayer : (action.soundPlayer ?? null),
				fallbackPlayer: action.fallbackPlayer ?? null,
				playersPackId: ss.packId,
				hostPlayerPackId: hostKept ? ss.hostPlayerPackId : undefined,
			};
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundSetAlertSound: {
			next = { ...ss, alertSound: action.sound ?? ss.alertSound };
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundSetAlertVolume: {
			// Mirrored from Appearance.alertVolume by ClassicySoundManagerProvider.
			const alertVolume = clampPercent(action.alertVolume);
			next = alertVolume === undefined ? ss : { ...ss, alertVolume };
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundLoad: {
			const requested = action.disabled
				? Array.isArray(action.disabled)
					? action.disabled
					: [action.disabled]
				: ss.disabled;
			// A reload never un-mutes: the "*" wildcard (defaultMuted, or the
			// user's mute) survives the theme's own disabled list.
			const disabled =
				ss.disabled.includes("*") && !requested.includes("*")
					? [...requested, "*"]
					: requested;
			const pack = action.pack;
			if (!pack) {
				next = { ...ss, disabled };
				break;
			}
			const isDefault = pack.id === CLASSICY_DEFAULT_SOUND_PACK_ID;
			// The pack to play, and the default pack as the stand-in for the
			// sprites it lacks (when it is another pack and the default is
			// registered). The provider builds both players, logging what the
			// pack lacks, and unloads the previous pack's. A load that moves to
			// another pack ends a host's player (`hostPlayerPackId`), so coming
			// back to the host's pack takes the provider's player for it.
			next = {
				...ss,
				packId: pack.id,
				hostPlayerPackId:
					pack.id === ss.packId ? ss.hostPlayerPackId : undefined,
				pack,
				sprites: new Set(Object.keys(pack.sprite)),
				fallbackPackId:
					!isDefault &&
					getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID) !== undefined
						? CLASSICY_DEFAULT_SOUND_PACK_ID
						: null,
				disabled,
			};
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundLoadFallback: {
			// The default pack registered after the active pack loaded: it stands
			// in for the sprites the active pack lacks. Never replaces one.
			next =
				ss.packId === CLASSICY_DEFAULT_SOUND_PACK_ID ||
				ss.fallbackPackId ||
				getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID) === undefined
					? ss
					: { ...ss, fallbackPackId: CLASSICY_DEFAULT_SOUND_PACK_ID };
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundSet: {
			// A player of the host's own: commands run on it from now on, as
			// they did when the reducer played (until a pack load replaces it).
			next = {
				...ss,
				soundPlayer: action.soundPlayer ?? null,
				playersPackId: ss.packId,
				hostPlayerPackId: ss.packId,
			};
			break;
		}
		case ClassicySoundActionTypes.ClassicyVolumeSet: {
			// A whole-number percentage. ClassicySoundManagerProvider applies it to
			// the player (and to any player loaded later).
			const volume = clampPercent(action.volume);
			next = volume === undefined ? ss : { ...ss, volume };
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundDisable: {
			next = {
				...ss,
				disabled: action.disabled
					? Array.isArray(action.disabled)
						? action.disabled
						: [action.disabled]
					: ss.disabled,
			};
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundDisableOne: {
			if (action.disabled) {
				const toDisable = Array.isArray(action.disabled)
					? action.disabled
					: [action.disabled];
				next = {
					...ss,
					disabled: Array.from(new Set([...ss.disabled, ...toDisable])),
				};
			} else {
				next = ss;
			}
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundEnableOne: {
			if (action.enabled) {
				const enabled = Array.isArray(action.enabled)
					? action.enabled
					: [action.enabled];
				next = {
					...ss,
					disabled: ss.disabled.filter((item) => !enabled.includes(item)),
				};
			} else {
				next = ss;
			}
			break;
		}
		default: {
			next = { ...ss };
			classicyLog(
				"warn",
				"ClassicySoundStateEventReducer",
				"Unhandled action type",
				{
					type: action.type,
				},
			);
			break;
		}
	}

	if ("debug" in action) {
		console.log("End State: ", next);
		console.groupEnd();
	}

	return next;
};

/** The default pack's player, or null while that pack is not registered. */
const createDefaultPackPlayer = (): Howl | null => {
	const fallback = getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID);
	return fallback ? createSoundPlayer({ soundData: fallback }) : null;
};

/**
 * @deprecated Use `ClassicySoundManagerProvider`, which reduces with the
 * pure `classicySoundStateReducer`. Kept for a provider of the host's own
 * (`useReducer(ClassicySoundStateEventReducer, initialPlayer)` with the
 * exported contexts) and for direct callers: it behaves as it did before
 * the reducer was made pure. A pack load builds the new pack's player (and
 * the default pack's as the stand-in), unloading the one it replaces; a
 * play or stop runs at once, against the state it was dispatched to; and
 * the state it returns holds no queued commands. Under React's StrictMode
 * it plays and builds twice, as it always did.
 */
export const ClassicySoundStateEventReducer = (
	ss: ClassicySoundState,
	action: ClassicySoundAction,
): ClassicySoundState => {
	let next = classicySoundStateReducer(ss, action);
	if (
		action.type === ClassicySoundActionTypes.ClassicySoundLoad &&
		action.pack
	) {
		const isDefault = action.pack.id === CLASSICY_DEFAULT_SOUND_PACK_ID;
		warnClassicySoundPackMissingSprites(action.pack);
		unloadClassicySoundPlayer(ss.soundPlayer);
		if (isDefault) unloadClassicySoundPlayer(ss.fallbackPlayer);
		next = {
			...next,
			soundPlayer: createSoundPlayer({ soundData: action.pack }),
			fallbackPlayer: isDefault
				? null
				: (ss.fallbackPlayer ?? createDefaultPackPlayer()),
			playersPackId: next.packId,
		};
	} else if (
		action.type === ClassicySoundActionTypes.ClassicySoundLoadFallback &&
		next !== ss
	) {
		const fallbackPlayer = ss.fallbackPlayer ? null : createDefaultPackPlayer();
		next = fallbackPlayer ? { ...next, fallbackPlayer } : ss;
	}
	const commands = next.commands ?? [];
	if (commands.length === 0) return next;
	for (const command of commands)
		runClassicySoundCommand({ ...next, ...command.policy }, command.action);
	return { ...next, commands: [] };
};
