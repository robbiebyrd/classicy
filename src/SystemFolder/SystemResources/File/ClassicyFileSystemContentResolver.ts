import type { ClassicyFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

export type ClassicyFileSystemEntrySource =
	| { kind: "url"; url: string }
	| { kind: "data"; data: string }
	| { kind: "none" };

/**
 * Resolves what content source an entry should be opened from. `_data`
 * (compressed + base64url-encoded bytes, see base64Compression.ts) takes
 * precedence over `_url` when both are present. Any app opening a file from
 * ClassicyFileSystem can use this instead of reading `_url`/`_data` directly.
 */
export function resolveFileSystemEntrySource(
	entry: ClassicyFileSystemEntry | undefined,
): ClassicyFileSystemEntrySource {
	if (typeof entry?._data === "string" && entry._data.length > 0) {
		return { kind: "data", data: entry._data };
	}
	if (typeof entry?._url === "string" && entry._url.length > 0) {
		return { kind: "url", url: entry._url };
	}
	return { kind: "none" };
}
