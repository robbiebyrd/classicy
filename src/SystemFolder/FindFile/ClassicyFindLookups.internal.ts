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

/**
 * gzip + base64url (`compressToBase64`) always starts with these characters;
 * text may too, so data that does is only compressed if it inflates.
 */
const GZIP_BASE64_PREFIX = "H4sI";

const mayBeCompressed = (data: string) => data.startsWith(GZIP_BASE64_PREFIX);

/**
 * The size `fs.size` gives, when it can be had without waiting: a shortcut's
 * 0, the length of plain `_data`, a recorded `_size`, or -1 for a file with
 * nothing to measure. `undefined` when it needs a read: `_data` that may be
 * compressed (`fs.size` inflates it, or measures it as text), or a `_url`
 * with no `_size` (a HEAD request). Folders have none.
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
		if (mayBeCompressed(data)) return undefined;
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
 * The most of a file's contents the contents criterion reads: 5 MiB (of
 * text, or of inflated bytes). Classicy keeps its tree in localStorage,
 * which holds 5 MiB per origin in every browser (MDN, "Storage quotas and
 * eviction criteria", Web Storage), so no plain file of a stored tree is
 * longer; a compressed one can inflate past it, and only its first 5 MiB
 * are searched.
 */
export const CLASSICY_FIND_CONTENTS_LIMIT = 5 * 1024 * 1024;

/** base64url (`compressToBase64`'s alphabet, unpadded) to bytes; throws on junk. */
const base64UrlBytes = (data: string): Uint8Array => {
	const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

type Inflated =
	| { kind: "text"; text: string }
	| { kind: "notCompressed" }
	| { kind: "aborted" };

/**
 * Inflate gzip + base64url `data` as UTF-8 text, chunk by chunk: at most
 * `limit` bytes, ending at once when `signal` aborts. `notCompressed` when
 * it is no gzip stream at all.
 */
async function inflateText(
	data: string,
	limit: number,
	signal: AbortSignal | undefined,
): Promise<Inflated> {
	let bytes: Uint8Array;
	try {
		bytes = base64UrlBytes(data);
	} catch {
		return { kind: "notCompressed" };
	}
	if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return { kind: "notCompressed" };
	const reader = new Blob([new Uint8Array(bytes)])
		.stream()
		.pipeThrough(new DecompressionStream("gzip"))
		.getReader();
	const stop = () => {
		void reader.cancel().catch(() => {});
	};
	signal?.addEventListener("abort", stop, { once: true });
	const decoder = new TextDecoder();
	let text = "";
	let inflated = 0;
	try {
		for (;;) {
			if (signal?.aborted) return { kind: "aborted" };
			const { done, value } = await reader.read();
			if (signal?.aborted) return { kind: "aborted" };
			if (done) break;
			const chunk = value.subarray(0, limit - inflated);
			inflated += chunk.byteLength;
			text += decoder.decode(chunk, { stream: true });
			if (inflated >= limit) {
				stop();
				break;
			}
		}
		return { kind: "text", text: text + decoder.decode() };
	} catch {
		if (signal?.aborted) return { kind: "aborted" };
		// Not a gzip stream after all: the caller reads it as text.
		return inflated === 0
			? { kind: "notCompressed" }
			: { kind: "text", text: text + decoder.decode() };
	} finally {
		signal?.removeEventListener("abort", stop);
	}
}

/**
 * A file's contents as text, for the contents criterion: its `_data`,
 * inflated when it is gzip + base64url (`compressToBase64`) and decoded as
 * UTF-8, else the text itself (a note that merely begins "H4sI" is text);
 * at most `CLASSICY_FIND_CONTENTS_LIMIT` of it, the inflation ending as soon
 * as `signal` aborts. `undefined` for a file with no `_data` (a `_url` file
 * is never fetched), and when `signal` aborted first.
 */
export async function classicyFindReadText(
	entry: ClassicyFileSystemEntry,
	signal?: AbortSignal,
	limit: number = CLASSICY_FIND_CONTENTS_LIMIT,
): Promise<string | undefined> {
	if (!("_data" in entry) || typeof entry._data !== "string") return undefined;
	if (signal?.aborted) return undefined;
	const data = entry._data;
	if (mayBeCompressed(data)) {
		const inflated = await inflateText(data, limit, signal);
		if (inflated.kind === "aborted") return undefined;
		if (inflated.kind === "text") return inflated.text;
	}
	return data.length > limit ? data.slice(0, limit) : data;
}
