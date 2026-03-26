/* eslint-disable react-refresh/only-export-components -- Utilities and constants file, not components */
import { ClassicyStoreSystemManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { Howl } from "howler";
import { createContext, Dispatch } from "react";
import soundData from "@snd/platinum/platinum.json";
import soundLabels from "./ClassicySoundManagerLabels.json";

export interface ClassicyStoreSystemSoundManager extends ClassicyStoreSystemManager {
  volume: number;
  labels: Record<string, { group: string; label: string; description: string }>;
  disabled: string[];
}

export type ClassicyThemeSound = {
  file: string;
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
};

export enum ClassicySoundActionTypes {
  ClassicySoundStop,
  ClassicySoundPlay,
  ClassicySoundPlayInterrupt,
  ClassicySoundPlayError,
  ClassicySoundLoad,
  ClassicySoundSet,
  ClassicySoundDisable,
  ClassicySoundDisableOne,
  ClassicySoundEnableOne,
  ClassicyVolumeSet,
}

export interface ClassicySoundAction {
  type: ClassicySoundActionTypes | keyof typeof ClassicySoundActionTypes;
  sound?: string;
  file?: SoundData;
  disabled?: string | string[];
  enabled?: string | string[];
  soundPlayer?: Howl;
  volume?: number;
}

export interface SoundData {
  src: string[];
  sprite: Record<string, number[]>;
}

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
      sprite: soundData.sprite as Record<string, [number, number] | [number, number, boolean]>,
      ...options,
    });
  }
  return null;
};

export const initialPlayer: ClassicySoundState = {
  soundPlayer: createSoundPlayer({ soundData: soundData }),
  disabled: [] as string[],
  labels: soundLabels,
  volume: 100,
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

  const validatedAction =
    ClassicySoundActionTypes[
      action.type as keyof typeof ClassicySoundActionTypes
    ];

  let next: ClassicySoundState;
  switch (validatedAction) {
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
      if (action.sound && playerCanPlayInterrupt(ss, action.sound)) {
        ss.soundPlayer?.stop();
        ss.soundPlayer?.play(action.sound || "ClassicyAlertWildEep");
      }
      next = { ...ss };
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
      next = { ...ss, volume: action.volume };
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
        next = { ...ss, disabled: Array.from(new Set([...ss.disabled, ...toDisable])) };
      } else {
        next = { ...ss };
      }
      break;
    }
    case ClassicySoundActionTypes.ClassicySoundEnableOne: {
      const enabled = Array.isArray(action.enabled)
        ? action.enabled
        : [action.enabled];
      next = { ...ss, disabled: ss.disabled.filter((item) => !enabled.includes(item)) };
      break;
    }
    default: {
      next = { ...ss };
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[ClassicySoundStateEventReducer] Unhandled action type', { type: action.type });
      }
      break;
    }
  }

  if ("debug" in action) {
    console.log("End State: ", next);
    console.groupEnd();
  }

  return next;
};
