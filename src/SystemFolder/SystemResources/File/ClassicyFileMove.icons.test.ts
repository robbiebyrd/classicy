import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { afterEach, describe, expect, it } from "vitest";
import { registerTestAppsPackage } from "@/__tests__/testAppsPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicyAssets,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import { classicyDesktopItemIconAction } from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// A Desktop Folder item with no icon of its own is recorded on the desktop
// with the core's icon for its type, whatever package is active (story
// 0193-801): the desktop's icon records persist, and the desktop draws a
// core icon URL as the active package's.

const PACKAGE = "test-file-move-icons";
const switchPackage = (packageId: string) =>
	dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });
const core = (key: string) =>
	resolveClassicyAsset("icons", key, PLATINUM_APPEARANCE_PACKAGE_ID);

afterEach(() => {
	switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
	unregisterClassicyAppearancePackage(PACKAGE);
});

describe("type icons under another package", () => {
	it("iconImageByType draws the active package's, or the named package's", () => {
		registerTestAppsPackage(PACKAGE, {});
		registerClassicyAssets("icons", PACKAGE, {
			system: {
				folders: { directory: "/pkg/folder.png" },
				files: { file: "/pkg/file.png" },
			},
		});
		switchPackage(PACKAGE);
		expect(iconImageByType("directory")).toBe("/pkg/folder.png");
		expect(iconImageByType("text_file")).toBe("/pkg/file.png");
		expect(iconImageByType("directory", PLATINUM_APPEARANCE_PACKAGE_ID)).toBe(
			core("system.folders.directory"),
		);
		expect(iconImageByType("text_file", PLATINUM_APPEARANCE_PACKAGE_ID)).toBe(
			core("system.files.file"),
		);
	});

	it("a Desktop Folder item's desktop icon holds the core's icon", () => {
		registerTestAppsPackage(PACKAGE, {});
		registerClassicyAssets("icons", PACKAGE, {
			system: {
				folders: { directory: "/pkg/folder.png" },
				files: { file: "/pkg/file.png" },
			},
		});
		const fs = new ClassicyFileSystem("test-file-move-icons", {
			_type: "directory",
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				"Desktop Folder": {
					_type: ClassicyFileSystemEntryFileType.Directory,
					Folder: { _type: ClassicyFileSystemEntryFileType.Directory },
					"Note.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
				},
			},
		});
		switchPackage(PACKAGE);
		const icon = (name: string) => {
			const action = classicyDesktopItemIconAction(
				fs,
				`Macintosh HD:Desktop Folder:${name}`,
			) as unknown as { app: { icon: string } };
			return action.app.icon;
		};
		expect(icon("Folder")).toBe(core("system.folders.directory"));
		expect(icon("Note.txt")).toBe(core("system.files.file"));
	});
});
