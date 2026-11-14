import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { afterEach, describe, expect, it } from "vitest";
import { registerTestAppsPackage } from "@/__tests__/testAppsPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicyAssets,
	resolveClassicyAsset,
	resolveClassicyIconImage,
} from "@/Appearance/ClassicyAssetRegistry";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// A new folder stores the core's folder icon whatever package is active
// (story 0193-801), so the stored tree is the same under every package and
// the folder draws as the active package's folder (resolveClassicyIconImage).

const PACKAGE = "test-fs-folder-icon";
const seed = {
	_type: "directory",
	HD: { _type: ClassicyFileSystemEntryFileType.Drive },
};
const switchPackage = (packageId: string) =>
	dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });

afterEach(() => {
	switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
	unregisterClassicyAppearancePackage(PACKAGE);
});

describe("mkDir's folder icon", () => {
	it("is the core's folder icon under another package, drawn as that package's", () => {
		registerTestAppsPackage(PACKAGE, {});
		registerClassicyAssets("icons", PACKAGE, {
			system: { folders: { directory: "/pkg/folder.png" } },
		});
		const core = resolveClassicyAsset(
			"icons",
			"system.folders.directory",
			PLATINUM_APPEARANCE_PACKAGE_ID,
		);
		expect(core).toBeTruthy();

		const fs = new ClassicyFileSystem("folder-icon-test", seed);
		switchPackage(PACKAGE);
		fs.mkDir("HD:Made Under Package:Nested");
		expect(fs.resolve("HD:Made Under Package")._icon).toBe(core);
		expect(fs.resolve("HD:Made Under Package:Nested")._icon).toBe(core);
		expect(resolveClassicyIconImage(core as string, 32)).toBe(
			"/pkg/folder.png",
		);

		switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
		fs.mkDir("HD:Made Under Platinum");
		expect(fs.resolve("HD:Made Under Platinum")._icon).toBe(core);
		expect(resolveClassicyIconImage(core as string, 32)).toBe(core);
	});
});
