/**
 * Find File's slow reads (story 0227-815, fix round 1): a file's size and its
 * contents. Neither ever holds a search or Items Found back: a search reads
 * them only for a candidate that already matched every other row, and Items
 * Found only for the rows it draws, each read under an `AbortSignal` and at
 * most `CLASSICY_FIND_LOOKUPS` at a time.
 *
 * A size is the Finder's (`fs.size`): a `_url` file's comes from a HEAD
 * request. Contents are read from `_data` only, the bytes Classicy holds; a
 * `_url` file's are never fetched.
 */
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";

/** How many reads run at once (sizes over the network, contents decoded). */
export const CLASSICY_FIND_LOOKUPS = 4;

/**
 * Run `work` over `items`, at most `limit` at a time, in order; once `signal`
 * aborts, no new item starts. Resolves when every started item has settled.
 * `work` must not throw (each item handles its own failure).
 */
export async function classicyFindEachBounded<T>(
	items: readonly T[],
	work: (item: T) => Promise<void>,
	{
		limit = CLASSICY_FIND_LOOKUPS,
		signal,
	}: { limit?: number; signal?: AbortSignal } = {},
): Promise<void> {
	let next = 0;
	const lane = async () => {
		while (next < items.length && !signal?.aborted) {
			const item = items[next];
			next += 1;
			await work(item);
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, lane),
	);
}

/** gzip + base64url (`compressToBase64`) always starts with these characters. */
const GZIP_BASE64_PREFIX = "H4sI";

const isCompressed = (data: string) => data.startsWith(GZIP_BASE64_PREFIX);

/**
 * The size `fs.size` gives, when it can be had without waiting: a shortcut's
 * 0, the length of plain `_data`, a recorded `_size`, or -1 for a file with
 * nothing to measure. `undefined` when it needs a read: compressed `_data`,
 * or a `_url` with no `_size` (a HEAD request). Folders have none.
 */
export const classicyFindKnownSize = (
	entry: ClassicyFileSystemEntry,
): number | undefined => {
	if (
		entry._type === ClassicyFileSystemEntryFileType.Directory ||
		entry._type === ClassicyFileSystemEntryFileType.Drive
	) {
		return undefined;
	}
	if ("_data" in entry) {
		const data = String(entry._data);
		if (isCompressed(data)) return undefined;
		return new TextEncoder().encode(data).byteLength;
	}
	if (entry._type === ClassicyFileSystemEntryFileType.Shortcut) return 0;
	if (typeof entry._size === "number") return entry._size;
	if (typeof entry._url === "string") return undefined;
	return -1;
};

/** What one Find File session remembers between reads, and shares. */
export interface ClassicyFindLookupMemory {
	/**
	 * The `_url`s whose size could not be read (no answer, no length, a
	 * refusal): not asked again while Find File runs.
	 */
	unknownUrls: Set<string>;
	/** Reads running now, across the session (a search's, Items Found's). */
	running: number;
	/** Reads waiting for one of the `CLASSICY_FIND_LOOKUPS` places. */
	waiting: (() => void)[];
}

export const createClassicyFindLookupMemory = (): ClassicyFindLookupMemory => ({
	unknownUrls: new Set(),
	running: 0,
	waiting: [],
});

/**
 * Run `read` in one of the session's `CLASSICY_FIND_LOOKUPS` places, waiting
 * for one to free, so a search's reads and Items Found's together stay
 * within the bound. Resolves `undefined` without running `read` when
 * `signal` aborts first. Without `memory`, `read` runs at once.
 */
export async function classicyFindWithLookupPlace<T>(
	memory: ClassicyFindLookupMemory | undefined,
	signal: AbortSignal | undefined,
	read: () => Promise<T>,
): Promise<T | undefined> {
	if (signal?.aborted) return undefined;
	if (!memory) return read();
	if (memory.running >= CLASSICY_FIND_LOOKUPS) {
		const placed = await new Promise<boolean>((resolve) => {
			const wake = () => {
				signal?.removeEventListener("abort", onAbort);
				resolve(true);
			};
			const onAbort = () => {
				const at = memory.waiting.indexOf(wake);
				if (at >= 0) memory.waiting.splice(at, 1);
				resolve(false);
			};
			memory.waiting.push(wake);
			signal?.addEventListener("abort", onAbort, { once: true });
		});
		if (!placed) return undefined;
	} else {
		memory.running += 1;
	}
	try {
		return await read();
	} finally {
		// The place passes to the next read waiting, or is freed.
		const next = memory.waiting.shift();
		if (next) next();
		else memory.running -= 1;
	}
}

/**
 * A file's size, as `classicyFindKnownSize` or `fs.size` gives it, under
 * `signal`, in one of the session's places. -1 when it cannot be known, and
 * when `signal` aborted first. `undefined`, with nothing read, when
 * `stillWanted` says no once a place is free (a row scrolled out of view).
 */
export async function classicyFindReadSize(
	fs: ClassicyFileSystem,
	entry: ClassicyFileSystemEntry,
	{
		signal,
		memory,
		stillWanted,
	}: {
		signal?: AbortSignal;
		memory?: ClassicyFindLookupMemory;
		stillWanted?: () => boolean;
	} = {},
): Promise<number | undefined> {
	const known = classicyFindKnownSize(entry);
	if (known !== undefined) return known;
	const url =
		"_data" in entry || typeof entry._url !== "string" ? undefined : entry._url;
	if (url !== undefined && memory?.unknownUrls.has(url)) return -1;
	if (signal?.aborted) return -1;
	let skipped = false;
	const size = await classicyFindWithLookupPlace(memory, signal, async () => {
		if (stillWanted && !stillWanted()) {
			skipped = true;
			return -1;
		}
		return fs.size(entry, { signal });
	});
	if (skipped) return undefined;
	if (size === undefined) return -1;
	if (url !== undefined && size < 0 && !signal?.aborted) {
		memory?.unknownUrls.add(url);
	}
	return size;
}

/**
 * A file's contents as text, for the contents criterion: its `_data`,
 * decompressed when it is stored compressed and decoded as UTF-8. `undefined`
 * for a file with no `_data` (a `_url` file is never fetched) or whose data
 * cannot be decoded.
 */
export async function classicyFindReadText(
	entry: ClassicyFileSystemEntry,
): Promise<string | undefined> {
	if (!("_data" in entry) || typeof entry._data !== "string") return undefined;
	const data = entry._data;
	if (!isCompressed(data)) return data;
	try {
		return new TextDecoder().decode(await decompressFromBase64(data));
	} catch {
		return undefined;
	}
}
