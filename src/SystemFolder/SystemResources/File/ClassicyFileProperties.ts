import type { ActionMessage } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// Explorer's Properties (WIG Ch.2 "Putting Theory into Practice",
// pp.12-13; Ch.5 "Properties", p.51; App. B Table B.2, p.358), under
// `layout.finder.commands` "windows": what a property sheet stands for, the
// action that opens one, and the text Windows 98 SE's General page writes
// (shell32.dll's strings and dialogs). Store-free and pure, so Finder's
// reducer, its menus, the desktop's icons and the sheet share them.

/** What a property sheet describes: items of the tree, or an application. */
export type ClassicyPropertiesTarget =
	| { paths: readonly string[] }
	| { appId: string };

/** The action that opens (or focuses) a property sheet. */
export const CLASSICY_PROPERTIES_OPEN_ACTION =
	"ClassicyAppFinderPropertiesOpen";

/** The action that closes one (`{ key }`). */
export const CLASSICY_PROPERTIES_CLOSE_ACTION =
	"ClassicyAppFinderPropertiesClose";

/** A property sheet's window id is this prefix and its key. */
export const CLASSICY_PROPERTIES_WINDOW_PREFIX = "properties:";

/**
 * A sheet's key: the one path it describes (`"Macintosh HD:Read Me.txt"`),
 * the sorted paths of a multiple selection joined by `::` (an empty name,
 * which no path holds), or `:` and an application's id (a leading
 * separator, which no path has). One key per target, so choosing Properties
 * again for the same items finds the open sheet.
 */
export const classicyPropertiesKey = (
	target: ClassicyPropertiesTarget,
): string =>
	"appId" in target
		? `:${target.appId}`
		: [...new Set(target.paths)].sort().join("::");

/** The window id of the sheet with `key` (`properties:<key>`). */
export const classicyPropertiesWindowId = (key: string): string =>
	`${CLASSICY_PROPERTIES_WINDOW_PREFIX}${key}`;

/** Whether `windowId` is a property sheet's. */
export const isClassicyPropertiesWindowId = (windowId: string): boolean =>
	windowId.startsWith(CLASSICY_PROPERTIES_WINDOW_PREFIX);

/** The action that opens `target`'s sheet, or focuses it when open. */
export const classicyPropertiesOpenAction = (
	target: ClassicyPropertiesTarget,
): ActionMessage =>
	"appId" in target
		? { type: CLASSICY_PROPERTIES_OPEN_ACTION, appId: target.appId }
		: { type: CLASSICY_PROPERTIES_OPEN_ACTION, paths: [...target.paths] };

/**
 * What Properties on the desktop icon `iconId` describes, with the desktop's
 * selection `selectedIds` (it acts on the selection when the icon is in it):
 * one icon's item (a Desktop Folder item, a drive, the Trash: its path) or
 * application (an app shortcut: its id); several icons, the items among
 * them, else the first application. Undefined for an icon that stands for
 * neither (a host's URL shortcut).
 */
export const classicyDesktopIconPropertiesTarget = (
	icons: readonly ClassicyStoreSystemDesktopManagerIcon[],
	selectedIds: readonly string[],
	iconId: string,
): ClassicyPropertiesTarget | undefined => {
	const icon = icons.find((i) => i.appId === iconId);
	if (!icon) return undefined;
	const targets = selectedIds.includes(iconId)
		? icons.filter((i) => selectedIds.includes(i.appId))
		: [icon];
	const paths = targets.flatMap((i) =>
		i.filePath !== undefined ? [i.filePath] : [],
	);
	if (paths.length > 0) return { paths };
	const app = targets.find((i) => i.kind === "app_shortcut");
	return app ? { appId: app.appId } : undefined;
};

/** The Properties command's title (shell32.dll's "P&roperties"). */
export const CLASSICY_PROPERTIES_TITLE = "Properties";

/** A sheet's caption: "<name> Properties" (Windows 98's). */
export const classicyPropertiesCaption = (name: string): string =>
	`${name} ${CLASSICY_PROPERTIES_TITLE}`;

/** A multiple selection's caption name: shell32.dll's "%s, ...". */
export const classicyPropertiesMultipleName = (first: string): string =>
	`${first}, ...`;

/** shell32.dll's placeholder for a value it does not know. */
export const CLASSICY_PROPERTIES_UNKNOWN = "(unknown)";

/** shell32.dll's "Multiple Types": a selection of more than one type. */
export const CLASSICY_PROPERTIES_MULTIPLE_TYPES = "Multiple Types";

/** shell32.dll's "Various Folders": a selection from more than one folder. */
export const CLASSICY_PROPERTIES_VARIOUS_FOLDERS = "Various Folders";

/** shell32.dll's "All of type ": a selection of one type. */
export const classicyPropertiesAllOfType = (typeName: string): string =>
	`All of type ${typeName}`;

/** shell32.dll's "All in ": a selection from one folder. */
export const classicyPropertiesAllIn = (folder: string): string =>
	`All in ${folder}`;

/** shell32.dll's "%1 Files, %2 Folders". */
export const classicyPropertiesCount = (files: number, folders: number) =>
	`${files} Files, ${folders} Folders`;

const DAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

/**
 * A date as Windows 98's General page writes it, the long date and the
 * time with seconds: "Wednesday, November 25, 2026 1:23:45 PM";
 * `CLASSICY_PROPERTIES_UNKNOWN` for none. A stored date (a `Date`, or the
 * ISO string the tree round-trips it as) is read in the page's time zone,
 * as the list view's columns read it. Hand-rolled, so it reads the same in
 * every locale.
 */
export const classicyFormatPropertiesDate = (value: unknown): string => {
	const date =
		value instanceof Date
			? value
			: typeof value === "string" || typeof value === "number"
				? new Date(value)
				: undefined;
	if (!date || Number.isNaN(date.getTime())) return CLASSICY_PROPERTIES_UNKNOWN;
	const hours = date.getHours();
	const twelve = hours % 12 === 0 ? 12 : hours % 12;
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${twelve}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${hours < 12 ? "AM" : "PM"}`;
};

/** A count of bytes with thousands separators ("1,263"). */
const groupDigits = (n: number): string =>
	String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const BYTE_UNITS = ["KB", "MB", "GB", "TB"];

/**
 * A size as Windows 98 writes one (shlwapi's StrFormatByteSize, shell32.dll's
 * "%s bytes", "%sKB", "%sMB"…): under 1,024 the bytes; else three
 * significant digits, truncated, and the unit ("1.23KB", "12.3KB",
 * "123KB").
 */
export const classicyFormatByteSize = (bytes: number): string => {
	if (bytes < 1024) return `${groupDigits(bytes)} bytes`;
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
		value /= 1024;
		unit++;
	}
	const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
	const scale = 10 ** decimals;
	return `${(Math.floor(value * scale) / scale).toFixed(decimals)}${BYTE_UNITS[unit]}`;
};

/**
 * A General page's Size: the short size and the exact bytes, "1.23KB (1,263
 * bytes)" (shell32.dll's "%1 (%2 bytes), %3 bytes used", whose space used on
 * disk Classicy has no clusters for); under 1,024 bytes, the bytes alone.
 */
export const classicyPropertiesSize = (bytes: number): string =>
	bytes < 1024
		? classicyFormatByteSize(bytes)
		: `${classicyFormatByteSize(bytes)} (${groupDigits(bytes)} bytes)`;

const isFolderType = (type: unknown): boolean =>
	type === ClassicyFileSystemEntryFileType.Directory ||
	type === ClassicyFileSystemEntryFileType.Drive;

/**
 * What a folder holds, counted all the way down (a General page's
 * "Contains:"): its files and its folders, invisible ones included, as
 * Windows counts them.
 */
export const classicyCountFolderContents = (
	entry: ClassicyFileSystemEntry | undefined,
): { files: number; folders: number } => {
	let files = 0;
	let folders = 0;
	const walk = (node: ClassicyFileSystemEntry) => {
		for (const [key, child] of Object.entries(node)) {
			if (key.startsWith("_") || typeof child !== "object" || child === null)
				continue;
			const item = child as ClassicyFileSystemEntry;
			if (typeof item._type !== "string") continue;
			if (isFolderType(item._type)) {
				folders++;
				walk(item);
			} else {
				files++;
			}
		}
	};
	if (entry) walk(entry);
	return { files, folders };
};

/** The folder an item lies in: its path without its last name. */
export const classicyParentPath = (
	fs: Pick<ClassicyFileSystem, "separator">,
	path: string,
): string => path.split(fs.separator).slice(0, -1).join(fs.separator);

/**
 * Whether `path`'s Read-only and Hidden attributes may be written from its
 * sheet: an entry of the tree that is no drive, system or derived entry
 * (the Applications, Extensions and Control Strip Modules folders' entries,
 * which a rebuild replaces), and not the Trash.
 */
export const classicyPropertiesAttributesEditable = (
	entry: ClassicyFileSystemEntry | undefined,
): boolean =>
	!!entry &&
	entry._type !== ClassicyFileSystemEntryFileType.Drive &&
	entry._system !== true &&
	entry._derived !== true;
