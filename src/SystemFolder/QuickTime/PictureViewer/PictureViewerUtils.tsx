import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const appIcon = ClassicyIcons.applications.pictureViewer.app;

export type QuickTimeImageDocument = {
	url: string;
	name?: string;
	icon?: string;
};

// An open file can be either a manually-opened document (url-only, e.g. the
// demo picture) or a plain ClassicyFileSystem path (e.g. a JPG double-clicked
// in Finder — see ClassicyAppPictureViewerOpenFile), resolved to a source at
// render time via ClassicyFileSystem + resolveFileSystemEntrySource.
export type PictureViewerOpenFile = string | QuickTimeImageDocument;

export type PictureViewerData = {
	openFiles: PictureViewerOpenFile[];
};

export function isPictureViewerData(
	d: Record<string, unknown>,
): d is PictureViewerData {
	return (
		d !== null &&
		typeof d === "object" &&
		"openFiles" in d &&
		Array.isArray(d.openFiles)
	);
}

export const PictureViewerAppInfo = {
	name: "Picture Viewer",
	id: "PictureViewer.app",
	icon: appIcon,
};
