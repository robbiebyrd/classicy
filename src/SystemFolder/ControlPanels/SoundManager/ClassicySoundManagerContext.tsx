/* eslint-disable react-refresh/only-export-components -- Re-exporting utilities for backwards compatibility */
import { useContext } from "react";
import {
	ClassicySoundDispatchContext,
	ClassicySoundManagerContext,
} from "./ClassicySoundManagerUtils";

// Re-export types and utilities for backwards compatibility
export type {
	ClassicySoundAction,
	ClassicySoundInfo,
	ClassicySoundState,
	ClassicyStoreSystemSoundManager,
	ClassicyThemeSound,
	SoundData,
	SoundPlayer,
} from "./ClassicySoundManagerUtils";

export {
	ClassicySoundActionTypes,
	ClassicySoundDispatchContext,
	ClassicySoundManagerContext,
	ClassicySoundStateEventReducer,
	createSoundPlayer,
	initialPlayer,
	loadSoundTheme,
} from "./ClassicySoundManagerUtils";

export function useSound() {
	return useContext(ClassicySoundManagerContext);
}

export function useSoundDispatch() {
	return useContext(ClassicySoundDispatchContext);
}
