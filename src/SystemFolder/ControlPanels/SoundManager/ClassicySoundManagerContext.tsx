/* eslint-disable react-refresh/only-export-components -- Re-exporting utilities for backwards compatibility */
import { useCallback, useContext } from "react";
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

/**
 * Returns a function that plays the user's selected default alert sound
 * (an application-wide trigger for the `ClassicyAlertSound` event). The sound
 * itself is resolved from the sound state, which the provider keeps in sync
 * with the Appearance preference.
 */
export function useClassicyAlertSound() {
	const dispatch = useSoundDispatch();
	return useCallback(
		() => dispatch({ type: "ClassicyAlertSound" }),
		[dispatch],
	);
}
