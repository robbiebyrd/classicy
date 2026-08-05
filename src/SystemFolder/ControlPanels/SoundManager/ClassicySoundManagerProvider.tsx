import {
	type FC as FunctionalComponent,
	type ReactNode,
	useEffect,
	useReducer,
} from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	ClassicySoundDispatchContext,
	ClassicySoundManagerContext,
	ClassicySoundStateEventReducer,
	initialPlayer,
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
	const [sound, soundDispatch] = useReducer(
		ClassicySoundStateEventReducer,
		initialPlayer,
		(base) => (defaultMuted ? { ...base, disabled: ["*"] } : base),
	);

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

	return (
		<ClassicySoundManagerContext.Provider value={sound}>
			<ClassicySoundDispatchContext.Provider value={soundDispatch}>
				{children}
			</ClassicySoundDispatchContext.Provider>
		</ClassicySoundManagerContext.Provider>
	);
};
