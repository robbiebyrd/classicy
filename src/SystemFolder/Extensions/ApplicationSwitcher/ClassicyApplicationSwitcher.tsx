import "./ClassicyApplicationSwitcher.scss";
import { type FC as FunctionalComponent, useEffect, useMemo } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { frontAppIdOf } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontAppId";
import { SCREEN_SAVER_APP_ID } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	APPLICATION_SWITCHER_APP_ID,
	APPLICATION_SWITCHER_APP_NAME,
	APPLICATION_SWITCHER_CYCLE,
	type ClassicyApplicationSwitcherData,
	classicyApplicationSwitcherSettings,
} from "./ClassicyApplicationSwitcherContext";
import {
	classicyAppSwitcherChordDirection,
	classicyAppSwitcherReverseShortcut,
} from "./ClassicyApplicationSwitcherCycle";
import { releaseClassicyAppSwitcherKeyboardTo } from "./ClassicyApplicationSwitcherKeyboard.internal";
import { ClassicyApplicationSwitcherPalette } from "./ClassicyApplicationSwitcherPalette.internal";

/**
 * The Application Switcher, Mac OS 8.5's: a background extension that
 * `ClassicyDesktop` mounts. It draws the palette the Application menu tears
 * off into (`ClassicyApplicationSwitcherPalette`, while the active package's
 * `layout.applicationSwitcher.palette` is `"tearOff"`), and switches
 * applications from the keyboard: the chord (`cyclingShortcut`, default
 * Control-`) goes to the next application in the Application menu's order,
 * with Shift to the previous one, showing a hidden one, as Command-Tab did.
 *
 * The chord is read in the capture phase on the document, before the menu
 * bar's dispatcher and the windows' own keys, as Mac OS 8.5 took
 * Command-Tab ahead of the application in front; a keyboard-equivalent
 * dialog recording a chord (its own capture listener, on `window`) still
 * gets it first. A switch hands the keyboard to the application switched
 * to, as Command-Tab did: a text field or control of the application left
 * behind gives up the DOM focus, so the keys that follow reach the new
 * front application, not the document left behind. Both chords are also
 * registered as global shortcuts, so the Keyboard Shortcuts topic lists
 * them and another extension cannot take them.
 */
/**
 * Whether a screen saver is showing (`ScreenSaver.app`'s `active`): the key
 * that wakes it is the saver's alone. Read from the live store when the key
 * comes, since the saver's own capture listener on the document may run
 * first and clear it (then it has also prevented the key) or after.
 */
const screenSaverShowing = (): boolean =>
	useAppManager.getState().System.Manager.Applications.apps[SCREEN_SAVER_APP_ID]
		?.data?.active === true;

export const ClassicyApplicationSwitcher: FunctionalComponent = () => {
	const icon = useClassicyAsset("icons", "system.extension") ?? "";
	const rawData = useAppManager(
		(s) =>
			s.System.Manager.Applications.apps[APPLICATION_SWITCHER_APP_ID]?.data as
				| ClassicyApplicationSwitcherData
				| undefined,
	);
	const settings = classicyApplicationSwitcherSettings(rawData);
	const { keyboardCycling, cyclingShortcut } = settings;
	const dispatch = useAppManagerDispatch();
	const drawsPalette =
		useClassicyAppearanceLayout().applicationSwitcher?.palette !== "none";

	useEffect(() => {
		if (!keyboardCycling) return;
		const onKeyDown = (e: KeyboardEvent) => {
			// A key another listener took (the saver waking, a keyboard
			// equivalent dialog recording), or one that wakes the saver.
			if (e.defaultPrevented || screenSaverShowing()) return;
			const direction = classicyAppSwitcherChordDirection(cyclingShortcut, e);
			if (direction === 0) return;
			e.preventDefault();
			const frontNow = () =>
				frontAppIdOf(useAppManager.getState().System.Manager.Applications);
			const before = frontNow();
			dispatch({ type: APPLICATION_SWITCHER_CYCLE, direction });
			// Only a switch moves the keyboard: a chord that switches nothing
			// (a modal window open, one application) leaves it where it is.
			const after = frontNow();
			if (after !== undefined && after !== before)
				releaseClassicyAppSwitcherKeyboardTo(after);
		};
		document.addEventListener("keydown", onKeyDown, true);
		return () => document.removeEventListener("keydown", onKeyDown, true);
	}, [keyboardCycling, cyclingShortcut, dispatch]);

	const globalShortcuts = useMemo(
		() =>
			keyboardCycling
				? [
						{
							shortcut: cyclingShortcut,
							title: "Switch to the next application",
							event: APPLICATION_SWITCHER_CYCLE,
							eventData: { direction: 1 },
						},
						{
							shortcut: classicyAppSwitcherReverseShortcut(cyclingShortcut),
							title: "Switch to the previous application",
							event: APPLICATION_SWITCHER_CYCLE,
							eventData: { direction: -1 },
						},
					]
				: [],
		[keyboardCycling, cyclingShortcut],
	);

	return (
		<ClassicyApp
			id={APPLICATION_SWITCHER_APP_ID}
			name={APPLICATION_SWITCHER_APP_NAME}
			icon={icon}
			extension
			// Mac OS 8.5's Application Switcher shows no icon in the startup
			// parade (`resources/screenshots/mac-os-8.5/
			// platinum-85-startup-parade.png`).
			bootIcon={false}
			globalShortcuts={globalShortcuts}
		>
			{drawsPalette && settings.paletteOpen && (
				<ClassicyApplicationSwitcherPalette settings={settings} />
			)}
		</ClassicyApp>
	);
};
