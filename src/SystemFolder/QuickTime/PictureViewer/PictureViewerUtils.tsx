import { z } from "zod";
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

/** Manifest schema for one open file: a filesystem path or an image document. */
export const PictureViewerOpenFileSchema = z.union([
	z.string().describe("A ClassicyFileSystem path to an image file."),
	z
		.looseObject({
			url: z.string().describe("Source URL of the image document."),
			name: z.string().optional().describe("Display name of the document."),
			icon: z.string().optional().describe("Icon shown for the document."),
		})
		.describe("A manually opened image document."),
]);

/** Manifest schema for PictureViewer.app's `data` (see registerApp). */
export const PictureViewerDataSchema = z.looseObject({
	openFiles: z
		.array(PictureViewerOpenFileSchema)
		.optional()
		.describe("Image documents currently open in Picture Viewer."),
});

export const PictureViewerAppInfo = {
	name: "Picture Viewer",
	id: "PictureViewer.app",
	icon: appIcon,
};
