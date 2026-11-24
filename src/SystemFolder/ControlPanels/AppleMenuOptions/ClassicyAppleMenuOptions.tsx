import "./ClassicyAppleMenuOptions.scss";
import { useEffect, useRef, useState } from "react";
import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	APPLE_MENU_OPTIONS_APP_ID,
	APPLE_MENU_OPTIONS_APP_NAME,
} from "@/SystemFolder/ControlPanels/AppleMenuOptions/ClassicyAppleMenuOptionsManifest";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyEditMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import {
	ClassicyControlGroup,
	ClassicyControlGroupFormRow,
} from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import {
	type ClassicyRecentItemKind,
	normalizeClassicyRecentItems,
} from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItems";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const APP_ID = APPLE_MENU_OPTIONS_APP_ID;
const APP_NAME = APPLE_MENU_OPTIONS_APP_NAME;
const WINDOW_ID = "AppleMenuOptions_1";

/** The count fields, in the panel's order (Mac OS 8.1). */
const COUNT_FIELDS: { kind: ClassicyRecentItemKind; label: string }[] = [
	{ kind: "document", label: "Documents:" },
	{ kind: "application", label: "Applications:" },
];

/**
 * The Apple Menu Options control panel (Mac OS 8; System 7.5 introduced it):
 * "Remember recently used items" turns the Apple menu's Recent Applications
 * and Recent Documents on and off, and the fields set how many items each
 * remembers (0 to 99; 10 by default). As on the Mac, the fields dim and empty
 * while the box is off, and turning it off forgets every item.
 *
 * Everything it edits lives in `System.Manager.Desktop.recentItems` and
 * persists with the desktop. The Mac panel's Submenus group and Servers
 * field are left out: Classicy's Apple menu has no folders of its own to
 * open as submenus, and no file servers.
 */
export function ClassicyAppleMenuOptions() {
	const dispatch = useAppManagerDispatch();
	const appIcon =
		useClassicyAsset("icons", "controlPanels.appleMenuOptions.app") ?? "";
	// Display only: the app's id, record, stored menus and Quit keep APP_NAME
	// and appIcon.
	const identity = useClassicyAppIdentity(APP_ID, {
		name: APP_NAME,
		icon: appIcon,
	});
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
	const editMenu = useClassicyEditMenu(APP_ID);
	const windowClose = useClassicyWindowClose(APP_ID);

	const stored = useAppManager((s) => s.System.Manager.Desktop.recentItems);
	const { enabled, counts } = normalizeClassicyRecentItems(stored);

	const setCount = (kind: ClassicyRecentItemKind, count: number) =>
		dispatch({ type: "ClassicyDesktopRecentItemsSetCount", kind, count });

	return (
		<ClassicyApp
			id={APP_ID}
			name={APP_NAME}
			icon={appIcon}
			defaultWindow={WINDOW_ID}
			showDesktopIcon={false}
			showInApplicationsFolder={false}
			addSystemMenu={true}
		>
			<ClassicyWindow
				id={WINDOW_ID}
				title={identity.name}
				appId={APP_ID}
				icon={identity.icon}
				closable={true}
				resizable={false}
				zoomable={false}
				scrollable={false}
				collapsable={true}
				initialSize={[280, 0]}
				initialPosition={[340, 100]}
				modal={false}
				backgroundColor="var(--color-system-03)"
				appMenu={[
					{
						id: `${APP_ID}_file`,
						title: "File",
						menuChildren: [
							{ ...aboutMenuItem, title: `About ${APP_NAME}` },
							{
								...closeWindowMenuItemHelper(`${APP_ID}_close_window`, () =>
									windowClose(
										WINDOW_ID,
										quitAppHelper(APP_ID, APP_NAME, appIcon),
									),
								),
								keyboardShortcut: "⌥W",
							},
							{ id: "spacer" },
							{
								...quitMenuItemHelper(APP_ID, APP_NAME, appIcon),
								keyboardShortcut: "⌥Q",
							},
						],
					},
					editMenu,
				]}
			>
				<div className="classicyAppleMenuOptions">
					<ClassicyControlGroup label="Recent Items" layout="form">
						<ClassicyControlGroupFormRow>
							<ClassicyCheckbox
								id="AppleMenuOptions_remember"
								label="Remember recently used items"
								checked={enabled}
								onClickFunc={(checked) =>
									dispatch({
										type: "ClassicyDesktopRecentItemsSetEnabled",
										enabled: checked,
									})
								}
							/>
						</ClassicyControlGroupFormRow>
						{COUNT_FIELDS.map(({ kind, label }) => (
							<AppleMenuOptionsCountField
								key={kind}
								kind={kind}
								label={label}
								enabled={enabled}
								count={counts[kind]}
								onCommit={(count) => setCount(kind, count)}
							/>
						))}
					</ClassicyControlGroup>
				</div>
			</ClassicyWindow>
			{aboutWindow}
		</ClassicyApp>
	);
}

/**
 * One count field. What the user types is a draft: the count is set when
 * the field is left (it loses focus), on Return, or when the panel closes,
 * never on each keystroke, since a smaller count forgets the items past it
 * (typing "15" over "10" would otherwise pass through 1). A value past 99 is
 * set to 99; anything else not a number, an empty field included, puts the
 * stored count back in the field.
 */
function AppleMenuOptionsCountField({
	kind,
	label,
	enabled,
	count,
	onCommit,
}: {
	kind: ClassicyRecentItemKind;
	label: string;
	enabled: boolean;
	count: number;
	onCommit: (count: number) => void;
}) {
	const draftRef = useRef<string | null>(null);
	const onCommitRef = useRef(onCommit);
	onCommitRef.current = onCommit;
	const inputRef = useRef<HTMLInputElement | null>(null);
	// Bumped to remount the field, so it shows the stored count again.
	const [revision, setRevision] = useState(0);

	const commit = () => {
		const draft = draftRef.current;
		draftRef.current = null;
		if (draft === null) return;
		const digits = draft.replace(/\D/g, "");
		if (digits !== "") onCommitRef.current(Number.parseInt(digits, 10));
		setRevision((r) => r + 1);
	};
	const commitRef = useRef(commit);
	commitRef.current = commit;

	// Leaving the field commits it. (Each remount is a new <input>.)
	// biome-ignore lint/correctness/useExhaustiveDependencies: revision is the new <input> to listen on.
	useEffect(() => {
		const input = inputRef.current;
		if (!input) return;
		const onBlur = () => commitRef.current();
		input.addEventListener("blur", onBlur);
		return () => input.removeEventListener("blur", onBlur);
	}, [revision]);

	// Closing the panel commits a draft still in the field.
	useEffect(
		() => () => {
			const draft = draftRef.current;
			draftRef.current = null;
			const digits = draft?.replace(/\D/g, "") ?? "";
			if (digits !== "") onCommitRef.current(Number.parseInt(digits, 10));
		},
		[],
	);

	// Turning tracking off drops a draft: the field empties and dims.
	useEffect(() => {
		if (!enabled) draftRef.current = null;
	}, [enabled]);

	return (
		<ClassicyInput
			key={revision}
			ref={inputRef}
			id={`AppleMenuOptions_${kind}s`}
			labelTitle={label}
			labelPosition="left"
			disabled={!enabled}
			prefillValue={enabled ? String(count) : ""}
			onChangeFunc={(e) => {
				draftRef.current = e.target.value;
			}}
			onEnterFunc={() => commitRef.current()}
		/>
	);
}
