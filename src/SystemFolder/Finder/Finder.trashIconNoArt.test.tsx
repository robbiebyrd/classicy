// The Trash folder's icon when no package has Trash art (plan 0019-fb7's
// final review): every surface that draws the Trash draws the active
// package's art, else the folder's stored `_icon`, else the directory icon
// by type, as every surface did before 5.1. Only a package with no
// `trashFull`/`trashEmpty` is registered, and not the default package, so
// there is no art to draw.
//
// No `withPlatinum` import: Platinum must stay unregistered here.
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerTestAppsPackage } from "@/__tests__/testAppsPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { Finder } from "@/SystemFolder/Finder/Finder";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import { ClassicyFileBrowserViewIcons } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { flushClassicyFileSystemPendingForStorageKey } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	CLASSICY_TRASH_PATH,
	ensureClassicyTrash,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";

const PACKAGE = "test-trash-no-art";
const SAVED = "/assets/saved-trash-AbC12345.png";

const rootTree = () => ({
	_type: "directory",
	"Macintosh HD": {
		_type: ClassicyFileSystemEntryFileType.Drive,
		"Note.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
	},
});

/** The Trash's image in each view of a root listing. */
const renderRootListing = (fs: ClassicyFileSystem) => {
	render(
		<ClassicyAppManagerProvider>
			<div data-view="icons">
				<ClassicyFileBrowserViewIcons fs={fs} path="" appId="Finder.app" />
			</div>
			<div data-view="list">
				<ClassicyFileBrowserViewTable fs={fs} path="" appId="Finder.app" />
			</div>
		</ClassicyAppManagerProvider>,
	);
	return (view: string) =>
		document
			.querySelector(`[data-view="${view}"] img[alt$="Trash"]`)
			?.getAttribute("src");
};

const titleIcon = () =>
	document
		.querySelector('.classicyWindowIcon img[alt="Trash"]')
		?.getAttribute("src");

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	registerTestAppsPackage(PACKAGE, {});
});

afterEach(() => {
	cleanup();
	unregisterClassicyAppearancePackage(PACKAGE);
});

describe("the Trash's icon with no Trash art registered", () => {
	it("has no art to draw", () => {
		for (const key of ["trashEmpty", "trashFull"] as const)
			expect(resolveClassicyAsset("systemArt", key)).toBeUndefined();
		expect(iconImageByType("directory")).toBeTruthy();
	});

	it("a root listing draws the stored `_icon`", async () => {
		const fs = new ClassicyFileSystem("trash-no-art-saved", rootTree());
		ensureClassicyTrash(fs, SAVED);
		const src = renderRootListing(fs);
		await waitFor(() => expect(src("icons")).toBe(SAVED));
		expect(src("list")).toBe(SAVED);
	});

	it("a root listing draws the directory icon when nothing is stored", async () => {
		const fs = new ClassicyFileSystem("trash-no-art-empty", rootTree());
		ensureClassicyTrash(fs);
		expect(fs.resolve(CLASSICY_TRASH_PATH)?._icon).toBe("");
		const src = renderRootListing(fs);
		await waitFor(() =>
			expect(src("icons")).toBe(iconImageByType("directory")),
		);
		expect(src("list")).toBe(iconImageByType("directory"));
	});

	it("the Trash window draws the stored `_icon`", async () => {
		flushClassicyFileSystemPendingForStorageKey("classicyStorage");
		const saved = new ClassicyFileSystem("trash-no-art-desktop.saved");
		ensureClassicyTrash(saved, SAVED);
		localStorage.setItem("classicyStorage", saved.snapshot());
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>
					<Finder />
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			dispatch({
				type: "ClassicyAppFinderOpenFolder",
				path: CLASSICY_TRASH_PATH,
			});
		});
		await waitFor(() => expect(titleIcon()).toBe(SAVED));
	});
});
