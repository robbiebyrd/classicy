/* eslint-disable react-refresh/only-export-components -- Re-exporting utilities for backwards compatibility */
import { useContext } from "react";
import {
  ClassicySoundManagerContext,
  ClassicySoundDispatchContext,
} from "./ClassicySoundManagerUtils";

// Re-export types and utilities for backwards compatibility
export type {
  ClassicyStoreSystemSoundManager,
  ClassicyThemeSound,
  ClassicySoundInfo,
  ClassicySoundState,
  ClassicySoundAction,
  SoundData,
  SoundPlayer,
} from "./ClassicySoundManagerUtils";

export {
  ClassicySoundActionTypes,
  createSoundPlayer,
  initialPlayer,
  loadSoundTheme,
  ClassicySoundStateEventReducer,
  ClassicySoundManagerContext,
  ClassicySoundDispatchContext,
} from "./ClassicySoundManagerUtils";

export function useSound() {
  return useContext(ClassicySoundManagerContext);
}

export function useSoundDispatch() {
  return useContext(ClassicySoundDispatchContext);
}
