/* eslint-disable react-refresh/only-export-components -- Utilities and constants file, not components */

import { Howl } from "howler";
import { createContext, type Dispatch } from "react";
import "@/Appearance/Platinum/assets/sounds/platinum";
import type { ClassicyStoreSystemManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
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
import { DEFAULT_ALERT_SOUND } from "./ClassicyAlertSounds";
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
	 * The Platinum player, used for sprites the active pack lacks. Null when
	 * Platinum is the active pack (or is not registered).
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
	alertSound: DEFAULT_ALERT_SOUND,
	alertVolume: 100,
};

const createPlatinumPlayer = (): Howl | null => {
	const platinum = getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID);
	return platinum ? createSoundPlayer({ soundData: platinum }) : null;
};

/** The player that owns `sound`: the active pack's, else the Platinum fallback. */
const playerFor = (ss: ClassicySoundState, sound: string): Howl | null =>
	ss.sprites.has(sound) ? ss.soundPlayer : ss.fallbackPlayer;

/**
 * Initial sound state for a provider mount: `base` (muted when asked) with the
 * player already loaded from `packId`, or Platinum when that pack is not
 * registered (yet). Seeding at init means children's mount effects, such as the
 * boot chime, find a player. Returns `base` when no pack is registered at all.
 */
export const seedSoundState = (
	base: ClassicySoundState,
	packId: string,
	muted: boolean | undefined,
): ClassicySoundState => {
	const start = muted ? { ...base, disabled: ["*"] } : base;
	const pack =
		getClassicySoundPack(packId) ??
		getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID);
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
	player?.stop();
	const id = player?.play(sound);
	if (typeof id === "number") {
		player?.volume(
			classicySoundGain(ss.volume) * classicySoundGain(ss.alertVolume),
			id,
		);
	}
};

const playerCanPlay = (ss: ClassicySoundState, sound: string) => {
	return playerCanPlayInterrupt(ss, sound) && !playerFor(ss, sound)?.playing();
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
			ss.soundPlayer?.stop();
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
				player?.stop();
				player?.play(action.sound);
			}
			next = { ...ss };
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundPlayError: {
			const sound = action.sound ?? ss.alertSound ?? DEFAULT_ALERT_SOUND;
			if (playerCanPlayInterrupt(ss, sound)) playAlert(ss, sound);
			next = { ...ss };
			break;
		}
		case ClassicySoundActionTypes.ClassicyAlertSound: {
			const sound = ss.alertSound ?? DEFAULT_ALERT_SOUND;
			if (playerCanPlayInterrupt(ss, sound)) playAlert(ss, sound);
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
			const disabled = action.disabled
				? Array.isArray(action.disabled)
					? action.disabled
					: [action.disabled]
				: ss.disabled;
			const pack = action.pack;
			if (!pack) {
				next = { ...ss, disabled };
				break;
			}
			const missing = classicySoundPackMissingSprites(pack);
			if (missing.length > 0) {
				classicyLog(
					"warn",
					"ClassicySoundManager",
					"Sound pack is missing sprites; falling back to platinum",
					{ id: pack.id, missing },
				);
			}
			ss.soundPlayer?.unload();
			const isDefault = pack.id === CLASSICY_DEFAULT_SOUND_PACK_ID;
			if (isDefault) ss.fallbackPlayer?.unload();
			next = {
				...ss,
				soundPlayer: createSoundPlayer({ soundData: pack }),
				packId: pack.id,
				sprites: new Set(Object.keys(pack.sprite)),
				fallbackPlayer: isDefault
					? null
					: (ss.fallbackPlayer ?? createPlatinumPlayer()),
				disabled,
			};
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
