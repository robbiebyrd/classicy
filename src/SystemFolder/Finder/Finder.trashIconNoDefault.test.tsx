// The Trash folder's stored icon on a host without the default package
// (plan 0019-fb7 5.1, rulings R14 and R15): only a package other than
// Platinum is registered, so there is no default art to store. A saved
// Trash keeps its `_icon` (never healed to nothing), and when the default
// package's art registers later the icon heals to it, once.
//
// No `withPlatinum` import: Platinum must stay unregistered here.
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
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { Finder } from "@/SystemFolder/Finder/Finder";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemJournalEntry,
	flushClassicyFileSystemPendingForStorageKey,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import {
	CLASSICY_TRASH_PATH,
	ensureClassicyTrash,
} from "@/SystemFolder/SystemResources/File/ClassicyTrash";

const PACKAGE = "test-trash-no-default";
const OTHER_EMPTY = "/pkg/trash-empty.png";
const SAVED = "/assets/saved-trash-AbC12345.png";
const DEFAULT_LATER = "/default/trash-empty-later.png";
const ADAPTER = "test-trash-no-default-journal";

const storedIcon = () =>
	new ClassicyFileSystem().resolve(CLASSICY_TRASH_PATH)?._icon;

const desktopTrashIcon = () =>
	useAppManager
		.getState()
		.System.Manager.Desktop.icons.find((i) => i.appId === "Trash")?.icon;

/** Saves a desktop whose Trash holds `SAVED` as its `_icon`. */
const saveDesktop = () => {
	flushClassicyFileSystemPendingForStorageKey("classicyStorage");
	const saved = new ClassicyFileSystem("finder-trash-no-default.saved");
	ensureClassicyTrash(saved, SAVED);
	localStorage.setItem("classicyStorage", saved.snapshot());
};

/** Records every journal entry for the Trash folder itself. */
const recordTrashJournal = (): ClassicyFileSystemJournalEntry[] => {
	const journal: ClassicyFileSystemJournalEntry[] = [];
	registerClassicyFileSystemAdapter({
		id: ADAPTER,
		onChange: (entry) => {
			if (entry.path === CLASSICY_TRASH_PATH) journal.push(entry);
		},
	});
	return journal;
};

const renderFinder = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false}>
				<Finder />
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>,
	);

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	registerTestAppsPackage(PACKAGE, {});
	registerClassicySystemArt(PACKAGE, {
		trashEmpty: OTHER_EMPTY,
		trashFull: "/pkg/trash-full.png",
	});
});

afterEach(() => {
	unregisterClassicyFileSystemAdapter(ADAPTER);
	cleanup();
	unregisterClassicyAppearancePackage(PACKAGE);
});

describe("the Trash's stored icon without the default package", () => {
	it("mounting Finder over a saved Trash journals nothing for it", async () => {
		expect(
			resolveClassicyAsset(
				"systemArt",
				"trashEmpty",
				CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
				"",
			),
		).toBeUndefined();
		saveDesktop();
		const journal = recordTrashJournal();
		renderFinder();
		// Finder has run its Trash effects: the desktop icon is drawn, with the
		// active package's art.
		await waitFor(() => expect(desktopTrashIcon()).toBe(OTHER_EMPTY));
		expect(journal).toEqual([]);
		expect(storedIcon()).toBe(SAVED);
	});

	// Last in the file: it registers default-package art, which stays.
	it("heals once when the default package's art registers after mount", async () => {
		saveDesktop();
		const journal = recordTrashJournal();
		renderFinder();
		await waitFor(() => expect(desktopTrashIcon()).toBe(OTHER_EMPTY));
		expect(journal).toEqual([]);
		act(() => {
			registerClassicySystemArt(CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID, {
				trashEmpty: DEFAULT_LATER,
			});
		});
		await waitFor(() => expect(storedIcon()).toBe(DEFAULT_LATER));
		// Let any further effect run before counting.
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
		});
		expect(journal).toHaveLength(1);
		expect(journal[0]).toMatchObject({
			op: "meta",
			path: CLASSICY_TRASH_PATH,
			metadata: { _icon: DEFAULT_LATER },
		});
		// The active package still draws its own art on the desktop.
		expect(desktopTrashIcon()).toBe(OTHER_EMPTY);
	});
});
