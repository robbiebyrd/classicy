import { useMemo } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { SCREEN_SAVER_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManagerManifest";
import {
	useSound,
	useSoundDispatch,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { SOUND_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerManifest";
import {
	SCREEN_SAVER_ACTIVATE_EVENT,
	SCREEN_SAVER_APP_ID,
	SCREEN_SAVER_DEFAULT_TIMEOUT_MINUTES,
	type ScreenSaverData,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import type { ClassicyControlStripModule } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const SEPARATOR: ClassicyMenuItem = { id: "spacer" };

/**
 * Menu item that opens a control panel — HIGOS8 p.125: a module belonging to a
 * control panel must offer a way to open it (Figure 6-15's "Open File Sharing
 * Control Panel").
 */
const openControlPanelItem = (
	dispatch: ReturnType<typeof useAppManagerDispatch>,
	panelName: string,
	app: { id: string; name: string; icon: string },
): ClassicyMenuItem => ({
	id: `open-${app.id}`,
	title: `Open ${panelName} Control Panel`,
	onClickFunc: () => dispatch({ type: "ClassicyAppOpen", app }),
});

/** Sound: turn sound on or off, or open the Sound control panel. */
export const useClassicySoundControlStripModule =
	(): ClassicyControlStripModule => {
		const { disabled } = useSound();
		const player = useSoundDispatch();
		const dispatch = useAppManagerDispatch();
		const muted = disabled.includes("*");

		return useMemo(() => {
			const setMuted = (mute: boolean) =>
				player({ type: "ClassicySoundDisable", disabled: mute ? ["*"] : [] });
			const icons = ClassicyIcons.controlPanels.soundManager;
			return {
				id: "classicy-sound",
				label: "Sound",
				icon: muted ? icons.soundOff : icons.soundOn,
				menuItems: [
					{
						id: "sound-on",
						title: "Sound On",
						checked: !muted,
						onClickFunc: () => setMuted(false),
					},
					{
						id: "sound-off",
						title: "Sound Off",
						checked: muted,
						onClickFunc: () => setMuted(true),
					},
					SEPARATOR,
					openControlPanelItem(dispatch, "Sound", {
						id: SOUND_MANAGER_APP_ID,
						name: "Sound Manager",
						icon: icons.app,
					}),
				],
			};
		}, [muted, player, dispatch]);
	};

/**
 * Screen Saver: start it now, switch it on or off, or open the Screen Saver
 * control panel. Its italic status line says when it will next start.
 */
export const useClassicyScreenSaverControlStripModule =
	(): ClassicyControlStripModule => {
		const dispatch = useAppManagerDispatch();
		const data = useAppManager(
			(s) =>
				s.System.Manager.Applications.apps[SCREEN_SAVER_APP_ID]?.data as
					| ScreenSaverData
					| undefined,
		);
		const enabled = data?.enabled ?? true;
		const minutes =
			data?.timeoutMinutes ?? SCREEN_SAVER_DEFAULT_TIMEOUT_MINUTES;

		return useMemo(() => {
			const icon = ClassicyIcons.system.extensions.screensaver;
			return {
				id: "classicy-screen-saver",
				label: "Screen Saver",
				icon,
				menuItems: [
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
					openControlPanelItem(dispatch, "Screen Saver", {
						id: SCREEN_SAVER_MANAGER_APP_ID,
						name: "Screen Saver",
						icon,
					}),
				],
			};
		}, [enabled, minutes, dispatch]);
	};

/** The modules ClassicyControlStrip shows when given none of its own. */
export const useClassicyDefaultControlStripModules =
	(): ClassicyControlStripModule[] => {
		const sound = useClassicySoundControlStripModule();
		const screenSaver = useClassicyScreenSaverControlStripModule();
		return useMemo(() => [sound, screenSaver], [sound, screenSaver]);
	};
