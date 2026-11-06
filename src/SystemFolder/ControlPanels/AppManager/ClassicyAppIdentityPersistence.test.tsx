import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	registerTestRenamePackage,
	TEST_RENAME_PACKAGE_ID,
	TEST_RENAMED_ICON,
} from "@/__tests__/testRenamePackage";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import {
	moveClassicyFileSystemItems,
	moveClassicyItemsToTrash,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { flushClassicyFileSystemPendingForStorageKey } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";

// I13: an Appearance Package's display identity (an app's name and icon)
// reaches every surface, and never the persisted state. Whatever is drawn
// under a renaming package, what reaches localStorage (the desktop state and
// the file-system tree) keeps the apps' own names and icons.

// jsdom plays no audio, so the full desktop's sound manager would log a
// "Failed to load audio sprite" error for every Howl it builds.
vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

// Importing the Platinum module registered it; keep that object so every
// test can put the real Platinum registration back after a reset.
const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const TV_ICON = "/icons/tv.png";

/** Every display string `test-rename` introduces. */
const DISPLAY_ONLY = ["Media Player", "Television", TEST_RENAMED_ICON];

const resetToPlatinum = () => {
	resetClassicyAppearancePackagesForTests();
	registerClassicyAppearancePackage(platinum);
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
};

const switchPackage = (packageId: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
	);

const runTimers = () =>
	act(() => {
		vi.runOnlyPendingTimers();
	});

const persisted = () =>
	JSON.stringify(sanitizeStateForPersistence(useAppManager.getState()));

/** The TV desktop icon's label. */
const tvLabel = () =>
	document.getElementById("TV.app.shortcut")?.querySelector("p")?.textContent;

/** The App Switcher's visible title (see ClassicyDesktopMenuBar.identity). */
const switcherTitle = () => {
	const row = document.querySelector("#app-switcher > p");
	const sized = row?.querySelector(
		".classicyMenuItemTitleSizer > span:first-child",
	);
	return (sized ?? row)?.textContent;
};

beforeEach(() => {
	// A previous case's debounced file-system write would land here.
	flushClassicyFileSystemPendingForStorageKey("classicyStorage");
	localStorage.clear();
	sessionStorage.clear();
	resetToPlatinum();
	registerTestRenamePackage();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	resetToPlatinum();
});

describe("app identity overrides and persistence (I13)", () => {
	it("never writes a display name or icon to persisted state, and a switch back restores the own names", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} controlStrip={false}>
					<ClassicyApp
						id="TV.app"
						name="TV"
						icon={TV_ICON}
						showDesktopIcon
						addSystemMenu
						bootIcon
					/>
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			dispatch({ type: "ClassicyAppOpen", app: MoviePlayerAppInfo });
		});

		switchPackage(TEST_RENAME_PACKAGE_ID);
		runTimers();

		// Every surface is drawn under the renaming package…
		expect(tvLabel()).toBe("Television");
		expect(switcherTitle()).toBe("Media Player");

		// …while the persisted form of the store keeps the own identity.
		const sanitized = persisted();
		for (const text of DISPLAY_ONLY) {
			expect(sanitized).not.toContain(text);
		}
		expect(sanitized).toContain('"name":"TV"');
		expect(sanitized).toContain('"name":"Movie Player"');

		// An ordinary write after the switch, flushed: neither localStorage
		// record (the desktop state, the file-system tree) holds display data.
		act(() => {
			dispatch({ type: "ClassicyAppFocus", app: { id: "TV.app" } });
			new ClassicyFileSystem().mkDir("Macintosh HD:After Switch");
		});
		runTimers();
		flushClassicyFileSystemPendingForStorageKey("classicyStorage");
		const desktopState = localStorage.getItem("classicyDesktopState");
		const fileSystem = localStorage.getItem("classicyStorage");
		expect(desktopState).toContain('"name":"TV"');
		expect(fileSystem).toContain("After Switch");
		for (const stored of [desktopState, fileSystem]) {
			for (const text of DISPLAY_ONLY) {
				expect(stored).not.toContain(text);
			}
		}

		// Back under Platinum, the own names are drawn again.
		act(() => {
			dispatch({
				type: "ClassicyAppFocus",
				app: { id: MoviePlayerAppInfo.id },
			});
		});
		switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);
		runTimers();
		expect(tvLabel()).toBe("TV");
		expect(switcherTitle()).toBe("Movie Player");
	});

	// K-R13 (I1): the refusal alert names the entry by its path, which in the
	// derived Applications folder is the display name. The alert is shown,
	// but, like every transient dialog, never persisted.
	it.each([
		[
			"moved to the Trash",
			(fs: ClassicyFileSystem, path: string) =>
				moveClassicyItemsToTrash(fs, [path], dispatch),
		],
		[
			"moved to another folder",
			(fs: ClassicyFileSystem, path: string) =>
				moveClassicyFileSystemItems(
					fs,
					[path],
					{ kind: "folder", path: "Macintosh HD" },
					dispatch,
				),
		],
	])("a renamed Applications entry refused when %s leaves no display name in persisted state", (_, move) => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} controlStrip={false} />
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			dispatch({ type: "ClassicyAppOpen", app: MoviePlayerAppInfo });
		});
		switchPackage(TEST_RENAME_PACKAGE_ID);
		runTimers();

		const fs = new ClassicyFileSystem();
		const entry = "Macintosh HD:Applications:Media Player";
		expect(fs.resolve(entry)).toBeTruthy();
		act(() => {
			expect(move(fs, entry)).toEqual([]);
		});

		// The alert is drawn under the display name…
		expect(
			useAppManager.getState().System.Manager.Desktop.errorDialog?.message,
		).toContain("Media Player");

		// …and reaches neither the persisted form nor localStorage.
		runTimers();
		const desktopState = localStorage.getItem("classicyDesktopState");
		expect(desktopState).toContain('"name":"Movie Player"');
		for (const stored of [persisted(), desktopState]) {
			for (const text of DISPLAY_ONLY) {
				expect(stored).not.toContain(text);
			}
		}
	});
});
