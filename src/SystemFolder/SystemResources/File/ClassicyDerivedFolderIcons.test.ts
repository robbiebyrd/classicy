import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { afterEach, describe, expect, it } from "vitest";
import { registerTestAppsPackage } from "@/__tests__/testAppsPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { registerClassicyAssets } from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { buildApplicationsFolder } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import { buildControlStripModulesFolder } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemControlStripModules";
import { buildExtensionsFolder } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions";

// The derived folders' own icons (story 0193-801): each folder holds the
// default package's icon for its key, read from the registry when it is
// built, never the active package's (the folder itself is stored, so its
// bytes stay the same under every package) and never a capture (a host's
// re-registration under the default package counts). Icon surfaces draw it
// as the active package's.

const PACKAGE = "test-derived-folder-icons";
const KEYS = {
	applications: ClassicyIcons.system.folders.applications,
	extensions: ClassicyIcons.system.folders.extensions,
	controlStrip: ClassicyIcons.system.folders.controlStrip,
};
const folders = () => ({
	applications: buildApplicationsFolder([])._icon,
	extensions: buildExtensionsFolder([])._icon,
	controlStrip: buildControlStripModulesFolder([])._icon,
});
const switchPackage = (packageId: string) =>
	dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });

afterEach(() => {
	switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
	unregisterClassicyAppearancePackage(PACKAGE);
	registerClassicyAssets("icons", PLATINUM_APPEARANCE_PACKAGE_ID, {
		system: { folders: KEYS },
	});
});

describe("the derived folders' own icons", () => {
	it("are the core's under another package", () => {
		registerTestAppsPackage(PACKAGE, {});
		registerClassicyAssets("icons", PACKAGE, {
			system: {
				folders: {
					applications: "/pkg/apps.png",
					extensions: "/pkg/ext.png",
					controlStrip: "/pkg/strip.png",
				},
			},
		});
		switchPackage(PACKAGE);
		expect(folders()).toEqual(KEYS);
	});

	it("follow a re-registration under the default package", () => {
		const host = {
			applications: "/host/apps.png",
			extensions: "/host/ext.png",
			controlStrip: "/host/strip.png",
		};
		registerClassicyAssets("icons", PLATINUM_APPEARANCE_PACKAGE_ID, {
			system: { folders: host },
		});
		expect(folders()).toEqual(host);
	});
});
