import { describe, expect, it } from "vitest";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	CLASSICY_PROPERTIES_OPEN_ACTION,
	classicyCountFolderContents,
	classicyDesktopIconPropertiesTarget,
	classicyFormatByteSize,
	classicyFormatPropertiesDate,
	classicyParentPath,
	classicyPropertiesAllIn,
	classicyPropertiesAllOfType,
	classicyPropertiesAttributesEditable,
	classicyPropertiesCaption,
	classicyPropertiesCount,
	classicyPropertiesKey,
	classicyPropertiesMultipleName,
	classicyPropertiesOpenAction,
	classicyPropertiesSize,
	classicyPropertiesWindowId,
	isClassicyPropertiesWindowId,
} from "@/SystemFolder/SystemResources/File/ClassicyFileProperties";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// The remaining chapters' audit's 2.2 / 5.27 / B.10 (WIG Ch.2 pp.12-13; Ch.5
// "Properties", p.51; App. B Table B.2, p.358): what a property sheet stands
// for, its window and Windows 98 SE's General page text (shell32.dll).

describe("a property sheet's key and window", () => {
	it("keys one path by itself, several by their sorted paths, an app by its id", () => {
		expect(classicyPropertiesKey({ paths: ["Macintosh HD:Read Me.txt"] })).toBe(
			"Macintosh HD:Read Me.txt",
		);
		expect(classicyPropertiesKey({ paths: ["HD:b", "HD:a", "HD:b"] })).toBe(
			"HD:a::HD:b",
		);
		expect(classicyPropertiesKey({ appId: "TV.app" })).toBe(":TV.app");
		// A drive named "app" never takes an app's key.
		expect(classicyPropertiesKey({ paths: ["app:TV.app"] })).not.toBe(
			classicyPropertiesKey({ appId: "TV.app" }),
		);
	});

	it("names the window properties:<key>", () => {
		expect(classicyPropertiesWindowId("HD:a")).toBe("properties:HD:a");
		expect(isClassicyPropertiesWindowId("properties:HD:a")).toBe(true);
		expect(isClassicyPropertiesWindowId("Macintosh HD")).toBe(false);
	});

	it("opens a sheet by paths or by app", () => {
		expect(classicyPropertiesOpenAction({ paths: ["HD:a"] })).toEqual({
			type: CLASSICY_PROPERTIES_OPEN_ACTION,
			paths: ["HD:a"],
		});
		expect(classicyPropertiesOpenAction({ appId: "TV.app" })).toEqual({
			type: "ClassicyAppFinderPropertiesOpen",
			appId: "TV.app",
		});
	});
});

describe("classicyDesktopIconPropertiesTarget", () => {
	const icon = (
		appId: string,
		kind: string,
		filePath?: string,
	): ClassicyStoreSystemDesktopManagerIcon =>
		({
			appId,
			appName: appId,
			icon: "",
			kind,
			...(filePath ? { filePath } : {}),
		}) as ClassicyStoreSystemDesktopManagerIcon;
	const icons = [
		icon("item:a", "file", "HD:Desktop Folder:a"),
		icon("item:b", "file", "HD:Desktop Folder:b"),
		icon("Finder.app", "drive", "HD"),
		icon("TV.app", "app_shortcut"),
		icon("Web", "shortcut"),
	];

	it("takes one icon's item or app", () => {
		expect(classicyDesktopIconPropertiesTarget(icons, [], "item:a")).toEqual({
			paths: ["HD:Desktop Folder:a"],
		});
		expect(
			classicyDesktopIconPropertiesTarget(icons, [], "Finder.app"),
		).toEqual({ paths: ["HD"] });
		expect(classicyDesktopIconPropertiesTarget(icons, [], "TV.app")).toEqual({
			appId: "TV.app",
		});
		expect(
			classicyDesktopIconPropertiesTarget(icons, [], "Web"),
		).toBeUndefined();
		expect(
			classicyDesktopIconPropertiesTarget(icons, [], "gone"),
		).toBeUndefined();
	});

	it("takes the selection's items when the icon is in it", () => {
		expect(
			classicyDesktopIconPropertiesTarget(
				icons,
				["item:a", "item:b", "TV.app"],
				"item:b",
			),
		).toEqual({ paths: ["HD:Desktop Folder:a", "HD:Desktop Folder:b"] });
		// Not in it: the icon alone.
		expect(
			classicyDesktopIconPropertiesTarget(icons, ["item:a"], "item:b"),
		).toEqual({ paths: ["HD:Desktop Folder:b"] });
		// Apps alone: the first.
		expect(
			classicyDesktopIconPropertiesTarget(icons, ["TV.app", "Web"], "Web"),
		).toEqual({ appId: "TV.app" });
	});
});

describe("the General page's text", () => {
	it("captions the sheet as Windows 98 does", () => {
		expect(classicyPropertiesCaption("Read Me")).toBe("Read Me Properties");
		expect(classicyPropertiesMultipleName("Read Me")).toBe("Read Me, ...");
		expect(classicyPropertiesCount(3, 1)).toBe("3 Files, 1 Folders");
		expect(classicyPropertiesAllOfType("Text Document")).toBe(
			"All of type Text Document",
		);
		expect(classicyPropertiesAllIn("HD:Documents")).toBe("All in HD:Documents");
	});

	it("writes a date as the long date and the time with seconds", () => {
		const date = new Date(2026, 10, 25, 13, 4, 5);
		expect(classicyFormatPropertiesDate(date)).toBe(
			"Wednesday, November 25, 2026 1:04:05 PM",
		);
		expect(classicyFormatPropertiesDate(date.toISOString())).toBe(
			"Wednesday, November 25, 2026 1:04:05 PM",
		);
		expect(classicyFormatPropertiesDate(new Date(2026, 0, 4, 0, 0, 9))).toBe(
			"Sunday, January 4, 2026 12:00:09 AM",
		);
		expect(classicyFormatPropertiesDate(undefined)).toBe("(unknown)");
		expect(classicyFormatPropertiesDate("not a date")).toBe("(unknown)");
	});

	it("writes a size as StrFormatByteSize does, three digits truncated, with the bytes", () => {
		expect(classicyFormatByteSize(0)).toBe("0 bytes");
		expect(classicyFormatByteSize(1023)).toBe("1,023 bytes");
		expect(classicyFormatByteSize(1263)).toBe("1.23KB");
		expect(classicyFormatByteSize(12_632)).toBe("12.3KB");
		expect(classicyFormatByteSize(126_320)).toBe("123KB");
		expect(classicyFormatByteSize(1_500_000)).toBe("1.43MB");
		expect(classicyPropertiesSize(512)).toBe("512 bytes");
		expect(classicyPropertiesSize(1263)).toBe("1.23KB (1,263 bytes)");
	});

	it("counts a folder's files and folders all the way down", () => {
		const folder = {
			_type: ClassicyFileSystemEntryFileType.Directory,
			a: { _type: ClassicyFileSystemEntryFileType.TextFile },
			Sub: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				b: { _type: ClassicyFileSystemEntryFileType.Image },
				c: { _type: ClassicyFileSystemEntryFileType.File, _invisible: true },
			},
		} as unknown as ClassicyFileSystemEntry;
		expect(classicyCountFolderContents(folder)).toEqual({
			files: 3,
			folders: 1,
		});
		expect(classicyCountFolderContents(undefined)).toEqual({
			files: 0,
			folders: 0,
		});
	});

	it("finds an item's folder and whether its attributes may change", () => {
		expect(classicyParentPath({ separator: ":" }, "HD:Docs:a.txt")).toBe(
			"HD:Docs",
		);
		expect(classicyParentPath({ separator: ":" }, "HD")).toBe("");
		const entry = (meta: Record<string, unknown>) =>
			meta as unknown as ClassicyFileSystemEntry;
		expect(classicyPropertiesAttributesEditable(entry({ _type: "file" }))).toBe(
			true,
		);
		expect(
			classicyPropertiesAttributesEditable(entry({ _type: "drive" })),
		).toBe(false);
		expect(
			classicyPropertiesAttributesEditable(
				entry({ _type: "file", _system: true }),
			),
		).toBe(false);
		expect(
			classicyPropertiesAttributesEditable(
				entry({ _type: "app_shortcut", _derived: true }),
			),
		).toBe(false);
		expect(classicyPropertiesAttributesEditable(undefined)).toBe(false);
	});
});
