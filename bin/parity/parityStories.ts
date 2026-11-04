// The story set: Storybook's index.json (every `type: "story"` entry, docs
// left out) or a list file, filtered by a regular expression on the id.
import { readFileSync } from "node:fs";

export function storyIdsFromIndex(index: unknown, filter?: RegExp): string[] {
	const entries = (index as { entries?: unknown } | null)?.entries;
	if (!entries || typeof entries !== "object")
		throw new Error("not a Storybook index.json (no `entries` object)");
	return Object.values(
		entries as Record<string, { id?: string; type?: string }>,
	)
		.filter((e) => e.type === "story" && typeof e.id === "string")
		.map((e) => e.id as string)
		.filter((id) => !filter || filter.test(id))
		.sort();
}

/** One id per line; blank lines and `#` comments are skipped. */
export function parseStoryList(text: string, filter?: RegExp): string[] {
	return text
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("#"))
		.filter((id) => !filter || filter.test(id));
}

export const storyUrl = (baseUrl: string, id: string) =>
	`${baseUrl}/iframe.html?id=${id}&viewMode=story`;

/** The ids from `listFile` when given, else from the server's index.json. */
export async function resolveStoryIds(
	baseUrl: string,
	listFile: string | undefined,
	filter: RegExp | undefined,
): Promise<string[]> {
	if (listFile) return parseStoryList(readFileSync(listFile, "utf8"), filter);
	let res: Response;
	try {
		res = await fetch(`${baseUrl}/index.json`);
	} catch (e) {
		throw new Error(
			`cannot reach Storybook at ${baseUrl} (${String(e)}); start it first, or pass --port / --base-url`,
		);
	}
	if (!res.ok) throw new Error(`${baseUrl}/index.json answered ${res.status}`);
	return storyIdsFromIndex(await res.json(), filter);
}
