import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type {
	ClassicyFileSystem,
	ClassicyFileSystemMoveRefusal,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import type { ClassicyFileSystemEntryMetadata } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

/**
 * The Trash: a folder at the root of the tree, beside the drives — what the
 * Trash icon on the desktop opens. Items moved into it remember the folder
 * they came from (`_trashedFrom`), so Restore can put them back, and stay
 * until the Trash is emptied.
 */
export const CLASSICY_TRASH_PATH = "Trash";

/** Why an item could not be moved into, or restored from, the Trash. */
export type ClassicyTrashRefusal =
	| ClassicyFileSystemMoveRefusal
	/** Restore: the folder the item came from no longer exists. */
	| "no-origin";

export type ClassicyTrashResult = {
	/** The moves that happened, as old → new path. */
	moves: { from: string; to: string }[];
	/** The first item that couldn't be moved, and why. */
	refusal?: { reason: ClassicyTrashRefusal; name: string };
};

/** Metadata that marks an entry as trashed; cleared when it leaves the Trash. */
export const CLASSICY_UNTRASHED_METADATA: Partial<ClassicyFileSystemEntryMetadata> =
	{
		_trashed: undefined,
		_trashedFrom: undefined,
		_trashedName: undefined,
		_trashedLocation: undefined,
	};

const baseName = (fs: ClassicyFileSystem, path: string) =>
	path.split(fs.separator).pop() ?? path;

const parentPath = (fs: ClassicyFileSystem, path: string) =>
	path.split(fs.separator).slice(0, -1).join(fs.separator);

/** Is `path` the Trash or inside it? */
export const isInClassicyTrash = (
	fs: ClassicyFileSystem,
	path: string,
): boolean =>
	path === CLASSICY_TRASH_PATH ||
	path.startsWith(`${CLASSICY_TRASH_PATH}${fs.separator}`);

/** Is `path` an item directly in the Trash — one Restore can put back? */
export const isClassicyTrashItem = (
	fs: ClassicyFileSystem,
	path: string,
): boolean =>
	path !== CLASSICY_TRASH_PATH && parentPath(fs, path) === CLASSICY_TRASH_PATH;

/**
 * Create the Trash folder if the tree has none (a fresh tree, or one from
 * before the Trash existed). Idempotent: it journals nothing once it exists.
 * The folder is a system folder, so it can't itself be moved or trashed, and
 * invisible, so it isn't offered as a volume in Open and Save dialogs.
 */
export function ensureClassicyTrash(fs: ClassicyFileSystem): string {
	if (!fs.resolve(CLASSICY_TRASH_PATH)) {
		fs.mkDir(CLASSICY_TRASH_PATH);
		fs.setMetadata(CLASSICY_TRASH_PATH, {
			_icon: ClassicyIcons.system.desktop.trashEmpty,
			_system: true,
			_nameLocked: true,
			// Not a volume: Open and Save dialogs, which list the root, skip it.
			_invisible: true,
		});
	}
	return CLASSICY_TRASH_PATH;
}

/** Paths of the items directly in the Trash, in listing order. */
export function listClassicyTrashItems(fs: ClassicyFileSystem): string[] {
	const trash = fs.resolve(CLASSICY_TRASH_PATH);
	if (!trash) return [];
	return Object.keys(trash)
		.filter((key) => !key.startsWith("_"))
		.map((key) => `${CLASSICY_TRASH_PATH}${fs.separator}${key}`);
}

/**
 * A name for `name` that is free in the Trash: the name itself, else the
 * first of "Plan 2.txt", "Plan 3.txt", … (before the extension, if any).
 */
const freeTrashName = (fs: ClassicyFileSystem, name: string): string => {
	const trash = fs.resolve(CLASSICY_TRASH_PATH) ?? {};
	if (!Object.hasOwn(trash, name)) return name;
	const dot = name.lastIndexOf(".");
	const [stem, ext] =
		dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
	for (let n = 2; ; n++) {
		const candidate = `${stem} ${n}${ext}`;
		if (!Object.hasOwn(trash, candidate)) return candidate;
	}
};

/**
 * Move `paths` into the Trash, recording where each came from. A clashing
 * name is numbered rather than refused. Items already in the Trash are
 * skipped; `locations` (by path) records a desktop icon's position so a
 * restored desktop item returns to it. Locked items (drives, system and
 * read-only items) are refused.
 */
export function trashClassicyFileSystemItems(
	fs: ClassicyFileSystem,
	paths: string[],
	locations: Record<string, [number, number] | undefined> = {},
): ClassicyTrashResult {
	ensureClassicyTrash(fs);
	const result: ClassicyTrashResult = { moves: [] };
	for (const path of paths) {
		if (isInClassicyTrash(fs, path)) continue;
		const name = baseName(fs, path);
		const trashName = freeTrashName(fs, name);
		const location = locations[path];
		const moved = fs.move(path, CLASSICY_TRASH_PATH, {
			name: trashName,
			metadata: {
				_trashed: true,
				_trashedFrom: parentPath(fs, path),
				...(trashName === name ? {} : { _trashedName: name }),
				...(location ? { _trashedLocation: location } : {}),
			},
		});
		if (moved.ok) {
			result.moves.push({ from: path, to: moved.path });
		} else if (!result.refusal) {
			result.refusal = { reason: moved.reason, name };
		}
	}
	return result;
}

/**
 * Put Trash items back where they came from, under their original names. An
 * item whose folder is gone, or whose name is now taken there, stays in the
 * Trash. Paths that aren't items directly in the Trash are ignored.
 */
export function restoreClassicyFileSystemItems(
	fs: ClassicyFileSystem,
	paths: string[],
): ClassicyTrashResult {
	const result: ClassicyTrashResult = { moves: [] };
	for (const path of paths) {
		if (!isClassicyTrashItem(fs, path)) continue;
		const entry = fs.resolve(path);
		if (!entry) continue;
		const name = entry._trashedName ?? baseName(fs, path);
		const origin = entry._trashedFrom;
		if (typeof origin !== "string" || !fs.resolve(origin)) {
			result.refusal ??= { reason: "no-origin", name };
			continue;
		}
		const moved = fs.move(path, origin, {
			name,
			metadata: CLASSICY_UNTRASHED_METADATA,
		});
		if (moved.ok) {
			result.moves.push({ from: path, to: moved.path });
		} else if (!result.refusal) {
			result.refusal = { reason: moved.reason, name };
		}
	}
	return result;
}

/** Permanently remove everything in the Trash. Returns how many items went. */
export function emptyClassicyTrash(fs: ClassicyFileSystem): number {
	const items = listClassicyTrashItems(fs);
	for (const path of items) fs.rmDir(path);
	return items.length;
}
