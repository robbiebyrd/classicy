import { type FC, useMemo, useState } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { getDriveRows, isDriveSyncConnected } from "./ClassicyDriveSetupUtils";
import { DriveSetupController } from "./DriveSetupController";
import { DriveSetupList } from "./DriveSetupList";

const APP_ID = "DriveSetup.app";
const APP_NAME = "Drive Setup";
const WINDOW_ID = "DriveSetup_1";
const appIcon = ClassicyIcons.system.drives.disk;

export const ClassicyDriveSetup: FC = () => {
	const dispatch = useAppManagerDispatch();
	const fs = useClassicyFileSystem();
	const fsVersion = useAppManager(
		(s) => s.System.Manager.Desktop.fsVersion ?? 0,
	);

	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
	const windowClose = useClassicyWindowClose(APP_ID);

	const [selected, setSelected] = useState<string | null>(null);

	// Rebuild rows when the tree is replaced out-of-band (sync). fsVersion is
	// the intentional invalidation key.
	// biome-ignore lint/correctness/useExhaustiveDependencies: fsVersion invalidates the derived rows after a sync replace
	const drives = useMemo(() => getDriveRows(fs), [fs, fsVersion]);
	const connected = isDriveSyncConnected();

	const runAction = (
		action: "Initialize" | "Sync" | "Backup",
		drive: string,
	) => {
		dispatch({ type: `ClassicyDesktopDriveSetup${action}`, drive });
	};

	const functionsMenu: ClassicyMenuItem = {
		id: `${APP_ID}_functions`,
		title: "Functions",
		menuChildren: [
			{
				id: `${APP_ID}_fn_initialize`,
				title: "Initialize…",
				event: "ClassicyDesktopDriveSetupInitialize",
				eventData: { drive: selected ?? "" },
				disabled: !selected,
			},
			{
				id: `${APP_ID}_fn_sync`,
				title: "Sync",
				event: "ClassicyDesktopDriveSetupSync",
				eventData: { drive: selected ?? "" },
				disabled: !connected,
			},
			{
				id: `${APP_ID}_fn_backup`,
				title: "Backup",
				event: "ClassicyDesktopDriveSetupBackup",
				eventData: { drive: selected ?? "" },
				disabled: !connected,
			},
		],
	};

	const appMenu: ClassicyMenuItem[] = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			menuChildren: [
				{ ...aboutMenuItem, title: `About ${APP_NAME}` },
				closeWindowMenuItemHelper(`${APP_ID}_close_window`, () =>
					windowClose(WINDOW_ID, quitAppHelper(APP_ID, APP_NAME, appIcon)),
				),
				{ id: "spacer" },
				quitMenuItemHelper(APP_ID, APP_NAME, appIcon),
			],
		},
		functionsMenu,
	];

	return (
		<>
			<DriveSetupController />
			<ClassicyApp
				id={APP_ID}
				name={APP_NAME}
				icon={appIcon}
				defaultWindow={WINDOW_ID}
				noDesktopIcon={true}
				inApplicationsFolder={true}
				addSystemMenu={true}
			>
				<ClassicyWindow
					id={WINDOW_ID}
					title={APP_NAME}
					appId={APP_ID}
					icon={appIcon}
					closable={true}
					resizable={false}
					zoomable={false}
					scrollable={false}
					collapsable={true}
					initialSize={[440, 0]}
					initialPosition={[120, 80]}
					modal={false}
					appMenu={appMenu}
				>
					<div className="driveSetupContent">
						<DriveSetupList
							drives={drives}
							selected={selected}
							onSelect={setSelected}
						/>
						<div className="driveSetupButtons">
							<ClassicyButton
								disabled={!connected}
								onClickFunc={() => runAction("Backup", selected ?? "")}
							>
								Backup
							</ClassicyButton>
							<ClassicyButton
								disabled={!connected}
								onClickFunc={() => runAction("Sync", selected ?? "")}
							>
								Sync
							</ClassicyButton>
							<ClassicyButton
								disabled={!selected}
								onClickFunc={() =>
									selected && runAction("Initialize", selected)
								}
							>
								Initialize…
							</ClassicyButton>
						</div>
					</div>
				</ClassicyWindow>
				{aboutWindow}
			</ClassicyApp>
		</>
	);
};
