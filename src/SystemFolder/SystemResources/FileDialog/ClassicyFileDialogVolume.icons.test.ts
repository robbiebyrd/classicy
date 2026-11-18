import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { afterEach, describe, expect, it } from "vitest";
import { registerTestAppsPackage } from "@/__tests__/testAppsPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicyAssets,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	desktopVolume,
	fileSystemVolume,
} from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialogVolume";

// Open and Save dialogs' volumes hold the core's icons whatever package is
// active (story 0193-801, fix round 1): their entries' fallback icons, the
// volumes' own icons and a saved file's stored icon. The dialog's list draws
// them as the active package's (ClassicyIconImage), so a dialog left open
// across a package switch never keeps the other package's art, and a saved
// file stores the same bytes under every package.

const PACKAGE = "test-file-dialog-icons";
const switchPackage = (packageId: string) =>
	dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });
const core = (key: string) =>
	resolveClassicyAsset("icons", key, PLATINUM_APPEARANCE_PACKAGE_ID);

afterEach(() => {
	switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
	unregisterClassicyAppearancePackage(PACKAGE);
});

const underPackage = () => {
	registerTestAppsPackage(PACKAGE, {});
	registerClassicyAssets("icons", PACKAGE, {
		system: {
			mac: "/pkg/mac.png",
			drives: { disk: "/pkg/disk.png" },
			folders: { directory: "/pkg/folder.png" },
			files: { file: "/pkg/file.png" },
		},
	});
	switchPackage(PACKAGE);
};

const tree = () =>
	new ClassicyFileSystem(`file-dialog-icons-${Math.random()}`, {
		_type: "directory",
		"Macintosh HD": {
			_type: ClassicyFileSystemEntryFileType.Drive,
			Folder: { _type: ClassicyFileSystemEntryFileType.Directory },
			"Note.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
		},
	});

describe("file dialog volume icons under another package", () => {
	it("list entries without an icon of their own with the core's", async () => {
		underPackage();
		const entries = await fileSystemVolume(tree(), "Macintosh HD").list([]);
		expect(Object.fromEntries(entries.map((e) => [e.name, e.icon]))).toEqual({
			Folder: core("system.folders.directory"),
			"Note.txt": core("system.files.file"),
		});
	});

	it("give the desktop and an icon-less drive the core's icons", () => {
		underPackage();
		const fs = tree();
		expect(desktopVolume(fs).icon).toBe(core("system.mac"));
		expect(fileSystemVolume(fs, "Macintosh HD").icon).toBe(
			core("system.drives.disk"),
		);
	});

	it("store the core's icon for a saved file of no icon", async () => {
		underPackage();
		const fs = tree();
		const write = fileSystemVolume(fs, "Macintosh HD").write;
		if (!write) throw new Error("the volume is not writable");
		await write([], "Saved.txt", {
			data: "x",
			fileType: ClassicyFileSystemEntryFileType.TextFile,
		});
		expect(fs.resolve("Macintosh HD:Saved.txt")._icon).toBe(
			core("system.files.file"),
		);
	});
});
