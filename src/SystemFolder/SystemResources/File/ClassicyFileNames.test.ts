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
	classicyDisplayFileName,
	classicyFileExtensionsHidden,
	classicyFileNameRefusal,
	classicyFileTypeIsRegistered,
	classicyFirstFreeName,
	classicyFirstFreeNameAmong,
	classicyForbiddenFileNameCharacters,
	classicyHiddenFileExtension,
	classicyRegisteredFileExtension,
	classicyWindowsFileNames,
	isClassicyValidFileName,
} from "@/SystemFolder/SystemResources/File/ClassicyFileNames";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

// The remaining chapters' audit's 10.9 and 10.10 (WIG Ch.10 "File Naming
// Conventions", p.210): Windows' names refuse nine characters (the quotation
// mark too, as Windows 98 shipped) and number a clash "New Folder (2)";
// Mac OS 8's refuse the separator alone.

const registerPackage = (
	id: string,
	names?: "mac" | "windows",
	extensions?: "shown" | "hideRegistered",
) =>
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
			...(names || extensions
				? {
						files: {
							...(names ? { names } : {}),
							...(extensions ? { extensions } : {}),
						},
					}
				: {}),
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

// The remaining chapters' audit's 10.8 (WIG Ch.10 "System Naming
// Conventions", p.210): under `files.extensions` "hideRegistered" a file of a
// type an application other than the Finder opens is shown without its
// final extension; Mac OS 8 shows every name whole.
describe("classicyDisplayFileName", () => {
	const handlers = {
		text_file: "SimpleText.app",
		video: "MoviePlayer.app",
		file: "Finder.app",
	};

	it("hides nothing under a package that shows names whole", () => {
		registerPackage("shown-names", undefined, "shown");
		registerPackage("absent-names");
		for (const id of ["shown-names", "absent-names"]) {
			expect(
				classicyDisplayFileName("Read Me.txt", { _type: "text_file" }, id, {
					fileTypeHandlers: handlers,
				}),
			).toBe("Read Me.txt");
			expect(
				classicyHiddenFileExtension("Read Me.txt", { _type: "text_file" }, id, {
					fileTypeHandlers: handlers,
				}),
			).toBe("");
		}
		expect(
			classicyFileExtensionsHidden(CLASSICY_DEFAULT_APPEARANCE_LAYOUT),
		).toBe(false);
	});

	it("hides a registered type's final extension under hideRegistered", () => {
		registerPackage("hidden-names", undefined, "hideRegistered");
		const display = (name: string, type: string) =>
			classicyDisplayFileName(name, { _type: type }, "hidden-names", {
				fileTypeHandlers: handlers,
			});
		expect(display("Read Me.txt", "text_file")).toBe("Read Me");
		expect(display("BuckBunny.mov", "video")).toBe("BuckBunny");
		expect(display("archive.tar.gz", "text_file")).toBe("archive.tar");
		// The Finder's own types, folders and drives keep their names.
		expect(display("data.bin", "file")).toBe("data.bin");
		expect(display("Photos.old", "directory")).toBe("Photos.old");
		expect(display("Disk.vol", "drive")).toBe("Disk.vol");
		// What reads as no extension stays.
		expect(display("Version 1.2", "text_file")).toBe("Version 1.2");
		expect(display(".profile", "text_file")).toBe(".profile");
		expect(display("notes.verylong", "text_file")).toBe("notes.verylong");
		expect(display("Plan", "text_file")).toBe("Plan");
		expect(
			classicyHiddenFileExtension(
				"Read Me.txt",
				{ _type: "text_file" },
				"hidden-names",
				{ fileTypeHandlers: handlers },
			),
		).toBe(".txt");
	});

	it("follows the user's choice and needs the handler map", () => {
		registerPackage("choice-names", undefined, "hideRegistered");
		expect(
			classicyDisplayFileName(
				"Read Me.txt",
				{ _type: "text_file" },
				"choice-names",
				{ fileTypeHandlers: handlers, hideFileExtensions: false },
			),
		).toBe("Read Me.txt");
		// No handler map: no type counts as registered.
		expect(
			classicyDisplayFileName(
				"Read Me.txt",
				{ _type: "text_file" },
				"choice-names",
			),
		).toBe("Read Me.txt");
		expect(
			classicyFileExtensionsHidden(
				{ files: { extensions: "hideRegistered" } },
				false,
			),
		).toBe(false);
		expect(
			classicyFileExtensionsHidden({ files: { extensions: "hideRegistered" } }),
		).toBe(true);
	});

	it("counts a type registered only when an app but the Finder opens it", () => {
		expect(classicyFileTypeIsRegistered("text_file", handlers)).toBe(true);
		expect(classicyFileTypeIsRegistered("file", handlers)).toBe(false);
		expect(classicyFileTypeIsRegistered("pdf", handlers)).toBe(false);
		expect(classicyFileTypeIsRegistered(undefined, handlers)).toBe(false);
		expect(classicyFileTypeIsRegistered("text_file", undefined)).toBe(false);
		expect(classicyFileTypeIsRegistered("constructor", handlers)).toBe(false);
		expect(
			classicyRegisteredFileExtension("clip.mp4", { _type: "video" }, handlers),
		).toBe(".mp4");
		expect(
			classicyRegisteredFileExtension("clip.mp4", undefined, handlers),
		).toBe("");
	});
});
