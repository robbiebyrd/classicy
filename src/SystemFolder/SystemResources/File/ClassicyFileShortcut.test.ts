import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	activateTestWindowsKeysPackage,
	TEST_WINDOWS_KEYS_PACKAGE_ID,
} from "@/__tests__/testWindowsKeysPackage";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import {
	CLASSICY_SHORTCUT_DESKTOP_OFFER,
	CLASSICY_SHORTCUT_MISSING_ORIGINAL,
	CLASSICY_SHORTCUT_PROBLEM_TITLE,
	CLASSICY_SHORTCUT_TITLE,
	classicyFileShortcutPath,
	classicyFirstFreeShortcutName,
	classicyShortcutMissingMessage,
	classicyShortcutName,
	classicyShortcutProblem,
	createClassicyFileShortcut,
	isClassicyFileShortcut,
	resolveClassicyFileShortcut,
} from "@/SystemFolder/SystemResources/File/ClassicyFileShortcut";
import {
	ClassicyFileSystem,
	getClassicySharedFileSystem,
	resetClassicyFileSystemSharedTrees,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemJournalEntry,
	registerClassicyFileSystemAdapter,
	unregisterClassicyFileSystemAdapter,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const DOCS = "Macintosh HD:Documents";

let restore: (() => void) | undefined;
beforeEach(() => {
	// Drain an earlier test's debounced flush first, so no tree it wrote is
	// read back as stored.
	window.dispatchEvent(new Event("pagehide"));
	localStorage.clear();
	resetClassicyFileSystemSharedTrees();
});
afterEach(() => {
	restore?.();
	restore = undefined;
});

// The remaining chapters' audit's 10.6 (WIG Ch.10 "Registering Commands",
// pp.200-201, and "System Naming Conventions", p.210; Windows 98 SE's
// shell32.dll): a file shortcut names its target, is named "Shortcut to
// <name>" ("Shortcut (2) to <name>" on a clash) and says so in Windows'
// words when its target is gone.
describe("file shortcut names", () => {
	it("names a shortcut as Windows 98 SE does, the number in parentheses", () => {
		expect(classicyShortcutName("Plan.txt")).toBe("Shortcut to Plan.txt");
		expect(classicyShortcutName("Plan.txt", 1)).toBe("Shortcut to Plan.txt");
		expect(classicyShortcutName("Plan.txt", 2)).toBe(
			"Shortcut (2) to Plan.txt",
		);
		expect(classicyShortcutName("Macintosh HD", 3)).toBe(
			"Shortcut (3) to Macintosh HD",
		);
	});

	it("takes the first free name, compared without case, invisible entries too", () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile(`${DOCS}:Plan.txt`, "a");
		expect(classicyFirstFreeShortcutName(fs, DOCS, "Plan.txt")).toBe(
			"Shortcut to Plan.txt",
		);
		fs.writeFile(`${DOCS}:shortcut TO plan.txt`, "", { _invisible: true });
		expect(classicyFirstFreeShortcutName(fs, DOCS, "Plan.txt")).toBe(
			"Shortcut (2) to Plan.txt",
		);
		fs.writeFile(`${DOCS}:Shortcut (2) to Plan.txt`, "");
		expect(classicyFileShortcutPath(fs, `${DOCS}:Plan.txt`, DOCS)).toBe(
			`${DOCS}:Shortcut (3) to Plan.txt`,
		);
	});

	it("holds Windows 98 SE's message box texts (shell32.dll)", () => {
		expect(CLASSICY_SHORTCUT_TITLE).toBe("Shortcut");
		expect(CLASSICY_SHORTCUT_PROBLEM_TITLE).toBe("Problem with Shortcut");
		expect(CLASSICY_SHORTCUT_DESKTOP_OFFER).toBe(
			"Windows cannot create a shortcut here.\nDo you want the shortcut to be placed on the desktop instead?",
		);
		expect(classicyShortcutMissingMessage(`${DOCS}:Plan.txt`)).toBe(
			"The file or folder 'Macintosh HD:Documents:Plan.txt' that this shortcut refers to cannot be found.",
		);
	});

	it("says a target is gone in Windows' box under Explorer's commands, the core's words otherwise", () => {
		expect(
			classicyShortcutProblem("X", CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID),
		).toEqual({ message: CLASSICY_SHORTCUT_MISSING_ORIGINAL });
		restore = activateTestWindowsKeysPackage();
		expect(classicyShortcutProblem("X", TEST_WINDOWS_KEYS_PACKAGE_ID)).toEqual({
			title: "Problem with Shortcut",
			message:
				"The file or folder 'X' that this shortcut refers to cannot be found.",
		});
		// The active package when none is named.
		expect(classicyShortcutProblem("X").title).toBe("Problem with Shortcut");
	});
});

describe("createClassicyFileShortcut", () => {
	it("writes a file_shortcut entry beside its target, with the target's path and icon", () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile(`${DOCS}:Plan.txt`, "a");
		const path = createClassicyFileShortcut(fs, `${DOCS}:Plan.txt`, DOCS);
		expect(path).toBe(`${DOCS}:Shortcut to Plan.txt`);
		const entry = fs.resolve(path as string);
		expect(entry._type).toBe(ClassicyFileSystemEntryFileType.FileShortcut);
		expect(isClassicyFileShortcut(entry)).toBe(true);
		expect(entry._targetPath).toBe(`${DOCS}:Plan.txt`);
		// The core's icon for the target's type, drawn as the active package's.
		expect(entry._icon).toBe(
			iconImageByType("text_file", CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID),
		);
		expect(entry._creator).toBeUndefined();
		// A second is numbered.
		expect(createClassicyFileShortcut(fs, `${DOCS}:Plan.txt`, DOCS)).toBe(
			`${DOCS}:Shortcut (2) to Plan.txt`,
		);
	});

	it("keeps a folder's or a drive's own icon, and writes at the path given", () => {
		const fs = new ClassicyFileSystem();
		const drive = fs.resolve("Macintosh HD");
		const path = createClassicyFileShortcut(fs, "Macintosh HD", DOCS, {
			path: `${DOCS}:My Disk`,
		});
		expect(path).toBe(`${DOCS}:My Disk`);
		expect(fs.resolve(`${DOCS}:My Disk`)._icon).toBe(drive._icon);
		expect(fs.resolve(`${DOCS}:My Disk`)._targetPath).toBe("Macintosh HD");
	});

	it("copies a shortcut rather than pointing at it (Windows 98 makes no shortcut to a shortcut)", () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile(`${DOCS}:Plan.txt`, "a");
		const first = createClassicyFileShortcut(fs, `${DOCS}:Plan.txt`, DOCS);
		const copy = createClassicyFileShortcut(fs, first as string, DOCS);
		expect(copy).toBe(`${DOCS}:Shortcut to Shortcut to Plan.txt`);
		expect(fs.resolve(copy as string)._targetPath).toBe(`${DOCS}:Plan.txt`);
	});

	it("names an application's entry and stores the app's own icon, never the display icon", () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile("Macintosh HD:Applications:Notepad", "", {
			_type: ClassicyFileSystemEntryFileType.AppShortcut,
			_creator: "SimpleText.app",
			_icon: "windows-notepad.png",
			_derived: true,
		});
		const path = createClassicyFileShortcut(
			fs,
			"Macintosh HD:Applications:Notepad",
			DOCS,
			{ appIcon: (id) => (id === "SimpleText.app" ? "simpletext.png" : "") },
		);
		const entry = fs.resolve(path as string);
		expect(entry._creator).toBe("SimpleText.app");
		expect(entry._icon).toBe("simpletext.png");
		// With no icon of the app's own, the entry's.
		const second = createClassicyFileShortcut(
			fs,
			"Macintosh HD:Applications:Notepad",
			DOCS,
		);
		expect(fs.resolve(second as string)._icon).toBe("windows-notepad.png");
	});

	it("makes nothing for a target that is gone", () => {
		const fs = new ClassicyFileSystem();
		expect(
			createClassicyFileShortcut(fs, `${DOCS}:Gone.txt`, DOCS),
		).toBeUndefined();
		expect(fs.resolve(`${DOCS}:Shortcut to Gone.txt`)).toBeUndefined();
	});

	it("persists the entry, its target path included, and journals it as a write", () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile(`${DOCS}:Plan.txt`, "a");
		const entries: ClassicyFileSystemJournalEntry[] = [];
		registerClassicyFileSystemAdapter({
			id: "shortcut-journal",
			onChange: (entry) => {
				entries.push(entry);
			},
		});
		let path: string;
		try {
			path = createClassicyFileShortcut(fs, `${DOCS}:Plan.txt`, DOCS) as string;
		} finally {
			unregisterClassicyFileSystemAdapter("shortcut-journal");
		}
		expect(entries.at(-1)).toMatchObject({
			op: "write",
			path,
			metadata: {
				_type: "file_shortcut",
				_targetPath: `${DOCS}:Plan.txt`,
			},
		});
		fs.persist();
		resetClassicyFileSystemSharedTrees();
		const reloaded = new ClassicyFileSystem();
		expect(reloaded.resolve(path)).toMatchObject({
			_type: "file_shortcut",
			_targetPath: `${DOCS}:Plan.txt`,
		});
	});
});

describe("resolveClassicyFileShortcut", () => {
	it("finds the target, and says what is missing when it is gone", () => {
		const fs = new ClassicyFileSystem();
		fs.mkDir(`${DOCS}:Projects`);
		expect(
			resolveClassicyFileShortcut(fs, { _targetPath: `${DOCS}:Projects` }),
		).toMatchObject({ found: true, path: `${DOCS}:Projects` });
		expect(
			resolveClassicyFileShortcut(fs, { _targetPath: `${DOCS}:Gone` }),
		).toEqual({ found: false, path: `${DOCS}:Gone` });
		expect(resolveClassicyFileShortcut(fs, {})).toEqual({
			found: false,
			path: "",
		});
	});

	it("follows a shortcut to a shortcut, and stops at a circle", () => {
		const fs = new ClassicyFileSystem();
		fs.writeFile(`${DOCS}:Plan.txt`, "a");
		fs.writeFile(`${DOCS}:A`, "", {
			_type: ClassicyFileSystemEntryFileType.FileShortcut,
			_targetPath: `${DOCS}:Plan.txt`,
		});
		const chained = resolveClassicyFileShortcut(fs, {
			_targetPath: `${DOCS}:A`,
		});
		expect(chained).toMatchObject({ found: true, path: `${DOCS}:Plan.txt` });
		fs.writeFile(`${DOCS}:B`, "", {
			_type: ClassicyFileSystemEntryFileType.FileShortcut,
			_targetPath: `${DOCS}:C`,
		});
		fs.writeFile(`${DOCS}:C`, "", {
			_type: ClassicyFileSystemEntryFileType.FileShortcut,
			_targetPath: `${DOCS}:B`,
		});
		expect(
			resolveClassicyFileShortcut(fs, { _targetPath: `${DOCS}:B` }).found,
		).toBe(false);
	});
});

describe("getClassicySharedFileSystem", () => {
	it("reads the live tree and never seeds one", () => {
		expect(getClassicySharedFileSystem()).toBeUndefined();
		const fs = new ClassicyFileSystem();
		act(() => {
			fs.writeFile(`${DOCS}:Live.txt`, "now");
		});
		const shared = getClassicySharedFileSystem();
		expect(shared?.resolve(`${DOCS}:Live.txt`)?._data).toBe("now");
		expect(getClassicySharedFileSystem("someOtherKey")).toBeUndefined();
	});
});
