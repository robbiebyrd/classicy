import { useEffect, useMemo } from "react";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	APPEARANCE_MANAGER_APP_ID,
	APPEARANCE_MANAGER_DESKTOP_TAB,
	APPEARANCE_MANAGER_TABS_KEY,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyDesktopFreeIconLocation } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import { startClassicyDesktopIconRename } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconRename.internal";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	classicyFileClipboardKey,
	useClassicyFileClipboard,
} from "@/SystemFolder/SystemResources/File/ClassicyFileClipboard";
import {
	type ClassicyNewItemKind,
	classicyArrangeIconsMenuItem,
	classicyCanPaste,
	classicyCanRename,
	classicyCopyItems,
	classicyCopyMenuItem,
	classicyCreateShortcutMenuItem,
	classicyCreateShortcuts,
	classicyCutItems,
	classicyCutMenuItem,
	classicyDeleteMenuItem,
	classicyLineUpIconsMenuItem,
	classicyNewItemPath,
	classicyNewMenuItem,
	classicyPasteItems,
	classicyPasteMenuItem,
	classicyPasteShortcutMenuItem,
	classicyPasteShortcuts,
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
import {
	CLASSICY_PROPERTIES_TITLE,
	classicyDesktopIconPropertiesTarget,
	classicyPropertiesOpenAction,
} from "@/SystemFolder/SystemResources/File/ClassicyFileProperties";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { useClassicyFileSystemAccessor } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { useClassicyMenuItemShortcuts } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuItemShortcut";
import { openClassicyAppAtTab } from "@/SystemFolder/SystemResources/Tabs/useClassicySessionTab";

/** The desktop's Explorer commands (`useClassicyDesktopCommands`). */
export type ClassicyDesktopCommands = {
	/**
	 * The desktop's File, Edit and View menus (ids `finder_file`,
	 * `finder_edit`, `finder_view`, the ids of the desktop's own), for
	 * `Desktop.appMenu` and the headless bar's chords: File ▸ Open ⌃O, New ▸,
	 * Create Shortcut, Delete (Del), Rename and Properties; Edit ▸ Cut ⌃X,
	 * Copy ⌃C, Paste ⌃V, Paste Shortcut and Select All ⌃A; View ▸ Arrange
	 * Icons ▸ and Line Up Icons.
	 */
	barMenu?: ClassicyMenuItem[];
	/**
	 * The desktop's white-space menu, opened at the client point `at`:
	 * Arrange Icons ▸, Line Up Icons, Paste and Paste Shortcut (the first
	 * item going to `at`), New ▸ (a new item's icon going to `at`) and
	 * Properties (Display Properties).
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
 * The paths the desktop's Create Shortcut makes shortcuts to: every
 * selected icon that stands for an entry of the tree (a Desktop Folder
 * item, a drive, the Trash). An application's icon is no entry, and the
 * desktop draws it already.
 */
const selectedShortcutTargets = (): string[] =>
	selectedDesktopIcons().flatMap((icon) =>
		icon.filePath !== undefined ? [icon.filePath] : [],
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
 * - Create Shortcut: a shortcut to each selected Desktop Folder item beside
 *   it, "Shortcut to <name>", in the first free cell and selected; for a
 *   selected drive or the Trash, Windows 98's offer of the desktop
 *   (`ClassicyAppFinderOfferDesktopShortcut`), which Finder asks.
 * - Delete (Del): the selected files and folders to the Trash, Windows 98
 *   SE's confirmation first (`moveClassicyItemsToTrash`).
 * - Rename: the one selected Desktop Folder item's name, edited in place.
 * - Select All ⌃A: every icon drawn.
 * - Arrange Icons ▸ by Name, by Type (the desktop's own sorts; its icons
 *   hold no size or date) and Line Up Icons (each icon to its nearest free
 *   cell, `ClassicyDesktopIconLineUp`).
 *
 * - Properties: the selected icons' property sheet
 *   (`ClassicyAppFinderPropertiesOpen`, `classicyDesktopIconPropertiesTarget`);
 *   with none selected, and on the white space, Display Properties: the
 *   Appearance control panel opened on its Desktop tab
 *   (`openClassicyAppAtTab`), or brought forward as it stands when open.
 *
 * - Cut ⌃X and Copy ⌃C: the selected Desktop Folder items into the file
 *   clipboard (`ClassicyFileClipboard.ts`), a cut item drawn cut until the
 *   Paste, another Cut or Copy, or Escape.
 * - Paste ⌃V: the file clipboard's items into the Desktop Folder, moved (a
 *   Cut, emptying it) or copied ("Copy of <name>" where the name is taken),
 *   at the white-space menu's point or each in the next free cell, then
 *   selected; Paste Shortcut, after a Copy, a shortcut to each there.
 *
 * While the hook is mounted under the key it also takes the desktop's
 * Ctrl+X, Ctrl+C and Ctrl+V (`classicyFileClipboardKey`, with the active
 * package's Command rule): pressed on the desktop itself or a desktop icon,
 * never in a text field (a name being edited keeps the browser's own) or a
 * window, and not taken by anything before it, they run Cut, Copy and
 * Paste above (bubble phase, on the document).
 *
 * Windows 98 SE's desktop menu also held Active Desktop ▸, Refresh and
 * Undo; Refresh has nothing to do in a live tree, and Classicy has no file
 * undo.
 */
export const useClassicyDesktopCommands = (): ClassicyDesktopCommands => {
	const windowsCommands = useClassicyWindowsFinderCommands();
	const ak = useClassicyBundledAccessKeys();
	// The user's own Open and Select All keys (`keyboard.editableShortcuts`),
	// shared with the Finder windows' items of the same ids.
	const shortcut = useClassicyMenuItemShortcuts();
	const dispatch = useAppManagerDispatch();
	const getFileSystem = useClassicyFileSystemAccessor();
	const creatableTypes = useClassicyCreatableFileTypes();
	// The bar's Paste and Paste Shortcut dim while the file clipboard holds
	// nothing to paste (live: the menu follows a Cut or Copy).
	const clipboard = useClassicyFileClipboard();

	// Explorer's Ctrl+X, Ctrl+C and Ctrl+V on the desktop (5.28).
	useEffect(() => {
		if (!windowsCommands) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.defaultPrevented || !(e.target instanceof Element)) return;
			const target = e.target;
			const onDesktop =
				target.id === "classicyDesktop" ||
				(target.closest(".classicyDesktopIcon") !== null &&
					target.closest(".classicyWindow") === null);
			if (
				!onDesktop ||
				target.closest("input, textarea, [contenteditable='true']")
			)
				return;
			const command = classicyFileClipboardKey(e);
			if (!command) return;
			e.preventDefault();
			const fs = getFileSystem();
			if (command === "cut") classicyCutItems(fs, selectedDeletablePaths());
			else if (command === "copy")
				classicyCopyItems(fs, selectedDeletablePaths());
			else classicyPasteItems(fs, { kind: "desktop" }, dispatch);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [windowsCommands, getFileSystem, dispatch]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: clipboard is a trigger: the bar's Paste items read it (through classicyCanPaste) when built
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
		const createShortcut = () => {
			const paths = selectedShortcutTargets();
			if (paths.length > 0)
				classicyCreateShortcuts(getFileSystem(), paths, dispatch);
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
		// Explorer's Properties (WIG Ch.2 pp.12-13; Ch.5 "Properties",
		// p.51): the desktop's Display Properties (the Appearance control
		// panel on its Desktop tab), or the selected icons' sheet.
		const displayProperties = () => {
			openClassicyAppAtTab(
				dispatch,
				APPEARANCE_MANAGER_APP_ID,
				APPEARANCE_MANAGER_TABS_KEY,
				APPEARANCE_MANAGER_DESKTOP_TAB,
			);
		};
		const properties = () => {
			const desktop = useAppManager.getState().System.Manager.Desktop;
			const selected = selectedDesktopIcons();
			const target =
				selected.length > 0
					? classicyDesktopIconPropertiesTarget(
							desktop.icons,
							desktop.selectedIcons ?? [],
							selected[0].appId,
						)
					: undefined;
			if (target) dispatch(classicyPropertiesOpenAction(target));
			else displayProperties();
		};
		const propertiesItem = (id: string, onProperties: () => void) => ({
			id: `${id}_properties`,
			title: CLASSICY_PROPERTIES_TITLE,
			...key("r"),
			onClickFunc: onProperties,
		});
		// Explorer's Cut, Copy, Paste and Paste Shortcut (5.28).
		const cut = () => {
			const paths = selectedDeletablePaths();
			if (paths.length > 0) classicyCutItems(getFileSystem(), paths);
		};
		const copy = () => {
			const paths = selectedDeletablePaths();
			if (paths.length > 0) classicyCopyItems(getFileSystem(), paths);
		};
		const pasteItems = (id: string, at?: [number, number]) => {
			const fs = getFileSystem();
			return [
				classicyPasteMenuItem(
					id,
					ak,
					() => classicyPasteItems(fs, { kind: "desktop" }, dispatch, { at }),
					{
						disabled: !classicyCanPaste(fs, undefined),
						shortcut: at === undefined,
					},
				),
				classicyPasteShortcutMenuItem(
					id,
					ak,
					() =>
						classicyPasteShortcuts(fs, { kind: "desktop" }, dispatch, { at }),
					{ disabled: !classicyCanPaste(fs, undefined, { shortcut: true }) },
				),
			];
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
						keyboardShortcut: shortcut("finder_file_open", "⌘O"),
						onClickFunc: open,
					},
					{ id: "spacer" },
					classicyNewMenuItem("finder_file", ak, creatableTypes, (what) =>
						newItem(what),
					),
					{ id: "spacer" },
					classicyCreateShortcutMenuItem("finder_file", ak, createShortcut),
					classicyDeleteMenuItem("finder_file", ak, remove),
					classicyRenameMenuItem("finder_file", ak, rename),
					propertiesItem("finder_file", properties),
				],
			},
			{
				id: "finder_edit",
				title: "Edit",
				...key("e"),
				menuChildren: [
					classicyCutMenuItem("finder_edit", ak, cut, { shortcut: true }),
					classicyCopyMenuItem("finder_edit", ak, copy, { shortcut: true }),
					...pasteItems("finder_edit"),
					{ id: "spacer" },
					{
						id: "finder_edit_select_all",
						title: "Select All",
						...key("a"),
						keyboardShortcut: shortcut("finder_edit_select_all", "⌘A"),
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
			...pasteItems("finder_desktop", at),
			{ id: "spacer" },
			classicyNewMenuItem("finder_desktop", ak, creatableTypes, (what) =>
				newItem(what, at),
			),
			{ id: "spacer" },
			propertiesItem("finder_desktop", displayProperties),
		];
		return { barMenu, whiteSpaceMenu };
	}, [
		windowsCommands,
		ak,
		dispatch,
		getFileSystem,
		creatableTypes,
		clipboard,
		shortcut,
	]);
};
