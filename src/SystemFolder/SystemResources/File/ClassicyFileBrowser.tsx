import "./ClassicyFileBrowserViewTable.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type RefObject,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type {
	FinderIconViewOptions,
	FinderListViewOptions,
} from "@/SystemFolder/Finder/FinderContext";
import {
	LIST_VIEW_ICON_SIZE_VARS,
	listViewIconSize,
} from "@/SystemFolder/Finder/FinderViewOptions";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import {
	ClassicyFileBrowserListMarqueeContext,
	useClassicyFileBrowserListMarquee,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserMarquee.internal";
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
import type { ClassicyZoomOrigin } from "@/SystemFolder/SystemResources/Window/ClassicyZoomRects";

/**
 * Items to select, in the view shown, whenever `key` changes: the Finder's
 * reveal (Find File's Open Enclosing Folder). The first is scrolled into view.
 */
export type ClassicyFileBrowserReveal = {
	paths: readonly string[];
	key: string | number;
};

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
	/**
	 * Called with a folder's full path when it is opened (double-click; Return
	 * in the list view), and the zoom origin of the item it was opened from
	 * (its icon's box and desktop), for a window it opens to zoom out of it
	 * (`noteClassicyWindowZoomSource`).
	 */
	dirOnClickFunc?: (path: string, origin?: ClassicyZoomOrigin) => void;
	/**
	 * Called with a file's full path when it is opened (double-click; Return
	 * in the list view), and the item's zoom origin, as `dirOnClickFunc`.
	 */
	fileOnClickFunc?: (path: string, origin?: ClassicyZoomOrigin) => void;
	/**
	 * When set, files whose `_createdOn` is after this moment are hidden from
	 * the listing. Pass the current Classicy date/time to hide "future" files.
	 * Defaults to `null` (show everything).
	 */
	hideFilesCreatedAfter?: Date | string | number | null;
	/**
	 * List entries marked `_invisible` — drawn dimmed in the icon view.
	 * Defaults to true. Finder passes false: as in Mac OS 8, invisible items
	 * such as the Desktop Folder don't appear in its windows, whose header
	 * counts them as hidden instead.
	 */
	showInvisible?: boolean;
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
	/**
	 * Receives the browser's `{ selectAll, select }` handle on the selection
	 * of the view it shows (the list's rows or the icon view's icons), e.g.
	 * for Edit → Select All.
	 */
	selectionApiRef?: RefObject<ClassicyTableSelectionApi | null>;
	/** Controlled selection by row path. Omit for uncontrolled. List view only. */
	selectedPaths?: string[];
	/** Called with the selected row paths whenever the selection changes. List view only. */
	onSelectionChange?: (paths: string[]) => void;
	/**
	 * Receives the element keyboard navigation acts on — the list view's
	 * focusable list box, or the icon view's icons' holder (focusable from
	 * code only) — so a hosting window can focus it (pass the same ref as
	 * ClassicyWindow's `initialFocusRef`): Select All, Delete and the arrow
	 * keys then act on the browser without a click first.
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
	/**
	 * Select these items, alone, whenever `reveal.key` changes, in the view
	 * shown (its own selection, as a selection rectangle sets it), and
	 * scroll the first into view (the Finder's reveal). Clicks and keys then
	 * change the selection by the view's usual rules.
	 */
	reveal?: ClassicyFileBrowserReveal;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
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
	showInvisible = true,
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
	reveal,
	className,
	style,
}) => {
	const holderRef = useRef<HTMLDivElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const { showContextMenu } = useClassicyContextualMenu();

	// The list view reports its selection; the icon view's lives in each icon
	// (highlighted ones carry the selected state class), so it is read from the DOM.
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
				`.classicyIcon.selected[${CLASSICY_FILE_PATH_ATTRIBUTE}]`,
			) ?? [],
			(el) => el.getAttribute(CLASSICY_FILE_PATH_ATTRIBUTE) ?? "",
		).filter(Boolean);
	}, [display]);
	useImperativeHandle(
		commandsRef,
		() => ({ selectedPaths: currentSelection }),
		[currentSelection],
	);

	// The views' own handles on their selections (the list's table, the
	// icon view's), lent to the host's `selectionApiRef`: Select All and the
	// list's selection rectangle select through them.
	const tableApiRef = useRef<ClassicyTableSelectionApi | null>(null);
	const iconsApiRef = useRef<ClassicyTableSelectionApi | null>(null);
	useEffect(() => {
		if (!selectionApiRef) return;
		const view = display === "list" ? tableApiRef : iconsApiRef;
		selectionApiRef.current = {
			selectAll: () => view.current?.selectAll(),
			select: (ids) => view.current?.select?.(ids),
		};
		return () => {
			selectionApiRef.current = null;
		};
	}, [selectionApiRef, display]);
	// A reveal (the Finder's: Find File's Open Enclosing Folder) selects its
	// items through the shown view's own selection, as a selection rectangle
	// does, then brings the first into view once it has drawn. A passive
	// effect, so the view (a child) has lent its handle, and an icon view
	// mounting with the reveal has run its own effects first. The view may
	// draw the item a commit later (the icon view lays its icons out in a
	// layout effect), so the scroll waits for this browser's next render,
	// which the reveal asks for.
	const revealKey = reveal?.key;
	const revealPathsRef = useRef(reveal?.paths);
	revealPathsRef.current = reveal?.paths;
	const pendingScrollRef = useRef<string | undefined>(undefined);
	const [, setRevealCount] = useState(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: a reveal applies when its key changes, not when the parent hands over a new paths array or the display changes
	useEffect(() => {
		const paths = revealPathsRef.current;
		if (revealKey === undefined || !paths) return;
		const next = [...paths];
		(display === "list" ? tableApiRef : iconsApiRef).current?.select?.(next);
		pendingScrollRef.current = next[0];
		setRevealCount((n) => n + 1);
	}, [revealKey]);
	useLayoutEffect(() => {
		const first = pendingScrollRef.current;
		if (first === undefined) return;
		const target = Array.from(
			rootRef.current?.querySelectorAll(`[${CLASSICY_FILE_PATH_ATTRIBUTE}]`) ??
				[],
		).find((el) => el.getAttribute(CLASSICY_FILE_PATH_ATTRIBUTE) === first);
		if (!target) return;
		pendingScrollRef.current = undefined;
		target.scrollIntoView?.({ block: "nearest", inline: "nearest" });
	});
	// The icon view's keyboard target is its icons' holder (the list's is
	// its list box, which the table hands the ref itself).
	useLayoutEffect(() => {
		if (!focusTargetRef || display !== "icons") return;
		const holder = holderRef.current;
		focusTargetRef.current = holder;
		return () => {
			if (focusTargetRef.current === holder) focusTargetRef.current = null;
		};
	}, [focusTargetRef, display]);
	const listMarquee = useClassicyFileBrowserListMarquee({
		rootRef,
		enabled: display === "list",
		getSelection: () => listSelectionRef.current,
		select: (paths) => tableApiRef.current?.select?.(paths),
	});

	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.defaultPrevented) return;
		// Select All on the browser's own key (⌘A, or Ctrl-A where that is the
		// browser's): every icon or row, as the Edit menu's Select All, which
		// is marked native and so leaves the key to the view with focus. In a
		// text field the browser selects the field's text instead. (The list
		// view's table takes the key itself when it has focus.)
		if (
			(e.metaKey || e.ctrlKey) &&
			!e.altKey &&
			!e.shiftKey &&
			e.key.toLowerCase() === "a"
		) {
			const field = (e.target as HTMLElement).closest(
				"input, textarea, [contenteditable='true']",
			);
			if (field) return;
			e.preventDefault();
			(display === "list" ? tableApiRef : iconsApiRef).current?.selectAll();
			return;
		}
		if (!onDeleteItems) return;
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
	// The list view's icon base is the desktop's --desktop-icon-size, read once
	// per theme icon size (not per render), in a layout effect after the commit
	// that applies a new theme's variables to #classicyDesktop. The store's
	// number is the fallback before the desktop mounts, and the value
	// whenever the desktop's variables are the theme's.
	const themeIconSize = useAppManager(
		(s) => s.System.Manager.Appearance.activeTheme.desktop.iconSize,
	);
	const [desktopIconSize, setDesktopIconSize] = useState(() =>
		readClassicyThemeVar("--desktop-icon-size", themeIconSize),
	);
	// An Appearance Package's own size for the chosen step, 0 for none (the
	// optional `fileBrowserList` measurements; System 7 draws its 16 px small
	// icons at 16). Read with the base, and again whenever the theme changes:
	// two themes of one icon size may differ in it.
	const activeTheme = useAppManager(
		(s) => s.System.Manager.Appearance.activeTheme,
	);
	// A list with no options draws the medium step, the Finder's default.
	const listIconStep = listViewOptions?.iconSize ?? "medium";
	const readPackageListIconSize = () =>
		readClassicyThemeVar(LIST_VIEW_ICON_SIZE_VARS[listIconStep], 0);
	const [packageListIconSize, setPackageListIconSize] = useState(
		readPackageListIconSize,
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: activeTheme is the trigger (its variables are read from the desktop, not from it); the reader closes over listIconStep only
	useLayoutEffect(() => {
		setDesktopIconSize(
			readClassicyThemeVar("--desktop-icon-size", themeIconSize),
		);
		setPackageListIconSize(readPackageListIconSize());
	}, [themeIconSize, activeTheme, listIconStep]);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: keys and right-clicks bubble here from the focusable list box and icons
		<div
			ref={rootRef}
			// The list view's root takes its table's width; the fill rule
			// keys on this class (no `:has()`, which Firefox 113-120 lacks).
			className={classNames(
				"classicyFileBrowserFill",
				display === "list" && "classicyFileBrowserFillList",
				className,
			)}
			style={style}
			{...{ [CLASSICY_DROP_FOLDER_ATTRIBUTE]: path }}
			onKeyDown={onKeyDown}
			onContextMenu={onContextMenu}
		>
			{display === "list" ? (
				<ClassicyFileBrowserListMarqueeContext.Provider value={true}>
					<ClassicyFileBrowserViewTable
						onMoveItems={onMoveItems}
						fileOnClickFunc={fileOnClickFunc ?? defaultFileOnClick}
						dirOnClickFunc={dirOnClickFunc ?? defaultDirOnClick}
						fs={fs}
						path={path}
						appId={appId}
						// The literal `18` fallback is deliberate: with no options passed
						// the component renders as it always has (whatever the theme's
						// base), unless the look gives the medium step its own size.
						iconSize={
							listViewOptions
								? listViewIconSize(
										desktopIconSize,
										listViewOptions.iconSize,
										packageListIconSize,
									)
								: packageListIconSize > 0
									? packageListIconSize
									: 18
						}
						holderRef={holderRef}
						hideFilesCreatedAfter={hideFilesCreatedAfter}
						showInvisible={showInvisible}
						listViewOptions={listViewOptions}
						now={now}
						selectionApiRef={tableApiRef}
						selectedPaths={selectedPaths}
						onSelectionChange={trackListSelection}
						focusTargetRef={focusTargetRef}
					/>
				</ClassicyFileBrowserListMarqueeContext.Provider>
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
					showInvisible={showInvisible}
					iconViewOptions={iconViewOptions}
					selectionApiRef={iconsApiRef}
				/>
			)}
			{listMarquee}
		</div>
	);
};
