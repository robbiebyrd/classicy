/**
 * Find File's search of the Classicy file system (story 0227-815): the live
 * shared tree of the desktop's storage key, walked under the chosen
 * location, each item checked against every row (`ClassicyFindCriteria.ts`).
 * Asynchronous, so a search of a large tree never blocks the desktop, and
 * canceled by its `AbortSignal` (a new search aborts the last).
 *
 * As in Mac OS 8.1: an invisible item is never found unless a visibility row
 * asks for it, but the search still looks inside invisible folders (an item
 * in the Trash is found); drives are where a search starts, not results.
 */
import {
	type ClassicyFindChoice,
	type ClassicyFindCriterion,
	type ClassicyFindItem,
	classicyFindCriterionMatches,
	classicyFindItemMatches,
	classicyFindRowNeedsRead,
	classicyFindRowsNeedSize,
	classicyFindRowsNeedText,
	isClassicyFindFolder,
} from "@/SystemFolder/FindFile/ClassicyFindCriteria";
import {
	type ClassicyFindLookupMemory,
	classicyFindEachBounded,
	classicyFindKnownSize,
	classicyFindReadSize,
	classicyFindReadText,
	classicyFindWithLookupPlace,
} from "@/SystemFolder/FindFile/ClassicyFindLookups.internal";
import { classicyDesktopFolderPath } from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { CLASSICY_TRASH_PATH } from "@/SystemFolder/SystemResources/File/ClassicyTrash";

/**
 * Where to search: every disk (`all`, `local`: Classicy's disks are all
 * local, and it has no file servers), the desktop, or one disk
 * (`disk:<name>`).
 */
export type ClassicyFindLocation =
	| "all"
	| "local"
	| "desktop"
	| `disk:${string}`;

/** 8.1's default location. */
export const CLASSICY_FIND_DEFAULT_LOCATION: ClassicyFindLocation = "local";

const DISK_PREFIX = "disk:";

/** The location that searches the disk `name`. */
export const classicyFindDiskLocation = (name: string): ClassicyFindLocation =>
	`${DISK_PREFIX}${name}`;

/** The disks of `fs`, in the tree's order. */
export const classicyFindDisks = (fs: ClassicyFileSystem): string[] =>
	Object.keys(fs.filterByType("", ClassicyFileSystemEntryFileType.Drive));

/**
 * The location pop-up's choices, in 8.1's order: all disks, local disks, the
 * desktop, then each disk by name (its icon beside it). `null` entries are
 * the pop-up's dividers.
 */
export const classicyFindLocationChoices = (
	fs: ClassicyFileSystem,
): (ClassicyFindChoice | null)[] => [
	{ value: "all", label: "on all disks" },
	{ value: "local", label: "on local disks" },
	null,
	{ value: "desktop", label: "on the desktop" },
	null,
	...classicyFindDisks(fs).map((disk) => ({
		value: classicyFindDiskLocation(disk),
		label: `on “${disk}”`,
	})),
];

/**
 * `location` if `fs` can still search it (a disk that is gone falls back to
 * the default), else the default.
 */
export const classicyFindUsableLocation = (
	fs: ClassicyFileSystem,
	location: unknown,
): ClassicyFindLocation => {
	if (location === "all" || location === "local" || location === "desktop") {
		return location;
	}
	if (
		typeof location === "string" &&
		location.startsWith(DISK_PREFIX) &&
		classicyFindDisks(fs).includes(location.slice(DISK_PREFIX.length))
	) {
		return location as ClassicyFindLocation;
	}
	return CLASSICY_FIND_DEFAULT_LOCATION;
};

/** One item found. */
export interface ClassicyFindFileResult {
	/** Its path in the tree. */
	path: string;
	/** Its name (its key in its folder). */
	name: string;
	entry: ClassicyFileSystemEntry;
	/**
	 * A file's size in bytes, when the search had it: recorded, or read for a
	 * size row (-1 when unknown). Items Found reads the others as it draws
	 * them; the search never waits on a size it does not need.
	 */
	size?: number;
}

export interface ClassicyFindFileSearchOptions {
	location: ClassicyFindLocation;
	criteria: readonly ClassicyFindCriterion[];
	/** Aborting it rejects the search with the signal's reason. */
	signal?: AbortSignal;
	/** Minutes east of UTC that dates are compared in (Classicy's clock). */
	timeZoneOffsetMinutes?: number;
	/**
	 * Told the number of items found so far, as they are found (8.1's "Items
	 * Found: N" beside Stop while it searches).
	 */
	onProgress?: (found: number) => void;
	/** What the session remembers between reads (sizes that could not be had). */
	memory?: ClassicyFindLookupMemory;
}

/** How many items are checked between yields to the event loop. */
const ITEMS_PER_SLICE = 250;

const isChild = (
	key: string,
	value: unknown,
): value is ClassicyFileSystemEntry =>
	!key.startsWith("_") && typeof value === "object" && value !== null;

const hasVisibleChild = (folder: ClassicyFileSystemEntry): boolean =>
	Object.entries(folder).some(
		([key, value]) => isChild(key, value) && value._invisible !== true,
	);

/** Find File's result order: by name, as the Finder sorts, then by path. */
export const compareClassicyFindFileResults = (
	a: ClassicyFindFileResult,
	b: ClassicyFindFileResult,
): number =>
	a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
	a.path.localeCompare(b.path);

const throwIfAborted = (signal: AbortSignal | undefined) => {
	if (!signal?.aborted) return;
	throw (
		signal.reason ?? new DOMException("The search was aborted.", "AbortError")
	);
};

/**
 * Search `fs` for the items that match every row under `location`, sorted
 * by name. Rejects with the signal's reason once `signal` aborts.
 *
 * Rows that need a read (size, contents) are checked last, and only for an
 * item every other row already matched: a recorded size answers at once,
 * anything else is one read per candidate, `CLASSICY_FIND_LOOKUPS` at a
 * time, under `signal`. No other size is read: Items Found reads a result's
 * size as it draws its row.
 */
export async function searchClassicyFileSystem(
	fs: ClassicyFileSystem,
	{
		location,
		criteria,
		signal,
		timeZoneOffsetMinutes = 0,
		onProgress,
		memory,
	}: ClassicyFindFileSearchOptions,
): Promise<ClassicyFindFileResult[]> {
	throwIfAborted(signal);
	const separator = fs.separator;
	const desktopFolder = classicyDesktopFolderPath(fs);
	const disks = classicyFindDisks(fs);
	const startupDisk = disks[0];
	const firstRows = criteria.filter((row) => !classicyFindRowNeedsRead(row));
	const lastRows = criteria.filter(classicyFindRowNeedsRead);
	const needSize = classicyFindRowsNeedSize(lastRows);
	const needText = classicyFindRowsNeedText(lastRows);
	const results: ClassicyFindFileResult[] = [];
	/** Files every other row matched, waiting on a read. */
	const candidates: { path: string; item: ClassicyFindItem }[] = [];
	let checked = 0;

	const sizeRows = lastRows.filter((row) => row.key === "size");
	/** Every row matches (the visibility rule is the first rows' to apply). */
	const matchesEvery = (
		item: ClassicyFindItem,
		rows: readonly ClassicyFindCriterion[],
	) => rows.every((row) => classicyFindCriterionMatches(item, row));

	const found = (path: string, item: ClassicyFindItem) => {
		results.push({
			path,
			name: item.name,
			entry: item.entry,
			...(item.size === undefined ? {} : { size: item.size }),
		});
		onProgress?.(results.length);
	};

	const consider = async (
		path: string,
		name: string,
		entry: ClassicyFileSystemEntry,
	) => {
		checked += 1;
		if (checked % ITEMS_PER_SLICE === 0) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		throwIfAborted(signal);
		const folder = isClassicyFindFolder(entry);
		const item: ClassicyFindItem = {
			name,
			entry,
			// The Desktop Folder is Classicy's invisible stand-in for the Mac's
			// visible one: 8.1 found it by name, and lists what is in it.
			visible: path === desktopFolder,
			empty: folder ? !hasVisibleChild(entry) : undefined,
			timeZoneOffsetMinutes,
		};
		if (!classicyFindItemMatches(item, firstRows)) return;
		// A folder fails a size or contents row (files only) without a read.
		if (lastRows.length === 0 || folder) {
			if (matchesEvery(item, lastRows)) found(path, item);
			return;
		}
		const known = needSize ? classicyFindKnownSize(entry) : undefined;
		const sized = known === undefined ? item : { ...item, size: known };
		// A size already known answers the size rows at once.
		if (known !== undefined && !matchesEvery(sized, sizeRows)) return;
		if (!needText && (!needSize || known !== undefined)) {
			found(path, sized);
			return;
		}
		candidates.push({ path, item: sized });
	};

	/** Every item inside `folder`, at any depth, invisible folders included. */
	const walk = async (
		folderPath: string,
		folder: ClassicyFileSystemEntry,
		keep: (name: string, entry: ClassicyFileSystemEntry) => boolean = () =>
			true,
	) => {
		for (const [name, value] of Object.entries(folder)) {
			if (!isChild(name, value) || !keep(name, value)) continue;
			const path = `${folderPath}${separator}${name}`;
			await consider(path, name, value);
			if (isClassicyFindFolder(value)) await walk(path, value);
		}
	};

	const trash = fs.resolve(CLASSICY_TRASH_PATH);
	/** The Trash itself, then what in it came from `disk` (any disk when unset). */
	const walkTrash = async (disk?: string) => {
		if (!trash || typeof trash !== "object") return;
		if (disk === undefined || disk === startupDisk) {
			await consider(CLASSICY_TRASH_PATH, CLASSICY_TRASH_PATH, trash);
		}
		await walk(CLASSICY_TRASH_PATH, trash, (_name, entry) => {
			if (disk === undefined) return true;
			const from =
				typeof entry._trashedFrom === "string" ? entry._trashedFrom : "";
			// An item with no origin was trashed from the startup disk.
			if (from === "") return disk === startupDisk;
			return from === disk || from.startsWith(`${disk}${separator}`);
		});
	};

	if (location === "desktop") {
		const folder = desktopFolder ? fs.resolve(desktopFolder) : undefined;
		if (desktopFolder && folder) {
			// 8.1's "on the desktop" lists the Desktop Folder itself too.
			const name = desktopFolder.slice(
				desktopFolder.lastIndexOf(separator) + 1,
			);
			await consider(desktopFolder, name, folder);
			await walk(desktopFolder, folder);
		}
	} else if (location.startsWith(DISK_PREFIX)) {
		const disk = location.slice(DISK_PREFIX.length);
		const root = disks.includes(disk) ? fs.resolve(disk) : undefined;
		if (root) {
			await walk(disk, root);
			await walkTrash(disk);
		}
	} else {
		for (const disk of disks) {
			const root = fs.resolve(disk);
			if (root) await walk(disk, root);
		}
		await walkTrash();
	}

	// The reads, last: one per candidate, a few at a time, under the signal.
	await classicyFindEachBounded(
		candidates,
		async ({ path, item }) => {
			let read = item;
			if (needSize && item.size === undefined) {
				const size =
					(await classicyFindReadSize(fs, item.entry, {
						signal,
						memory,
					})) ?? -1;
				if (signal?.aborted) return;
				read = { ...item, size };
				// A size that does not fit spares the contents read.
				if (!matchesEvery(read, sizeRows)) return;
			}
			if (needText) {
				const text = await classicyFindWithLookupPlace(memory, signal, () =>
					classicyFindReadText(item.entry),
				);
				if (signal?.aborted) return;
				if (text !== undefined) read = { ...read, text };
			}
			if (matchesEvery(read, lastRows)) found(path, read);
		},
		{ signal },
	);

	throwIfAborted(signal);
	return results.sort(compareClassicyFindFileResults);
}
