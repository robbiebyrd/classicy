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
}> = ({ children }) => {
	const [sound, soundDispatch] = useReducer(
		ClassicySoundStateEventReducer,
		initialPlayer,
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
