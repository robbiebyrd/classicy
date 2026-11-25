import type { ClassicyAppearancePackage } from "@classicy/classicy";

/**
 * Windows 98's names for the file types (the package's `fileTypeNames`):
 * what Explorer's Type column and a property sheet's Type say, title case
 * and 40 characters at most (WIG Ch.10 "The Application Identifier Key",
 * pp.197-198; Table 10.1; Windows 98 SE as shipped: shell.inf's registry
 * names "File Folder" and "Text Document", shell32.dll's "Local Disk" and
 * "Shortcut", mplay98.inf's "Video Clip", url.dll's "Internet Shortcut").
 * A type it names not keeps the core's name. Frozen: the registry keeps
 * its own frozen copy too.
 */
export const windows98FileTypeNames: NonNullable<
	ClassicyAppearancePackage["fileTypeNames"]
> = Object.freeze({
	directory: "File Folder",
	drive: "Local Disk",
	text_file: "Text Document",
	video: "Video Clip",
	app_shortcut: "Application",
	shortcut: "Internet Shortcut",
	file_shortcut: "Shortcut",
	stack: "HyperCard Stack",
	pdf: "PDF Document",
});
