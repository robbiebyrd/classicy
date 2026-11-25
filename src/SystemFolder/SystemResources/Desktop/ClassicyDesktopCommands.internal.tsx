import { useMemo } from "react";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyDesktopFreeIconLocation } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import { startClassicyDesktopIconRename } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconRename.internal";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	type ClassicyNewItemKind,
	classicyArrangeIconsMenuItem,
	classicyCanRename,
	classicyDeleteMenuItem,
	classicyLineUpIconsMenuItem,
	classicyNewItemPath,
	classicyNewMenuItem,
	classicyRenameMenuItem,
	makeClassicyNewItem,
	useClassicyCreatableFileTypes,
	useClassicyWindowsFinderCommands,
} from "@/SystemFolder/SystemResources/File/ClassicyFileCommands.internal";
import {
	CLASSICY_DESKTOP_ITEM_ICON_PREFIX,
	classicyDesktopDropLocation,
	classicyDesktopItemIconAction,
	ensureClassicyDesktopFolder,
	moveClassicyItemsToTrash,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/** The desktop's Explorer commands (`useClassicyDesktopCommands`). */
export type ClassicyDesktopCommands = {
	/**
	 * The desktop's File, Edit and View menus (ids `finder_file`,
	 * `finder_edit`, `finder_view`, the ids of the desktop's own), for
	 * `Desktop.appMenu` and the headless bar's chords: File ▸ Open ⌃O, New ▸,
	 * Delete (Del) and Rename; Edit ▸ Select All ⌃A; View ▸ Arrange Icons ▸
	 * and Line Up Icons.
	 */
	barMenu?: ClassicyMenuItem[];
	/**
	 * The desktop's white-space menu, opened at the client point `at`:
	 * Arrange Icons ▸, Line Up Icons and New ▸, a new item's icon going to
	 * `at`.
	 */
	whiteSpaceMenu?: (at: [number, number]) => ClassicyMenuItem[];
};

type Dispatch = (action: ActionMessage) => void;

/** The desktop's selected icons, in its order. */
const selectedDesktopIcons = (): ClassicyStoreSystemDesktopManagerIcon[] => {
	const desktop = useAppManager.getState().System.Manager.Desktop;
	const selected = new Set(desktop.selectedIcons ?? []);
	return desktop.icons.filter((icon) => selected.has(icon.appId));
};

/**
 * The paths the desktop's Delete moves: the selected file and folder icons'
 * (no drive, app or the Trash), as the desktop's Delete key takes them.
 */
const selectedDeletablePaths = (): string[] =>
	selectedDesktopIcons().flatMap((icon) =>
		icon.filePath !== undefined &&
		icon.kind !== "drive" &&
		icon.kind !== "trash"
			? [icon.filePath]
			: [],
	);

/**
 * Opens a desktop icon as its double-click does: a Desktop Folder item
 * through the file system (a folder in Finder, a file in its app), any
 * other icon by its stored event and its app's launch.
 */
export const classicyOpenDesktopIcon = (
	icon: ClassicyStoreSystemDesktopManagerIcon,
	fs: ClassicyFileSystem,
	dispatch: Dispatch,
): void => {
	if (
		icon.filePath !== undefined &&
		icon.kind !== "drive" &&
		icon.kind !== "trash"
	) {
		const entry = fs.resolve(icon.filePath);
		if (!entry) return;
		if (
			entry._type === ClassicyFileSystemEntryFileType.Directory ||
			entry._type === ClassicyFileSystemEntryFileType.Drive
		) {
			dispatch({ type: "ClassicyAppFinderOpenFolder", path: icon.filePath });
		} else {
			dispatch({
				type: "ClassicyAppFinderOpenFile",
				file: entry,
				path: icon.filePath,
			});
		}
		return;
	}
	if (icon.event && icon.eventData) {
		dispatch({ type: icon.event, ...icon.eventData });
	}
	if (!icon.noLaunch) {
		dispatch({
			type: "ClassicyDesktopIconOpen",
			iconId: `${icon.appId}.shortcut`,
			app: { id: icon.appId, name: icon.appName, icon: icon.icon },
		});
	}
};

/**
 * Explorer's commands for the desktop under `layout.finder.commands`
 * "windows" (Windows 98 SE's desktop, shell32.dll's menus; WIG Ch.1
 * "Understanding Users", p.8; App. A Table A.1 and note 3, pp.349-350):
 * `barMenu` and `whiteSpaceMenu`, both undefined under any other layout,
 * where the desktop keeps its own menus. They act on the desktop's
 * selection (`selectedIcons`, their Desktop Folder paths) through the file
 * system and the store's dispatch, read when each command runs, so the
 * desktop component needs nothing of its own for them.
 *
 * - Open ⌃O: each selected icon, as its double-click opens it.
 * - New ▸: Folder, then the mounted apps' `creates` types, made in the
 *   Desktop Folder (created on first use), named "New Folder", "New Folder
 *   (2)"…, its icon at the white-space menu's point or the first free grid
 *   cell, selected alone, its name edited at once.
 * - Delete (Del): the selected files and folders to the Trash, Windows 98
 *   SE's confirmation first (`moveClassicyItemsToTrash`).
 * - Rename: the one selected Desktop Folder item's name, edited in place.
 * - Select All ⌃A: every icon drawn.
 * - Arrange Icons ▸ by Name, by Type (the desktop's own sorts; its icons
 *   hold no size or date) and Line Up Icons (each icon to its nearest free
 *   cell, `ClassicyDesktopIconLineUp`).
 *
 * Windows 98 SE's desktop menu also held Active Desktop ▸, Refresh, Undo,
 * Paste, Paste Shortcut and Properties; Refresh has nothing to do in a live
 * tree, Classicy has no file undo, and Paste, Paste Shortcut, Create
 * Shortcut and Properties are other items' (they add to these menus).
 */
export const useClassicyDesktopCommands = (): ClassicyDesktopCommands => {
	const windowsCommands = useClassicyWindowsFinderCommands();
	const ak = useClassicyBundledAccessKeys();
	const dispatch = useAppManagerDispatch();
	const getFileSystem = useClassicyFileSystemAccessor();
	const creatableTypes = useClassicyCreatableFileTypes();

	return useMemo<ClassicyDesktopCommands>(() => {
		if (!windowsCommands) return {};
		const key = (letter: string) =>
			ak(letter) !== undefined ? { accessKey: ak(letter) } : {};

		const open = () => {
			const fs = getFileSystem();
			for (const icon of selectedDesktopIcons())
				classicyOpenDesktopIcon(icon, fs, dispatch);
		};
		const newItem = (what: ClassicyNewItemKind, at?: [number, number]) => {
			const fs = getFileSystem();
			const folder = ensureClassicyDesktopFolder(fs);
			if (!folder) return;
			const path = classicyNewItemPath(fs, folder, what);
			if (!makeClassicyNewItem(fs, path, what)) return;
			const state = useAppManager.getState().System.Manager;
			const location = at
				? classicyDesktopDropLocation(at)
				: classicyDesktopFreeIconLocation(
						state.Appearance.activeTheme,
						state.Desktop.icons,
						getClassicyAppearanceLayout(state.Appearance.packageId).desktop
							.iconGridOrigin,
					);
			// Placed in the same tick as the item is made, so the desktop's
			// mirror of the Desktop Folder finds it placed.
			const action = classicyDesktopItemIconAction(fs, path, location);
			if (!action) return;
			dispatch(action);
			const iconId = `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${path}`;
			dispatch({ type: "ClassicyDesktopIconFocus", iconId });
			startClassicyDesktopIconRename(iconId);
		};
		const remove = () => {
			const paths = selectedDeletablePaths();
			if (paths.length > 0)
				moveClassicyItemsToTrash(getFileSystem(), paths, dispatch);
		};
		const rename = () => {
			const selected = selectedDesktopIcons();
			const only = selected[0];
			if (
				selected.length === 1 &&
				only.filePath !== undefined &&
				only.appId.startsWith(CLASSICY_DESKTOP_ITEM_ICON_PREFIX) &&
				classicyCanRename(getFileSystem(), only.filePath)
			)
				startClassicyDesktopIconRename(only.appId);
		};
		const selectAll = () => {
			const desktop = useAppManager.getState().System.Manager.Desktop;
			dispatch({
				type: "ClassicyDesktopIconSelectBox",
				iconIds: desktop.icons
					.filter((icon) => !icon.hidden)
					.map((icon) => icon.appId),
			});
		};
		const arrangeItems = (id: string): ClassicyMenuItem[] => [
			classicyArrangeIconsMenuItem(id, ak, ["name", "kind"], (by) =>
				dispatch({ type: "ClassicyDesktopIconSort", sortBy: by }),
			),
			classicyLineUpIconsMenuItem(id, ak, () =>
				dispatch({ type: "ClassicyDesktopIconLineUp" }),
			),
		];

		const barMenu: ClassicyMenuItem[] = [
			{
				id: "finder_file",
				title: "File",
				...key("f"),
				menuChildren: [
					{
						id: "finder_file_open",
						title: "Open",
						...key("o"),
						keyboardShortcut: "⌘O",
						onClickFunc: open,
					},
					{ id: "spacer" },
					classicyNewMenuItem("finder_file", ak, creatableTypes, (what) =>
						newItem(what),
					),
					{ id: "spacer" },
					classicyDeleteMenuItem("finder_file", ak, remove),
					classicyRenameMenuItem("finder_file", ak, rename),
				],
			},
			{
				id: "finder_edit",
				title: "Edit",
				...key("e"),
				menuChildren: [
					{
						id: "finder_edit_select_all",
						title: "Select All",
						...key("a"),
						keyboardShortcut: "⌘A",
						onClickFunc: selectAll,
					},
				],
			},
			{
				id: "finder_view",
				title: "View",
				...key("v"),
				menuChildren: arrangeItems("finder_view"),
			},
		];
		const whiteSpaceMenu = (at: [number, number]): ClassicyMenuItem[] => [
			...arrangeItems("finder_desktop"),
			{ id: "spacer" },
			classicyNewMenuItem("finder_desktop", ak, creatableTypes, (what) =>
				newItem(what, at),
			),
		];
		return { barMenu, whiteSpaceMenu };
	}, [windowsCommands, ak, dispatch, getFileSystem, creatableTypes]);
};
