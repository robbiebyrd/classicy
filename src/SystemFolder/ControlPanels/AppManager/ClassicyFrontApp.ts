import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { frontAppIdOf } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontAppId";

/** The front application's id (see `frontAppIdOf`), re-read on a change. */
export const useFrontAppId = (): string | undefined =>
	useAppManager((s) => frontAppIdOf(s.System.Manager.Applications));
