/* eslint-disable react-refresh/only-export-components -- Utilities and constants file, not components */

import { Howl } from "howler";
import { createContext, type Dispatch } from "react";
import "@/Appearance/Platinum/assets/sounds/platinum";
import type { ClassicyStoreSystemManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	CLASSICY_DEFAULT_SOUND_PACK_ID,
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
	file?: SoundData;
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

const defaultSoundData = getClassicySoundPack(CLASSICY_DEFAULT_SOUND_PACK_ID);

/** The system volume as a 0–1 gain for the player (100 when unset). */
export const classicySoundGain = (volume: number | undefined): number =>
	(volume ?? 100) / 100;

export const initialPlayer: ClassicySoundState = {
	soundPlayer: defaultSoundData
		? createSoundPlayer({ soundData: defaultSoundData })
		: null,
	disabled: [] as string[],
	labels: soundLabels,
	volume: 100,
	alertSound: DEFAULT_ALERT_SOUND,
	alertVolume: 100,
};

export const loadSoundTheme = (soundTheme: SoundData): Howl | null => {
	return createSoundPlayer({ soundData: soundTheme });
};

export const ClassicySoundManagerContext =
	createContext<ClassicySoundState>(initialPlayer);
export const ClassicySoundDispatchContext = createContext<
	Dispatch<ClassicySoundAction>
>((() => undefined) as Dispatch<ClassicySoundAction>);

const playerCanPlayInterrupt = (
	{ disabled, soundPlayer }: ClassicySoundState,
	sound: string,
) => {
	return !disabled.includes("*") && !disabled.includes(sound) && soundPlayer;
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
	ss.soundPlayer?.stop();
	const id = ss.soundPlayer?.play(sound);
	if (typeof id === "number") {
		ss.soundPlayer?.volume(
			classicySoundGain(ss.volume) * classicySoundGain(ss.alertVolume),
			id,
		);
	}
};

const playerCanPlay = (ss: ClassicySoundState, sound: string) => {
	return playerCanPlayInterrupt(ss, sound) && !ss.soundPlayer?.playing();
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
				ss.soundPlayer?.play(action.sound);
			}
			next = { ...ss };
			break;
		}
		case ClassicySoundActionTypes.ClassicySoundPlayInterrupt: {
			if (action.sound && playerCanPlayInterrupt(ss, action.sound)) {
				ss.soundPlayer?.stop();
				ss.soundPlayer?.play(action.sound);
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
			next = {
				...ss,
				soundPlayer: action.file ? loadSoundTheme(action.file) : ss.soundPlayer,
				disabled: action.disabled
					? Array.isArray(action.disabled)
						? action.disabled
						: [action.disabled]
					: ss.disabled,
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
