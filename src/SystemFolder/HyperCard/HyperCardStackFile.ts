import { resolveFileSystemEntrySource } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver";
import type { ClassicyFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";

/**
 * The JSON text of a `.stack` file, from its `_data` or its `_url`.
 *
 * `_data` comes in two encodings. The Save Stack dialog writes the JSON raw,
 * as the file system stores all text (`fs.writeFile`); a seeded stack, such as
 * The Oregon Trail, is gzip + base64url (`compressToBase64`) to stay small.
 * They never collide: JSON text starts with `{` (after any whitespace), and
 * base64url has no `{` in its alphabet.
 */
export async function readHyperCardStackFileText(
	entry: ClassicyFileSystemEntry | undefined,
): Promise<string> {
	const source = resolveFileSystemEntrySource(entry);
	if (source.kind === "url") {
		const response = await fetch(source.url);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return response.text();
	}
	if (source.kind === "data") {
		if (source.data.trimStart().startsWith("{")) return source.data;
		return new TextDecoder().decode(await decompressFromBase64(source.data));
	}
	throw new Error("the file has no content");
}
