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
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
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
	classicyFileBrowserRegionSelect,
	classicyIconMarqueeSelection,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserIconSelection";
import {
	type ClassicyFileBrowserMarqueeBox,
	startClassicyFileBrowserMarquee,
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
import { classicySameSelection } from "@/SystemFolder/SystemResources/Utils/ClassicyListPressSelection.internal";
import { classicySecondaryButtonSelects } from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";

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
	 * Called with every selected item's path when a double-click opens the
	 * whole selection: under a package whose layout says
	 * `selection.modifiers: "windows"` (Windows 98; WIG App. A Tables A.2,
	 * pp.352-353, and A.3, p.356), the selection as the double-click's own
	 * clicks left it, in either view (Return on a selected icon too, as
	 * Explorer opens its selection). Finder opens each. Omitted, or under
	 * any other layout, a double-click opens its own item through
	 * `dirOnClickFunc` / `fileOnClickFunc`.
	 */
	openItemsFunc?: (paths: string[]) => void;
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
	/** Receives the view's `{ selectAll }` handle (e.g. for Edit ▸ Select All), in either view. */
	selectionApiRef?: RefObject<ClassicyTableSelectionApi | null>;
	/**
	 * Controlled selection by row path. Omit for uncontrolled. List view
	 * only. Under `layout.fileBrowser.regionSelect` the list view's
	 * selection rectangle selects through it (and `onSelectionChange`).
	 */
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
	/**
	 * Rename an item (icon view): called with its path and the name typed
	 * when the user commits a rename, begun by a click on a selected icon's
	 * name that no second click follows (Mac OS 8's Finder and Windows
	 * Explorer alike). Return the item's new path when it was renamed. Finder
	 * renames through `renameClassicyFileSystemItem`. Without it, names are
	 * not editable.
	 */
	onRenameItem?: (path: string, name: string) => string | undefined;
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
 *   (and locked) by name, modified/created date, size, kind or label. One
 *   selection, as the Finder keeps it: a click selects an icon, Shift-, ⌘-
 *   or Control-click adds or removes one, a drag across empty space selects
 *   the icons the rectangle touches, an arrow key the nearest icon its way,
 *   typing the icon whose name starts with the keys typed (within a
 *   second); a click on a selected icon's name, unless a second click
 *   follows, renames it (`onRenameItem`). Under a package whose
 *   `layout.fileBrowser.keys` is `"windows"`, Shift-click and Shift-arrows
 *   select from the anchor, Control-click toggles, Home, End, Page Up and
 *   Page Down select, and a letter typed again steps to the next icon
 *   starting with it. Windows 98's layout (`selection` and `fileBrowser`
 *   keys) also selects at the press, lets button 2 select, drags the whole
 *   selection, takes Space as the Select key, keeps one Tab stop and opens
 *   the whole selection at a double-click (`openItemsFunc`).
 * - `display="list"`: a `ClassicyTable` list view with sortable columns,
 *   disclosure triangles that expand folders in place, multi-selection
 *   (Shift / Command-click) and full keyboard navigation; under
 *   `layout.fileBrowser.regionSelect` a drag from below its rows draws the
 *   icon view's selection rectangle over the rows' names.
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
	openItemsFunc,
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
	onRenameItem,
	className,
	style,
}) => {
	const holderRef = useRef<HTMLDivElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const { showContextMenu } = useClassicyContextualMenu();
	const layout = useClassicyAppearanceLayout();
	// The list view's selection rectangle (Windows Explorer's), and button 2
	// starting it (`selection.secondaryButton` "select").
	const listRegionSelect = classicyFileBrowserRegionSelect(layout);
	const secondarySelects = classicySecondaryButtonSelects(layout);

	// Each view reports its selection: the list view's table, and the icon
	// view, which keeps one selection for its icons (in the commit that draws
	// it, so a menu or key the next event brings reads what is drawn).
	const listSelectionRef = useRef<string[]>(selectedPaths ?? []);
	// The list's selection, kept here when the caller does not hold it:
	// while the list view takes a selection rectangle, which selects through
	// the table's controlled `selected`, the table draws it.
	const [ownListSelection, setOwnListSelection] = useState<string[]>([]);
	const holdsListSelection = listRegionSelect && selectedPaths === undefined;
	const callerHoldsList = selectedPaths !== undefined;
	const trackListSelection = useCallback(
		(paths: string[]) => {
			listSelectionRef.current = paths;
			if (!callerHoldsList) setOwnListSelection(paths);
			onSelectionChange?.(paths);
		},
		[onSelectionChange, callerHoldsList],
	);
	const iconSelectionRef = useRef<string[]>([]);
	const trackIconSelection = useCallback((paths: string[]) => {
		iconSelectionRef.current = paths;
	}, []);
	const currentSelection = useCallback(
		(): string[] =>
			display === "list" ? listSelectionRef.current : iconSelectionRef.current,
		[display],
	);
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

	// The list view's selection rectangle, under `layout.fileBrowser.regionSelect`
	// (Windows Explorer's details view; WIG Ch.5 "Region Selection", p.42;
	// Ch.7 "List View Controls", p.123): a press on the list's empty space
	// (below its last row; never a row or the column titles) clears the
	// selection unless Shift, Control or ⌘ is held (comctl32's
	// LISTVIEW_LButtonDown; button 2, under `selection.secondaryButton`
	// "select", always, as LISTVIEW_RButtonDown) and, dragged, draws the
	// rectangle the icon view draws, selecting the rows whose names it
	// touches as it goes, with the icon view's modifiers
	// (`classicyIconMarqueeSelection`), the window scrolling toward an edge
	// the pointer is near or past.
	const [listMarquee, setListMarquee] =
		useState<ClassicyFileBrowserMarqueeBox | null>(null);
	const listMarqueeEndRef = useRef<(() => void) | null>(null);
	useEffect(() => () => listMarqueeEndRef.current?.(), []);
	const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
		if (display !== "list" || !listRegionSelect) return;
		const root = rootRef.current;
		const target = e.target as Element;
		if (!root?.contains(target)) return;
		const secondary = e.button === 2 && secondarySelects;
		if (e.button !== 0 && !secondary) return;
		if (
			target.closest(
				`tr[data-row-id], thead, .classicyScrollAreaHead, [${CLASSICY_FILE_PATH_ATTRIBUTE}], input, textarea, button`,
			)
		) {
			return;
		}
		const mods = secondary
			? { shiftKey: false, metaKey: false, ctrlKey: false }
			: { shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey };
		const extend = mods.shiftKey || mods.metaKey || mods.ctrlKey;
		const before = listSelectionRef.current;
		const base = extend ? before : [];
		if (!extend && before.length > 0) trackListSelection([]);
		const keys = layout.fileBrowser?.keys ?? "mac";
		listMarqueeEndRef.current?.();
		listMarqueeEndRef.current = startClassicyFileBrowserMarquee({
			holder: root,
			start: e,
			items: () =>
				root.querySelectorAll(
					`.classicyFileBrowserViewTableRowContainer[${CLASSICY_FILE_PATH_ATTRIBUTE}]`,
				),
			onBox: setListMarquee,
			onTouched: (touched) => {
				const next = classicyIconMarqueeSelection(keys, base, touched, mods);
				if (!classicySameSelection(next, listSelectionRef.current)) {
					trackListSelection(next);
				}
			},
			autoScroll: true,
			// Escape (`input.escapeCancels`): the selection the press found.
			onCancel: () => trackListSelection(before),
			onEnd: () => {
				listMarqueeEndRef.current = null;
			},
		});
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
			onMouseDown={onMouseDown}
		>
			{display === "list" ? (
				<ClassicyFileBrowserViewTable
					onMoveItems={onMoveItems}
					fileOnClickFunc={fileOnClickFunc ?? defaultFileOnClick}
					dirOnClickFunc={dirOnClickFunc ?? defaultDirOnClick}
					openItemsFunc={openItemsFunc}
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
					selectionApiRef={selectionApiRef}
					selectedPaths={
						selectedPaths ?? (holdsListSelection ? ownListSelection : undefined)
					}
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
					showInvisible={showInvisible}
					iconViewOptions={iconViewOptions}
					selectionApiRef={selectionApiRef}
					onRenameItem={onRenameItem}
					openItemsFunc={openItemsFunc}
					onSelectionChange={trackIconSelection}
				/>
			)}
			{listMarquee && (
				<div
					className={"classicyFileBrowserSelect"}
					aria-hidden={true}
					style={{
						left: listMarquee.left,
						top: listMarquee.top,
						width: listMarquee.width,
						height: listMarquee.height,
					}}
				/>
			)}
		</div>
	);
};
