import "./ClassicyTaskbarProperties.scss";
import {
	type FC as FunctionalComponent,
	type RefObject,
	useRef,
	useState,
} from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	classicyCheckboxHolderById,
	useClassicyWhatsThisHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyWhatsThisHelp.internal";
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
import { useKeyboardEquivalents } from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";
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
/**
 * What's This? on each Taskbar Options check box: Windows 98 SE's help text
 * for them (explorer.exe's), shown by the sheet's "?" box.
 */
export const CLASSICY_TASKBAR_PROPERTIES_HELP: Readonly<
	Record<(typeof CLASSICY_TASKBAR_PROPERTIES_OPTIONS)[number]["key"], string>
> = {
	alwaysOnTop:
		"Ensures that the taskbar is always visible, even when you run a program in a full-sized window.",
	autoHide:
		"Hides the taskbar. To display the taskbar, point to the area of your screen where the taskbar is located.",
	smallStartMenuIcons: "Reduces the size of the Start menu.",
	showClock: "Displays a clock on the taskbar.",
};

const TASKBAR_PROPERTIES_WHATS_THIS = CLASSICY_TASKBAR_PROPERTIES_OPTIONS.map(
	({ key }) => ({
		find: classicyCheckboxHolderById(`TaskbarProperties_${key}`),
		help: { content: CLASSICY_TASKBAR_PROPERTIES_HELP[key] },
	}),
);

export const ClassicyTaskbarProperties: FunctionalComponent<{
	onClose: () => void;
	/**
	 * The sheet's root, for its window's `initialFocusRef`
	 * (`classicyTaskbarPropertiesFocus`). Absent, a ref of its own.
	 */
	rootRef?: RefObject<HTMLDivElement | null>;
}> = ({ onClose, rootRef }) => {
	const ownRootRef = useRef<HTMLDivElement | null>(null);
	const root = rootRef ?? ownRootRef;
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
	const nothingToClear =
		recent.length === 0 &&
		!(Array.isArray(runHistory) && runHistory.length > 0);
	const clear = () => {
		resetClassicyRecentDocuments();
		dispatch({ type: "ClassicyDesktopTaskbarClearHistory" });
	};

	const ok = () => {
		apply();
		onClose();
	};
	// Each check box's What's This? help, for the sheet's "?" box.
	useClassicyWhatsThisHelp(root, TASKBAR_PROPERTIES_WHATS_THIS);
	// ENTER is OK and ESC Cancel, as in any property sheet.
	useKeyboardEquivalents({ onDefault: ok, onCancel: onClose, targetRef: root });

	return (
		<div ref={root} className="classicyTaskbarProperties">
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
				<ClassicyButton isDefault={true} onClickFunc={ok}>
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

/**
 * The element the sheet's window gives the keyboard when it is focused: its
 * selected tab, as a property sheet's (comctl32 PropertySheet), so ENTER and
 * ESC reach OK and Cancel without a click first.
 */
export const classicyTaskbarPropertiesFocus = (
	root: RefObject<HTMLDivElement | null>,
): RefObject<HTMLElement | null> => ({
	get current(): HTMLElement | null {
		return (
			root.current?.querySelector<HTMLElement>('[role="tab"][tabindex="0"]') ??
			null
		);
	},
});
