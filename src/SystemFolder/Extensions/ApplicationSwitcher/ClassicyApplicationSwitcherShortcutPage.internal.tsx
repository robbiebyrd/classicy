import { type FC as FunctionalComponent, useMemo } from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { useClassicyStandardHelpMenu } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyStandardHelpMenu";
import { ClassicyKbd } from "@/SystemFolder/SystemResources/Kbd/ClassicyKbd";
import { ClassicyKeyboardEquivalentField } from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentField";
import {
	type ClassicyKeyboardEquivalentInUse,
	keyboardEquivalentsInUse,
} from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentRules";
import {
	APPLICATION_SWITCHER_APP_ID,
	APPLICATION_SWITCHER_SET_CYCLING,
	type ClassicyApplicationSwitcherData,
	classicyApplicationSwitcherSettings,
} from "./ClassicyApplicationSwitcherContext";
import {
	classicyAppSwitcherReverseShortcut,
	classicyAppSwitcherShortcutProblem,
} from "./ClassicyApplicationSwitcherCycle";

/** The id of the page's keyboard equivalent field (its button). */
export const CLASSICY_APP_SWITCHER_SHORTCUT_FIELD_ID =
	"classicy-app-switcher-shortcut";

/**
 * The Keyboard Shortcuts topic's page on switching applications, the
 * counterpart of Mac OS 8.5's Mac OS Help page "Switching between open
 * programs" and its "Help me modify the keyboard shortcuts" script, which
 * asked whether to use a shortcut at all, then for a modifier and a key
 * (`resources/screenshots/mac-os-8.5/platinum-85-help-shortcut-*.png`): a
 * checkbox turns keyboard switching on or off, and a keyboard equivalent
 * field records the chord for the next application (Shift added goes to the
 * previous one). The chord must hold Control, Option or Command and no
 * Shift, and may not be one the system menus, the Help menu or another
 * extension already use.
 *
 * `appId` owns the recording dialog: the topic's own app (Apple Guide).
 */
export const ClassicyApplicationSwitcherShortcutPage: FunctionalComponent<{
	appId: string;
}> = ({ appId }) => {
	const data = useAppManager(
		(s) =>
			s.System.Manager.Applications.apps[APPLICATION_SWITCHER_APP_ID]?.data as
				| ClassicyApplicationSwitcherData
				| undefined,
	);
	const { keyboardCycling, cyclingShortcut } =
		classicyApplicationSwitcherSettings(data);
	const dispatch = useAppManagerDispatch();
	const tearsOff =
		useClassicyAppearanceLayout().applicationSwitcher?.palette !== "none";

	const systemMenu = useAppManager((s) => s.System.Manager.Desktop.systemMenu);
	const global = useAppManager((s) => s.System.Manager.Keyboard.global);
	const { helpItem } = useClassicyStandardHelpMenu({
		appMenu: undefined,
		appId: undefined,
	});
	const inUse = useMemo<ClassicyKeyboardEquivalentInUse[]>(
		() => [
			...keyboardEquivalentsInUse(systemMenu ?? []),
			...keyboardEquivalentsInUse([helpItem]),
			...Object.entries(global)
				.filter(([, g]) => g.appId !== APPLICATION_SWITCHER_APP_ID)
				.map(([chord, g]) => ({
					shortcut: g.shortcut ?? chord,
					name: g.title ?? g.appId,
				})),
		],
		[systemMenu, helpItem, global],
	);

	return (
		<div className="classicyApplicationSwitcherShortcutPage">
			<p>
				<strong>Switching applications</strong>
			</p>
			<p>
				Press <ClassicyKbd shortcut={cyclingShortcut} /> to switch to the next
				application, and{" "}
				<ClassicyKbd
					shortcut={classicyAppSwitcherReverseShortcut(cyclingShortcut)}
				/>{" "}
				to the one before, in the Application menu&rsquo;s order. A hidden
				application shows again when you switch to it.
			</p>
			{tearsOff && (
				<p>
					To keep the open applications on the screen, drag past the bottom of
					the Application menu and let go: the Application Switcher appears.
					Click its zoom box to show or hide the names, Option-click it for
					large or small icons, and Option-Shift-click it to set the buttons
					across or down.
				</p>
			)}
			<ClassicyCheckbox
				id="classicy-app-switcher-keyboard"
				label="Use a keyboard shortcut to switch applications"
				checked={keyboardCycling}
				onClickFunc={(checked) =>
					dispatch({ type: APPLICATION_SWITCHER_SET_CYCLING, enabled: checked })
				}
			/>
			<ClassicyKeyboardEquivalentField
				id={CLASSICY_APP_SWITCHER_SHORTCUT_FIELD_ID}
				appId={appId}
				label="Switch to the next application"
				value={cyclingShortcut}
				disabled={!keyboardCycling}
				requireCommandKey={false}
				validate={classicyAppSwitcherShortcutProblem}
				inUse={inUse}
				description="Shift added switches to the previous application."
				onChange={(shortcut) =>
					dispatch({ type: APPLICATION_SWITCHER_SET_CYCLING, shortcut })
				}
			/>
		</div>
	);
};
