import type { Plugin } from "vite";

// Published source maps keep Classicy's own source text only (plan 0019-fb7
// Part 1). A third-party module (a path through node_modules/, the compressed
// pdf.js worker's module included) and an asset Vite embedded in the bundle
// lose their `sourcesContent`; `sources`, `names` and `mappings` stay, so stack
// traces and DevTools still name the vendor file and line, and every vendor
// source is on the map's `x_google_ignoreList`, so DevTools steps over it.
//
// classicySourceMapTextPlugin does it in the three library builds;
// findClassicySourceMapTextProblems is each package's verify:dist gate.

/** A source map as Rollup writes it: the v3 fields, any other key kept. */
export type ClassicyRawSourceMap = {
	version: number;
	file?: string;
	sources: string[];
	sourcesContent?: Array<string | null>;
	names: string[];
	mappings: string;
	x_google_ignoreList?: number[];
	[key: string]: unknown;
};

/** What a map source is, for deciding whether its text ships. */
export type ClassicyMapSourceKind = "vendor" | "asset" | "own" | "other";

/** File extensions of the asset modules Vite embeds in a bundle. */
export const CLASSICY_MAP_ASSET_EXTENSIONS = [
	"png",
	"jpg",
	"jpeg",
	"gif",
	"svg",
	"webp",
	"avif",
	"ico",
	"mp3",
	"mp4",
	"ogg",
	"m4a",
	"ac3",
	"wav",
	"woff",
	"woff2",
	"pdf",
] as const;

const ASSET_EXTENSIONS: ReadonlySet<string> = new Set(
	CLASSICY_MAP_ASSET_EXTENSIONS,
);
// Vite's asset queries (`?inline`, `?url`) and the no-inline opt-out
// (bin/classicyNoInlineAssets.ts). `?raw` is not one: it is Classicy's text.
const ASSET_QUERIES: ReadonlySet<string> = new Set([
	"inline",
	"url",
	"no-inline",
]);
const DATA_MODULE = 'export default "data:';

/**
 * A map source as a forward-slash path and its query. Rollup relativizes a
 * virtual module's `\0` id like any other (`../../\0commonjsHelpers.js`), so
 * every NUL goes, not only a leading one.
 */
const splitSource = (source: string): { path: string; query: string[] } => {
	const normalized = source.replace(/\\/g, "/").replace(/\0/g, "");
	const at = normalized.indexOf("?");
	if (at === -1) return { path: normalized, query: [] };
	return {
		path: normalized.slice(0, at),
		query: normalized
			.slice(at + 1)
			.split("&")
			.map((param) => param.split("=")[0]),
	};
};

/**
 * Whose text a map source holds. `vendor`: a path through node_modules/
 * (query ignored). `asset`: an embedded asset module, by its Vite query, its
 * extension or a text starting `export default "data:`. `own`: Classicy's
 * source, under a src/ folder (the core's, a package's, or Platinum's savers
 * as System 7 bundles them). `other`: anything else, such as a virtual helper.
 */
export function classifyClassicyMapSource(
	source: string,
	content: string | null | undefined,
): ClassicyMapSourceKind {
	const { path, query } = splitSource(source);
	if (/(?:^|\/)node_modules\//.test(path)) return "vendor";
	const extension = /\.([^./]+)$/.exec(path)?.[1].toLowerCase();
	if (
		query.some((param) => ASSET_QUERIES.has(param)) ||
		(extension !== undefined && ASSET_EXTENSIONS.has(extension)) ||
		content?.startsWith(DATA_MODULE)
	)
		return "asset";
	if (/(?:^|\/)src\//.test(path)) return "own";
	return "other";
}

/**
 * A new map whose vendor and asset sources have `null` text, every other
 * source's text, `sources`, `names` and `mappings` unchanged, and whose
 * `x_google_ignoreList` is its old one plus every vendor source, sorted.
 */
export function stripClassicySourceMapText(
	map: ClassicyRawSourceMap,
): ClassicyRawSourceMap {
	const kinds = map.sources.map((source, i) =>
		classifyClassicyMapSource(source, map.sourcesContent?.[i]),
	);
	const ignore = new Set(map.x_google_ignoreList ?? []);
	kinds.forEach((kind, i) => {
		if (kind === "vendor") ignore.add(i);
	});
	return {
		...map,
		...(map.sourcesContent && {
			sourcesContent: map.sourcesContent.map((content, i) =>
				kinds[i] === "vendor" || kinds[i] === "asset" ? null : content,
			),
		}),
		x_google_ignoreList: [...ignore].sort((a, b) => a - b),
	};
}

/**
 * verify:dist's source map problems for one `.js.map` file: vendor or asset
 * text kept, Classicy's own text gone, a vendor source missing from the
 * ignore list, or a file that is not a source map.
 */
export function findClassicySourceMapTextProblems(
	mapText: string,
	fileName: string,
): string[] {
	let map: ClassicyRawSourceMap;
	try {
		map = JSON.parse(mapText);
	} catch (error) {
		return [
			`${fileName}: is not valid JSON (${error instanceof Error ? error.message : String(error)}) -> a published .js.map must be a source map.`,
		];
	}
	if (!Array.isArray(map?.sources))
		return [
			`${fileName}: has no sources array -> a published .js.map must be a source map.`,
		];
	const hint = "-> the library build must run classicySourceMapTextPlugin.";
	const ignore = new Set(map.x_google_ignoreList ?? []);
	return map.sources.flatMap((source, i) => {
		const content = map.sourcesContent?.[i];
		const kind = classifyClassicyMapSource(source, content);
		const problems: string[] = [];
		if ((kind === "vendor" || kind === "asset") && typeof content === "string")
			problems.push(
				`${fileName}: keeps the text of ${kind} source ${source} ${hint}`,
			);
		if (kind === "own" && typeof content !== "string")
			problems.push(
				`${fileName}: has no text for Classicy's own source ${source} -> only third-party and asset text may be dropped.`,
			);
		if (kind === "vendor" && !ignore.has(i))
			problems.push(
				`${fileName}: vendor source ${source} is not in x_google_ignoreList ${hint}`,
			);
		return problems;
	});
}

/**
 * Strips third-party and asset text from every `.js.map` the build writes.
 * Rollup emits a chunk's map as an asset before generateBundle, so the
 * asset's `source` is what reaches the disk; editing `chunk.map` changes
 * nothing written.
 */
export function classicySourceMapTextPlugin(): Plugin {
	return {
		name: "classicy-source-map-text",
		enforce: "post",
		generateBundle(_options, bundle) {
			for (const output of Object.values(bundle)) {
				if (output.type !== "asset" || !output.fileName.endsWith(".js.map"))
					continue;
				const text =
					typeof output.source === "string"
						? output.source
						: new TextDecoder().decode(output.source);
				let map: ClassicyRawSourceMap;
				try {
					map = JSON.parse(text);
				} catch (error) {
					this.error(
						`${output.fileName}: is not valid JSON (${error instanceof Error ? error.message : String(error)})`,
					);
				}
				output.source = JSON.stringify(stripClassicySourceMapText(map));
			}
		},
	};
}
