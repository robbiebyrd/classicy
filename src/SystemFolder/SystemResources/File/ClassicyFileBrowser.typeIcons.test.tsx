import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { registerTestAppsPackage } from "@/__tests__/testAppsPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicyAssets,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyFileBrowserViewIcons } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const PACKAGE = "test-browser-type-icons";
const switchPackage = (packageId: string) =>
	act(() => {
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });
	});

afterEach(() => {
	cleanup();
	switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
	unregisterClassicyAppearancePackage(PACKAGE);
});

describe("type icons in the file browser views", () => {
	it("follow a package switch and back", () => {
		registerTestAppsPackage(PACKAGE, {});
		registerClassicyAssets("icons", PACKAGE, {
			system: { files: { file: "/pkg/file.png" } },
		});
		const fs = new ClassicyFileSystem("browser-type-icons", {
			_type: "directory",
			Docs: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				"Note.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
			},
		});
		switchPackage(PACKAGE);
		render(
			<ClassicyAppManagerProvider>
				<div data-view="icons">
					<ClassicyFileBrowserViewIcons
						fs={fs}
						path="Docs"
						appId="Finder.app"
					/>
				</div>
				<div data-view="list">
					<ClassicyFileBrowserViewTable
						fs={fs}
						path="Docs"
						appId="Finder.app"
					/>
				</div>
			</ClassicyAppManagerProvider>,
		);
		const src = (view: string) =>
			document
				.querySelector(`[data-view="${view}"] img[alt$="Note.txt"]`)
				?.getAttribute("src");
		expect(src("icons")).toBe("/pkg/file.png");
		expect(src("list")).toBe("/pkg/file.png");
		switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
		const core = resolveClassicyAsset("icons", "system.files.file");
		expect(src("icons")).toBe(core);
		expect(src("list")).toBe(core);
	});
});
