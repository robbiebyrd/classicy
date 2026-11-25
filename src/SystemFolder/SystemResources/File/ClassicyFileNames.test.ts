import { afterEach, describe, expect, it } from "vitest";
// The Windows-layout package below needs a sound pack registered: the core
// default theme names Platinum's.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import {
	CLASSICY_WINDOWS_FILE_NAME_REFUSAL,
	CLASSICY_WINDOWS_FORBIDDEN_FILE_NAME_CHARACTERS,
	classicyFileNameRefusal,
	classicyFirstFreeName,
	classicyFirstFreeNameAmong,
	classicyForbiddenFileNameCharacters,
	classicyWindowsFileNames,
	isClassicyValidFileName,
} from "@/SystemFolder/SystemResources/File/ClassicyFileNames";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

// The remaining chapters' audit's 10.9 and 10.10 (WIG Ch.10 "File Naming
// Conventions", p.210): Windows' names refuse nine characters (the quotation
// mark too, as Windows 98 shipped) and number a clash "New Folder (2)";
// Mac OS 8's refuse the separator alone.

const registerPackage = (id: string, names?: "mac" | "windows") =>
	registerClassicyAppearancePackage({
		id,
		name: id,
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: `${id}-default`,
			package: id,
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			...(names ? { files: { names } } : {}),
		},
	});

afterEach(() => {
	resetClassicyAppearancePackagesForTests();
});

describe("isClassicyValidFileName", () => {
	it("refuses only the separator under a package without Windows' names", () => {
		registerPackage("mac-names");
		expect(classicyWindowsFileNames(CLASSICY_DEFAULT_APPEARANCE_LAYOUT)).toBe(
			false,
		);
		expect(classicyForbiddenFileNameCharacters("mac-names")).toEqual([":"]);
		expect(isClassicyValidFileName("Plan: draft", "mac-names")).toBe(false);
		for (const name of [
			"a/b",
			"a\\b",
			"a*b",
			"a?b",
			'a"b',
			"a<b",
			"a>b",
			"a|b",
		])
			expect(isClassicyValidFileName(name, "mac-names"), name).toBe(true);
		expect(classicyFileNameRefusal("mac-names")).toBeUndefined();
	});

	it("refuses Windows 98's nine characters under files.names windows", () => {
		registerPackage("windows-names", "windows");
		expect(CLASSICY_WINDOWS_FORBIDDEN_FILE_NAME_CHARACTERS).toEqual([
			"\\",
			"/",
			":",
			"*",
			"?",
			'"',
			"<",
			">",
			"|",
		]);
		for (const c of CLASSICY_WINDOWS_FORBIDDEN_FILE_NAME_CHARACTERS)
			expect(isClassicyValidFileName(`a${c}b`, "windows-names"), c).toBe(false);
		expect(isClassicyValidFileName("Report (2).txt", "windows-names")).toBe(
			true,
		);
		expect(classicyFileNameRefusal("windows-names")).toBe(
			CLASSICY_WINDOWS_FILE_NAME_REFUSAL,
		);
		expect(CLASSICY_WINDOWS_FILE_NAME_REFUSAL).toBe(
			'A filename cannot contain any of the following characters:\n\\ / : * ? " < > |',
		);
	});

	it("reads the active package when no id is given", () => {
		// No package registered: the default layout, Mac OS 8's names.
		expect(isClassicyValidFileName("a?b")).toBe(true);
		expect(isClassicyValidFileName("a:b")).toBe(false);
	});
});

describe("classicyFirstFreeName", () => {
	it("numbers a clash in parentheses, without case, an extension after the number", () => {
		expect(classicyFirstFreeNameAmong([], "New Folder")).toBe("New Folder");
		expect(classicyFirstFreeNameAmong(["new folder"], "New Folder")).toBe(
			"New Folder (2)",
		);
		expect(
			classicyFirstFreeNameAmong(
				["New Folder", "New Folder (2)", "New Folder (4)"],
				"New Folder",
			),
		).toBe("New Folder (3)");
		expect(
			classicyFirstFreeNameAmong(
				["New Text Document.txt"],
				"New Text Document",
				{ extension: "txt" },
			),
		).toBe("New Text Document (2).txt");
		expect(
			classicyFirstFreeNameAmong([], "New Text Document", {
				extension: ".txt",
			}),
		).toBe("New Text Document.txt");
	});

	it("looks the names up in a folder of the file system, invisible ones included", () => {
		const fs = new ClassicyFileSystem("classicyFileNamesTest");
		const folder = "Macintosh HD:Names";
		fs.mkDir(folder);
		expect(classicyFirstFreeName(fs, folder, "New Folder")).toBe("New Folder");
		fs.mkDir(`${folder}:New Folder`);
		fs.mkDir(`${folder}:NEW FOLDER (2)`);
		fs.setMetadata(`${folder}:NEW FOLDER (2)`, { _invisible: true });
		expect(classicyFirstFreeName(fs, folder, "New Folder")).toBe(
			"New Folder (3)",
		);
		fs.writeFile(`${folder}:New Text Document.txt`, "");
		expect(
			classicyFirstFreeName(fs, folder, "New Text Document", {
				extension: "txt",
			}),
		).toBe("New Text Document (2).txt");
	});
});
