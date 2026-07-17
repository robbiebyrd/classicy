import "./ClassicyFileBrowserViewTable.scss";
import { type FC as FunctionalComponent, useRef } from "react";
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
}) => {
	const holderRef = useRef<HTMLDivElement>(null);

	return (
		<div className={"classicyFileBrowserFill"}>
			{display === "list" ? (
				<ClassicyFileBrowserViewTable
					fileOnClickFunc={fileOnClickFunc ?? defaultFileOnClick}
					dirOnClickFunc={dirOnClickFunc ?? defaultDirOnClick}
					fs={fs}
					path={path}
					appId={appId}
					iconSize={18}
					holderRef={holderRef}
					hideFilesCreatedAfter={hideFilesCreatedAfter}
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
