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
};

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
}

export interface ClassicySoundAction {
	type: ClassicySoundActionTypes | string;
	sound?: string;
	/** ClassicySoundLoad: the pack to build the player from. */
	pack?: ClassicySoundPack;
	disabled?: string | string[];
	enabled?: string | string[];
	soundPlayer?: Howl;
	volume?: number;
	/** ClassicySoundSetAlertVolume: the alert level, 0–100. */
	alertVolume?: number;
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
};

/** The default pack's player, or null while that pack is not registered. */
const createDefaultPackPlayer = (): Howl | null => {
	const fallback = getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID);
	return fallback ? createSoundPlayer({ soundData: fallback }) : null;
};

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
 * Initial sound state for a provider mount: `base` (muted when asked) with the
 * player already loaded from `packId`, or the default pack when that one is not
 * registered (yet). Seeding at init means children's mount effects, such as the
 * boot chime, find a player. Returns `base`, with no player, when neither is
 * registered; each missing id is logged once.
 */
export const seedSoundState = (
	base: ClassicySoundState,
	packId: string,
	muted: boolean | undefined,
): ClassicySoundState => {
	const start = muted ? { ...base, disabled: ["*"] } : base;
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

export const ClassicySoundStateEventReducer = (
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
		case ClassicySoundActionTypes.ClassicySoundStop: {
			stopAll(ss);
			next = { ...ss };
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundPlay: {
			if (action.sound && playerCanPlay(ss, action.sound)) {
				playerFor(ss, action.sound)?.play(action.sound);
			}
			next = { ...ss };
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundPlayInterrupt: {
			if (action.sound && playerCanPlayInterrupt(ss, action.sound)) {
				const player = playerFor(ss, action.sound);
				stopAll(ss);
				player?.play(action.sound);
			}
			next = { ...ss };
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundPlayError: {
			const sound = action.sound ?? currentAlert(ss);
			if (sound && playerCanPlayInterrupt(ss, sound)) playAlert(ss, sound);
			next = { ...ss };
			break;
		}
		case ClassicySoundActionTypes.ClassicyAlertSound: {
			const sound = currentAlert(ss);
			if (sound && playerCanPlayInterrupt(ss, sound)) playAlert(ss, sound);
			next = { ...ss };
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
			const missing = classicySoundPackMissingSprites(pack);
			if (missing.length > 0) {
				// Only the default pack can stand in for the sprites; without it
				// (or when it is the pack missing them) they play nothing.
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
			}
			ss.soundPlayer?.unload();
			if (isDefault) ss.fallbackPlayer?.unload();
			next = {
				...ss,
				soundPlayer: createSoundPlayer({ soundData: pack }),
				packId: pack.id,
				sprites: new Set(Object.keys(pack.sprite)),
				fallbackPlayer: isDefault
					? null
					: (ss.fallbackPlayer ?? createDefaultPackPlayer()),
				disabled,
			};
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundLoadFallback: {
			// The default pack registered after the active pack loaded: build the
			// stand-in for the sprites the active pack lacks. Never replaces one.
			const fallbackPlayer =
				ss.packId === CLASSICY_DEFAULT_SOUND_PACK_ID || ss.fallbackPlayer
					? null
					: createDefaultPackPlayer();
			next = fallbackPlayer ? { ...ss, fallbackPlayer } : ss;
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundSet: {
			next = { ...ss, soundPlayer: action.soundPlayer ?? null };
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
