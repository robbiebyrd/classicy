import "./ClassicyAppleMenuOptions.scss";
import type { ChangeEvent } from "react";
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

	// A field takes digits only; a value past 99 is stored as 99. An empty
	// field changes nothing.
	const setCount =
		(kind: ClassicyRecentItemKind) => (e: ChangeEvent<HTMLInputElement>) => {
			const digits = e.target.value.replace(/\D/g, "");
			if (digits === "") return;
			dispatch({
				type: "ClassicyDesktopRecentItemsSetCount",
				kind,
				count: Number.parseInt(digits, 10),
			});
		};

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
							<ClassicyInput
								key={kind}
								id={`AppleMenuOptions_${kind}s`}
								labelTitle={label}
								labelPosition="left"
								disabled={!enabled}
								prefillValue={enabled ? String(counts[kind]) : ""}
								onChangeFunc={setCount(kind)}
							/>
						))}
					</ClassicyControlGroup>
				</div>
			</ClassicyWindow>
			{aboutWindow}
		</ClassicyApp>
	);
}
