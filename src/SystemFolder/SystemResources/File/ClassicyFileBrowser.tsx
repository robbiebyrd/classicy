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
	fs: ClassicyFileSystem;
	path: string;
	appId: string;
	display?: "icons" | "list";
	dirOnClickFunc?: (path: string) => void;
	fileOnClickFunc?: (path: string) => void;
	// When set, files whose `_createdOn` is after this moment are hidden from the
	// listing. Pass the current Classicy date/time to hide "future" files.
	hideFilesCreatedAfter?: Date | string | number | null;
	listViewOptions?: FinderListViewOptions;
	iconViewOptions?: FinderIconViewOptions;
	/** The in-world "now" for relative dates, already converted to the
	 *  virtual clock's local frame. Omitted means real time. */
	now?: Date;
	selectionApiRef?: RefObject<ClassicyTableSelectionApi | null>;
	/** Controlled selection by row path. Omit for uncontrolled. */
	selectedPaths?: string[];
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
