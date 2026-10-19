import "./ClassicyFileBrowserViewTable.scss";
import { type FC as FunctionalComponent, type RefObject, useRef } from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type {
	FinderIconViewOptions,
	FinderListViewOptions,
} from "@/SystemFolder/Finder/FinderContext";
import { listViewIconSize } from "@/SystemFolder/Finder/FinderViewOptions";
import { ClassicyFileBrowserViewIcons } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import type { ClassicyTableSelectionApi } from "@/SystemFolder/SystemResources/Table/ClassicyTable";

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
}) => {
	const holderRef = useRef<HTMLDivElement>(null);
	const themeIconSize = useAppManager(
		(s) => s.System.Manager.Appearance.activeTheme.desktop.iconSize,
	);

	return (
		<div className={"classicyFileBrowserFill"}>
			{display === "list" ? (
				<ClassicyFileBrowserViewTable
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
					onSelectionChange={onSelectionChange}
					focusTargetRef={focusTargetRef}
				/>
			) : (
				<ClassicyFileBrowserViewIcons
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
