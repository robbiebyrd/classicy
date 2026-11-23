import { readFile } from "node:fs/promises";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { Plugin } from "vite";

// `import text from "<file>?classicy-deflate"` embeds the file raw-deflated
// as base64 text (plan 0019-fb7 Part 2): the module's default export is
// CLASSICY_DEFLATE_MARK followed by the base64 of `deflateRawSync(bytes,
// { level: 9 })`, the same text on every build. The pdf.js worker is carried
// this way, about a third of its size as a base64 data: URI, and inflated
// back into that URI when the first PDF opens.
//
// classicyDeflateAssetPlugin is registered wherever src/ is compiled: the
// core's library build (vite.config.ts), the root vitest config and both
// Appearance Packages' vitest configs, Storybook's viteFinal and the example's
// live-source dev server. classicyDeflatePayloads is the dist gate's reader:
// it inflates every payload a bundle carries.

/** The import query that embeds a file deflated. */
export const CLASSICY_DEFLATE_QUERY = "?classicy-deflate";

/**
 * A module id the plugin loads. Vitest runs a file under node_modules in
 * Node itself, past every plugin, unless its id is inlined: each vitest
 * config lists this in `test.server.deps.inline`.
 */
export const CLASSICY_DEFLATE_ID_RE = /\?classicy-deflate$/;

/** What a deflated payload's text starts with, before its base64. */
export const CLASSICY_DEFLATE_MARK = "classicy-deflate:deflate-raw;base64,";

// The mark, then at least four base64 characters: the bare mark (a module
// that names the constant) is no payload. The mark holds no regex syntax.
const PAYLOAD_RE = new RegExp(
	`${CLASSICY_DEFLATE_MARK}([A-Za-z0-9+/=]{4,})`,
	"g",
);

/**
 * Every deflated payload in a bundle's code, inflated, in order. A payload
 * that does not inflate throws: the gate fails loudly on it.
 */
export function classicyDeflatePayloads(code: string): Buffer[] {
	return Array.from(code.matchAll(PAYLOAD_RE), ([, base64]) =>
		inflateRawSync(Buffer.from(base64, "base64")),
	);
}

export function classicyDeflateAssetPlugin(): Plugin {
	return {
		name: "classicy-deflate-asset",
		enforce: "pre",
		async resolveId(source, importer, options) {
			if (!source.endsWith(CLASSICY_DEFLATE_QUERY)) return null;
			const file = source.slice(0, -CLASSICY_DEFLATE_QUERY.length);
			// Resolved as a `?raw` import, so the id names the file itself: for a
			// bare package path, a dev server's dependency optimizer (Storybook,
			// the example) would answer with its pre-bundled copy
			// (node_modules/.vite/deps/…) and queue that copy's build, but it never
			// optimizes an asset query (`?raw`, `?url`).
			const resolved = await this.resolve(`${file}?raw`, importer, {
				...options,
				skipSelf: true,
			});
			if (!resolved) return null;
			// Embedding needs the file itself: an external id names no file here.
			if (resolved.external)
				this.error(
					`${source}: "${file}" resolves as external, so it cannot be embedded deflated`,
				);
			// The file's own path, then the query: `?raw`, and a query the resolver
			// added (a dev server's `v=` version hash), would leave load() no file.
			const [path] = resolved.id.split("?");
			return `${path}${CLASSICY_DEFLATE_QUERY}`;
		},
		async load(id) {
			if (!id.endsWith(CLASSICY_DEFLATE_QUERY)) return null;
			const file = id.slice(0, -CLASSICY_DEFLATE_QUERY.length);
			this.addWatchFile(file);
			const deflated = deflateRawSync(await readFile(file), { level: 9 });
			return {
				code: `export default ${JSON.stringify(
					CLASSICY_DEFLATE_MARK + deflated.toString("base64"),
				)};`,
				// The text is data, not source: it maps to nothing.
				map: { mappings: "" },
			};
		},
	};
}
