import "./ClassicyFileBrowserViewTable.scss";
import { type FC as FunctionalComponent, useRef } from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { FinderListViewOptions } from "@/SystemFolder/Finder/FinderContext";
import { listViewIconSize } from "@/SystemFolder/Finder/FinderViewOptions";
import { ClassicyFileBrowserViewIcons } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

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
	/** The in-world "now" for relative dates, already converted to the
	 *  virtual clock's local frame. Omitted means real time. */
	now?: Date;
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
	now,
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
				/>
			)}
		</div>
	);
};
