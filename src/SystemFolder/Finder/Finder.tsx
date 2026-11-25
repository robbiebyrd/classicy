import {
	type FC as FunctionalComponent,
	memo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { ClassicyCreatableFileType } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { toLocalDate } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils";
import {
	buildDriveContextMenu,
	isDriveSyncConnected,
} from "@/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetupUtils";
import { ClassicyFilePropertiesWindow } from "@/SystemFolder/Finder/ClassicyFilePropertiesWindow";
import { ClassicyOpenWithDialog } from "@/SystemFolder/Finder/ClassicyOpenWithDialog";
import { FinderAboutThisComputer } from "@/SystemFolder/Finder/FinderAboutThisComputer";
import {
	classicyFinderOpensWithDialog,
	type FinderData,
	type FinderIconViewOptions,
	type FinderListViewOptions,
	isFinderData,
	resolveStandardViews,
} from "@/SystemFolder/Finder/FinderContext";
import { FinderPreferences } from "@/SystemFolder/Finder/FinderPreferences";
import { useFinderFolderSize } from "@/SystemFolder/Finder/useFinderFolderSize";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { startClassicyDesktopIconRename } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconRename.internal";
import { classicySpecialMenuItems } from "@/SystemFolder/SystemResources/Desktop/ClassicySpecialMenu";
import {
	ClassicyFileBrowser,
	type ClassicyFileBrowserCommands,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import type {
	ClassicyFileBrowserArrangeKey,
	ClassicyFileBrowserMoveItems,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { useClassicyFileClipboard } from "@/SystemFolder/SystemResources/File/ClassicyFileClipboard";
import {
	type ClassicyNewItemKind,
	classicyArrangeIconsMenuItem,
	classicyCanCopy,
	classicyCanCut,
	classicyCanMakeItemIn,
	classicyCanPaste,
	classicyCanRename,
	classicyCopyItems,
	classicyCopyMenuItem,
	classicyCreateShortcutMenuItem,
	classicyCreateShortcuts,
	classicyCutItems,
	classicyCutMenuItem,
	classicyDeleteConfirmation,
	classicyDeleteMenuItem,
	classicyLineUpIconsMenuItem,
	classicyNewItemPath,
	classicyNewMenuItem,
	classicyPasteItems,
	classicyPasteMenuItem,
	classicyPasteShortcutMenuItem,
	classicyPasteShortcuts,
	classicyRenameMenuItem,
	classicyVerbMenuItems,
	createClassicyDesktopShortcuts,
	makeClassicyNewItem,
	transferClassicyFileSystemItems,
	useClassicyCreatableFileTypes,
	useClassicyFileVerbs,
} from "@/SystemFolder/SystemResources/File/ClassicyFileCommands.internal";
import {
	activateClassicyDropWindow,
	CLASSICY_DESKTOP_ITEM_ICON_PREFIX,
	classicyDesktopDropLocation,
	classicyDesktopFolderPath,
	classicyDesktopItemIconAction,
	moveClassicyItemsToTrash,
	renameClassicyFileSystemItem,
	restoreClassicyTrashItems,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import {
	CLASSICY_PROPERTIES_TITLE,
	classicyPropertiesOpenAction,
} from "@/SystemFolder/SystemResources/File/ClassicyFileProperties";
import {
	CLASSICY_SHORTCUT_DESKTOP_OFFER,
	CLASSICY_SHORTCUT_TITLE,
} from "@/SystemFolder/SystemResources/File/ClassicyFileShortcut";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { classicyExtensionControlPanelId } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	CLASSICY_TRASH_PATH,
	ensureClassicyTrash,
	isClassicyTrashItem,
	isInClassicyTrash,
	listClassicyTrashItems,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import {
	useClassicyStoredTrashIcon,
	useClassicyTrashIcon,
} from "@/SystemFolder/SystemResources/File/ClassicyTrashIcon.internal";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { useClassicyMenuItemShortcuts } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuItemShortcut";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

type FinderWindowProps = {
	appId: string;
	op: string;
	dir: ClassicyFileSystemEntry;
	idx: number;
	closeFolder: (path: string) => void;
	closeAllFolders: () => void;
	closeWindow: (windowId: string, appCleanupAction: ActionMessage) => void;
	setFolderView: (path: string, viewType: "icons" | "list") => void;
	openFolder: (path: string) => void;
	openFile: (path: string) => void;
	/** Opens every item given, as a double-click on each does. */
	openItems: (paths: string[]) => void;
	getHeaderString: (dir: ClassicyFileSystemEntryMetadata) => string;
	fs: ClassicyFileSystem;
	disableBalloonHelp: boolean;
	toggleBalloonHelp: () => void;
	aboutMenuItem: ClassicyMenuItem;
	openPreferences: () => void;
	viewType: "icons" | "list";
	iconViewOptions: FinderIconViewOptions;
	listViewOptions: FinderListViewOptions;
	now: Date;
	onMoveItems: ClassicyFileBrowserMoveItems;
	trashItems: (paths: string[]) => void;
	restoreItems: (paths: string[]) => void;
	renameItem: (path: string, name: string) => string | undefined;
	itemContextMenu: (
		path: string,
		selectedPaths: string[],
		commands: ClassicyFileBrowserCommands | null,
	) => ClassicyMenuItem[] | undefined;
	/** The active package's Trash art, full or empty: the Trash window's icon. */
	trashIcon: string;
	/**
	 * Explorer's commands in the window's menus (`layout.finder.commands`
	 * "windows"): File ▸ Open, New ▸, Delete and Rename, View ▸ Large Icons,
	 * Details, Arrange Icons ▸ and Line Up Icons, and the white space's menu.
	 */
	windowsCommands: boolean;
	/** The document types File ▸ New lists (the mounted apps' `creates`). */
	creatableTypes: ClassicyCreatableFileType[];
	/**
	 * Makes a new folder or document in `folder` and begins editing its name
	 * in the window's browser (`commands`), its icon at the client point `at`
	 * (a white-space menu's) or the first free cell.
	 */
	newItem: (
		folder: string,
		what: ClassicyNewItemKind,
		commands: ClassicyFileBrowserCommands | null,
		at?: [number, number],
	) => void;
	/**
	 * Explorer's Create Shortcut on the items at `paths`: a shortcut beside
	 * each, placed and selected in the window's browser (`commands`), or the
	 * desktop offered where none may be made.
	 */
	createShortcuts: (
		paths: string[],
		commands: ClassicyFileBrowserCommands | null,
	) => void;
	/**
	 * Explorer's Properties on the items at `paths` (their property sheet,
	 * `ClassicyFilePropertiesWindow`): File ▸ Properties, Alt+Enter and an
	 * Alt double-click in the window, the window's folder when nothing is
	 * selected.
	 */
	showProperties: (paths: string[]) => void;
	/**
	 * Explorer's Cut and Copy of the items at `paths` (the file clipboard,
	 * `ClassicyFileClipboard.ts`): Edit ▸ Cut and Copy, Ctrl+X and Ctrl+C in
	 * the window.
	 */
	cutItems: (paths: string[]) => void;
	copyItems: (paths: string[]) => void;
	/**
	 * Explorer's Paste and Paste Shortcut into `folder`: the file
	 * clipboard's items moved (a Cut) or copied, or shortcuts to them made,
	 * placed (the first at the client point `at`, a white-space menu's) and
	 * selected in the window's browser (`commands`).
	 */
	pasteItems: (
		folder: string,
		commands: ClassicyFileBrowserCommands | null,
		at?: [number, number],
	) => void;
	pasteShortcuts: (
		folder: string,
		commands: ClassicyFileBrowserCommands | null,
		at?: [number, number],
	) => void;
};

const FinderWindow: FunctionalComponent<FinderWindowProps> = ({
	appId,
	op,
	dir,
	idx,
	closeFolder,
	closeAllFolders,
	closeWindow,
	setFolderView,
	openFolder,
	openFile,
	openItems,
	getHeaderString,
	fs,
	disableBalloonHelp,
	toggleBalloonHelp,
	aboutMenuItem,
	openPreferences,
	viewType,
	iconViewOptions,
	listViewOptions,
	now,
	onMoveItems,
	trashItems,
	restoreItems,
	renameItem,
	itemContextMenu,
	trashIcon,
	windowsCommands,
	creatableTypes,
	newItem,
	createShortcuts,
	showProperties,
	cutItems,
	copyItems,
	pasteItems,
	pasteShortcuts,
}) => {
	const desktopEventDispatch = useAppManagerDispatch();
	// The bundled menus' access keys under a package that has them (WIG
	// Appendix B Table B.5: File F, Close C, Edit E, Select All A, View V,
	// Help H; Special S, its first letter).
	const ak = useClassicyBundledAccessKeys();
	// The user's own shortcuts (`keyboard.editableShortcuts`; WIG Ch.4
	// "Shortcut Keys", p.27), under the ids the desktop's menus share.
	const shortcut = useClassicyMenuItemShortcuts();
	// The browser's selection, for File ▸ Move To Trash and Restore.
	const commandsRef = useRef<ClassicyFileBrowserCommands | null>(null);
	const inTrash = isInClassicyTrash(fs, op);
	// One handle per open folder window: a single shared ref would make every
	// window's Select All drive whichever table mounted last.
	const selectionApiRef = useRef<ClassicyTableSelectionApi | null>(null);
	// #270: likewise one keyboard target per window — the list view's list
	// box (null in icon view). The window focuses it whenever it becomes the
	// focused window, so arrows/Return work without clicking the list first.
	const focusTargetRef = useRef<HTMLDivElement | null>(null);
	const windowFocused = useAppManager(
		(state) =>
			!!getAppWindow(state.System.Manager.Applications.apps[appId], op)
				?.focused,
	);

	// Switching View as Icons/List swaps the browser's content but is no
	// window-focus transition, so ClassicyWindow won't refocus on its own.
	// Hand the freshly mounted list box focus when this window is the focused
	// one and focus isn't already on something else inside it.
	const prevViewTypeRef = useRef(viewType);
	useEffect(() => {
		if (prevViewTypeRef.current === viewType) return;
		prevViewTypeRef.current = viewType;
		if (!windowFocused) return;
		const target = focusTargetRef.current;
		if (!target) return;
		const active = document.activeElement;
		if (active && target.closest(".classicyWindow")?.contains(active)) return;
		target.focus({ preventScroll: true });
	}, [viewType, windowFocused]);

	// Explorer's commands (`layout.finder.commands` "windows"; Windows 98 SE
	// Explorer's menus, shell32.dll; WIG Ch.1 "Understanding Users", p.8):
	// File ▸ Open, New ▸, Delete, Rename and Close, View ▸ Large Icons and
	// Details, Arrange Icons ▸ and Line Up Icons, acting on the browser's
	// selection, and the same view commands, with New, on the white space.
	const canMakeHere = windowsCommands && classicyCanMakeItemIn(fs, op);
	// Paste and Paste Shortcut (5.28) dim while the file clipboard holds
	// nothing this folder takes (live: the menus follow a Cut or Copy).
	const clipboard = useClassicyFileClipboard();
	const canPaste =
		windowsCommands && clipboard !== null && classicyCanPaste(fs, op);
	const canPasteShortcut =
		canPaste && classicyCanPaste(fs, op, { shortcut: true });
	const pasteMenuItems = useCallback(
		(idPrefix: string, at?: [number, number]): ClassicyMenuItem[] => [
			classicyPasteMenuItem(
				idPrefix,
				ak,
				() => pasteItems(op, commandsRef.current, at),
				{ disabled: !canPaste, shortcut: at === undefined },
			),
			classicyPasteShortcutMenuItem(
				idPrefix,
				ak,
				() => pasteShortcuts(op, commandsRef.current, at),
				{ disabled: !canPasteShortcut },
			),
		],
		[ak, op, pasteItems, pasteShortcuts, canPaste, canPasteShortcut],
	);
	const offeredArrangements: ClassicyFileBrowserArrangeKey[] =
		viewType === "icons"
			? ["name", "kind", "size", "modified"]
			: [
					"name",
					...(listViewOptions.columns.kind ? (["kind"] as const) : []),
					...(listViewOptions.columns.size ? (["size"] as const) : []),
					...(listViewOptions.columns.modified ? (["modified"] as const) : []),
				];
	const offeredArrangementsKey = offeredArrangements.join(",");
	const windowsViewItems = useCallback(
		(idPrefix: string): ClassicyMenuItem[] => [
			{
				id: `${idPrefix}_large_icons`,
				title: "Large Icons",
				...(ak("g") !== undefined ? { accessKey: ak("g") } : {}),
				checked: viewType === "icons",
				mark: "bullet" as const,
				onClickFunc: () => setFolderView(op, "icons"),
			},
			{
				id: `${idPrefix}_details`,
				title: "Details",
				...(ak("D") !== undefined ? { accessKey: ak("D") } : {}),
				checked: viewType === "list",
				mark: "bullet" as const,
				onClickFunc: () => setFolderView(op, "list"),
			},
		],
		[ak, viewType, setFolderView, op],
	);
	const windowsArrangeItems = useCallback(
		(idPrefix: string): ClassicyMenuItem[] => [
			classicyArrangeIconsMenuItem(
				idPrefix,
				ak,
				offeredArrangementsKey.split(",") as ClassicyFileBrowserArrangeKey[],
				(key) => commandsRef.current?.arrange(key),
			),
			// Windows 98 SE dims Line Up Icons in the details view.
			classicyLineUpIconsMenuItem(
				idPrefix,
				ak,
				() => commandsRef.current?.lineUp(),
				viewType === "list",
			),
		],
		[ak, offeredArrangementsKey, viewType],
	);
	const backgroundContextMenu = useCallback(
		(at: [number, number]): ClassicyMenuItem[] | undefined =>
			windowsCommands
				? [
						{
							id: `${appId}_${op}_ws_view`,
							title: "View",
							...(ak("V") !== undefined ? { accessKey: ak("V") } : {}),
							menuChildren: windowsViewItems(`${appId}_${op}_ws_view`),
						},
						{ id: "spacer" },
						...windowsArrangeItems(`${appId}_${op}_ws`),
						// Explorer's Paste and Paste Shortcut (5.28), into the
						// window's folder, the first item where the menu opened.
						{ id: "spacer" },
						...pasteMenuItems(`${appId}_${op}_ws`, at),
						...(canMakeHere
							? [
									{ id: "spacer" },
									classicyNewMenuItem(
										`${appId}_${op}_ws`,
										ak,
										creatableTypes,
										(what) => newItem(op, what, commandsRef.current, at),
									),
								]
							: []),
						// Explorer's Properties, last (2.2): the folder's sheet.
						{ id: "spacer" },
						{
							id: `${appId}_${op}_ws_properties`,
							title: CLASSICY_PROPERTIES_TITLE,
							...(ak("r") !== undefined ? { accessKey: ak("r") } : {}),
							onClickFunc: () => showProperties([op]),
						},
					]
				: undefined,
		[
			windowsCommands,
			appId,
			op,
			ak,
			windowsViewItems,
			windowsArrangeItems,
			canMakeHere,
			creatableTypes,
			newItem,
			pasteMenuItems,
			showProperties,
		],
	);
	const windowsItemContextMenu = useCallback(
		(path: string, selectedPaths: string[]) =>
			itemContextMenu(path, selectedPaths, commandsRef.current),
		[itemContextMenu],
	);

	const appMenu = useMemo(
		() => [
			{
				id: `${appId}_${op}_file`,
				title: "File",
				accessKey: ak("f"),
				menuChildren: windowsCommands
					? [
							{
								id: `${appId}_${op}_file_open`,
								title: "Open",
								...(ak("o") !== undefined ? { accessKey: ak("o") } : {}),
								keyboardShortcut: shortcut("finder_file_open", "⌘O"),
								onClickFunc: () =>
									openItems(commandsRef.current?.selectedPaths() ?? []),
							},
							{ id: "spacer" },
							...(inTrash
								? []
								: [
										classicyNewMenuItem(
											`${appId}_${op}_file`,
											ak,
											creatableTypes,
											(what) => newItem(op, what, commandsRef.current),
											!canMakeHere,
										),
										{ id: "spacer" },
										classicyCreateShortcutMenuItem(
											`${appId}_${op}_file`,
											ak,
											() =>
												createShortcuts(
													commandsRef.current?.selectedPaths() ?? [],
													commandsRef.current,
												),
										),
										classicyDeleteMenuItem(`${appId}_${op}_file`, ak, () =>
											trashItems(commandsRef.current?.selectedPaths() ?? []),
										),
										classicyRenameMenuItem(`${appId}_${op}_file`, ak, () => {
											const only = commandsRef.current?.selectedPaths() ?? [];
											if (only.length === 1 && classicyCanRename(fs, only[0]))
												commandsRef.current?.rename(only[0]);
										}),
									]),
							...(op === CLASSICY_TRASH_PATH
								? [
										{
											id: `${appId}_${op}_file_restore`,
											title: "Restore",
											...(ak("e") !== undefined ? { accessKey: ak("e") } : {}),
											onClickFunc: () =>
												restoreItems(
													commandsRef.current?.selectedPaths() ?? [],
												),
										},
									]
								: []),
							// Explorer's File ▸ Properties (WIG Ch.5 "Properties",
							// p.51): the selection's sheet, else the folder's.
							{
								id: `${appId}_${op}_file_properties`,
								title: CLASSICY_PROPERTIES_TITLE,
								...(ak("r") !== undefined ? { accessKey: ak("r") } : {}),
								onClickFunc: () => {
									const selected = commandsRef.current?.selectedPaths() ?? [];
									showProperties(selected.length > 0 ? selected : [op]);
								},
							},
							{ id: "spacer" },
							{
								id: `${appId}_${op}_file_closew`,
								title: "Close",
								...(ak("c") !== undefined ? { accessKey: ak("c") } : {}),
								onClickFunc: () =>
									closeWindow(op, {
										type: "ClassicyAppFinderCloseFolder",
										path: op,
									}),
							},
						]
					: [
							closeWindowMenuItemHelper(
								`${appId}_${op}_file_closew`,
								() =>
									closeWindow(op, {
										type: "ClassicyAppFinderCloseFolder",
										path: op,
									}),
								ak("c"),
							),
							closeAllWindowsMenuItemHelper(
								`${appId}_${op}_file_closews`,
								closeAllFolders,
							),
							{ id: "spacer" },
							{
								id: `${appId}_${op}_file_move_to_trash`,
								title: "Move To Trash",
								keyboardShortcut: shortcut("finder_file_move_to_trash", "⌃⌫"),
								disabled: inTrash,
								onClickFunc: () =>
									trashItems(commandsRef.current?.selectedPaths() ?? []),
							},
							...(op === CLASSICY_TRASH_PATH
								? [
										{
											id: `${appId}_${op}_file_restore`,
											title: "Restore",
											onClickFunc: () =>
												restoreItems(
													commandsRef.current?.selectedPaths() ?? [],
												),
										},
									]
								: []),
						],
			},
			// Built inline rather than from useClassicyEditMenu: that hook's Select
			// All calls classicyEditCommands.selectAll, which acts on the focused
			// text field — correct for SimpleText, wrong for a file browser. Do
			// not consolidate the two.
			{
				id: `${appId}_${op}_edit`,
				title: "Edit",
				accessKey: ak("e"),
				menuChildren: [
					// Explorer's Edit menu (Windows 98 SE, shell32.dll; 5.28):
					// Cut Ctrl+X, Copy Ctrl+C, Paste Ctrl+V and Paste Shortcut on
					// the window's selection and folder, before Select All.
					...(windowsCommands
						? [
								classicyCutMenuItem(
									`${appId}_${op}_edit`,
									ak,
									() => cutItems(commandsRef.current?.selectedPaths() ?? []),
									{ shortcut: true },
								),
								classicyCopyMenuItem(
									`${appId}_${op}_edit`,
									ak,
									() => copyItems(commandsRef.current?.selectedPaths() ?? []),
									{ disabled: inTrash, shortcut: true },
								),
								...pasteMenuItems(`${appId}_${op}_edit`),
								{ id: "spacer" },
							]
						: []),
					{
						id: `${appId}_${op}_edit_select_all`,
						title: "Select All",
						accessKey: ak("a"),
						keyboardShortcut: shortcut("finder_edit_select_all", "⌘A"),
						// Either view: the icon view keeps one selection too.
						onClickFunc: () => selectionApiRef.current?.selectAll(),
					},
					{ id: "spacer" },
					{
						id: `${appId}_${op}_edit_preferences`,
						title: "Preferences…",
						onClickFunc: openPreferences,
					},
				],
			},
			{
				id: `${appId}_view`,
				title: "View",
				accessKey: ak("v"),
				// One view at a time: an option group marking the current one,
				// as Mac OS 8's View menu checks it (Platinum and System 7 draw
				// their check) and Windows draws the chosen option's bullet (WIG
				// Ch.7 "Types of Menu Items" (p.108), Figure 7.5 "Option Button").
				// Explorer's View menu holds its views, then Arrange Icons ▸ and
				// Line Up Icons.
				menuChildren: windowsCommands
					? [
							...windowsViewItems(`${appId}_${op}_view`),
							{ id: "spacer" },
							...windowsArrangeItems(`${appId}_${op}_view`),
						]
					: [
							{
								id: `${appId}_${op}_view_as_icons`,
								title: "View as Icons",
								checked: viewType === "icons",
								mark: "bullet" as const,
								onClickFunc: () => setFolderView(op, "icons"),
							},
							{
								id: `${appId}_${op}_view_as_list`,
								title: "View as List",
								checked: viewType === "list",
								mark: "bullet" as const,
								onClickFunc: () => setFolderView(op, "list"),
							},
						],
			},
			{
				id: `${appId}_${op}_special`,
				title: "Special",
				accessKey: ak("s"),
				menuChildren: classicySpecialMenuItems(
					desktopEventDispatch,
					`${appId}_${op}`,
				),
			},
			{
				id: `${appId}_${op}_help`,
				title: "Help",
				accessKey: ak("h"),
				menuChildren: [
					{
						id: `${appId}_${op}_help_balloon`,
						title: disableBalloonHelp
							? "Show Balloon Help"
							: "Hide Balloon Help",
						onClickFunc: toggleBalloonHelp,
					},
					aboutMenuItem,
				],
			},
		],
		[
			appId,
			op,
			closeWindow,
			closeAllFolders,
			setFolderView,
			disableBalloonHelp,
			toggleBalloonHelp,
			aboutMenuItem,
			openPreferences,
			viewType,
			inTrash,
			trashItems,
			restoreItems,
			desktopEventDispatch,
			ak,
			windowsCommands,
			openItems,
			creatableTypes,
			newItem,
			canMakeHere,
			fs,
			windowsViewItems,
			windowsArrangeItems,
			createShortcuts,
			showProperties,
			cutItems,
			copyItems,
			pasteMenuItems,
			shortcut,
		],
	);

	return (
		<ClassicyWindow
			id={op}
			title={dir._name}
			// The Trash draws the active package's art at render, as its desktop
			// icon does, not the `_icon` stored with the folder; with no Trash
			// art registered, that `_icon`, else the directory icon.
			icon={
				op === CLASSICY_TRASH_PATH
					? trashIcon || dir._icon || iconImageByType(dir._type)
					: dir._icon
			}
			appId={appId}
			defaultWindow={false}
			hidden={false}
			initialSize={[425, 300]}
			initialPosition={[50 + idx * 50, 50 + idx * 50]}
			header={<span>{getHeaderString(dir)}</span>}
			onCloseFunc={closeFolder}
			appMenu={appMenu}
			initialFocusRef={focusTargetRef}
		>
			<ClassicyFileBrowser
				appId={appId}
				fs={fs}
				path={op}
				dirOnClickFunc={openFolder}
				fileOnClickFunc={openFile}
				// A double-click opens every selected item under Windows'
				// modifiers (WIG App. A Tables A.2 and A.3).
				openItemsFunc={openItems}
				display={viewType}
				iconViewOptions={iconViewOptions}
				listViewOptions={listViewOptions}
				now={now}
				selectionApiRef={selectionApiRef}
				focusTargetRef={focusTargetRef}
				onMoveItems={onMoveItems}
				// Invisible items (the Desktop Folder) stay out of Finder windows,
				// as in Mac OS 8; the header counts them as hidden.
				showInvisible={false}
				onDeleteItems={inTrash ? undefined : trashItems}
				itemContextMenu={windowsItemContextMenu}
				commandsRef={commandsRef}
				onRenameItem={renameItem}
				backgroundContextMenu={
					windowsCommands ? backgroundContextMenu : undefined
				}
				// Explorer's Alt+Enter and Alt double-click: the selection's
				// sheet, else the folder's.
				onPropertiesItems={
					windowsCommands
						? (paths) => showProperties(paths.length > 0 ? paths : [op])
						: undefined
				}
				// Explorer's Ctrl+X, Ctrl+C and Ctrl+V (5.28): the selection
				// cut or copied, the clipboard pasted into the window's folder.
				onClipboardCommand={
					windowsCommands
						? (command, paths) => {
								if (command === "cut") cutItems(paths);
								else if (command === "copy") {
									if (!inTrash) copyItems(paths);
								} else pasteItems(op, commandsRef.current);
							}
						: undefined
				}
			/>
		</ClassicyWindow>
	);
};

const FinderWindowMemo = memo(FinderWindow);

type FinderFolderWindowProps = Omit<FinderWindowProps, "dir" | "op"> & {
	path: string;
};

const FinderFolderWindow: FunctionalComponent<FinderFolderWindowProps> = ({
	path,
	fs,
	...rest
}) => {
	const size = useFinderFolderSize(path, fs);
	const shell = fs.statDirShell(path);
	if (!shell) return null;

	return (
		<FinderWindowMemo
			{...rest}
			fs={fs}
			op={path}
			dir={{ ...shell, _size: size }}
		/>
	);
};

const FinderFolderWindowMemo = memo(FinderFolderWindow);

/**
 * Windows 98 SE's Delete confirmation (Explorer's commands; shell32.dll's
 * "Confirm File Delete", "Confirm Folder Delete" and "Confirm Multiple File
 * Delete" boxes, Yes and No): shown while Finder's data holds a pending
 * Delete. Yes moves the items still there to the Trash under the trust the
 * request arrived with; No, Escape or closing moves nothing.
 */
const FinderDeleteConfirmation: FunctionalComponent<{
	appId: string;
	fs: ClassicyFileSystem;
	paths: string[];
	trust: "trusted" | "untrusted";
}> = ({ appId, fs, paths, trust }) => {
	const desktopEventDispatch = useAppManagerDispatch();
	const present = paths.filter((path) => fs.resolve(path));
	const { title, message } = classicyDeleteConfirmation(fs, present);
	return (
		<ClassicyAlert
			id={"finder_confirm_delete"}
			appId={appId}
			alertType={"caution"}
			movable={true}
			title={title}
			label={message}
			buttons={[
				{
					id: "yes",
					label: "Yes",
					role: "default",
					onClick: () => {
						if (present.length > 0)
							moveClassicyItemsToTrash(
								fs,
								present,
								(action) => desktopEventDispatch(action, trust),
								{ confirmed: true, trust },
							);
					},
				},
				{ id: "no", label: "No", role: "cancel" },
			]}
			onClose={() =>
				desktopEventDispatch({ type: "ClassicyAppFinderConfirmDeleteClose" })
			}
		/>
	);
};

/**
 * Windows 98 SE's offer when Create Shortcut's items lie where no shortcut
 * may be made (Explorer's commands; shell32.dll's "Windows cannot create a
 * shortcut here. Do you want the shortcut to be placed on the desktop
 * instead?", in its "Shortcut" box, Yes and No): shown while Finder's data
 * holds a pending offer. Yes makes a shortcut on the desktop to each item
 * still there; No, Escape or closing makes none.
 */
const FinderDesktopShortcutOffer: FunctionalComponent<{
	appId: string;
	fs: ClassicyFileSystem;
	paths: string[];
}> = ({ appId, fs, paths }) => {
	const desktopEventDispatch = useAppManagerDispatch();
	return (
		<ClassicyAlert
			id={"finder_desktop_shortcut_offer"}
			appId={appId}
			alertType={"caution"}
			movable={true}
			title={CLASSICY_SHORTCUT_TITLE}
			label={CLASSICY_SHORTCUT_DESKTOP_OFFER}
			buttons={[
				{
					id: "yes",
					label: "Yes",
					role: "default",
					onClick: () => {
						createClassicyDesktopShortcuts(
							fs,
							paths.filter((path) => fs.resolve(path)),
							desktopEventDispatch,
						);
					},
				},
				{ id: "no", label: "No", role: "cancel" },
			]}
			onClose={() =>
				desktopEventDispatch({
					type: "ClassicyAppFinderOfferDesktopShortcutClose",
				})
			}
		/>
	);
};

export const Finder = () => {
	// Two icons on purpose (K-R1). The record's icon, which the App Switcher
	// draws, is the Finder face, matching the store's default Finder record.
	// The About box has always drawn the compact Mac.
	const appIcon = useClassicyAsset("icons", "system.macos") ?? "";
	const aboutIcon = useClassicyAsset("icons", "system.mac") ?? "";
	const appName: string = "Finder";
	const appId: string = "Finder.app";
	const desktopEventDispatch = useAppManagerDispatch();
	// Explorer's commands in the item menus (`layout.finder.commands`
	// "windows": Windows 98); absent, Mac OS 8's Finder's.
	const windowsCommands =
		useClassicyAppearanceLayout().finder?.commands === "windows";
	// Open's access key in the item menus under a package that has them
	// (WIG Appendix B Table B.5: Open O; shell32.dll's "&Open").
	const ak = useClassicyBundledAccessKeys();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);
	const finderData: FinderData = isFinderData(appState?.data ?? {})
		? (appState?.data as FinderData)
		: {};
	const disableBalloonHelp = useAppManager(
		(state) => state.System.Manager.Desktop.disableBalloonHelp,
	);
	const toggleBalloonHelp = useCallback(() => {
		desktopEventDispatch({
			type: "ClassicyDesktopSetBalloonHelp",
			disableBalloonHelp: !disableBalloonHelp,
		});
	}, [desktopEventDispatch, disableBalloonHelp]);

	const dateAndTime = useAppManager((s) => s.System.Manager.DateAndTime);
	// Memoized on the primitive fields, not the DateAndTime object's identity —
	// a fresh Date or a new object every render would invalidate the memos the
	// icon/list views depend on for `now`.
	const now = useMemo(
		() =>
			toLocalDate(
				dateAndTime.dateTime,
				parseInt(dateAndTime.timeZoneOffset, 10),
			),
		[dateAndTime.dateTime, dateAndTime.timeZoneOffset],
	);

	const fs = useClassicyFileSystem();
	const closeWindow = useClassicyWindowClose(appId);
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		appId,
		appName,
		aboutIcon,
	);

	const prevOpenPathsRef = useRef<string[] | null>(null);
	useEffect(() => {
		const raw = appState.data ?? {};
		const appData: FinderData = isFinderData(raw) ? raw : {};
		if (!appData.openPaths) {
			return;
		}
		const openPaths: string[] = appData.openPaths;
		const prev = prevOpenPathsRef.current;
		if (
			prev &&
			prev.length === openPaths.length &&
			prev.every((p, i) => p === openPaths[i])
		) {
			return;
		}
		prevOpenPathsRef.current = openPaths;
		desktopEventDispatch({
			type: "ClassicyAppFinderOpenFolders",
			paths: openPaths,
		});
	}, [desktopEventDispatch, appState.data]);

	const setFolderView = useCallback(
		(path: string, viewType: "icons" | "list") => {
			desktopEventDispatch({
				type: "ClassicyAppFinderSetFolderView",
				path,
				viewType,
			});
		},
		[desktopEventDispatch],
	);

	// Depend on the window collection, not the whole app record, so the
	// callback (passed to every folder window) is stable across data changes.
	const finderWindows = appState.windows;
	const openFolder = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: "ClassicyAppFinderOpenFolder",
				path,
			});

			const ws = getAppWindow({ windows: finderWindows }, path);
			if (ws) {
				desktopEventDispatch({
					type: "ClassicyWindowOpen",
					app: {
						id: appId,
					},
					window: ws,
				});
				desktopEventDispatch({
					type: "ClassicyWindowFocus",
					app: {
						id: appId,
					},
					window: ws,
				});
			}
		},
		[desktopEventDispatch, finderWindows],
	);

	const openFile = useCallback(
		(path: string) => {
			const file = fs.resolve(path);
			desktopEventDispatch({
				type: "ClassicyAppFinderOpenFile",
				file,
				path,
			});
		},
		[fs, desktopEventDispatch],
	);

	const closeFolder = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: "ClassicyAppFinderCloseFolder",
				path,
			});
		},
		[desktopEventDispatch],
	);

	const closeAllFolders = useCallback(() => {
		const paths: string[] = finderData.openPaths ?? [];
		paths.forEach((path) => {
			closeWindow(path, { type: "ClassicyAppFinderCloseFolder", path });
		});
	}, [closeWindow, finderData.openPaths]);

	const openPreferences = useCallback(() => {
		desktopEventDispatch({ type: "ClassicyAppFinderPreferencesOpen" });
	}, [desktopEventDispatch]);

	// The drives (name and icon), so the icons below follow drives being added
	// or removed — not every change to the tree, which hands out a new `fs`.
	const drivesKey = JSON.stringify(
		Object.entries(fs.filterByType("", "drive")).map(([path, metadata]) => [
			path,
			metadata._icon,
		]),
	);

	useEffect(() => {
		const drives = JSON.parse(drivesKey) as [string, string | undefined][];
		const addedDriveNames: string[] = [];

		drives.forEach(([path, driveIcon]) => {
			const alreadyExists = useAppManager
				.getState()
				.System.Manager.Desktop.icons.some(
					(i) => i.appId === appId && i.appName === path,
				);
			if (!alreadyExists) {
				addedDriveNames.push(path);
			}
			desktopEventDispatch({
				type: "ClassicyDesktopIconAdd",
				app: {
					id: appId,
					name: path,
					icon: driveIcon,
				},
				event: "ClassicyAppFinderOpenFolder",
				eventData: { path },
				kind: "drive",
				// Marks the drive icon as a drop target for Finder drags.
				filePath: path,
				contextMenu: buildDriveContextMenu(path, isDriveSyncConnected(), {
					// Explorer's drives lead with Open, the default (5.23).
					open: windowsCommands,
					openAccessKey: ak("o"),
					// And offer Create Shortcut, on the desktop (10.6).
					createShortcut: windowsCommands,
					createShortcutAccessKey: ak("S"),
					// And end with Properties, the drive's sheet (2.2).
					properties: windowsCommands,
					propertiesAccessKey: ak("r"),
				}),
			});
		});

		return () => {
			addedDriveNames.forEach((name) => {
				desktopEventDispatch({
					type: "ClassicyDesktopIconRemove",
					app: { id: appId, name },
				});
			});
		};
	}, [drivesKey, desktopEventDispatch, windowsCommands, ak]);

	// Finder drags: move dragged items into a folder, a drive or the desktop
	// (its Desktop Folder), with icons dropped on the desktop placed where
	// their outline was let go.
	// A drop that moved something into an inactive Finder window activates
	// it under `layout.transfer.activateDropWindow` (5.31; WIG Ch.5 "Direct
	// Manipulation Method", p.62). Under `layout.transfer`'s copy modifier
	// and transfer menu (Windows 98) the drop's `effect` copies the items or
	// makes shortcuts to them instead (5.33, 5.34).
	const onMoveItems = useCallback<ClassicyFileBrowserMoveItems>(
		(paths, destination, outlineTopLeft, target, effect = "move") => {
			const moves = transferClassicyFileSystemItems(
				fs,
				paths,
				destination,
				desktopEventDispatch,
				effect,
				{
					desktopLocation: classicyDesktopDropLocation(outlineTopLeft),
				},
			);
			if (moves.length > 0)
				activateClassicyDropWindow(target, desktopEventDispatch);
		},
		[fs, desktopEventDispatch],
	);

	// The Trash: a folder at the root of the tree, opened by the desktop's
	// Trash icon — which shows full while anything is in it. The desktop icon
	// and the Trash window draw the active package's art at render.
	const trashIcon = useClassicyTrashIcon(listClassicyTrashItems(fs).length > 0);
	// The folder stores the default package's art, never the active one's, so
	// a package switch writes nothing. Runs on every tree change (`fs` is
	// handed out afresh), so it must stay idempotent: it writes only to create
	// the Trash or to heal a stale stored `_icon` (an older build's art under
	// another package, or a file this build no longer ships), and again when
	// the default package registers its art after mount.
	const storedTrashIcon = useClassicyStoredTrashIcon();
	useEffect(() => {
		ensureClassicyTrash(fs, storedTrashIcon);
	}, [fs, storedTrashIcon]);
	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyDesktopIconAdd",
			app: {
				id: "Trash",
				name: "Trash",
				icon: trashIcon,
			},
			kind: "trash",
			filePath: CLASSICY_TRASH_PATH,
			noLaunch: true,
			event: "ClassicyAppFinderOpenFolder",
			eventData: { path: CLASSICY_TRASH_PATH },
			contextMenu: [
				{
					id: "finder_trash_open",
					title: "Open",
					...(ak("o") !== undefined ? { accessKey: ak("o") } : {}),
					// The command a double-click on the icon runs: the menu's
					// default item, which Windows draws bold (WIG Ch.7 "Types of
					// Menu Items" (pp.108–109), Figure 7.5 "Default Item").
					isDefault: true,
					onClickFunc: () =>
						desktopEventDispatch({
							type: "ClassicyAppFinderOpenFolder",
							path: CLASSICY_TRASH_PATH,
						}),
				},
				{
					id: "finder_trash_empty",
					title: "Empty Trash",
					confirms: true,
					onClickFunc: () =>
						desktopEventDispatch({
							type: "ClassicyDesktopShowSystemDialog",
							dialog: "emptyTrash",
						}),
				},
				// Explorer's Create Shortcut (Windows 98 SE's Recycle Bin menu,
				// shell32.dll): the Trash lies at the root of the tree, so its
				// shortcut is offered on the desktop.
				...(windowsCommands
					? [
							{ id: "spacer" },
							classicyCreateShortcutMenuItem("finder_trash", ak, () =>
								desktopEventDispatch({
									type: "ClassicyAppFinderOfferDesktopShortcut",
									paths: [CLASSICY_TRASH_PATH],
								}),
							),
							// Explorer's Properties, last (2.2): the Trash's sheet.
							{ id: "spacer" },
							{
								id: "finder_trash_properties",
								title: CLASSICY_PROPERTIES_TITLE,
								...(ak("r") !== undefined ? { accessKey: ak("r") } : {}),
								onClickFunc: () =>
									desktopEventDispatch(
										classicyPropertiesOpenAction({
											paths: [CLASSICY_TRASH_PATH],
										}),
									),
							},
						]
					: []),
			],
		});
	}, [trashIcon, desktopEventDispatch, ak, windowsCommands]);

	const trashItems = useCallback(
		(paths: string[]) => {
			// A list's remembered selection can name items moved away since.
			const present = paths.filter((path) => fs.resolve(path));
			if (present.length > 0) {
				moveClassicyItemsToTrash(fs, present, desktopEventDispatch);
			}
		},
		[fs, desktopEventDispatch],
	);
	const restoreItems = useCallback(
		(paths: string[]) => {
			const items = paths.filter((path) => isClassicyTrashItem(fs, path));
			if (items.length > 0) {
				restoreClassicyTrashItems(fs, items, desktopEventDispatch);
			}
		},
		[fs, desktopEventDispatch],
	);
	// Rename an item in place (a slow click on its name in an icon view):
	// windows open on it follow it, a refusal is told in an alert.
	const renameItem = useCallback(
		(path: string, name: string) =>
			renameClassicyFileSystemItem(fs, path, name, desktopEventDispatch),
		[fs, desktopEventDispatch],
	);
	// Open an item as a double-click on it does: a folder (or drive) in a
	// window, a file in its application.
	const openItem = useCallback(
		(path: string) => {
			const entry = fs.resolve(path);
			if (!entry) return;
			if (
				entry._type === ClassicyFileSystemEntryFileType.Directory ||
				entry._type === ClassicyFileSystemEntryFileType.Drive
			) {
				openFolder(path);
			} else {
				openFile(path);
			}
		},
		[fs, openFolder, openFile],
	);
	// Explorer's File ▸ New ▸ (5.40, 10.3): a folder, or a registered type
	// (the mounted apps' `creates`), named "New Folder", "New Folder (2)"…
	// (10.10), made in `folder`, its icon where the menu was opened (else
	// the first free cell), selected alone and its name edited at once.
	const creatableTypes = useClassicyCreatableFileTypes();
	const newItem = useCallback(
		(
			folder: string,
			what: ClassicyNewItemKind,
			commands: ClassicyFileBrowserCommands | null,
			at?: [number, number],
		) => {
			if (!classicyCanMakeItemIn(fs, folder)) return;
			const path = classicyNewItemPath(fs, folder, what);
			commands?.place(path, at);
			if (!makeClassicyNewItem(fs, path, what)) return;
			commands?.select([path]);
			commands?.rename(path);
		},
		[fs],
	);
	// Explorer's Create Shortcut (10.6; WIG Ch.10 p.210): a shortcut beside
	// each item, "Shortcut to <name>" ("Shortcut (2) to <name>" on a clash),
	// placed in the first free cell and selected in the window; on the
	// desktop when the item is a Desktop Folder item; for items whose folder
	// takes none (a drive, an item of a derived folder), Windows 98's offer
	// of the desktop instead.
	const createShortcuts = useCallback(
		(paths: string[], commands: ClassicyFileBrowserCommands | null) => {
			classicyCreateShortcuts(fs, paths, desktopEventDispatch, commands);
		},
		[fs, desktopEventDispatch],
	);
	// Explorer's Cut, Copy, Paste and Paste Shortcut of files (5.28; WIG
	// Ch.5 "Command Method", pp.59-61): the file clipboard
	// (`ClassicyFileClipboard.ts`) holds the items; a Paste into a folder
	// moves a Cut's (emptying it) or copies a Copy's (keeping it), the
	// pasted items placed and selected; Paste Shortcut makes shortcuts to a
	// Copy's.
	const cutItems = useCallback(
		(paths: string[]) => {
			classicyCutItems(fs, paths);
		},
		[fs],
	);
	const copyItems = useCallback(
		(paths: string[]) => {
			classicyCopyItems(fs, paths);
		},
		[fs],
	);
	const pasteItems = useCallback(
		(
			folder: string,
			commands: ClassicyFileBrowserCommands | null,
			at?: [number, number],
		) => {
			classicyPasteItems(
				fs,
				{ kind: "folder", path: folder },
				desktopEventDispatch,
				{ commands, at },
			);
		},
		[fs, desktopEventDispatch],
	);
	const pasteShortcuts = useCallback(
		(
			folder: string,
			commands: ClassicyFileBrowserCommands | null,
			at?: [number, number],
		) => {
			classicyPasteShortcuts(
				fs,
				{ kind: "folder", path: folder },
				desktopEventDispatch,
				{ commands, at },
			);
		},
		[fs, desktopEventDispatch],
	);
	// An item's Cut and Copy (Windows 98 SE's item menu, shell32.dll: after
	// Open and the verbs), on the items the menu acts on.
	const transferItems = useCallback(
		(targets: () => string[]): ClassicyMenuItem[] => [
			classicyCutMenuItem("finder_item", ak, () => cutItems(targets()), {
				disabled: !targets().some((target) => classicyCanCut(fs, target)),
			}),
			classicyCopyMenuItem("finder_item", ak, () => copyItems(targets()), {
				disabled: !targets().some((target) => classicyCanCopy(fs, target)),
			}),
		],
		[fs, ak, cutItems, copyItems],
	);
	// The item's handler's verbs, after Open (10.6; WIG Ch.10 "Registering
	// Commands", pp.200-201): those of the app that opens the item's type,
	// run on each target that app opens too.
	const fileVerbs = useClassicyFileVerbs();
	const verbItems = useCallback(
		(path: string, targets: () => string[]): ClassicyMenuItem[] => {
			const verbs = fileVerbs(fs.resolve(path)?._type);
			if (verbs.length === 0) return [];
			const handler = verbs[0].appId;
			return classicyVerbMenuItems(
				"finder_item",
				ak,
				verbs,
				() =>
					targets().filter(
						(target) =>
							fileVerbs(fs.resolve(target)?._type)[0]?.appId === handler,
					),
				desktopEventDispatch,
			);
		},
		[fs, fileVerbs, ak, desktopEventDispatch],
	);
	// Explorer's Properties (2.2; WIG Ch.5 "Properties", p.51): the items'
	// property sheet, or the open one brought forward.
	const showProperties = useCallback(
		(paths: string[]) => {
			if (paths.length > 0)
				desktopEventDispatch(classicyPropertiesOpenAction({ paths }));
		},
		[desktopEventDispatch],
	);
	const propertiesItem = useCallback(
		(targets: () => string[]): ClassicyMenuItem => ({
			id: "finder_item_properties_sheet",
			title: CLASSICY_PROPERTIES_TITLE,
			...(ak("r") !== undefined ? { accessKey: ak("r") } : {}),
			onClickFunc: () => showProperties(targets()),
		}),
		[ak, showProperties],
	);
	// The first command of an item's menu: Open, or "Open With…" for a file
	// whose type only the Finder opens under `layout.files.unregisteredOpen`
	// "openWith" (WIG Ch.10 "Registering File Extensions", p.192: Open With
	// is an unregistered type's default command; shell32.dll's "Open With...").
	const openTitle = useCallback(
		(path: string) =>
			classicyFinderOpensWithDialog(
				fs.resolve(path),
				useAppManager.getState().System.Manager.Applications,
			)
				? "Open With\u2026"
				: "Open",
		[fs],
	);
	// Every item of a selection a double-click opens (the list view, under
	// `layout.selection.modifiers` "windows"), each as openItem opens it.
	const openItems = useCallback(
		(paths: string[]) => {
			for (const path of paths) openItem(path);
		},
		[openItem],
	);
	// Right-click on an item: Restore in the Trash, Move To Trash elsewhere —
	// acting on the whole selection when the item is part of it. Under
	// Explorer's commands (`layout.finder.commands` "windows") Open comes
	// first, the menu's default item, the command a double-click runs, which
	// Windows draws bold (WIG Ch.7 "Icon Pop-up Menus", pp.102-103); Mac OS
	// 8's Finder sets no default item in a contextual menu (HIGOS8
	// "Contextual Menus", pp.94-95: "you should not set a default item"), so
	// its menus are as they were. Rename, Create Shortcut and Properties are
	// Windows' (Tables 7.1-7.2); the menus keep the commands Classicy has,
	// and it has no Make Alias or Get Info.
	const itemContextMenu = useCallback(
		(
			path: string,
			selectedPaths: string[],
			commands: ClassicyFileBrowserCommands | null,
		): ClassicyMenuItem[] | undefined => {
			const targets = selectedPaths.includes(path) ? selectedPaths : [path];
			// An Extension's menu leads with Properties, its default: the
			// control panel that sets it up (9.3; WIG Ch.9 p.176), which a
			// double-click opens too.
			const panelId = windowsCommands
				? classicyExtensionControlPanelId(fs.resolve(path))
				: undefined;
			const open: ClassicyMenuItem[] = !windowsCommands
				? []
				: panelId
					? [
							{
								id: "finder_item_properties",
								title: "Properties",
								accessKey: ak("r"),
								isDefault: true,
								onClickFunc: () => openItem(path),
							},
						]
					: [
							{
								id: "finder_item_open",
								title: openTitle(path),
								accessKey: ak("o"),
								isDefault: true,
								onClickFunc: () => openItem(path),
							},
						];
			// Explorer's Properties ends every item's menu (2.2), an
			// Extension's but its own (its Properties is its control panel).
			const properties: ClassicyMenuItem[] =
				windowsCommands && !panelId
					? [{ id: "spacer" }, propertiesItem(() => targets)]
					: [];
			if (isClassicyTrashItem(fs, path)) {
				return [
					...open,
					{
						id: "finder_item_restore",
						title: "Restore",
						...(ak("e") !== undefined ? { accessKey: ak("e") } : {}),
						onClickFunc: () => restoreItems(targets),
					},
					// Windows 98's Recycle Bin items take Cut (a Paste takes
					// them out), not Copy (5.28).
					...(windowsCommands
						? [{ id: "spacer" }, transferItems(() => targets)[0]]
						: []),
					...properties,
				];
			}
			if (isInClassicyTrash(fs, path))
				return open.length > 0 ? [...open, ...properties] : undefined;
			if (windowsCommands) {
				// Explorer's item menu (Windows 98 SE, shell32.dll): Open, the
				// handler's verbs, then Create Shortcut, Delete and Rename;
				// Rename only for one item that may be.
				return [
					...open,
					...verbItems(path, () => targets),
					{ id: "spacer" },
					// Explorer's Cut and Copy (5.28).
					...transferItems(() => targets),
					{ id: "spacer" },
					classicyCreateShortcutMenuItem("finder_item", ak, () =>
						createShortcuts(targets, commands),
					),
					classicyDeleteMenuItem("finder_item", ak, () => trashItems(targets)),
					classicyRenameMenuItem(
						"finder_item",
						ak,
						() => commands?.rename(path),
						targets.length !== 1 || !classicyCanRename(fs, path),
					),
					...properties,
				];
			}
			return [
				...open,
				{
					id: "finder_item_move_to_trash",
					title: "Move To Trash",
					onClickFunc: () => trashItems(targets),
				},
			];
		},
		[
			fs,
			windowsCommands,
			openItem,
			restoreItems,
			trashItems,
			ak,
			verbItems,
			createShortcuts,
			openTitle,
			propertiesItem,
			transferItems,
		],
	);
	// A desktop file or folder icon's menu under Explorer's commands
	// (`layout.finder.commands` "windows"), stored with the icon: the same as
	// the item's in a window (Open, then Move To Trash, for the desktop's
	// selected items when it is one of them). Open runs the latest openItem
	// (through a ref), so the menu need not be rebuilt each time Finder's
	// windows change. Mac OS 8's Finder stores none (null, below, clears one
	// a Windows session stored), as before.
	const openItemRef = useRef(openItem);
	useLayoutEffect(() => {
		openItemRef.current = openItem;
	}, [openItem]);
	const desktopItemContextMenu = useCallback(
		(path: string): ClassicyMenuItem[] => {
			const selectedDesktopPaths = () => {
				const desktop = useAppManager.getState().System.Manager.Desktop;
				const selected = new Set(desktop.selectedIcons ?? []);
				return desktop.icons.flatMap((icon) =>
					icon.filePath !== undefined &&
					icon.appId.startsWith(CLASSICY_DESKTOP_ITEM_ICON_PREFIX) &&
					selected.has(icon.appId)
						? [icon.filePath]
						: [],
				);
			};
			const targets = () => {
				const selectedPaths = selectedDesktopPaths();
				return selectedPaths.includes(path) ? selectedPaths : [path];
			};
			return [
				{
					id: "finder_item_open",
					title: openTitle(path),
					...(ak("o") !== undefined ? { accessKey: ak("o") } : {}),
					isDefault: true,
					onClickFunc: () => openItemRef.current(path),
				},
				...verbItems(path, targets),
				{ id: "spacer" },
				// Explorer's Cut and Copy (5.28), for the desktop's selected
				// items when this is one.
				...transferItems(targets),
				{ id: "spacer" },
				// Explorer's Create Shortcut, Delete and Rename (Windows 98 SE,
				// shell32.dll), for the desktop's selected items when this is
				// one.
				classicyCreateShortcutMenuItem("finder_item", ak, () =>
					createShortcuts(targets(), null),
				),
				classicyDeleteMenuItem("finder_item", ak, () => trashItems(targets())),
				classicyRenameMenuItem("finder_item", ak, () => {
					if (targets().length === 1 && classicyCanRename(fs, path))
						startClassicyDesktopIconRename(
							`${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${path}`,
						);
				}),
				// Explorer's Properties, last (2.2): the desktop's selected
				// items' sheet when this is one.
				{ id: "spacer" },
				propertiesItem(targets),
			];
		},
		[
			trashItems,
			ak,
			fs,
			verbItems,
			createShortcuts,
			openTitle,
			propertiesItem,
			transferItems,
		],
	);

	// Mirror the Desktop Folder onto the desktop: an icon for each item in it,
	// none for items that have left it. Runs again whenever the tree changes
	// (`fs` is handed out afresh on every change), so icons follow items
	// dragged in or out.
	useEffect(() => {
		const folder = classicyDesktopFolderPath(fs);
		const items = folder ? fs.filterByType(folder, undefined, false) : {};
		const paths = new Set(
			Object.keys(items).map((name) => `${folder}${fs.separator}${name}`),
		);
		for (const path of paths) {
			const action = classicyDesktopItemIconAction(fs, path);
			if (action) {
				desktopEventDispatch({
					...action,
					contextMenu: windowsCommands ? desktopItemContextMenu(path) : null,
				});
			}
		}
		for (const icon of useAppManager.getState().System.Manager.Desktop.icons) {
			if (
				icon.appId.startsWith(CLASSICY_DESKTOP_ITEM_ICON_PREFIX) &&
				!paths.has(icon.appId.slice(CLASSICY_DESKTOP_ITEM_ICON_PREFIX.length))
			) {
				desktopEventDispatch({
					type: "ClassicyDesktopIconRemove",
					app: { id: icon.appId },
				});
			}
		}
	}, [fs, desktopEventDispatch, windowsCommands, desktopItemContextMenu]);

	const getHeaderString = useCallback(
		(dir: ClassicyFileSystemEntryMetadata) => {
			const sizeText =
				dir._size === undefined
					? "Calculating…"
					: dir._size === -1
						? "—"
						: fs.formatSize(dir._size);
			return (
				dir._count +
				" items" +
				(dir._countHidden ? ` (${dir._countHidden} hidden)` : "") +
				", " +
				sizeText
			);
		},
		[fs],
	);

	const standardViews = useMemo(
		() => resolveStandardViews(finderData),
		[finderData],
	);

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			showDesktopIcon={false}
			showInApplicationsFolder={false}
			// The desktop is Finder's own surface: clicking it, or an icon on it,
			// leaves Finder focused with no window active — don't raise one.
			restoreWindowFocus={false}
			defaultWindow={
				finderData.openPaths?.length
					? finderData.openPaths.at(0)
					: "Macintosh HD"
			}
		>
			{finderData.openPaths && finderData.openPaths.length > 0
				? finderData.openPaths.map((p: string, idx: number) => (
						<FinderFolderWindowMemo
							key={`${appName}_${p}`}
							path={p}
							appId={appId}
							idx={idx}
							closeFolder={closeFolder}
							closeAllFolders={closeAllFolders}
							closeWindow={closeWindow}
							setFolderView={setFolderView}
							openFolder={openFolder}
							openFile={openFile}
							openItems={openItems}
							getHeaderString={getHeaderString}
							fs={fs}
							disableBalloonHelp={disableBalloonHelp}
							toggleBalloonHelp={toggleBalloonHelp}
							aboutMenuItem={aboutMenuItem}
							openPreferences={openPreferences}
							// A path absent from folderViews follows the standard views'
							// appearance but still opens in list — the standard-view
							// options configure how each view looks, not which view a
							// new window opens in. A default-view-type preference is an
							// explicit non-goal of this design.
							viewType={finderData.folderViews?.[p] ?? "list"}
							iconViewOptions={standardViews.icons}
							listViewOptions={standardViews.list}
							now={now}
							onMoveItems={onMoveItems}
							trashItems={trashItems}
							restoreItems={restoreItems}
							renameItem={renameItem}
							itemContextMenu={itemContextMenu}
							trashIcon={trashIcon}
							windowsCommands={windowsCommands}
							creatableTypes={creatableTypes}
							newItem={newItem}
							createShortcuts={createShortcuts}
							showProperties={showProperties}
							cutItems={cutItems}
							copyItems={copyItems}
							pasteItems={pasteItems}
							pasteShortcuts={pasteShortcuts}
						/>
					))
				: null}
			{finderData.confirmDelete ? (
				<FinderDeleteConfirmation
					appId={appId}
					fs={fs}
					paths={finderData.confirmDelete.paths}
					trust={finderData.confirmDelete.trust}
				/>
			) : null}
			{finderData.desktopShortcutOffer ? (
				<FinderDesktopShortcutOffer
					appId={appId}
					fs={fs}
					paths={finderData.desktopShortcutOffer.paths}
				/>
			) : null}
			{/* Explorer's property sheets (2.2) and Open With (10.1). */}
			{(finderData.properties ?? []).map((sheet, index) => (
				<ClassicyFilePropertiesWindow
					key={sheet.key}
					appId={appId}
					fs={fs}
					paths={sheet.paths}
					targetAppId={sheet.appId}
					index={index}
					trashIcon={trashIcon}
				/>
			))}
			{finderData.openWith ? (
				<ClassicyOpenWithDialog
					appId={appId}
					fs={fs}
					path={finderData.openWith.path}
				/>
			) : null}
			{aboutWindow}
			{appState.data?.showAboutThisComputer ? (
				<FinderAboutThisComputer />
			) : null}
			{finderData.showPreferences ? <FinderPreferences /> : null}
		</ClassicyApp>
	);
};
