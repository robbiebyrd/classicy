/**
 * Find File's criteria: the rows of "Find items … whose" (Mac OS 8.1's Find
 * File, observed on Infinite Mac; story 0227-815; the captures are in
 * `packages/appearance/platinum/resources/screenshots/find-file/`), each a
 * criterion, an operator and a value, and how an item of the Classicy file
 * system matches one. Store-free and pure: the search (`ClassicyFindFileSearch.ts`) and the
 * window (`FindFile.tsx`) share it.
 *
 * Every value is a string, so a row is plain data: text, a number of K for
 * size, a `YYYY-MM-DD` day for the dates, or one of a pop-up's values.
 */
import { asFinderDate } from "@/SystemFolder/Finder/FinderViewOptions";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

/** The criteria of 8.1's pop-up, in its order, then the Option-click adds. */
export type ClassicyFindCriterionKey =
	| "name"
	| "size"
	| "kind"
	| "label"
	| "dateCreated"
	| "dateModified"
	| "version"
	| "comments"
	| "lock"
	| "folderAttribute"
	| "fileType"
	| "creator"
	| "contents"
	| "nameIconLock"
	| "visibility";

/** One row of the Find window. */
export interface ClassicyFindCriterion {
	key: ClassicyFindCriterionKey;
	operator: string;
	value: string;
}

/** A pop-up choice: a value and the words 8.1 shows for it. */
export interface ClassicyFindChoice {
	value: string;
	label: string;
}

/** How a criterion's value is entered. */
export type ClassicyFindValueInput = "text" | "size" | "date" | "choice";

/** A criterion as the Find window draws it. */
export interface ClassicyFindCriterionDefinition {
	key: ClassicyFindCriterionKey;
	/** The criterion pop-up's words. */
	label: string;
	/**
	 * Its operators, in 8.1's order; a single operator is drawn as text, not
	 * a pop-up ("lock attribute is locked"). `null` entries are the pop-up's
	 * dividers (the date operators' groups).
	 */
	operators: readonly (ClassicyFindChoice | null)[];
	input: ClassicyFindValueInput;
	/** For `choice`: its values, `null` for a divider (the label's None). */
	choices?: readonly (ClassicyFindChoice | null)[];
	/** Offered only when the criterion pop-up is opened with Option. */
	optionOnly?: boolean;
	/** Only files have it: folders never match (8.1 refuses kind is folder with it). */
	filesOnly?: boolean;
	/** Only folders have it: files never match. */
	foldersOnly?: boolean;
}

const op = (value: string, label: string): ClassicyFindChoice => ({
	value,
	label,
});

const IS_ISNOT = [op("is", "is"), op("isNot", "is not")] as const;

/** 8.1's date operators, with the dividers between their groups. */
const DATE_OPERATORS: readonly (ClassicyFindChoice | null)[] = [
	op("is", "is"),
	op("isBefore", "is before"),
	op("isAfter", "is after"),
	op("isNot", "is not"),
	null,
	op("within1Day", "is within 1 day of"),
	op("within2Days", "is within 2 days of"),
	op("within3Days", "is within 3 days of"),
	null,
	op("within1Week", "is within 1 week of"),
	op("within2Weeks", "is within 2 weeks of"),
	op("within3Weeks", "is within 3 weeks of"),
	null,
	op("within1Month", "is within 1 month of"),
	op("within2Months", "is within 2 months of"),
	op("within3Months", "is within 3 months of"),
	op("within6Months", "is within 6 months of"),
];

/** The kinds of 8.1's kind pop-up. */
export const CLASSICY_FIND_KINDS: readonly ClassicyFindChoice[] = [
	op("alias", "alias"),
	op("application", "application"),
	op("clipping", "clipping file"),
	op("controlPanel", "control panel"),
	op("document", "document"),
	op("extension", "extension"),
	op("folder", "folder"),
	op("font", "font"),
	op("letter", "letter"),
	op("sound", "sound"),
	op("stationery", "stationery"),
];

/** Mac OS 8's seven Finder labels, after None. */
export const CLASSICY_FIND_LABELS: readonly ClassicyFindChoice[] = [
	op("Essential", "Essential"),
	op("Hot", "Hot"),
	op("In Progress", "In Progress"),
	op("Cool", "Cool"),
	op("Personal", "Personal"),
	op("Project 1", "Project 1"),
	op("Project 2", "Project 2"),
];

/** The label value that stands for no label. */
export const CLASSICY_FIND_NO_LABEL = "None";

/** Every criterion, in the pop-up's order. */
export const CLASSICY_FIND_CRITERIA: readonly ClassicyFindCriterionDefinition[] =
	[
		{
			key: "name",
			label: "name",
			operators: [
				op("contains", "contains"),
				op("startsWith", "starts with"),
				op("endsWith", "ends with"),
				op("is", "is"),
				op("isNot", "is not"),
				op("doesNotContain", "doesn’t contain"),
			],
			input: "text",
		},
		{
			key: "size",
			label: "size",
			operators: [
				op("lessThan", "is less than"),
				op("greaterThan", "is greater than"),
			],
			input: "size",
			filesOnly: true,
		},
		{
			key: "kind",
			label: "kind",
			operators: IS_ISNOT,
			input: "choice",
			choices: CLASSICY_FIND_KINDS,
		},
		{
			key: "label",
			label: "label",
			operators: IS_ISNOT,
			input: "choice",
			choices: [
				op(CLASSICY_FIND_NO_LABEL, "None"),
				null,
				...CLASSICY_FIND_LABELS,
			],
		},
		{
			key: "dateCreated",
			label: "date created",
			operators: DATE_OPERATORS,
			input: "date",
		},
		{
			key: "dateModified",
			label: "date modified",
			operators: DATE_OPERATORS,
			input: "date",
		},
		{ key: "version", label: "version", operators: IS_ISNOT, input: "text" },
		{
			key: "comments",
			label: "comments",
			operators: [
				op("contain", "contain"),
				op("doNotContain", "do not contain"),
			],
			input: "text",
		},
		{
			key: "lock",
			label: "lock attribute",
			operators: [op("is", "is")],
			input: "choice",
			choices: [op("locked", "locked"), op("unlocked", "unlocked")],
			filesOnly: true,
		},
		{
			key: "folderAttribute",
			label: "folder attribute",
			operators: IS_ISNOT,
			input: "choice",
			choices: [
				op("empty", "empty"),
				op("shared", "shared"),
				op("mounted", "mounted"),
			],
			foldersOnly: true,
		},
		{ key: "fileType", label: "file type", operators: IS_ISNOT, input: "text" },
		{ key: "creator", label: "creator", operators: IS_ISNOT, input: "text" },
		{
			// 8.1's first Option-click criterion: "contents" "contain" / "do
			// not contain" (`packages/appearance/platinum/resources/screenshots/find-file/81-contents-operators.png`).
			// Classicy reads the contents it holds, a file's `_data`.
			key: "contents",
			label: "contents",
			operators: [
				op("contain", "contain"),
				op("doNotContain", "do not contain"),
			],
			input: "text",
			optionOnly: true,
			filesOnly: true,
		},
		{
			key: "nameIconLock",
			label: "name/icon lock",
			operators: [op("is", "is")],
			input: "choice",
			choices: [op("locked", "locked"), op("unlocked", "unlocked")],
			optionOnly: true,
		},
		{
			key: "visibility",
			label: "visibility",
			operators: [op("is", "is")],
			input: "choice",
			choices: [op("invisible", "invisible"), op("visible", "visible")],
			optionOnly: true,
		},
	];

/** The most rows the Find window holds (8.1 dims More Choices at ten). */
export const CLASSICY_FIND_MAX_CRITERIA = 10;

/** The size row's starting value, in K (8.1's). */
export const CLASSICY_FIND_DEFAULT_SIZE_K = "128";

export const classicyFindCriterionDefinition = (
	key: ClassicyFindCriterionKey,
): ClassicyFindCriterionDefinition =>
	CLASSICY_FIND_CRITERIA.find((c) => c.key === key) ??
	CLASSICY_FIND_CRITERIA[0];

const firstChoice = (
	choices: readonly (ClassicyFindChoice | null)[] | undefined,
): ClassicyFindChoice | undefined =>
	choices?.find((c): c is ClassicyFindChoice => c !== null);

const pad2 = (n: number) => String(n).padStart(2, "0");

/** A `YYYY-MM-DD` day string for `date`'s local calendar day (a date picker's). */
export const classicyFindDayString = (date: Date): string =>
	`${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** The local date at midnight of a `YYYY-MM-DD` day string, for a date picker. */
export const classicyFindDayDate = (day: string): Date | undefined => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
	return match
		? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
		: undefined;
};

/**
 * The day it is on Classicy's clock (`System.Manager.DateAndTime`): its UTC
 * time `dateTime` and its zone's offset in hours.
 */
export const classicyFindClockDay = (
	dateTime: string,
	timeZoneOffsetHours: number,
): string => {
	const shifted = new Date(
		new Date(dateTime).getTime() + timeZoneOffsetHours * 3_600_000,
	);
	if (Number.isNaN(shifted.getTime())) return "1970-01-01";
	return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
};

/**
 * A new row for `key`, with 8.1's first operator and starting value: an
 * empty field, 128 K, the first choice, or `today` (a `YYYY-MM-DD` day) for
 * the dates.
 */
export const classicyFindCriterion = (
	key: ClassicyFindCriterionKey,
	today: string,
): ClassicyFindCriterion => {
	const definition = classicyFindCriterionDefinition(key);
	const operator = firstChoice(definition.operators)?.value ?? "is";
	const value =
		definition.input === "size"
			? CLASSICY_FIND_DEFAULT_SIZE_K
			: definition.input === "date"
				? today
				: definition.input === "choice"
					? (firstChoice(definition.choices)?.value ?? "")
					: "";
	return { key, operator, value };
};

/**
 * The row More Choices adds: the first criterion of the plain pop-up that no
 * row uses yet (8.1: rows of name then size gave kind; a row of size gave
 * name), else name.
 */
export const classicyFindNextCriterionKey = (
	rows: readonly ClassicyFindCriterion[],
): ClassicyFindCriterionKey => {
	const used = new Set(rows.map((r) => r.key));
	return (
		CLASSICY_FIND_CRITERIA.find((c) => !c.optionOnly && !used.has(c.key))
			?.key ?? "name"
	);
};

/** Why 8.1 refuses to search with these rows: its alert's words, or none. */
export const classicyFindCriteriaProblem = (
	rows: readonly ClassicyFindCriterion[],
): string | undefined => {
	if (rows.some((r) => r.key === "name" && r.value.trim() === "")) {
		return "Please enter a name before searching.";
	}
	const foldersOnly = rows.some(
		(r) => r.key === "kind" && r.operator === "is" && r.value === "folder",
	);
	if (foldersOnly && rows.some((r) => r.key === "size")) {
		return "You have asked to search for items which are folders, but also specified a file size. Please adjust your popup menu choices.";
	}
	if (foldersOnly && rows.some((r) => r.key === "lock")) {
		return "You have asked to search for items which are folders, but also specified a lock status. Only files can be locked. Please adjust your popup menu choices.";
	}
	return undefined;
};

/** What the matcher needs beyond the entry itself. */
export interface ClassicyFindItem {
	/** The item's name (its key in its folder). */
	name: string;
	entry: ClassicyFileSystemEntry;
	/** Treated as visible whatever its flag: the Desktop Folder (8.1's is). */
	visible?: boolean;
	/** Its size in bytes, for a size row; read only when one is asked. */
	size?: number;
	/**
	 * A file's contents as text, for a contents row; read only when one is
	 * asked, and only from the `_data` Classicy holds (none for a `_url`
	 * file, which matches no contents row).
	 */
	text?: string;
	/** Whether a folder holds no visible item. */
	empty?: boolean;
	/** Minutes east of UTC for the day a date falls on (Classicy's clock). */
	timeZoneOffsetMinutes?: number;
}

export const isClassicyFindFolder = (entry: ClassicyFileSystemEntry): boolean =>
	entry._type === ClassicyFileSystemEntryFileType.Directory ||
	entry._type === ClassicyFileSystemEntryFileType.Drive;

/**
 * The kind of 8.1's pop-up an entry is: a folder; an alias for a shortcut;
 * an application for an app shortcut (the Finder shows them as
 * Application); an extension; a sound for audio, and for a QuickTime file
 * whose format is Audio; any other file a document. Classicy has no
 * clipping files, control panel files, fonts, letters or stationery, so
 * those kinds match nothing.
 */
export const classicyFindKindOf = (entry: ClassicyFileSystemEntry): string => {
	if (isClassicyFindFolder(entry)) return "folder";
	switch (entry._type) {
		case ClassicyFileSystemEntryFileType.Shortcut:
			return "alias";
		case ClassicyFileSystemEntryFileType.AppShortcut:
			return "application";
		case ClassicyFileSystemEntryFileType.Extension:
			return "extension";
		case ClassicyFileSystemEntryFileType.Audio:
			return "sound";
		default:
			return entry._format === "Audio" ? "sound" : "document";
	}
};

/** An entry's Finder label: one of the seven, else None. */
export const classicyFindLabelOf = (entry: ClassicyFileSystemEntry): string =>
	typeof entry._label === "string" &&
	CLASSICY_FIND_LABELS.some((l) => l.value === entry._label)
		? entry._label
		: CLASSICY_FIND_NO_LABEL;

const fold = (text: unknown): string =>
	typeof text === "string" ? text.toLocaleLowerCase() : "";

const textMatches = (subject: string, operator: string, wanted: string) => {
	const s = fold(subject);
	const w = fold(wanted);
	switch (operator) {
		case "contains":
		case "contain":
			return s.includes(w);
		case "startsWith":
			return s.startsWith(w);
		case "endsWith":
			return s.endsWith(w);
		case "is":
			return s === w;
		case "isNot":
			return s !== w;
		case "doesNotContain":
		case "doNotContain":
			return !s.includes(w);
		default:
			return false;
	}
};

const DAY_MS = 86_400_000;

/** The day number (days since 1970-01-01) of a `YYYY-MM-DD` value. */
const dayOfValue = (value: string): number | undefined => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return undefined;
	return (
		Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS
	);
};

/** The day number of a stored date, in the clock's zone. */
const dayOfDate = (date: Date, offsetMinutes: number): number =>
	Math.floor((date.getTime() + offsetMinutes * 60_000) / DAY_MS);

/**
 * "Is within N … of" a day, as Mac OS 8.1's Find File measured it on
 * Infinite Mac (fix round 1; `packages/appearance/platinum/resources/screenshots/find-file/81-within-*`):
 * the item's day minus the chosen day must lie in `[-before, after]`, in
 * calendar days. Days are N either side; a week counts 7 days and a month
 * 31 (not calendar months: 2 months of 9/23 reached 11/24, 62 days on),
 * and both take one day more before the chosen day than after it (1 week
 * of 12/2 found an item of 11/24, 8 days before; 1 week of 11/16 did not
 * find it, 8 days after).
 */
const WITHIN: Readonly<Record<string, { before: number; after: number }>> = {
	within1Day: { before: 1, after: 1 },
	within2Days: { before: 2, after: 2 },
	within3Days: { before: 3, after: 3 },
	within1Week: { before: 8, after: 7 },
	within2Weeks: { before: 15, after: 14 },
	within3Weeks: { before: 22, after: 21 },
	within1Month: { before: 32, after: 31 },
	within2Months: { before: 63, after: 62 },
	within3Months: { before: 94, after: 93 },
	within6Months: { before: 187, after: 186 },
};

/**
 * Whether a date matches: compared by day, in Classicy's clock zone ("is
 * within N of" as `WITHIN` has it). An item with no such date matches no
 * date row.
 */
const dateMatches = (
	stored: unknown,
	operator: string,
	value: string,
	offsetMinutes: number,
): boolean => {
	const date = asFinderDate(stored);
	const wanted = dayOfValue(value);
	if (!date || wanted === undefined) return false;
	const day = dayOfDate(date, offsetMinutes);
	switch (operator) {
		case "is":
			return day === wanted;
		case "isNot":
			return day !== wanted;
		case "isBefore":
			return day < wanted;
		case "isAfter":
			return day > wanted;
		default: {
			const span = WITHIN[operator];
			if (!span) return false;
			const offset = day - wanted;
			return offset >= -span.before && offset <= span.after;
		}
	}
};

/** The size row's value in bytes (K = 1024 bytes), or undefined when not a number. */
const sizeLimit = (value: string): number | undefined => {
	const k = Number(value.trim());
	return value.trim() !== "" && Number.isFinite(k) && k >= 0
		? k * 1024
		: undefined;
};

/** Whether the item is invisible, as Find File sees it. */
export const isClassicyFindInvisible = (item: ClassicyFindItem): boolean =>
	!item.visible && item.entry._invisible === true;

/** Whether `item` matches one row. */
export const classicyFindCriterionMatches = (
	item: ClassicyFindItem,
	criterion: ClassicyFindCriterion,
): boolean => {
	const { entry } = item;
	const folder = isClassicyFindFolder(entry);
	const { operator, value } = criterion;
	switch (criterion.key) {
		case "name":
			return textMatches(item.name, operator, value);
		case "size": {
			const limit = sizeLimit(value);
			if (folder || limit === undefined || item.size === undefined) {
				return false;
			}
			if (item.size < 0) return false;
			return operator === "lessThan"
				? item.size < limit
				: operator === "greaterThan" && item.size > limit;
		}
		case "kind": {
			const kind = classicyFindKindOf(entry);
			return operator === "isNot" ? kind !== value : kind === value;
		}
		case "label": {
			const label = classicyFindLabelOf(entry);
			return operator === "isNot" ? label !== value : label === value;
		}
		case "dateCreated":
			return dateMatches(
				entry._createdOn,
				operator,
				value,
				item.timeZoneOffsetMinutes ?? 0,
			);
		case "dateModified":
			return dateMatches(
				entry._modifiedOn,
				operator,
				value,
				item.timeZoneOffsetMinutes ?? 0,
			);
		case "version":
			return textMatches(
				typeof entry._version === "string" ? entry._version : "",
				operator,
				value,
			);
		case "comments":
			return textMatches(
				typeof entry._comments === "string" ? entry._comments : "",
				operator,
				value,
			);
		case "lock": {
			if (folder) return false;
			const locked = entry._readOnly === true;
			return value === "locked" ? locked : !locked;
		}
		case "folderAttribute": {
			if (!folder) return false;
			// Classicy has no file sharing: no folder is shared or mounted.
			const has = value === "empty" ? item.empty === true : false;
			return operator === "isNot" ? !has : has;
		}
		case "fileType":
			return textMatches(
				typeof entry._type === "string" ? entry._type : "",
				operator,
				value,
			);
		case "creator":
			return textMatches(
				typeof entry._creator === "string" ? entry._creator : "",
				operator,
				value,
			);
		case "contents":
			if (folder || item.text === undefined) return false;
			return textMatches(item.text, operator, value);
		case "nameIconLock": {
			const locked = entry._nameLocked === true;
			return value === "locked" ? locked : !locked;
		}
		case "visibility": {
			const invisible = isClassicyFindInvisible(item);
			return value === "invisible" ? invisible : !invisible;
		}
		default:
			return false;
	}
};

/**
 * Whether `item` matches every row. Without a visibility row an invisible
 * item never does (8.1's name search left out the invisible Desktop DB and
 * Desktop DF; only Option's visibility criterion finds them).
 */
export const classicyFindItemMatches = (
	item: ClassicyFindItem,
	rows: readonly ClassicyFindCriterion[],
): boolean => {
	if (
		!rows.some((r) => r.key === "visibility") &&
		isClassicyFindInvisible(item)
	) {
		return false;
	}
	return rows.every((row) => classicyFindCriterionMatches(item, row));
};

/** Whether any row needs the item's size (read lazily: it is async). */
export const classicyFindRowsNeedSize = (
	rows: readonly ClassicyFindCriterion[],
): boolean => rows.some((r) => r.key === "size");

/** Whether any row needs a file's contents (read lazily: it is async). */
export const classicyFindRowsNeedText = (
	rows: readonly ClassicyFindCriterion[],
): boolean => rows.some((r) => r.key === "contents");

/**
 * Whether a row's answer waits on a read (a size, contents): the search
 * checks every other row first and reads only for an item that passed them.
 */
export const classicyFindRowNeedsRead = (row: ClassicyFindCriterion): boolean =>
	row.key === "size" || row.key === "contents";
