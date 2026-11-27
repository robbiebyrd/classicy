import type { CSSProperties, FC as FunctionalComponent } from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import type { ClassicyDesktopSystemDialog } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { listClassicyTrashItems } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import {
	classicyTrashDisplayName,
	useClassicyTrashName,
} from "@/SystemFolder/SystemResources/File/ClassicyTrashName";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/** Window ids of the system dialogs (they focus like windows): the Special
 * menu's alerts and the Windows shell's dialogs. */
export const SYSTEM_DIALOG_WINDOW_IDS: Record<
	ClassicyDesktopSystemDialog,
	string
> = {
	emptyTrash: "empty_trash",
	resetPram: "reset_pram",
	shutDown: "shut_down",
	run: "run",
	logOff: "log_off",
	taskbarDrop: "taskbar_drop",
};

/**
 * The Finder's Special menu: Empty Trash… and, below it, Reset PRAM… — each
 * opens its confirmation alert, which `ClassicyDesktop` draws, so each
 * `confirms` (the menu adds the ellipsis Mac OS writes, and Windows 98
 * leaves out: `layout.menu.confirmEllipsis`). Shared by the
 * desktop's menu bar and every Finder window's, so the commands are there
 * whichever has focus. `idPrefix` keeps the item ids unique per menu bar.
 * `trashName` is the Trash's name as the package shows it ("Empty Recycle
 * Bin" under Windows 98, 1.15); omitted, it is read store-free from the
 * active package (`classicyTrashDisplayName`).
 */
export const classicySpecialMenuItems = (
	dispatch: (action: ActionMessage) => void,
	idPrefix: string,
	trashName: string = classicyTrashDisplayName(),
): ClassicyMenuItem[] => [
	{
		id: `${idPrefix}_special_empty_trash`,
		title: `Empty ${trashName}`,
		confirms: true,
		onClickFunc: () => {
			dispatch({
				type: "ClassicyDesktopShowSystemDialog",
				dialog: "emptyTrash",
			});
		},
	},
	{ id: "spacer" },
	{
		id: `${idPrefix}_special_reset_pram`,
		title: "Reset PRAM",
		confirms: true,
		onClickFunc: () => {
			dispatch({
				type: "ClassicyDesktopShowSystemDialog",
				dialog: "resetPram",
			});
		},
	},
];

type ClassicyEmptyTrashAlertProps = {
	/** Items directly in the Trash. */
	itemCount: number;
	/** Remove them for good (called after the user confirms). */
	onEmpty: () => void;
	/** Close the alert (after either button). */
	onClose: () => void;
	/** Extra class names, forwarded to the alert's window root. */
	className?: string;
	/** Inline style, forwarded to the alert's window root. */
	style?: CSSProperties;
};

/**
 * Windows 98 SE's confirmation before the Recycle Bin is emptied
 * (shell32.dll's strings, as Empty Recycle Bin shows them): one file, "Confirm
 * File Delete" and "Are you sure you want to delete '<name>'?"; one folder,
 * "Confirm Folder Delete" and "Are you sure you want to remove the folder
 * '<name>' and all its contents?"; more, "Confirm Multiple File Delete" and
 * "Are you sure you want to delete these <n> items?". `name` is the item's
 * original name (the one Restore gives back).
 */
export const classicyEmptyTrashConfirmation = (
	itemCount: number,
	only?: { name: string; folder: boolean },
): { title: string; message: string } => {
	if (itemCount === 1 && only !== undefined) {
		return only.folder
			? {
					title: "Confirm Folder Delete",
					message: `Are you sure you want to remove the folder '${only.name}' and all its contents?`,
				}
			: {
					title: "Confirm File Delete",
					message: `Are you sure you want to delete '${only.name}'?`,
				};
	}
	return {
		title: "Confirm Multiple File Delete",
		message: `Are you sure you want to delete these ${itemCount} items?`,
	};
};

/**
 * The warning before the Trash is emptied. Worded as in Mac OS 8: how much
 * is in the Trash, and that removing it is permanent; an empty Trash gets a
 * plain note instead. Under Explorer's commands (`layout.finder.commands`
 * "windows", Windows 98) it is Windows 98 SE's own confirmation
 * (`classicyEmptyTrashConfirmation`), Yes and No, the one item's name read
 * through the file system accessor. The Trash is named as the package shows
 * it (`useClassicyTrashName`: "Recycle Bin" under Windows 98).
 */
export const ClassicyEmptyTrashAlert: FunctionalComponent<
	ClassicyEmptyTrashAlertProps
> = ({ itemCount, onEmpty, onClose, className, style }) => {
	const trashName = useClassicyTrashName();
	const windowsCommands =
		useClassicyAppearanceLayout().finder?.commands === "windows";
	const getFileSystem = useClassicyFileSystemAccessor();
	if (itemCount === 0) {
		return (
			<ClassicyAlert
				id={SYSTEM_DIALOG_WINDOW_IDS.emptyTrash}
				appId={"Finder.app"}
				alertType={"note"}
				label={`The ${trashName} is empty.`}
				buttons={[{ id: "ok", label: "OK", role: "default" }]}
				onClose={onClose}
				className={className}
				style={style}
			/>
		);
	}
	if (windowsCommands) {
		const fs = itemCount === 1 ? getFileSystem() : undefined;
		const path = fs ? listClassicyTrashItems(fs)[0] : undefined;
		const entry = path !== undefined ? fs?.resolve(path) : undefined;
		const only =
			fs && path !== undefined && entry
				? {
						name: entry._trashedName ?? path.split(fs.separator).pop() ?? path,
						folder: entry._type === ClassicyFileSystemEntryFileType.Directory,
					}
				: undefined;
		const { title, message } = classicyEmptyTrashConfirmation(itemCount, only);
		return (
			<ClassicyAlert
				id={SYSTEM_DIALOG_WINDOW_IDS.emptyTrash}
				appId={"Finder.app"}
				alertType={"caution"}
				movable={true}
				title={title}
				label={message}
				defaultButtonId={"yes"}
				buttons={[
					{ id: "yes", label: "Yes", role: "default", onClick: onEmpty },
					{ id: "no", label: "No", role: "cancel" },
				]}
				onClose={onClose}
				className={className}
				style={style}
			/>
		);
	}
	const items = itemCount === 1 ? "1 item" : `${itemCount} items`;
	return (
		<ClassicyAlert
			id={SYSTEM_DIALOG_WINDOW_IDS.emptyTrash}
			appId={"Finder.app"}
			alertType={"caution"}
			label={`The ${trashName} contains ${items}. Are you sure you want to permanently remove ${itemCount === 1 ? "it" : "these items"}?`}
			message={"You can’t undo this action."}
			defaultButtonId={"ok"}
			buttons={[
				{ id: "cancel", label: "Cancel", role: "cancel" },
				{ id: "ok", label: "OK", role: "default", onClick: onEmpty },
			]}
			onClose={onClose}
			className={className}
			style={style}
		/>
	);
};
