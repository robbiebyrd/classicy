import { describe, expect, it } from "vitest";
import {
	CLASSICY_FIND_CRITERIA,
	CLASSICY_FIND_MAX_CRITERIA,
	type ClassicyFindCriterion,
	type ClassicyFindCriterionKey,
	type ClassicyFindItem,
	classicyFindClockDay,
	classicyFindCriteriaProblem,
	classicyFindCriterion,
	classicyFindCriterionDefinition,
	classicyFindCriterionMatches,
	classicyFindDayDate,
	classicyFindDayString,
	classicyFindItemMatches,
	classicyFindKindOf,
	classicyFindNextCriterionKey,
} from "@/SystemFolder/FindFile/ClassicyFindCriteria";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType as T,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const file = (extra: Partial<ClassicyFileSystemEntry> = {}) =>
	({ _type: T.TextFile, ...extra }) as ClassicyFileSystemEntry;
const folder = (extra: Partial<ClassicyFileSystemEntry> = {}) =>
	({ _type: T.Directory, ...extra }) as ClassicyFileSystemEntry;

const item = (
	name: string,
	entry: ClassicyFileSystemEntry,
	extra: Partial<ClassicyFindItem> = {},
): ClassicyFindItem => ({ name, entry, ...extra });

const row = (
	key: ClassicyFindCriterionKey,
	operator: string,
	value: string,
): ClassicyFindCriterion => ({ key, operator, value });

const matches = (i: ClassicyFindItem, r: ClassicyFindCriterion) =>
	classicyFindCriterionMatches(i, r);

describe("Find File's criteria (Mac OS 8.1)", () => {
	it("lists 8.1's twelve criteria in its order, then the Option-click ones", () => {
		expect(CLASSICY_FIND_CRITERIA.map((c) => c.label)).toEqual([
			"name",
			"size",
			"kind",
			"label",
			"date created",
			"date modified",
			"version",
			"comments",
			"lock attribute",
			"folder attribute",
			"file type",
			"creator",
			"contents",
			"name/icon lock",
			"visibility",
		]);
		expect(
			CLASSICY_FIND_CRITERIA.filter((c) => c.optionOnly).map((c) => c.key),
		).toEqual(["contents", "nameIconLock", "visibility"]);
		expect(CLASSICY_FIND_MAX_CRITERIA).toBe(10);
	});

	it("starts each row with 8.1's first operator and value", () => {
		const today = "2026-11-24";
		expect(classicyFindCriterion("name", today)).toEqual(
			row("name", "contains", ""),
		);
		expect(classicyFindCriterion("size", today)).toEqual(
			row("size", "lessThan", "128"),
		);
		expect(classicyFindCriterion("kind", today)).toEqual(
			row("kind", "is", "alias"),
		);
		expect(classicyFindCriterion("label", today)).toEqual(
			row("label", "is", "None"),
		);
		expect(classicyFindCriterion("dateModified", today)).toEqual(
			row("dateModified", "is", "2026-11-24"),
		);
		expect(classicyFindCriterion("comments", today)).toEqual(
			row("comments", "contain", ""),
		);
		expect(classicyFindCriterion("lock", today)).toEqual(
			row("lock", "is", "locked"),
		);
		expect(classicyFindCriterion("folderAttribute", today)).toEqual(
			row("folderAttribute", "is", "empty"),
		);
		expect(classicyFindCriterion("visibility", today)).toEqual(
			row("visibility", "is", "invisible"),
		);
	});

	it("reads today's day from Classicy's clock, in its zone", () => {
		expect(classicyFindClockDay("2026-11-24T23:30:00.000Z", 0)).toBe(
			"2026-11-24",
		);
		expect(classicyFindClockDay("2026-11-24T23:30:00.000Z", 1)).toBe(
			"2026-11-25",
		);
		expect(classicyFindClockDay("2026-11-24T02:00:00.000Z", -5)).toBe(
			"2026-11-23",
		);
		expect(classicyFindDayString(new Date(2026, 0, 5))).toBe("2026-01-05");
		expect(classicyFindDayDate("2026-01-05")?.getDate()).toBe(5);
		expect(classicyFindDayDate("soon")).toBeUndefined();
	});

	it("adds the first criterion no row uses (More Choices)", () => {
		expect(classicyFindNextCriterionKey([])).toBe("name");
		expect(classicyFindNextCriterionKey([row("name", "contains", "")])).toBe(
			"size",
		);
		expect(
			classicyFindNextCriterionKey([
				row("name", "contains", ""),
				row("size", "lessThan", "128"),
			]),
		).toBe("kind");
		// 8.1: a row of size, then More Choices, gave name.
		expect(classicyFindNextCriterionKey([row("size", "lessThan", "1")])).toBe(
			"name",
		);
	});

	it("refuses an empty name and folders with a size or a lock, in 8.1's words", () => {
		expect(classicyFindCriteriaProblem([row("name", "contains", " ")])).toBe(
			"Please enter a name before searching.",
		);
		expect(
			classicyFindCriteriaProblem([
				row("kind", "is", "folder"),
				row("size", "lessThan", "128"),
			]),
		).toBe(
			"You have asked to search for items which are folders, but also specified a file size. Please adjust your popup menu choices.",
		);
		expect(
			classicyFindCriteriaProblem([
				row("lock", "is", "unlocked"),
				row("kind", "is", "folder"),
			]),
		).toBe(
			"You have asked to search for items which are folders, but also specified a lock status. Only files can be locked. Please adjust your popup menu choices.",
		);
		expect(
			classicyFindCriteriaProblem([
				row("kind", "isNot", "folder"),
				row("size", "lessThan", "128"),
			]),
		).toBeUndefined();
		expect(classicyFindCriteriaProblem([row("name", "contains", "a")])).toBe(
			undefined,
		);
	});
});

describe("name", () => {
	const readMe = item("Read Me.txt", file());
	it.each([
		["contains", "read", true],
		["contains", "zzz", false],
		["startsWith", "READ", true],
		["startsWith", "me", false],
		["endsWith", ".txt", true],
		["endsWith", "read", false],
		["is", "read me.TXT", true],
		["is", "Read", false],
		["isNot", "Read", true],
		["isNot", "Read Me.txt", false],
		["doesNotContain", "zzz", true],
		["doesNotContain", "me", false],
	])("%s %j → %s (case is ignored)", (operator, value, expected) => {
		expect(matches(readMe, row("name", operator, value))).toBe(expected);
	});
});

describe("contents (Option, files only, from the data Classicy holds)", () => {
	const note = item("a", file(), { text: "Welcome to Infinite Macintosh!" });
	it.each([
		// 8.1: "infinite macintosh" found the Stickies file (case ignored).
		["contain", "infinite macintosh", true],
		["contain", "INFINITE", true],
		["contain", "zzq", false],
		["doNotContain", "zzq", true],
		["doNotContain", "welcome", false],
		// 8.1: an empty contents row searched, and found the Stickies file.
		["contain", "", true],
	])("%s %j → %s", (operator, value, expected) => {
		expect(matches(note, row("contents", operator, value))).toBe(expected);
	});

	it("never matches a folder, or a file whose contents were not read", () => {
		// 8.1: "contents do not contain zzq" on the desktop found none of its
		// folders, which a name search found.
		expect(
			matches(
				item("f", folder(), { text: "" }),
				row("contents", "doNotContain", "zzq"),
			),
		).toBe(false);
		expect(
			matches(item("u", file()), row("contents", "doNotContain", "zzq")),
		).toBe(false);
	});

	it("starts as an empty contain row, offered with Option", () => {
		expect(classicyFindCriterion("contents", "2026-11-24")).toEqual(
			row("contents", "contain", ""),
		);
		expect(classicyFindCriterionDefinition("contents").optionOnly).toBe(true);
	});
});

describe("size (files only, in K)", () => {
	const twoK = item("a", file(), { size: 2048 });
	it.each([
		["lessThan", "3", true],
		["lessThan", "2", false],
		["greaterThan", "1", true],
		["greaterThan", "2", false],
	])("2 K %s %s K → %s", (operator, value, expected) => {
		expect(matches(twoK, row("size", operator, value))).toBe(expected);
	});

	it("never matches a folder, an unknown size or a value that is no number", () => {
		expect(
			matches(item("f", folder(), { size: 0 }), row("size", "lessThan", "128")),
		).toBe(false);
		expect(matches(item("a", file()), row("size", "lessThan", "128"))).toBe(
			false,
		);
		expect(
			matches(item("a", file(), { size: -1 }), row("size", "lessThan", "128")),
		).toBe(false);
		expect(matches(twoK, row("size", "lessThan", "lots"))).toBe(false);
	});
});

describe("kind", () => {
	it.each([
		[folder(), "folder"],
		[{ _type: T.Drive }, "folder"],
		[{ _type: T.Shortcut }, "alias"],
		[{ _type: T.AppShortcut }, "application"],
		[{ _type: T.Extension }, "extension"],
		[{ _type: T.Audio }, "sound"],
		[{ _type: T.File, _format: "Audio" }, "sound"],
		[{ _type: T.File, _format: "Video" }, "document"],
		[{ _type: T.TextFile }, "document"],
		[{ _type: T.Pdf }, "document"],
		[{ _type: T.Stack }, "document"],
	])("%j is a %s", (entry, kind) => {
		const e = entry as ClassicyFileSystemEntry;
		expect(classicyFindKindOf(e)).toBe(kind);
		expect(matches(item("x", e), row("kind", "is", kind))).toBe(true);
		expect(matches(item("x", e), row("kind", "isNot", kind))).toBe(false);
	});

	it("matches nothing for the kinds Classicy has none of", () => {
		for (const kind of [
			"clipping",
			"controlPanel",
			"font",
			"letter",
			"stationery",
		]) {
			expect(matches(item("x", file()), row("kind", "is", kind))).toBe(false);
			expect(matches(item("x", file()), row("kind", "isNot", kind))).toBe(true);
		}
	});
});

describe("label", () => {
	it("is one of the seven Finder labels, else None", () => {
		const hot = item("x", file({ _label: "Hot" }));
		const none = item("x", file());
		const other = item("x", file({ _label: "My shortcut" }));
		expect(matches(hot, row("label", "is", "Hot"))).toBe(true);
		expect(matches(hot, row("label", "isNot", "Hot"))).toBe(false);
		expect(matches(hot, row("label", "is", "None"))).toBe(false);
		expect(matches(none, row("label", "is", "None"))).toBe(true);
		expect(matches(none, row("label", "isNot", "Cool"))).toBe(true);
		expect(matches(other, row("label", "is", "None"))).toBe(true);
	});
});

describe.each(["dateCreated", "dateModified"] as const)("%s", (key) => {
	const field = key === "dateCreated" ? "_createdOn" : "_modifiedOn";
	// An ISO string, as the tree holds it after a reload.
	const dated = item("x", file({ [field]: "2026-11-20T12:00:00.000Z" }));
	it.each([
		["is", "2026-11-20", true],
		["is", "2026-11-21", false],
		["isBefore", "2026-11-21", true],
		["isBefore", "2026-11-20", false],
		["isAfter", "2026-11-19", true],
		["isAfter", "2026-11-20", false],
		["isNot", "2026-11-20", false],
		["isNot", "2026-11-22", true],
		["within1Day", "2026-11-21", true],
		["within1Day", "2026-11-22", false],
		["within1Day", "2026-11-19", true],
		["within1Day", "2026-11-18", false],
		["within2Days", "2026-11-22", true],
		["within2Days", "2026-11-23", false],
		["within2Days", "2026-11-18", true],
		["within2Days", "2026-11-17", false],
		["within3Days", "2026-11-23", true],
		["within3Days", "2026-11-24", false],
		["within3Days", "2026-11-17", true],
		["within3Days", "2026-11-16", false],
		["within1Week", "2026-11-28", true],
		["within1Week", "2026-11-29", false],
		["within1Week", "2026-11-13", true],
		["within1Week", "2026-11-12", false],
		["within2Weeks", "2026-12-05", true],
		["within2Weeks", "2026-12-06", false],
		["within2Weeks", "2026-11-06", true],
		["within2Weeks", "2026-11-05", false],
		["within3Weeks", "2026-12-12", true],
		["within3Weeks", "2026-12-13", false],
		["within3Weeks", "2026-10-30", true],
		["within3Weeks", "2026-10-29", false],
		["within1Month", "2026-12-22", true],
		["within1Month", "2026-12-23", false],
		["within1Month", "2026-10-20", true],
		["within1Month", "2026-10-19", false],
		["within2Months", "2027-01-22", true],
		["within2Months", "2027-01-23", false],
		["within2Months", "2026-09-19", true],
		["within2Months", "2026-09-18", false],
		["within3Months", "2027-02-22", true],
		["within3Months", "2027-02-23", false],
		["within3Months", "2026-08-19", true],
		["within3Months", "2026-08-18", false],
		["within6Months", "2027-05-26", true],
		["within6Months", "2027-05-27", false],
		["within6Months", "2026-05-18", true],
		["within6Months", "2026-05-17", false],
	])("%s %s → %s", (operator, value, expected) => {
		expect(matches(dated, row(key, operator, value))).toBe(expected);
	});

	// Mac OS 8.1 on Infinite Mac (fix round 1): three folders modified on
	// 11/24/26 at 2:33 and 2:36 PM, searched "on the desktop" with each
	// operator and day; each pair is the last day found and the first not
	// (`packages/appearance/platinum/resources/screenshots/find-file/81-within-*`).
	const measured = item("x", file({ [field]: "2026-11-24T14:33:00.000Z" }));
	it.each([
		["within1Day", "2026-11-23", true],
		["within1Day", "2026-11-22", false],
		["within1Day", "2026-11-25", true],
		["within1Day", "2026-11-26", false],
		["within1Week", "2026-12-01", true],
		["within1Week", "2026-12-02", true],
		["within1Week", "2026-12-03", false],
		["within1Week", "2026-11-17", true],
		["within1Week", "2026-11-16", false],
		["within1Week", "2026-11-15", false],
		["within2Weeks", "2026-11-10", true],
		["within2Weeks", "2026-11-09", false],
		["within2Weeks", "2026-12-08", true],
		["within2Weeks", "2026-12-09", true],
		["within2Weeks", "2026-12-10", false],
		["within1Month", "2026-12-24", true],
		["within1Month", "2026-12-26", true],
		["within1Month", "2026-12-27", false],
		["within1Month", "2026-12-28", false],
		["within1Month", "2026-12-31", false],
		["within1Month", "2026-10-24", true],
		["within1Month", "2026-10-23", false],
		["within1Month", "2026-10-22", false],
		["within2Months", "2026-09-23", true],
		["within2Months", "2026-09-22", false],
		["within6Months", "2026-05-22", true],
		["within6Months", "2026-05-21", false],
	])("as Mac OS 8.1 measured: %s %s → %s", (operator, value, expected) => {
		expect(matches(measured, row(key, operator, value))).toBe(expected);
	});

	it("takes the day in Classicy's clock zone, from a Date too", () => {
		const late = item(
			"x",
			file({ [field]: new Date("2026-11-20T23:30:00.000Z") }),
			{ timeZoneOffsetMinutes: 60 },
		);
		expect(matches(late, row(key, "is", "2026-11-21"))).toBe(true);
		expect(matches(late, row(key, "is", "2026-11-20"))).toBe(false);
	});

	it("never matches an item without the date", () => {
		expect(matches(item("x", file()), row(key, "isNot", "2026-11-20"))).toBe(
			false,
		);
	});
});

describe("version, comments, file type and creator", () => {
	const entry = item(
		"x",
		file({
			_version: "1.0",
			_comments: "Quarterly figures",
			_creator: "QuickTime",
		}),
	);
	it("compares text, ignoring case", () => {
		expect(matches(entry, row("version", "is", "1.0"))).toBe(true);
		expect(matches(entry, row("version", "isNot", "1.0"))).toBe(false);
		expect(matches(entry, row("comments", "contain", "quarterly"))).toBe(true);
		expect(matches(entry, row("comments", "doNotContain", "figures"))).toBe(
			false,
		);
		expect(matches(entry, row("comments", "doNotContain", "budget"))).toBe(
			true,
		);
		// The file type is the entry's Classicy type.
		expect(matches(entry, row("fileType", "is", "TEXT_FILE"))).toBe(true);
		expect(matches(entry, row("fileType", "isNot", "text_file"))).toBe(false);
		expect(matches(entry, row("creator", "is", "quicktime"))).toBe(true);
		expect(matches(entry, row("creator", "isNot", "QuickTime"))).toBe(false);
		expect(matches(item("x", file()), row("comments", "contain", "a"))).toBe(
			false,
		);
	});
});

describe("lock attribute (files only)", () => {
	it("is locked for a read-only file", () => {
		const locked = item("x", file({ _readOnly: true }));
		const unlocked = item("x", file());
		expect(matches(locked, row("lock", "is", "locked"))).toBe(true);
		expect(matches(locked, row("lock", "is", "unlocked"))).toBe(false);
		expect(matches(unlocked, row("lock", "is", "unlocked"))).toBe(true);
		// 8.1: "Only files can be locked."
		expect(matches(item("f", folder()), row("lock", "is", "unlocked"))).toBe(
			false,
		);
	});
});

describe("folder attribute (folders only)", () => {
	const empty = item("e", folder(), { empty: true });
	const full = item("f", folder(), { empty: false });
	it.each([
		[empty, "is", "empty", true],
		[full, "is", "empty", false],
		[full, "isNot", "empty", true],
		[empty, "isNot", "empty", false],
		// Classicy has no file sharing.
		[empty, "is", "shared", false],
		[empty, "isNot", "shared", true],
		[full, "is", "mounted", false],
		[full, "isNot", "mounted", true],
	])("%#: %s %s → %s", (i, operator, value, expected) => {
		expect(matches(i, row("folderAttribute", operator, value))).toBe(expected);
	});

	it("never matches a file", () => {
		expect(
			matches(item("x", file()), row("folderAttribute", "isNot", "empty")),
		).toBe(false);
	});
});

describe("Option-click criteria", () => {
	it("name/icon lock reads the entry's name lock", () => {
		const locked = item("x", folder({ _nameLocked: true }));
		expect(matches(locked, row("nameIconLock", "is", "locked"))).toBe(true);
		expect(matches(locked, row("nameIconLock", "is", "unlocked"))).toBe(false);
		expect(
			matches(item("x", file()), row("nameIconLock", "is", "unlocked")),
		).toBe(true);
	});

	it("visibility reads the invisible flag; the Desktop Folder counts as visible", () => {
		const hidden = item("Desktop DB", file({ _invisible: true }));
		const desktop = item("Desktop Folder", folder({ _invisible: true }), {
			visible: true,
		});
		expect(matches(hidden, row("visibility", "is", "invisible"))).toBe(true);
		expect(matches(hidden, row("visibility", "is", "visible"))).toBe(false);
		expect(matches(desktop, row("visibility", "is", "visible"))).toBe(true);
	});
});

describe("every row", () => {
	it("must match, and an invisible item matches only a visibility row", () => {
		const hidden = item("Desktop DB", file({ _invisible: true }));
		expect(
			classicyFindItemMatches(hidden, [row("name", "contains", "desk")]),
		).toBe(false);
		expect(
			classicyFindItemMatches(hidden, [
				row("name", "contains", "desk"),
				row("visibility", "is", "invisible"),
			]),
		).toBe(true);
		const plan = item("Plan.txt", file({ _label: "Hot" }));
		expect(
			classicyFindItemMatches(plan, [
				row("name", "contains", "plan"),
				row("label", "is", "Hot"),
			]),
		).toBe(true);
		expect(
			classicyFindItemMatches(plan, [
				row("name", "contains", "plan"),
				row("label", "is", "Cool"),
			]),
		).toBe(false);
	});
});
