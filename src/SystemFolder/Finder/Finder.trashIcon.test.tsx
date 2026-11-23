// The Trash folder's icon (plan 0019-fb7 5.1, ruling R14). The folder stores
// the default package's art, never the active package's, so switching the
// active package writes nothing for it. Every surface that draws the Trash
// draws the active package's art at render, full or empty as the desktop
// icon is.
import "@/__tests__/withPlatinum";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerTestAppsPackage } from "@/__tests__/testAppsPackage";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicySystemArt,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { Finder } from "@/SystemFolder/Finder/Finder";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyFileBrowserViewIcons } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { ClassicyFileBrowserViewTable } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemJournalEntry,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import {
	CLASSICY_TRASH_PATH,
	ensureClassicyTrash,
	trashClassicyFileSystemItems,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";

const PACKAGE = "test-trash-art";
const OTHER_EMPTY = "/pkg/trash-empty.png";
const OTHER_FULL = "/pkg/trash-full.png";
const ADAPTER = "test-trash-journal";

const switchPackage = (packageId: string) =>
	act(() => {
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });
	});

/** The default package's empty-Trash art: what the folder stores. */
const defaultEmpty = () =>
	resolveClassicyAsset(
		"systemArt",
		"trashEmpty",
		CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
		"",
	) as string;

const storedIcon = () =>
	new ClassicyFileSystem().resolve(CLASSICY_TRASH_PATH)?._icon;

const titleIcon = () =>
	document
		.querySelector('.classicyWindowIcon img[alt="Trash"]')
		?.getAttribute("src");

const desktopTrashIcon = () =>
	useAppManager
		.getState()
		.System.Manager.Desktop.icons.find((i) => i.appId === "Trash")?.icon;

const renderFinder = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false}>
				<Finder />
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>,
	);

const openTrash = () =>
	act(() => {
		dispatch({
			type: "ClassicyAppFinderOpenFolder",
			path: CLASSICY_TRASH_PATH,
		});
	});

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	registerTestAppsPackage(PACKAGE, {});
	registerClassicySystemArt(PACKAGE, {
		trashEmpty: OTHER_EMPTY,
		trashFull: OTHER_FULL,
	});
});

afterEach(() => {
	unregisterClassicyFileSystemAdapter(ADAPTER);
	cleanup();
	switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
	unregisterClassicyAppearancePackage(PACKAGE);
});

describe("the Trash folder's icon", () => {
	it("switching the active package after mount journals nothing for the Trash", async () => {
		expect(defaultEmpty()).toBeTruthy();
		expect(defaultEmpty()).not.toBe(OTHER_EMPTY);
		renderFinder();
		await waitFor(() => expect(storedIcon()).toBe(defaultEmpty()));
		openTrash();
		await waitFor(() => expect(titleIcon()).toBe(defaultEmpty()));

		const journal: ClassicyFileSystemJournalEntry[] = [];
		registerClassicyFileSystemAdapter({
			id: ADAPTER,
			onChange: (entry) => {
				journal.push(entry);
			},
		});
		switchPackage(PACKAGE);
		// Drawn as the active package's, on the window and on the desktop.
		await waitFor(() => expect(titleIcon()).toBe(OTHER_EMPTY));
		await waitFor(() => expect(desktopTrashIcon()).toBe(OTHER_EMPTY));
		switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
		await waitFor(() => expect(titleIcon()).toBe(defaultEmpty()));

		expect(journal.filter((e) => e.path === CLASSICY_TRASH_PATH)).toEqual([]);
		expect(storedIcon()).toBe(defaultEmpty());
	});

	it("a first mount under another package stores the default package's art", async () => {
		switchPackage(PACKAGE);
		renderFinder();
		await waitFor(() => expect(storedIcon()).toBe(defaultEmpty()));
		openTrash();
		await waitFor(() => expect(titleIcon()).toBe(OTHER_EMPTY));
		// Full while anything is in it, still the active package's.
		act(() => {
			const fs = new ClassicyFileSystem();
			fs.writeFile("Macintosh HD:Documents:Old Note.txt", "");
			trashClassicyFileSystemItems(fs, ["Macintosh HD:Documents:Old Note.txt"]);
		});
		await waitFor(() => expect(titleIcon()).toBe(OTHER_FULL));
		expect(desktopTrashIcon()).toBe(OTHER_FULL);
		expect(storedIcon()).toBe(defaultEmpty());
	});

	it("a listing of the root draws the Trash with the active package's art", async () => {
		const fs = new ClassicyFileSystem("finder-trash-root-listing", {
			_type: "directory",
			"Macintosh HD": {
				_type: ClassicyFileSystemEntryFileType.Drive,
				"Note.txt": { _type: ClassicyFileSystemEntryFileType.TextFile },
			},
		});
		ensureClassicyTrash(fs);
		expect(fs.resolve(CLASSICY_TRASH_PATH)?._icon).toBe(defaultEmpty());
		switchPackage(PACKAGE);
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
		const src = (view: string) =>
			document
				.querySelector(`[data-view="${view}"] img[alt$="Trash"]`)
				?.getAttribute("src");
		await waitFor(() => expect(src("icons")).toBe(OTHER_EMPTY));
		expect(src("list")).toBe(OTHER_EMPTY);
	});
});
