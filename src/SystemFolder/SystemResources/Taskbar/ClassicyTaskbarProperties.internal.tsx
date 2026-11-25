import "./ClassicyTaskbarProperties.scss";
import { type FC as FunctionalComponent, useState } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import {
	type ClassicyTaskbarOptions,
	classicyTaskbarOptions,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	resetClassicyRecentDocuments,
	useClassicyRecentDocuments,
} from "@/SystemFolder/SystemResources/File/ClassicyRecentDocuments.internal";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

/**
 * Taskbar Properties (plan 0020-w98 E4): the Windows shell's face of the
 * Control Strip control panel, opened from the taskbar's menu (Properties)
 * and from Start ▸ Settings, where the Windows 98 package names the panel
 * "Taskbar & Start Menu". Internal: not exported from the package.
 *
 * Windows 98 SE's property sheet (shell32's, two pages):
 *
 * - **Taskbar Options**: "Always on top", "Auto hide", "Show small icons in
 *   Start menu" and "Show Clock", each a check box, stored on OK or Apply
 *   (`ClassicyDesktopTaskbarSetOptions`) and not before, as a property
 *   sheet's page applies its changes: Cancel and the Close box drop them.
 *   Windows 98 drew a preview of the taskbar above them, a bitmap of its own
 *   it redrew for each choice; Classicy leaves the picture out (the choices
 *   take effect at Apply, on the real taskbar).
 * - **Start Menu Programs**: the "Documents menu" group's Clear, which
 *   empties Start ▸ Documents and the Run dialog's history ("the contents
 *   of the Documents menu and other personal history lists"), at once, as
 *   Windows 98's did. Its "Customize Start menu" group (Add..., Remove...,
 *   Advanced...) edits the Start Menu folder, which Classicy has none of:
 *   Programs lists the Applications folder, so the group is left out.
 *
 * Under the page the sheet's OK (the default), Cancel and Apply, Apply
 * dimmed until a choice changes.
 */

/** The Taskbar Options page's check boxes, in Windows 98's order. */
export const CLASSICY_TASKBAR_PROPERTIES_OPTIONS: readonly {
	key: keyof ClassicyTaskbarOptions;
	label: string;
}[] = [
	{ key: "alwaysOnTop", label: "Always on top" },
	{ key: "autoHide", label: "Auto hide" },
	{ key: "smallStartMenuIcons", label: "Show small icons in Start menu" },
	{ key: "showClock", label: "Show Clock" },
];

/** The Documents menu group's text, Windows 98 SE's. */
export const CLASSICY_TASKBAR_PROPERTIES_CLEAR_TEXT =
	"Click to remove the contents of the Documents menu and other personal history lists.";

const sameOptions = (
	a: Required<ClassicyTaskbarOptions>,
	b: Required<ClassicyTaskbarOptions>,
) => CLASSICY_TASKBAR_PROPERTIES_OPTIONS.every(({ key }) => a[key] === b[key]);

/**
 * The sheet's content: its pages and its buttons. `onClose` closes the
 * window (OK, after storing; Cancel).
 */
export const ClassicyTaskbarProperties: FunctionalComponent<{
	onClose: () => void;
}> = ({ onClose }) => {
	const dispatch = useAppManagerDispatch();
	const stored = classicyTaskbarOptions(
		useAppManager((s) => s.System.Manager.Desktop.taskbar),
	);
	// The page's choices, applied on OK or Apply.
	const [draft, setDraft] = useState(stored);
	const changed = !sameOptions(draft, stored);
	const apply = () => {
		if (changed)
			dispatch({ type: "ClassicyDesktopTaskbarSetOptions", options: draft });
	};
	const recent = useClassicyRecentDocuments();
	const runHistory = useAppManager(
		(s) => s.System.Manager.Desktop.taskbar?.runHistory,
	);
	const nothingToClear = recent.length === 0 && (runHistory ?? []).length === 0;
	const clear = () => {
		resetClassicyRecentDocuments();
		dispatch({ type: "ClassicyDesktopTaskbarClearHistory" });
	};

	return (
		<div className="classicyTaskbarProperties">
			<ClassicyTabs
				tabs={[
					{
						title: "Taskbar Options",
						children: (
							<div className="classicyTaskbarPropertiesPage">
								{CLASSICY_TASKBAR_PROPERTIES_OPTIONS.map(({ key, label }) => (
									<ClassicyCheckbox
										key={key}
										id={`TaskbarProperties_${key}`}
										label={label}
										checked={draft[key]}
										onClickFunc={(checked) =>
											setDraft((current) => ({ ...current, [key]: checked }))
										}
									/>
								))}
							</div>
						),
					},
					{
						title: "Start Menu Programs",
						children: (
							<div className="classicyTaskbarPropertiesPage">
								<ClassicyControlGroup label="Documents menu">
									<p className="classicyTaskbarPropertiesText">
										{CLASSICY_TASKBAR_PROPERTIES_CLEAR_TEXT}
									</p>
									<ClassicyButton disabled={nothingToClear} onClickFunc={clear}>
										Clear
									</ClassicyButton>
								</ClassicyControlGroup>
							</div>
						),
					},
				]}
			/>
			<div className="classicyTaskbarPropertiesButtons">
				<ClassicyButton
					isDefault={true}
					onClickFunc={() => {
						apply();
						onClose();
					}}
				>
					OK
				</ClassicyButton>
				<ClassicyButton onClickFunc={onClose}>Cancel</ClassicyButton>
				<ClassicyButton disabled={!changed} onClickFunc={apply}>
					Apply
				</ClassicyButton>
			</div>
		</div>
	);
};
