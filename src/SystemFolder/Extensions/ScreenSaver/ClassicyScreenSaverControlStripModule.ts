import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { SCREEN_SAVER_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManagerManifest";
import {
	SCREEN_SAVER_ACTIVATE_EVENT,
	SCREEN_SAVER_APP_ID,
	SCREEN_SAVER_DEFAULT_TIMEOUT_MINUTES,
	type ScreenSaverData,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import {
	CLASSICY_CONTROL_STRIP_MODULE_IDS,
	classicyControlStripOpenControlPanelItem,
	registerClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const SEPARATOR: ClassicyMenuItem = { id: "spacer" };

/**
 * Start the screen saver now, switch it on or off, or open the Screen Saver
 * control panel. The italic status line says when it will next start.
 */
const useScreenSaverModuleMenu = (): ClassicyMenuItem[] => {
	const dispatch = useAppManagerDispatch();
	const data = useAppManager(
		(s) =>
			s.System.Manager.Applications.apps[SCREEN_SAVER_APP_ID]?.data as
				| ScreenSaverData
				| undefined,
	);
	const enabled = data?.enabled ?? true;
	const minutes = data?.timeoutMinutes ?? SCREEN_SAVER_DEFAULT_TIMEOUT_MINUTES;
	// Display only: the item opens the panel by its own identity.
	const panel = useClassicyAppIdentity(SCREEN_SAVER_MANAGER_APP_ID, {
		name: "Screen Saver",
		icon: ClassicyIcons.system.extensions.screensaver,
	});
	return [
		{
			id: "screen-saver-status",
			title: enabled
				? `Starts After ${minutes} Minute${minutes === 1 ? "" : "s"} Idle`
				: "Screen Saver Is Off",
			disabled: true,
			className: "classicyControlStripStatus",
		},
		SEPARATOR,
		{
			id: "screen-saver-sleep-now",
			title: "Sleep Now",
			disabled: !enabled,
			onClickFunc: () => dispatch({ type: SCREEN_SAVER_ACTIVATE_EVENT }),
		},
		{
			id: "screen-saver-enabled",
			title: "Screen Saver On",
			checked: enabled,
			onClickFunc: () =>
				dispatch({
					type: "ClassicyAppScreenSaverSetEnabled",
					enabled: !enabled,
				}),
		},
		SEPARATOR,
		classicyControlStripOpenControlPanelItem(dispatch, panel.name, {
			id: SCREEN_SAVER_MANAGER_APP_ID,
			name: "Screen Saver",
			icon: ClassicyIcons.system.extensions.screensaver,
		}),
	];
};

/**
 * Screen Saver's module, contributed by the Screen Saver extension: it shows
 * while ScreenSaver.app is mounted.
 */
export const CLASSICY_SCREEN_SAVER_CONTROL_STRIP_MODULE =
	registerClassicyControlStripModule({
		id: CLASSICY_CONTROL_STRIP_MODULE_IDS.screenSaver,
		appId: SCREEN_SAVER_APP_ID,
		label: "Screen Saver",
		order: 20,
		icon: ClassicyIcons.system.controlStrip.screenSaver,
		fileIcon: ClassicyIcons.system.extensions.screensaver,
		menuItems: useScreenSaverModuleMenu,
	});
