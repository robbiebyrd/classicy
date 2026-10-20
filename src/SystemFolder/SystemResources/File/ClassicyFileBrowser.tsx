import "./ClassicyFileBrowserViewTable.scss";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type RefObject,
	useCallback,
	useImperativeHandle,
	useRef,
} from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type {
	FinderIconViewOptions,
	FinderListViewOptions,
} from "@/SystemFolder/Finder/FinderContext";
import { listViewIconSize } from "@/SystemFolder/Finder/FinderViewOptions";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import {
	type ClassicyFileBrowserMoveItems,
	ClassicyFileBrowserViewIcons,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import {
	CLASSICY_DROP_FOLDER_ATTRIBUTE,
	CLASSICY_FILE_PATH_ATTRIBUTE,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";

/** Commands a host (e.g. a window's menu) can run on a file browser. */
export type ClassicyFileBrowserCommands = {
	/** Paths of the selected items: highlighted icons, or selected list rows. */
	selectedPaths(): string[];
};

type ClassicyFileBrowserProps = {
	/** The file system to list (e.g. from `useClassicyFileSystem`). */
	fs: ClassicyFileSystem;
	/** Colon-separated path of the folder to show, e.g. `"Macintosh HD:Documents"`. */
	path: string;
	/** Id of the owning app (the enclosing `ClassicyApp`); passed to each icon. */
	appId: string;
	/** `"icons"` (free-form icon view) or `"list"` (sortable list view). Defaults to `"icons"`. */
	display?: "icons" | "list";
	/** Called with a folder's full path when it is opened (double-click; Return in the list view). */
	dirOnClickFunc?: (path: string) => void;
	/** Called with a file's full path when it is opened (double-click; Return in the list view). */
	fileOnClickFunc?: (path: string) => void;
	/**
	 * When set, files whose `_createdOn` is after this moment are hidden from
	 * the listing. Pass the current Classicy date/time to hide "future" files.
	 * Defaults to `null` (show everything).
	 */
	hideFilesCreatedAfter?: Date | string | number | null;
	/**
	 * List view options (Finder's View Options: columns, relative dates, folder
	 * sizes, icon size). Omitted means Name, Size and Kind columns, calculated
	 * folder sizes and 18 px icons.
	 */
	listViewOptions?: FinderListViewOptions;
	/**
	 * Icon view options (arrangement, keep-arranged-by key, icon size).
	 * Omitted means free placement at the theme's icon size.
	 */
	iconViewOptions?: FinderIconViewOptions;
	/** The in-world "now" for relative dates, already converted to the
	 *  virtual clock's local frame. Omitted means real time. List view only. */
	now?: Date;
	/** Receives the list view's `{ selectAll }` handle (e.g. for Select All). List view only. */
	selectionApiRef?: RefObject<ClassicyTableSelectionApi | null>;
	/** Controlled selection by row path. Omit for uncontrolled. List view only. */
	selectedPaths?: string[];
	/** Called with the selected row paths whenever the selection changes. List view only. */
	onSelectionChange?: (paths: string[]) => void;
	/**
	 * Receives the element keyboard navigation acts on — the list view's
	 * focusable list box — so a hosting window can focus it (pass the same ref
	 * as ClassicyWindow's `initialFocusRef`). The icon view has no single
	 * keyboard target, so the ref stays `null` there.
	 */
	focusTargetRef?: RefObject<HTMLDivElement | null>;
	/**
	 * Move items dragged out of this browser — onto another file browser, a
	 * folder icon or row, a desktop folder or drive, or the desktop. Finder
	 * passes one built on `moveClassicyFileSystemItems`. Without it, items can
	 * still be rearranged within the icon view but not moved. The browser
	 * itself always accepts drops into `path`.
	 */
	onMoveItems?: ClassicyFileBrowserMoveItems;
	/**
	 * Delete the selected items — called with their paths when Delete
	 * (Backspace) or ⌃⌫ is pressed in the browser. Finder moves them to the
	 * Trash. Without it the keys do nothing.
	 */
	onDeleteItems?: (paths: string[]) => void;
	/**
	 * The contextual menu for an item, built when it is right-clicked: given
	 * its path and the current selection's paths. Return nothing to fall back
	 * to the window's or app's menu. Finder offers Restore in the Trash.
	 */
	itemContextMenu?: (
		path: string,
		selectedPaths: string[],
	) => ClassicyMenuItem[] | undefined;
	/** Receives `{ selectedPaths() }`, for menu commands that act on the selection. */
	commandsRef?: RefObject<ClassicyFileBrowserCommands | null>;
};

// Define stable default functions outside component to prevent re-creation
const defaultDirOnClick = () => {};
const defaultFileOnClick = () => {};

/**
 * A Finder-style view of one folder of a `ClassicyFileSystem` — the same
 * component the Finder's windows are built from. Place it inside a
 * `ClassicyWindow` to show folder contents in an app.
 *
 * - `display="icons"`: draggable `ClassicyIcon`s laid out on the theme's icon
 *   grid; `iconViewOptions` can snap them to the grid or keep them arranged
 *   (and locked) by name, modified/created date, size, kind or label.
 * - `display="list"`: a `ClassicyTable` list view with sortable columns,
 *   disclosure triangles that expand folders in place, multi-selection
 *   (Shift / Command-click) and full keyboard navigation.
 *
 * Items drag like the Mac OS 8 Finder's: a dotted outline follows the pointer,
 * and letting go over another folder or the desktop calls `onMoveItems`
 * (letting go in the same icon view just moves the icon). The browser marks
 * itself, and each folder in it, as a drop target for drags from elsewhere.
 *
 * Delete (Backspace) or ⌃⌫ calls `onDeleteItems` with the selection, and a
 * right-click on an item shows `itemContextMenu(path, selection)`; Finder uses
 * them for Move To Trash and the Trash's Restore.
 *
 * The browser does not navigate on its own: opening an item (double-click,
 * or Return in the list view) calls `dirOnClickFunc` / `fileOnClickFunc` with
 * its full colon-separated path, and the host decides what to do — Finder
 * opens a new folder window or launches the file's app.
 *
 * ```tsx
 * <ClassicyWindow id="docs" appId={appId} title="Documents" initialFocusRef={listRef}>
 *   <ClassicyFileBrowser fs={fs} appId={appId} path="Macintosh HD:Documents"
 *     display="list" focusTargetRef={listRef} fileOnClickFunc={openFile} />
 * </ClassicyWindow>
 * ```
 */
export const ClassicyFileBrowser: FunctionalComponent<
	ClassicyFileBrowserProps
> = ({
	fs,
	display = "icons",
	path,
	appId,
	dirOnClickFunc,
	fileOnClickFunc,
	hideFilesCreatedAfter = null,
	listViewOptions,
	iconViewOptions,
	now,
	selectionApiRef,
	selectedPaths,
	onSelectionChange,
	focusTargetRef,
	onMoveItems,
	onDeleteItems,
	itemContextMenu,
	commandsRef,
}) => {
	const holderRef = useRef<HTMLDivElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const { showContextMenu } = useClassicyContextualMenu();

	// The list view reports its selection; the icon view's lives in each icon
	// (highlighted ones carry classicyIconActive), so it is read from the DOM.
	const listSelectionRef = useRef<string[]>(selectedPaths ?? []);
	const trackListSelection = useCallback(
		(paths: string[]) => {
			listSelectionRef.current = paths;
			onSelectionChange?.(paths);
		},
		[onSelectionChange],
	);
	const currentSelection = useCallback((): string[] => {
		if (display === "list") return listSelectionRef.current;
		return Array.from(
			rootRef.current?.querySelectorAll(
				`.classicyIconActive[${CLASSICY_FILE_PATH_ATTRIBUTE}]`,
			) ?? [],
			(el) => el.getAttribute(CLASSICY_FILE_PATH_ATTRIBUTE) ?? "",
		).filter(Boolean);
	}, [display]);
	useImperativeHandle(
		commandsRef,
		() => ({ selectedPaths: currentSelection }),
		[currentSelection],
	);

	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (!onDeleteItems || e.defaultPrevented) return;
		if (e.key !== "Backspace" && e.key !== "Delete") return;
		if (e.altKey || e.shiftKey) return;
		const target = e.target as HTMLElement;
		if (target.closest("input, textarea, [contenteditable='true']")) return;
		const paths = currentSelection();
		if (paths.length === 0) return;
		// Handled here, so the menu bar's ⌃⌫ doesn't act a second time.
		e.preventDefault();
		onDeleteItems(paths);
	};

	const onContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		if (!itemContextMenu || e.defaultPrevented) return;
		const item = (e.target as Element).closest(
			`[${CLASSICY_FILE_PATH_ATTRIBUTE}]`,
		);
		const path = item?.getAttribute(CLASSICY_FILE_PATH_ATTRIBUTE);
		if (!item || !path || !rootRef.current?.contains(item)) return;
		const menu = itemContextMenu(path, currentSelection());
		if (!menu || menu.length === 0) return;
		e.preventDefault();
		showContextMenu(menu, [e.clientX, e.clientY]);
	};
	const themeIconSize = useAppManager(
		(s) => s.System.Manager.Appearance.activeTheme.desktop.iconSize,
	);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: keys and right-clicks bubble here from the focusable list box and icons
		<div
			ref={rootRef}
			className={"classicyFileBrowserFill"}
			{...{ [CLASSICY_DROP_FOLDER_ATTRIBUTE]: path }}
			onKeyDown={onKeyDown}
			onContextMenu={onContextMenu}
		>
			{display === "list" ? (
				<ClassicyFileBrowserViewTable
					onMoveItems={onMoveItems}
					fileOnClickFunc={fileOnClickFunc ?? defaultFileOnClick}
					dirOnClickFunc={dirOnClickFunc ?? defaultDirOnClick}
					fs={fs}
					path={path}
					appId={appId}
					// The literal `18` fallback is deliberate: with no options passed
					// the component must render exactly as it does today, even if a
					// theme ever ships a different base.
					iconSize={
						listViewOptions
							? listViewIconSize(themeIconSize, listViewOptions.iconSize)
							: 18
					}
					holderRef={holderRef}
					hideFilesCreatedAfter={hideFilesCreatedAfter}
					listViewOptions={listViewOptions}
					now={now}
					selectionApiRef={selectionApiRef}
					selectedPaths={selectedPaths}
					onSelectionChange={trackListSelection}
					focusTargetRef={focusTargetRef}
				/>
			) : (
				<ClassicyFileBrowserViewIcons
					onMoveItems={onMoveItems}
					fileOnClickFunc={fileOnClickFunc ?? defaultFileOnClick}
					dirOnClickFunc={dirOnClickFunc ?? defaultDirOnClick}
					fs={fs}
					path={path}
					appId={appId}
					holderRef={holderRef}
					hideFilesCreatedAfter={hideFilesCreatedAfter}
					iconViewOptions={iconViewOptions}
				/>
			)}
		</div>
	);
};
